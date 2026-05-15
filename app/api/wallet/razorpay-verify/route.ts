// POST /api/wallet/razorpay-verify
//
// Verifies a Razorpay payment that was created as a wallet top-up,
// then credits the user's wallet. Idempotent — applyTopUp keys on
// the provider id (razorpay_payment_id) so re-firing this endpoint
// is a no-op.
//
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Returns: { credited: true, wallet, bonus } on success.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyRazorpaySignature, getRazorpayPayment } from "@/lib/razorpay";
import { applyTopUp, reloadWallet } from "@/lib/wallet/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { parseJson } from "@/lib/api-validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const VerifySchema = z.object({
  razorpay_order_id: z.string().trim().min(1).max(128),
  razorpay_payment_id: z.string().trim().min(1).max(128),
  razorpay_signature: z.string().trim().min(1).max(256),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, VerifySchema);
  if (!parsed.ok) return parsed.response;
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = parsed.data;

  // 1. HMAC verification first — the cheapest gate. A bad signature
  //    means the IDs were tampered with; reject before doing any
  //    expensive Razorpay API call.
  if (!verifyRazorpaySignature({ orderId, paymentId, signature })) {
    log.warn("wallet.razorpay_verify.signature_mismatch", { orderId, paymentId });
    return NextResponse.json({ credited: false, error: "Signature verification failed." }, { status: 400 });
  }

  // 2. Re-fetch the payment from Razorpay. The signature proves the
  //    IDs are authentic but not that money actually moved — paranoia
  //    that matches /api/payments/razorpay/verify.
  let payment: Record<string, unknown>;
  try {
    payment = await getRazorpayPayment(paymentId);
  } catch (err) {
    log.error("wallet.razorpay_verify.fetch_failed", err, { paymentId });
    return NextResponse.json({ credited: false, error: "Could not confirm payment." }, { status: 502 });
  }

  const status = String(payment?.status || "");
  if (status !== "captured" && status !== "authorized") {
    log.warn("wallet.razorpay_verify.not_captured", { paymentId, status });
    return NextResponse.json({ credited: false, error: "Payment not captured." }, { status: 400 });
  }

  // 3. Read the notes we set at order-creation time. The wallet only
  //    credits when the order was explicitly tagged as a wallet topup
  //    and the userId + amount were stamped server-side then.
  //    Trusting client-supplied userId here would let any signed-in
  //    user credit any wallet they like.
  const notes = (payment.notes || {}) as Record<string, string>;
  if (notes.type !== "wallet_topup") {
    return NextResponse.json({ credited: false, error: "Order not tagged as wallet top-up." }, { status: 400 });
  }
  const userId = notes.userId;
  const amount = Number(notes.amount);
  if (!userId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ credited: false, error: "Order missing user / amount." }, { status: 400 });
  }

  // 4. Credit the wallet. applyTopUp is idempotent on providerSid so
  //    a duplicate call (e.g. user refreshes after success) is safe.
  //    Reload first so a sibling-Lambda credit for the same paymentId
  //    is visible — that's the idempotency check applyTopUp relies on.
  await reloadWallet();
  const r = applyTopUp({
    userId,
    amountRupees: Math.floor(amount),
    providerSid: paymentId,
    note: `Razorpay top-up · ${paymentId}`,
  });
  if (!r.ok) {
    return NextResponse.json({ credited: false, error: r.error }, { status: 400 });
  }
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }

  return NextResponse.json({
    credited: true,
    wallet: r.wallet,
    topup: r.topup,
    bonus: r.bonus,
  });
}
