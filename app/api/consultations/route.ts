import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createConsultation,
  listConsultations,
  markPaid,
  reloadConsultations,
  type MedicalHistory,
} from "@/lib/consultations-store";
import { getBookings, reloadBookings } from "@/lib/bookings-store";
import { sendPatientBookingReceived, sendDoctorNewRequest } from "@/lib/consultation-emails";
import { paymentsDisabled } from "@/lib/payments-config";
import { validateSlot } from "@/lib/slot-utils";
import { findDoctorByEmail, getDoctorById } from "@/lib/doctors-store";
import { findUserByEmail } from "@/lib/users-store";
import { resolveActiveProfile } from "@/lib/family-active";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { checkConsultationEligibility } from "@/lib/consultation-eligibility";

import { log } from "@/lib/log";
export const runtime = "nodejs";

function emptyMedicalHistory(): MedicalHistory {
  return {
    chiefComplaint: "",
    symptoms: "",
    duration: "",
    severity: "",
    allergies: "",
    currentMedications: "",
    pastConditions: "",
    surgeries: "",
    familyHistory: "",
    smoker: "",
    alcohol: "",
    pregnant: "",
    additional: "",
  };
}

// ---------- GET — scoped list ----------
// Admins see everything, doctors see consults assigned to them, patients see
// their own. Optional ?status= filters inside that scope.

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; name?: string; role?: string } | undefined;
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;

  // Cross-Lambda freshness — booking written on a sibling Lambda
  // must surface in the next read for doctors and patients alike.
  await reloadConsultations();

  let list;
  if (user.role === "admin") {
    list = listConsultations({ status: status as never });
  } else if (user.role === "doctor") {
    // Match on email first (strict), then fall back to name match so demo
    // doctors like "Dr. Sarah Johnson" (logged in as doctor@odudoc.com) still
    // see consultations created from the public /doctors directory, where
    // the static data.ts doctor profiles don't carry emails.
    const byEmail = listConsultations({ doctorEmail: user.email, status: status as never });
    const byName = user.name
      ? listConsultations({ status: status as never }).filter(
          (c) => c.doctorName.toLowerCase() === user.name!.toLowerCase()
        )
      : [];

    // Fan-out: also include unclaimed consultations whose specialty
    // matches this doctor's. Any doctor in that specialty can accept.
    // The dashboard shows these under "Open requests" and a click on
    // Accept hits the claim endpoint for the atomic grab.
    const doc = findDoctorByEmail(user.email);
    const pool = doc?.specialty
      ? listConsultations({ unclaimedSpecialty: doc.specialty })
      : [];

    const seen = new Set<string>();
    list = [...byEmail, ...byName, ...pool].filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  } else {
    list = listConsultations({ patientEmail: user.email, status: status as never });
  }
  return NextResponse.json({ consultations: list });
}

// ---------- POST — patient creates a consultation ----------

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; name?: string } | undefined;
  const body = await req.json().catch(() => ({}));

  const patientEmail = (typeof body.patientEmail === "string" && body.patientEmail) || user?.email || "";
  const patientName = (typeof body.patientName === "string" && body.patientName) || user?.name || "";
  if (!patientEmail || !patientName) {
    return NextResponse.json({ error: "patientEmail and patientName required" }, { status: 400 });
  }
  // Fan-out ("any available doctor in this specialty") requests arrive
  // with doctorId === "" + a specialty set. Normal requests carry a
  // specific doctorId/doctorName. Validate both paths.
  const isPool = !body.doctorId && typeof body.specialty === "string" && body.specialty.trim().length > 0;
  if (!isPool) {
    if (!body.doctorId || !body.doctorName || !body.specialty || !body.scheduledFor || !body.timeSlot) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
  } else {
    if (!body.specialty || !body.scheduledFor || !body.timeSlot) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
  }

  // Cross-border eligibility — Indian-licensed doctors are
  // restricted to Indian patients per the IMC telemedicine
  // guidelines. We hard-gate at booking time so a direct-link
  // bypass (e.g. someone shares a doctor's profile URL with a
  // non-Indian friend) can't slip through. Pool bookings have no
  // doctor yet, so this only applies to specific-doctor flows.
  if (!isPool && body.doctorId) {
    const doctor = getDoctorById(String(body.doctorId));
    if (doctor) {
      const patientUser = findUserByEmail(patientEmail);
      const eligibility = checkConsultationEligibility({
        doctorCountry: doctor.country,
        patientCountry: patientUser?.country,
        patientPhone:
          (typeof body.patientPhone === "string" && body.patientPhone) ||
          patientUser?.phone,
      });
      if (!eligibility.allowed) {
        return NextResponse.json(
          { error: eligibility.reason, code: "ELIGIBILITY_BLOCKED" },
          { status: 403 },
        );
      }
    }
  }

  // Enforce 15-min ladder + 30-min lead + no double booking. For
  // specific-doctor bookings we also reject collisions with that
  // doctor's existing consultations. Pool bookings skip the
  // doctor-collision check (no doctor yet) but still get ladder + lead.
  const dateStr = String(body.scheduledFor).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    await Promise.all([reloadConsultations(), reloadBookings()]);
    const err = validateSlot({
      dateStr,
      slot: String(body.timeSlot),
      consultations: isPool ? [] : listConsultations({ doctorId: String(body.doctorId) }),
      bookings: isPool ? [] : getBookings().filter((b) => b.doctorId === String(body.doctorId)),
    });
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  const mhIn = (body.medicalHistory || {}) as Partial<MedicalHistory>;
  const mh: MedicalHistory = { ...emptyMedicalHistory(), ...mhIn };

  // Kill switch: while payments are disabled, ignore fee + treat as paid.
  const freePeriod = paymentsDisabled();
  const effectiveFee = freePeriod ? 0 : (typeof body.fee === "number" ? body.fee : 25);
  const effectivePaymentIntent = freePeriod
    ? `free_${Date.now()}`
    : (typeof body.paymentIntentId === "string" ? body.paymentIntentId : "");

  // Family-account threading. If the booker has an active dependent
  // profile cookie set, stamp dependentId + name on the consultation
  // row so the doctor's dashboard / patient summary renders the
  // right person (kid / parent), not the account holder.
  let depMeta: { dependentId?: string; dependentName?: string } = {};
  try {
    const owner = findUserByEmail(patientEmail);
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
    /* missing/invalid cookie → fall through as self */
  }

  const c = createConsultation({
    patientEmail,
    patientName,
    patientPhone: typeof body.patientPhone === "string" ? body.patientPhone : "",
    ...depMeta,
    // Pool bookings keep doctorId empty until a doctor clicks Accept.
    // createConsultation() already tolerates "" (it just skips the
    // email-lookup path when doctorId is blank).
    doctorId: isPool ? "" : String(body.doctorId),
    doctorName: isPool ? "" : String(body.doctorName),
    doctorEmail: isPool ? undefined : (typeof body.doctorEmail === "string" ? body.doctorEmail : undefined),
    specialty: body.specialty,
    scheduledFor: body.scheduledFor,
    timeSlot: body.timeSlot,
    dateLabel: typeof body.dateLabel === "string" ? body.dateLabel : new Date(body.scheduledFor).toDateString(),
    mode: body.mode === "chat" ? "chat" : "video",
    fee: effectiveFee,
    currency: typeof body.currency === "string" ? body.currency : "USD",
    paymentProvider: freePeriod ? "manual" : (body.paymentProvider === "induspays" ? "induspays" : body.paymentProvider === "manual" ? "manual" : "stripe"),
    paymentIntentId: effectivePaymentIntent,
    medicalHistory: mh,
  });

  // Confirm the booking actually persisted before responding. A
  // dropped consultation is the worst possible failure here — the
  // patient pays and gets a confirmation page but no doctor sees the
  // booking on their dashboard.
  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("consultations.persist_failed", err, {
      consultationId: c.id,
      patientEmail,
    });
    return NextResponse.json(
      {
        error:
          "Booking service is temporarily unavailable. If you were charged, no consultation was created — please contact support.",
      },
      { status: 503 },
    );
  }

  // If the client already confirmed payment (demo flow without a real
  // gateway round-trip), flip to awaiting_doctor and fire emails now.
  // Free period auto-confirms every booking.
  if (freePeriod || body.paymentStatus === "paid") {
    markPaid(c.id, c.paymentIntentId);
    // Pool bookings have no doctor email yet — skip the doctor notice
    // (fan-out surfaces on every matching doctor's dashboard via the
    // GET route instead). Still email the patient a receipt.
    if (isPool) {
      sendPatientBookingReceived(c).catch(console.error);
    } else {
      Promise.all([sendPatientBookingReceived(c), sendDoctorNewRequest(c)]).catch(console.error);
    }
  }

  return NextResponse.json({ consultation: c }, { status: 201 });
}
