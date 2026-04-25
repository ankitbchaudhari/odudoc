// POST /api/payments/mobile/verify
//
// Client calls this after Stripe PaymentSheet reports success. We re-fetch
// the PaymentIntent from Stripe (can't trust the client), confirm it
// belongs to the caller's booking, and flip paymentStatus to "paid" on
// success. A webhook would be more robust — add one later; for v1 this
// client-triggered verify is simpler and good enough.

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getBookingById, setBookingPayment } from "@/lib/bookings-store";
import { requireMobileUser } from "@/lib/mobile-auth";
import { parseJson, z } from "@/lib/validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const Schema = z.object({
  bookingId: z.string().trim().min(1).max(64),
  paymentIntentId: z.string().trim().min(1).max(128),
});

export async function POST(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "patient") {
    return NextResponse.json({ error: "wrong_role" }, { status: 403 });
  }

  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const { bookingId, paymentIntentId } = parsed;

  try {
    const booking = getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
    }
    if (booking.patientUserId !== auth.userId) {
      return NextResponse.json({ error: "not_owner" }, { status: 403 });
    }
    if (booking.paymentIntentId !== paymentIntentId) {
      return NextResponse.json(
        { error: "intent_mismatch", message: "This payment intent doesn't belong to this booking." },
        { status: 400 }
      );
    }

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Sanity check: the intent metadata must still point at our booking —
    // blocks a replay where a client tries to reuse someone else's paid
    // intent id.
    if (intent.metadata?.bookingId !== booking.id) {
      return NextResponse.json(
        { error: "intent_metadata_mismatch" },
        { status: 400 }
      );
    }

    if (intent.status === "succeeded") {
      const updated = setBookingPayment(booking.id, { paymentStatus: "paid" });
      return NextResponse.json({ booking: updated, intentStatus: intent.status });
    }

    // Requires further action (3DS, pending bank confirmation). Leave
    // booking as-is; the client should retry or fall back to the hosted
    // next_action flow.
    return NextResponse.json(
      { booking, intentStatus: intent.status, message: "Payment not yet confirmed." },
      { status: 202 }
    );
  } catch (err) {
    log.error("mobile-payment verify error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
