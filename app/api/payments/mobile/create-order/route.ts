// POST /api/payments/mobile/create-order
//
// Creates a Stripe PaymentIntent for an existing mobile booking and
// returns the data the Android Stripe PaymentSheet needs to launch:
//
//   { publishableKey, clientSecret, paymentIntentId, amount, currency }
//
// PaymentSheet is Stripe's drop-in native UI. The app calls this endpoint,
// hands the client secret to PaymentSheet, and — on success — calls
// /api/payments/mobile/verify so the server can flip the booking's
// paymentStatus to "paid" without trusting the client.
//
// We use Stripe rather than PayU for mobile v1 because PayU is hosted
// checkout (WebView only) and PaymentSheet gives a proper native flow.
// The web still uses every other gateway — this is additive, not a
// replacement.

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  getBookingById,
  setBookingPayment,
} from "@/lib/bookings-store";
import { findUserByEmail, reloadUsers } from "@/lib/users-store";
import { requireMobileUser } from "@/lib/mobile-auth";
import { paymentsDisabled } from "@/lib/payments-config";
import { parseJson, z } from "@/lib/validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

// OduDoc is India-first so default to INR. Override per deployment via env
// (e.g. for USD Stripe accounts that don't support INR). Accepted ISO
// currency codes only.
const CURRENCY = (process.env.MOBILE_PAYMENT_CURRENCY || "inr").toLowerCase();

const Schema = z.object({
  bookingId: z.string().trim().min(1).max(64),
});

export async function POST(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "patient") {
    return NextResponse.json(
      { error: "wrong_role", message: "Only patients can pay for consultations." },
      { status: 403 }
    );
  }

  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const { bookingId } = parsed;

  if (!process.env.STRIPE_SECRET_KEY || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return NextResponse.json(
      { error: "stripe_not_configured", message: "Payments are unavailable. Contact support." },
      { status: 503 }
    );
  }

  try {
    const booking = getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
    }
    if (booking.patientUserId !== auth.userId) {
      return NextResponse.json(
        { error: "not_owner", message: "This booking belongs to another user." },
        { status: 403 }
      );
    }
    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "booking_cancelled", message: "Cannot pay for a cancelled booking." },
        { status: 400 }
      );
    }
    if (booking.paymentStatus === "paid") {
      return NextResponse.json(
        { error: "already_paid", message: "This booking is already paid." },
        { status: 409 }
      );
    }
    if (!booking.fee || booking.fee <= 0) {
      return NextResponse.json(
        { error: "invalid_fee", message: "This booking has no fee to charge." },
        { status: 400 }
      );
    }

    // Free-consultation window — skip Stripe entirely, mark paid, return a
    // sentinel client secret the app treats as "go straight to confirmed".
    if (paymentsDisabled()) {
      setBookingPayment(booking.id, { paymentStatus: "paid" });
      return NextResponse.json({
        freeConsultation: true,
        publishableKey: "",
        clientSecret: "",
        paymentIntentId: "",
        amount: 0,
        currency: CURRENCY,
      });
    }

    await reloadUsers();
    const patient = findUserByEmail(auth.email);

    // Stripe wants the smallest currency unit (paise for INR, cents for USD).
    const amountMinor = Math.round(booking.fee * 100);

    const intent = await stripe.paymentIntents.create({
      amount: amountMinor,
      currency: CURRENCY,
      description: `Consult ${booking.doctorName}`,
      receipt_email: patient?.email,
      metadata: {
        bookingId: booking.id,
        doctorId: booking.doctorId,
        patientUserId: auth.userId,
        timeSlot: booking.timeSlot,
        date: booking.date || "",
      },
      automatic_payment_methods: { enabled: true },
    });

    setBookingPayment(booking.id, {
      paymentIntentId: intent.id,
      paymentStatus: "pending",
    });

    return NextResponse.json({
      freeConsultation: false,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: amountMinor,
      currency: CURRENCY,
    });
  } catch (err) {
    log.error("mobile-payment create-order error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
