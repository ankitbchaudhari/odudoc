// Create a Cashfree order to fund a wallet top-up.
//
// Flow:
//   1. Patient clicks "Add money ₹500" → POST here
//   2. We mint a Cashfree order with order_tags.type=wallet_topup
//      so the existing /api/payments/cashfree/webhook handler can
//      route the SUCCESS event to applyTopUp() on the wallet store.
//   3. Client receives paymentSessionId → launches Cashfree SDK.
//
// Falls back to direct credit when Cashfree env isn't configured
// (sandbox / dev) so the demo still flows end-to-end.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById } from "@/lib/users-store";
import { createCheckoutSession, isCashfreeConfigured } from "@/lib/cashfree";
import { applyTopUp, getWallet } from "@/lib/wallet/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const user = findUserById(userId);
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  const body = await req.json();
  const amount = Math.floor(Number(body.amountRupees));
  if (!Number.isFinite(amount) || amount < 100 || amount > 50000) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  // Sandbox path — when Cashfree creds are missing, credit the wallet
  // directly so the demo still works.
  if (!isCashfreeConfigured()) {
    const r = applyTopUp({
      userId, amountRupees: amount,
      note: "sandbox top-up (Cashfree not configured)",
    });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({
      mode: "sandbox",
      wallet: r.wallet,
      topup: r.topup,
      bonus: r.bonus,
    });
  }

  // Real Cashfree path — create order with wallet_topup tag.
  const orderId = `wt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const origin = `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("x-forwarded-host") || req.headers.get("host")}`;
  try {
    const order = await createCheckoutSession({
      orderId,
      amount,
      currency: "INR",
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: user.phone || "+910000000000",
      customerId: userId,
      description: `OduDoc Wallet top-up ₹${amount}`,
      returnUrl: `${origin}/dashboard/wallet?topup=${orderId}`,
      notifyUrl: `${origin}/api/payments/cashfree/webhook`,
      metadata: {
        type: "wallet_topup",
        userId,
        amount: String(amount),
      },
    });
    return NextResponse.json({
      mode: "live",
      orderId,
      paymentSessionId: order.paymentSessionId,
      paymentLink: order.paymentLink,
      cfOrderId: order.cfOrderId,
      wallet: getWallet(userId),
    });
  } catch (err) {
    const msg = (err as Error).message || "";
    // Cashfree returns "Cashfree create order 401" when the App ID +
    // Secret don't match the configured CASHFREE_ENV. Most common
    // mistake: SANDBOX keys deployed without setting CASHFREE_ENV
    // (which defaults to PROD). Surface that hint so ops can fix
    // env without grepping logs.
    if (msg.includes("401") || /authentication.?failed|invalid.?credential/i.test(msg)) {
      const env = (process.env.CASHFREE_ENV || "PROD").toUpperCase();
      return NextResponse.json({
        error: "payment_gateway_auth_failed",
        message: "Payment gateway rejected our credentials. Please try again in a few minutes — our team has been notified.",
        diagnostic: `Cashfree returned 401 against ${env} endpoint. If your CASHFREE_APP_ID is a SANDBOX key, set CASHFREE_ENV=SANDBOX (or swap to PROD keys).`,
      }, { status: 502 });
    }
    return NextResponse.json({ error: "payment_gateway_error", message: msg }, { status: 500 });
  }
}
