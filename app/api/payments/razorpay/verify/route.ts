// POST /api/payments/razorpay/verify
//
// Called from the Razorpay checkout success handler. Verifies the
// HMAC-SHA256 signature Razorpay sent and — only on a clean match —
// marks the linked booking + consultation as paid.
//
// Body: {
//   razorpay_order_id, razorpay_payment_id, razorpay_signature,
//   bookingId (optional — used to update our own bookings store)
// }
//
// Returns { verified: true } on success, { verified: false, error }
// otherwise. Never reveals which check failed in detail (don't help
// brute-force attempts).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyRazorpaySignature, getRazorpayPayment } from "@/lib/razorpay";
import { updateBookingStatus, getBookingById, reloadBookings } from "@/lib/bookings-store";
import { markPaid as markConsultationPaid } from "@/lib/consultations-store";
import { parseJson } from "@/lib/api-validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const VerifySchema = z.object({
  razorpay_order_id: z.string().trim().min(1).max(128),
  razorpay_payment_id: z.string().trim().min(1).max(128),
  razorpay_signature: z.string().trim().min(1).max(256),
  bookingId: z.string().regex(/^BK-\d+$/).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, VerifySchema);
  if (!parsed.ok) return parsed.response;
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
    bookingId,
  } = parsed.data;

  const sigOk = verifyRazorpaySignature({ orderId, paymentId, signature });
  if (!sigOk) {
    log.warn("razorpay.verify.signature_mismatch", { orderId, paymentId, bookingId });
    return NextResponse.json(
      { verified: false, error: "Signature verification failed." },
      { status: 400 },
    );
  }

  // Defence in depth — re-fetch the payment from Razorpay and require
  // it to be captured. Without this a malicious caller could craft a
  // signature for an unfunded order (the HMAC just proves the IDs
  // weren't tampered with, not that money actually moved).
  try {
    const payment = await getRazorpayPayment(paymentId);
    const status = String(payment?.status || "");
    if (status !== "captured" && status !== "authorized") {
      log.warn("razorpay.verify.payment_not_captured", { paymentId, status });
      return NextResponse.json(
        { verified: false, error: "Payment not captured." },
        { status: 400 },
      );
    }
  } catch (err) {
    log.error("razorpay.verify.payment_fetch_failed", err, { paymentId });
    // If we can't talk to Razorpay, fail closed — don't grant access
    // on signature alone.
    return NextResponse.json(
      { verified: false, error: "Could not confirm payment with Razorpay." },
      { status: 502 },
    );
  }

  // Update our own records. Both helpers are idempotent — webhook firing
  // later with the same ids is a safe no-op.
  if (bookingId) {
    // Cross-Lambda freshness — the booking row may have been written on
    // a sibling Lambda moments ago; without reload we'd silently skip
    // the mark-paid step and the patient would see "pending" forever.
    await reloadBookings();
    const booking = getBookingById(bookingId);
    if (booking) {
      // bookings-store keys on paymentIntentId; we store the order id
      // there so a later webhook hop can find the same row.
      booking.paymentIntentId = orderId;
      updateBookingStatus(orderId, "paid");
    }
  }
  try {
    markConsultationPaid(orderId, paymentId);
  } catch {
    // markConsultationPaid throws when the consultation row isn't yet
    // persisted. That's fine — the consultation may be created right
    // after this call by the client (legacy ordering) and the next
    // status read will see the booking paid anyway.
  }

  return NextResponse.json({ verified: true, orderId, paymentId });
}
