import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createBooking, getBookings, reloadBookings } from '@/lib/bookings-store';
import { emit as xcEmit } from '@/lib/cross-connections';
import { listConsultations, reloadConsultations } from '@/lib/consultations-store';
import { validateSlot } from '@/lib/slot-utils';
import { notifyAppointmentBooked } from '@/lib/notifications';
import { parseJson } from '@/lib/api-validate';
import { findUserById, findUserByEmail, reloadUsers } from '@/lib/users-store';
import { computeVerificationStatus } from '@/lib/verification-gate';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDoctorById } from '@/lib/doctors-store';
import { resolveActiveProfile } from '@/lib/family-active';
import { sendDoctorNewAppointmentViaSentDm } from '@/lib/sent-dm';
import { log } from "@/lib/log";

const BookingSchema = z.object({
  doctorId: z.string().trim().min(1).max(64),
  doctorName: z.string().trim().min(1).max(120),
  patientName: z.string().trim().min(1).max(120),
  patientEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(200)
    .refine((e) => !e.endsWith('@placeholder.com'), {
      message: 'Placeholder emails are not allowed',
    }),
  patientPhone: z.string().trim().min(3).max(32),
  timeSlot: z.string().trim().min(1).max(64),
  fee: z.number().positive().max(100000),
  paymentStatus: z.enum(['paid', 'pending', 'failed', 'refunded']).optional(),
  paymentIntentId: z.string().trim().max(128).optional(),
  appointmentType: z.enum(['in-person', 'video']).optional(),
  date: z.string().trim().max(64).optional(),
  doctorEmail: z.string().trim().email().max(200).optional(),
  doctorPhone: z.string().trim().max(32).optional(),
  // Clinic visit fields. When clinicId is set we treat this as an
  // in-person appointment routed to that clinic's reception.
  clinicId: z.string().regex(/^CL-\d+$/).optional(),
  paymentMode: z.enum(['online', 'clinic']).optional(),
});

export async function GET() {
  try {
    await reloadBookings();
    const bookings = getBookings();
    return NextResponse.json({ bookings });
  } catch (error: unknown) {
    log.error('Failed to fetch bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const parsed = await parseJson(request, BookingSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  // Verification gate: a patient booking an appointment must have
  // verified their email + phone + at least one attached ID. Looked
  // up by email (the booking body carries patientEmail). Unsigned-in
  // callers (free-tier guest flow at /api/bookings/free) skip this
  // route entirely. Doctor / admin / staff bookings (from a dashboard)
  // bypass the gate — they're identified via session, not the form.
  const session = await getServerSession(authOptions);
  // Hydrate users-store before any lookup — Vercel cold-Lambda races
  // can leave the in-memory cache empty even when the JWT is valid.
  // Same race that surfaced as user_not_found on /api/wallet/topup-create.
  await reloadUsers();
  const sessionUser = session?.user
    ? findUserById((session.user as { id?: string }).id || '')
    : null;
  if (!sessionUser || sessionUser.role === 'patient') {
    const candidate = sessionUser || findUserByEmail(body.patientEmail);
    if (candidate && candidate.role === 'patient') {
      const status = computeVerificationStatus(candidate);
      if (!status.allOk) {
        return NextResponse.json(
          {
            error: 'verification_required',
            message:
              'Verify your email, phone, and an ID before booking. Open the verification page from your dashboard.',
            status,
          },
          { status: 403 },
        );
      }
    }
  }

  // Guard against an unauthenticated POST that just claims to be paid.
  // A real "paid" booking must carry the upstream gateway's intent id;
  // the verify endpoints (Stripe/Razorpay/etc.) confirm with the gateway
  // before flipping a pending booking to paid.
  if (body.paymentStatus === 'paid' && !body.paymentIntentId) {
    return NextResponse.json(
      { error: 'paymentIntentId is required to record a paid booking.' },
      { status: 400 },
    );
  }

  // Mirror the 15-min ladder / 30-min lead / no-double-book rules here
  // too — this endpoint bypasses the free-booking path so it needs its
  // own guard. Accepts ISO YYYY-MM-DD in body.date; falls back to today.
  const dateStr =
    body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : new Date().toISOString().slice(0, 10);
  // Reload consultations from Postgres so the no-double-book check
  // catches slots taken on a sibling Lambda since this Lambda hydrated.
  await Promise.all([reloadConsultations(), reloadBookings()]);
  const doctorBookings = getBookings().filter((b) => b.doctorId === body.doctorId);
  const slotErr = validateSlot({
    dateStr,
    slot: body.timeSlot,
    consultations: listConsultations({ doctorId: body.doctorId }),
    bookings: doctorBookings,
  });
  if (slotErr) {
    return NextResponse.json({ error: slotErr }, { status: 400 });
  }

  // Clinic lookup — if a clinicId is supplied verify it belongs to the
  // requested doctor (prevents tampering) and denormalize the address +
  // name into the booking row so the confirmation page and notifications
  // can render without an extra DB hit.
  let clinicFields: {
    clinicId?: string;
    clinicName?: string;
    clinicAddress?: string;
    paymentMode?: 'online' | 'clinic';
  } = {};
  let serverFee = body.fee;       // fallback — will be overwritten below
  if (body.clinicId) {
    const { clinicBelongsToDoctor, getClinicById, reloadClinics } = await import('@/lib/clinics-store');
    // Doctor may have registered this clinic on a sibling Lambda
    // moments before this booking arrived — without reload the
    // check spuriously rejects valid clinics.
    await reloadClinics();
    if (!clinicBelongsToDoctor(body.clinicId, body.doctorId)) {
      return NextResponse.json({ error: 'Invalid clinic for this doctor' }, { status: 400 });
    }
    const c = getClinicById(body.clinicId)!;
    clinicFields = {
      clinicId: c.id,
      clinicName: c.name,
      clinicAddress: [c.addressLine1, c.addressLine2, c.city, c.state, c.postalCode].filter(Boolean).join(', '),
      paymentMode: body.paymentMode || 'clinic',
    };
    // Server-trusted fee: per-clinic override wins, else the doctor's
    // base fee. Never trust body.fee for the amount that hits the DB —
    // a malicious client could otherwise book at fee=1.
    const doc = getDoctorById(body.doctorId);
    serverFee = c.feeOverride ?? doc?.fee ?? 0;
  } else if (body.paymentMode) {
    clinicFields = { paymentMode: body.paymentMode };
    const doc = getDoctorById(body.doctorId);
    serverFee = doc?.fee ?? 0;
  } else {
    const doc = getDoctorById(body.doctorId);
    serverFee = doc?.fee ?? body.fee;
  }

  // Family-account threading. If the booker is signed in and has
  // an active dependent cookie set, stamp the dependentId + name on
  // the booking. The patient_name on the row stays whatever the
  // form submitted — the dependent name is just an annotation so
  // the doctor's dashboard can show "for Aarav (age 7)".
  let depMeta: { dependentId?: string; dependentName?: string } = {};
  try {
    const owner = body.patientEmail ? findUserByEmail(body.patientEmail) : undefined;
    if (owner) {
      const profile = await resolveActiveProfile(owner.id);
      if (profile.kind === "dependent") {
        depMeta = {
          dependentId: profile.dependentId,
          dependentName: profile.dependentName,
        };
      }
    }
  } catch {
    /* family-active cookie missing or invalid → fall through as self */
  }

  try {
    const booking = createBooking({
      doctorId: body.doctorId,
      doctorName: body.doctorName,
      patientName: body.patientName,
      patientPhone: body.patientPhone,
      timeSlot: body.timeSlot,
      fee: serverFee,
      // pay-at-clinic bookings stay 'pending' until reception collects.
      paymentStatus: body.paymentStatus || (clinicFields.paymentMode === 'clinic' ? 'pending' : 'paid'),
      paymentIntentId: body.paymentIntentId || '',
      patientEmail: body.patientEmail,
      date: body.date,
      appointmentType: clinicFields.clinicId ? 'in-person' : (body.appointmentType || 'in-person'),
      ...clinicFields,
      ...depMeta,
    });

    const doctorEmail =
      body.doctorEmail ||
      `${body.doctorName.toLowerCase().replace(/\s+/g, '.')}@odudoc.com`;
    const appointmentType = body.appointmentType || 'in-person';
    const appointmentDate = body.date || new Date().toLocaleDateString();

    // V6 §5.6 — fan out (audit log, doctor notif, V13 event, future
    // wallet-hold). Bus dispatches; this returns immediately.
    xcEmit("appointment.booked", {
      bookingId: booking.id,
      doctorId: body.doctorId,
      doctorName: body.doctorName,
      patientEmail: body.patientEmail,
      patientName: body.patientName,
      timeSlot: body.timeSlot,
      fee: serverFee,
    });

    notifyAppointmentBooked({
      patientName: body.patientName,
      patientEmail: body.patientEmail,
      patientPhone: body.patientPhone,
      doctorName: body.doctorName,
      doctorEmail,
      doctorPhone: body.doctorPhone,
      date: appointmentDate,
      time: body.timeSlot,
      type: clinicFields.clinicId ? 'in-person' : appointmentType,
      bookingId: booking.id,
      clinicName: clinicFields.clinicName,
      clinicAddress: clinicFields.clinicAddress,
      paymentMode: clinicFields.paymentMode,
    });

    // Best-effort WhatsApp alert to the assigned doctor. Looks up
    // the doctor's phone from users-store when not provided in the
    // request body; silently skips when no phone is on file.
    (async () => {
      try {
        const doctorPhone =
          body.doctorPhone ||
          (body.doctorId ? findUserById(body.doctorId)?.phone : undefined);
        if (!doctorPhone) return;
        const r = await sendDoctorNewAppointmentViaSentDm(doctorPhone, {
          doctorName: body.doctorName || "Doctor",
          patientName: body.patientName || "there",
          date: appointmentDate,
          time: body.timeSlot,
          chiefComplaint: "",
        });
        if (!r.ok) log.warn("bookings.doctor_new_appt_wa_template_failed", { error: r.error || "unknown" });
      } catch (err) {
        log.warn("bookings.doctor_new_appt_wa_template_threw", { error: err instanceof Error ? err.message : "send threw" });
      }
    })();

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error: unknown) {
    log.error('Failed to create booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
