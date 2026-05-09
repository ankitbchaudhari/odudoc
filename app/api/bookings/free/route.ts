import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createBooking } from "@/lib/bookings-store";
import {
  createConsultation,
  markPaid,
  listConsultations,
} from "@/lib/consultations-store";
import { validateSlot } from "@/lib/slot-utils";
import { paymentsDisabled } from "@/lib/payments-config";
import { consumeConsultToken } from "@/lib/consult-otp";
import { sendPatientBookingReceived, sendDoctorNewRequest } from "@/lib/consultation-emails";

import { log } from "@/lib/log";
export const runtime = "nodejs";

// Booking creation path used while payments are globally disabled.
// Mirrors the shape of /api/payments/create-intent's downstream result but
// skips Stripe entirely — the booking is recorded as paid with a synthetic
// intent id. It also creates a linked consultation so the booking appears
// in both the patient's /dashboard/consultations and the doctor's
// /dashboard/doctor/consultations dashboards.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  // Two valid paths into this endpoint:
  //   1. Global free-mode (paymentsDisabled() === true) — booking is
  //      created as paid because nobody is being charged.
  //   2. pendingPayment flag — patient is going through Cashfree (or
  //      another webhook-driven gateway). Booking lands as pending
  //      and the gateway webhook flips it to paid on confirmation.
  // Anything else 403s.
  const wantsPending = body?.pendingPayment === true;
  if (!paymentsDisabled() && !wantsPending) {
    return NextResponse.json(
      { error: "Free bookings are not enabled. Please complete payment." },
      { status: 403 }
    );
  }
  const {
    doctorId = "",
    doctorName = "",
    patientName = "",
    patientPhone = "",
    timeSlot = "",
    fee = 0,
    specialty = "",
    date = "",
    consultToken = "",
  } = body as Record<string, string | number>;

  // Verified-identity path: if the client has a consult token from the OTP
  // step, consume it (single-use) and use the server-trusted name + phone.
  // This ensures the doctor's dashboard shows the real verified caller.
  const tokenStr = String(consultToken || "").trim();
  if (!tokenStr) {
    return NextResponse.json(
      { error: "Phone verification required. Please verify your number and try again." },
      { status: 401 },
    );
  }
  const verified = consumeConsultToken(tokenStr);
  if (!verified) {
    return NextResponse.json(
      { error: "Verification expired. Please request a new code." },
      { status: 401 },
    );
  }
  const name = `${verified.firstName} ${verified.lastName}`.trim() || String(patientName).trim();
  const phone = verified.phone || String(patientPhone).trim();

  if (name.length < 3) {
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  }
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 7) {
    return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
  }
  if (!doctorId || !doctorName || !timeSlot) {
    return NextResponse.json({ error: "Missing booking details." }, { status: 400 });
  }

  const feeNum = Number(fee) || 0;

  // Resolve scheduled date — accept ISO date (YYYY-MM-DD) from client, clamp
  // to the 15-day booking window, and refuse past dates.
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const maxDate = new Date(todayMidnight);
  maxDate.setDate(maxDate.getDate() + 15);

  let scheduledDate = new Date();
  if (date && typeof date === "string") {
    const parsed = new Date(`${date}T00:00:00`);
    if (!isNaN(parsed.getTime())) scheduledDate = parsed;
  }
  if (scheduledDate < todayMidnight) {
    return NextResponse.json({ error: "Cannot book a date in the past." }, { status: 400 });
  }
  if (scheduledDate > maxDate) {
    return NextResponse.json({ error: "Appointments can only be booked up to 15 days in advance." }, { status: 400 });
  }

  // Enforce the 15-min ladder + 30-min lead + no-double-booking rules
  // server-side. Any slot that's not on the ladder — or that a sibling
  // request just claimed — is rejected here even if the client still
  // rendered it. Keeps the slot-utils helper as the sole source of
  // truth, so inspecting the DOM + replaying the POST can't slip past.
  const dateStr = `${scheduledDate.getFullYear()}-${String(scheduledDate.getMonth() + 1).padStart(2, "0")}-${String(scheduledDate.getDate()).padStart(2, "0")}`;
  const slotErr = validateSlot({
    dateStr,
    slot: String(timeSlot),
    consultations: listConsultations({ doctorId: String(doctorId) }),
  });
  if (slotErr) {
    return NextResponse.json({ error: slotErr }, { status: 400 });
  }

  // pendingPayment = true → patient is going through Cashfree (or a
  // similar gateway that confirms via webhook). Booking is created in
  // pending state and the webhook flips it to paid on confirmation.
  const pendingPayment = body?.pendingPayment === true;

  // 1. Legacy booking record (admin / earnings views).
  const booking = createBooking({
    doctorId: String(doctorId),
    doctorName: String(doctorName),
    patientName: name,
    patientPhone: phone,
    timeSlot: String(timeSlot),
    fee: feeNum,
    paymentStatus: pendingPayment ? "pending" : "paid",
    paymentIntentId: pendingPayment ? "" : `free_${Date.now()}`,
  });

  // 2. Consultation record so it shows in the new dashboards.
  //    Use the logged-in patient's email when available; fall back to a
  //    deterministic placeholder (based on name + phone) so the record still
  //    lands somewhere consistent.
  const session = await getServerSession(authOptions);
  const sessionUser = (session?.user as { email?: string } | undefined) || {};
  const patientEmail =
    sessionUser.email ||
    `${name.toLowerCase().replace(/\s+/g, ".")}+${phoneDigits.slice(-4)}@guest.odudoc.com`;

  const consultation = createConsultation({
    patientEmail,
    patientName: name,
    patientPhone: phone,
    doctorId: String(doctorId),
    doctorName: String(doctorName),
    specialty: String(specialty || "General"),
    scheduledFor: scheduledDate.toISOString(),
    dateLabel: scheduledDate.toDateString(),
    timeSlot: String(timeSlot),
    mode: "video",
    fee: 0,
    currency: "USD",
    paymentProvider: "manual",
    paymentIntentId: booking.paymentIntentId,
    medicalHistory: {
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
      pregnant: "na",
      additional: `Booked from doctor profile page during free promotion. Legacy booking ID: ${booking.id}`,
    },
  });
  // Only mark paid for the genuine free-promotion path. When
  // pendingPayment is set, payment confirmation happens via the
  // Cashfree webhook (or the verify-on-return path) — we leave the
  // consultation in its initial unpaid state until then.
  if (!pendingPayment) {
    markPaid(consultation.id, booking.paymentIntentId);
  }

  // Fire-and-forget notifications.
  Promise.all([
    sendPatientBookingReceived(consultation),
    sendDoctorNewRequest(consultation),
  ]).catch((err) => log.error("bookings.free.emails_failed", err));

  return NextResponse.json({ booking, consultation });
}
