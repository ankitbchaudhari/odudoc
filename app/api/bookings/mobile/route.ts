// /api/bookings/mobile
//
// Authenticated booking endpoints for the Android apps.
//
// POST — create a booking (patient identity is taken from the JWT, not from
// the request body, so clients can't book as someone else).
// GET  — list the caller's bookings (Upcoming / Past split happens client-
// side so the backend stays stateless about "now").

import { NextRequest, NextResponse } from "next/server";
import {
  createBooking,
  getBookings,
  getBookingsForUser,
  reloadBookings,
} from "@/lib/bookings-store";
import { listConsultations, reloadConsultations } from "@/lib/consultations-store";
import { validateSlot } from "@/lib/slot-utils";
import { getDoctorById } from "@/lib/doctors-store";
import { findUserByEmail, reloadUsers } from "@/lib/users-store";
import { resolveActiveProfile } from "@/lib/family-active";
import { notifyAppointmentBooked } from "@/lib/notifications";
import { requireMobileUser } from "@/lib/mobile-auth";
import { applySpend, reloadWallet } from "@/lib/wallet/store";
import { sendToUser, sendToEmail } from "@/lib/fcm";
import { sendPush } from "@/lib/push";
import { parseJson, z } from "@/lib/validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const MobileBookingSchema = z.object({
  doctorId: z.string().trim().min(1).max(64),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  timeSlot: z.string().trim().regex(/^\d{2}:\d{2}$/, "timeSlot must be HH:MM"),
  appointmentType: z.enum(["video", "in-person"]).optional(),
  paymentIntentId: z.string().trim().max(128).optional(),
  paymentStatus: z.enum(["paid", "pending"]).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;

  // Doctors shouldn't be booking themselves from the patient app.
  if (auth.role !== "patient") {
    return NextResponse.json(
      { error: "wrong_role", message: "Only patients can book consultations." },
      { status: 403 }
    );
  }

  const parsed = await parseJson(request, MobileBookingSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed;

  try {
    await reloadUsers();
    const patient = findUserByEmail(auth.email);
    if (!patient) {
      return NextResponse.json({ error: "patient_not_found" }, { status: 404 });
    }

    const doctor = getDoctorById(body.doctorId);
    if (!doctor) {
      return NextResponse.json({ error: "doctor_not_found" }, { status: 404 });
    }

    await Promise.all([reloadConsultations(), reloadBookings()]);
    const slotErr = validateSlot({
      dateStr: body.date,
      slot: body.timeSlot,
      consultations: listConsultations({ doctorId: doctor.id }),
      bookings: getBookings().filter((b) => b.doctorId === doctor.id),
    });
    if (slotErr) {
      return NextResponse.json({ error: "slot_invalid", message: slotErr }, { status: 400 });
    }

    // Family-account threading — owner may be booking on behalf of
    // a dependent (kid / parent / spouse). The active-profile cookie
    // is set on the mobile WebView session the same way it is on web,
    // so the same resolver works.
    let depMeta: { dependentId?: string; dependentName?: string } = {};
    try {
      const profile = await resolveActiveProfile(patient.id);
      if (profile.kind === "dependent") {
        depMeta = {
          dependentId: profile.dependentId,
          dependentName: profile.dependentName,
        };
      }
    } catch {
      /* missing/invalid cookie → fall through as self */
    }

    // ── Payment gate ────────────────────────────────────────────────
    // The mobile app didn't have a real payment step until now — it
    // POSTed paymentStatus:"pending" with no paymentIntentId and the
    // server happily created a free booking. Revenue leak.
    //
    // New rules, in priority order:
    //   1. Free consultations (doctor.fee === 0): allow as-is.
    //   2. Client says paymentStatus="paid" + paymentIntentId set:
    //      trust it (came from a completed Razorpay/Cashfree flow).
    //   3. Wallet covers the fee: debit the wallet here, mark paid.
    //   4. Otherwise: reject with 402 Payment Required + tell the
    //      client to top up + retry, OR pass a paid paymentIntentId.
    //
    // Until react-native-razorpay is wired into the patient app, path
    // 3 is the primary success path — patients pay once into the
    // wallet (which DOES have a working Razorpay flow), then bookings
    // are debited from the wallet balance.
    const totalFeeRupees = Math.floor(doctor.fee ?? 0);
    let paymentStatus: "paid" | "pending" = "pending";
    let paymentIntentId = "";

    if (totalFeeRupees === 0) {
      paymentStatus = "paid";
      paymentIntentId = "free";
    } else if (body.paymentStatus === "paid" && body.paymentIntentId) {
      paymentStatus = "paid";
      paymentIntentId = body.paymentIntentId;
    } else {
      // Try wallet debit. reloadWallet covers the cold-Lambda race
      // where the wallet cache hasn't been hydrated yet.
      await reloadWallet();
      const r = applySpend({
        userId: patient.id,
        amountRupees: totalFeeRupees,
        category: "consultation",
        reference: `booking:${doctor.id}:${body.date}:${body.timeSlot}`,
        note: `Consultation with ${doctor.name}`,
      });
      if (r.ok && r.tx) {
        paymentStatus = "paid";
        paymentIntentId = `wallet:${r.tx.id}`;
      } else {
        // Booking blocked: not paid, no payment intent, wallet short.
        log.warn("mobile-booking.payment_required", {
          userId: patient.id,
          fee: totalFeeRupees,
          shortfall: r.shortfallRupees,
        });
        return NextResponse.json(
          {
            error: "payment_required",
            message:
              r.error === "insufficient_funds"
                ? `Your wallet has ₹${(totalFeeRupees - (r.shortfallRupees || 0)).toLocaleString("en-IN")}, but the consult costs ₹${totalFeeRupees.toLocaleString("en-IN")}. Top up the difference, then try booking again.`
                : "Payment couldn't be completed. Top up your wallet, then try again.",
            shortfallRupees: r.shortfallRupees,
            feeRupees: totalFeeRupees,
          },
          { status: 402 },
        );
      }
    }

    const booking = createBooking({
      doctorId: doctor.id,
      doctorName: doctor.name,
      patientName: patient.name,
      patientPhone: patient.phone,
      ...depMeta,
      timeSlot: body.timeSlot,
      fee: totalFeeRupees,
      paymentStatus,
      paymentIntentId,
      // Mobile-only fields — let the My Consultations screen find this
      // booking and decide upcoming/past from `date`.
      patientUserId: patient.id,
      patientEmail: patient.email,
      date: body.date,
      appointmentType: body.appointmentType || "video",
      status: "scheduled",
    });

    // Email notifications — same helper the web flow uses. Non-fatal.
    try {
      notifyAppointmentBooked({
        patientName: patient.name,
        patientEmail: patient.email,
        patientPhone: patient.phone,
        doctorName: doctor.name,
        doctorEmail: doctor.email,
        doctorPhone: doctor.phone,
        date: body.date,
        time: body.timeSlot,
        type: body.appointmentType || "video",
      });
    } catch (err) {
      log.error("mobile-booking notify threw", err);
    }

    // FCM push (legacy native tokens) — kept for any user with a raw
    // FCM token registered via the older device-tokens-store. Expo
    // push tokens go through sendPush() below; the two coexist so we
    // never miss a device.
    void sendToUser(patient.id, {
      title: "Appointment booked",
      body: `${doctor.name} on ${body.date} at ${body.timeSlot}`,
      deepLink: `consult/${booking.id}`,
      channel: "appointments",
    });
    if (doctor.email) {
      void sendToEmail(doctor.email, {
        title: "New appointment",
        body: `${patient.name} on ${body.date} at ${body.timeSlot}`,
        deepLink: `consult/${booking.id}`,
        channel: "appointments",
      });
    }

    // Expo push (mobile apps registered via /api/mobile/push/register).
    void sendPush({
      toEmail: patient.email,
      app: "patient",
      title: "Appointment booked",
      body: `${doctor.name} on ${body.date} at ${body.timeSlot}`,
      data: { type: "booking", bookingId: booking.id },
    }).catch((err) => log.warn("mobile-booking.patient_push_failed", { err: String(err) }));
    if (doctor.email) {
      void sendPush({
        toEmail: doctor.email,
        app: "doctor",
        title: "New booking",
        body: `${patient.name} on ${body.date} at ${body.timeSlot}`,
        data: { type: "booking", bookingId: booking.id },
      }).catch((err) => log.warn("mobile-booking.doctor_push_failed", { err: String(err) }));
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    log.error("mobile-booking error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "patient") {
    return NextResponse.json(
      { error: "wrong_role", message: "This endpoint is for patients." },
      { status: 403 }
    );
  }

  try {
    await reloadBookings();
    const bookings = getBookingsForUser(auth.userId, auth.email);
    return NextResponse.json({ bookings });
  } catch (err) {
    log.error("mobile-booking list error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
