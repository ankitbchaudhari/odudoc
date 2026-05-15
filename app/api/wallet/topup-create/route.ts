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
import { createStripeWalletCheckout, isStripeConfigured } from "@/lib/stripe-wallet";
import { createRazorpayOrder, isRazorpayConfigured, razorpayPublicKey } from "@/lib/razorpay";
import { applyTopUp, getWallet } from "@/lib/wallet/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Pick the gateway based on the patient's country. India → Cashfree
 *  (UPI/RuPay first-class). Everywhere else → Stripe (global cards +
 *  Apple Pay / Google Pay).
 *
 *  Fallback: if the "natural" gateway isn't configured but the OTHER
 *  one is, use the configured one. Avoids dropping to sandbox just
 *  because the user's country routes to a gateway that hasn't been
 *  set up yet (common during initial rollout when only one of the
 *  two has been wired). The sandbox path remains as the last resort
 *  when NEITHER gateway is configured. */
type Gateway = "cashfree" | "stripe" | "razorpay";

function pickGateway(country: string | null | undefined): Gateway {
  const c = (country || "IN").toUpperCase();
  // For Indian users prefer Razorpay > Cashfree > Stripe (Razorpay is
  // primary merchant per Account & Settings; Cashfree is the backup
  // domestic gateway). For everywhere else Stripe stays default.
  if (c === "IN") {
    if (isRazorpayConfigured()) return "razorpay";
    if (isCashfreeConfigured()) return "cashfree";
    if (isStripeConfigured()) return "stripe";
    return "razorpay"; // sandbox fallback target
  }
  if (isStripeConfigured()) return "stripe";
  if (isRazorpayConfigured()) return "razorpay";
  if (isCashfreeConfigured()) return "cashfree";
  return "stripe";
}

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

  // Gateway selection priority:
  //   1. Explicit user choice from the client (body.gateway).
  //   2. Country-based natural pick (IN → Cashfree, else → Stripe).
  //   3. Fall back to whichever gateway is configured.
  // Honors the user's choice as long as that gateway is actually
  // configured. If they pick "stripe" but Stripe isn't wired up,
  // we transparently fall through to Cashfree (and vice versa).
  const clientChoice =
    body.gateway === "cashfree" || body.gateway === "stripe" || body.gateway === "razorpay"
      ? (body.gateway as Gateway)
      : null;
  let gateway: Gateway;
  if (clientChoice) {
    if (clientChoice === "cashfree" && isCashfreeConfigured()) gateway = "cashfree";
    else if (clientChoice === "stripe" && isStripeConfigured()) gateway = "stripe";
    else if (clientChoice === "razorpay" && isRazorpayConfigured()) gateway = "razorpay";
    else gateway = pickGateway(user.country); // requested gateway not configured — use fallback chain
  } else {
    gateway = pickGateway(user.country);
  }
  const orderId = `wt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const origin = `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("x-forwarded-host") || req.headers.get("host")}`;

  // Sandbox path — when the chosen gateway's keys are missing,
  // credit the wallet directly so the demo still works.
  const gatewayConfigured =
    gateway === "cashfree" ? isCashfreeConfigured()
    : gateway === "razorpay" ? isRazorpayConfigured()
    : isStripeConfigured();
  if (!gatewayConfigured) {
    // Diagnostic — echo back which env vars the runtime can see so
    // operators can tell "env vars set in Vercel but not in Lambda"
    // apart from "env vars genuinely missing". Booleans only — never
    // echo the values themselves.
    const diag = {
      pickedGateway: gateway,
      userCountry: user.country || "(unset → defaults to IN)",
      cashfreeAppIdPresent: !!process.env.CASHFREE_APP_ID,
      cashfreeSecretPresent: !!process.env.CASHFREE_SECRET_KEY,
      cashfreeEnv: process.env.CASHFREE_ENV || "(unset)",
      stripeSecretPresent: !!process.env.STRIPE_SECRET_KEY,
    };
    const r = applyTopUp({
      userId, amountRupees: amount,
      note: `sandbox top-up (${gateway} not configured)`,
    });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({
      mode: "sandbox",
      gateway,
      wallet: r.wallet,
      topup: r.topup,
      bonus: r.bonus,
      diag,
    });
  }

  try {
    if (gateway === "razorpay") {
      // Razorpay path — create an order tagged with type=wallet_topup
      // so the wallet razorpay-verify endpoint can credit the wallet
      // on payment success. The client then opens checkout.js with the
      // returned order_id + public key.
      const order = await createRazorpayOrder({
        amountPaise: amount * 100,
        currency: "INR",
        receipt: orderId,
        notes: {
          type: "wallet_topup",
          userId,
          amount: String(amount),
          internalOrderId: orderId,
        },
      });
      return NextResponse.json({
        mode: "live",
        gateway: "razorpay",
        orderId,
        razorpayOrderId: order.id,
        amountPaise: order.amount,
        currency: order.currency,
        keyId: razorpayPublicKey(),
        wallet: getWallet(userId),
      });
    }

    if (gateway === "stripe") {
      // Stripe Checkout — webhook credits wallet on
      // checkout.session.completed with metadata.type=wallet_topup.
      const order = await createStripeWalletCheckout({
        orderId,
        amount,
        country: user.country,
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone,
        customerId: userId,
        description: `OduDoc Wallet top-up`,
        successUrl: `${origin}/dashboard/wallet?topup=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/dashboard/wallet?topup_cancelled=${orderId}`,
        metadata: {
          type: "wallet_topup",
          userId,
          amount: String(amount),
          orderId,
        },
      });
      return NextResponse.json({
        mode: "live",
        gateway: "stripe",
        orderId,
        paymentLink: order.paymentLink,
        sessionId: order.sessionId,
        wallet: getWallet(userId),
      });
    }

    // Cashfree path — create order with wallet_topup tag.
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
      gateway: "cashfree",
      orderId,
      paymentSessionId: order.paymentSessionId,
      paymentLink: order.paymentLink,
      cfOrderId: order.cfOrderId,
      wallet: getWallet(userId),
    });
  } catch (err) {
    const msg = (err as Error).message || "";
    const env = gateway === "cashfree"
      ? (process.env.CASHFREE_ENV || "PROD").toUpperCase()
      : gateway === "razorpay"
      ? (process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_") ? "TEST" : "LIVE")
      : (process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ? "TEST" : "LIVE");
    const gwName = gateway === "cashfree" ? "Cashfree" : gateway === "razorpay" ? "Razorpay" : "Stripe";

    // SAFETY: never auto-mint wallet credit when the gateway is
    // present but rejects our keys. Earlier versions of this route
    // silently fell back to sandbox on 401, which credited the
    // wallet without an actual payment — a real bug if the deploy
    // had invalid keys (every "+ Add money" click became free
    // money). Auth failures are now hard 502s with a clear
    // diagnostic for ops. The only way to get a sandbox credit now
    // is to NOT configure the gateway at all (the early
    // `!gatewayConfigured` branch above), which is the real
    // "dev mode" signal.
    const isAuthFailed = gateway === "cashfree"
      ? (msg.includes("401") || /authentication.?failed|invalid.?credential/i.test(msg))
      : /invalid.?api.?key|no such api key|authentication/i.test(msg);
    if (isAuthFailed) {
      return NextResponse.json({
        error: "payment_gateway_auth_failed",
        message: "Payment gateway is misconfigured — please contact support. No money was charged.",
        diagnostic: gateway === "cashfree"
          ? `Cashfree returned 401 against ${env} endpoint. If your CASHFREE_APP_ID is a SANDBOX key, set CASHFREE_ENV=SANDBOX (or swap to PROD keys). To get a true dev sandbox (wallet credit without payment), UNSET CASHFREE_APP_ID + CASHFREE_SECRET_KEY entirely.`
          : `Stripe rejected STRIPE_SECRET_KEY (${env}). Check the key against the right account / mode. To get a true dev sandbox, UNSET STRIPE_SECRET_KEY entirely.`,
      }, { status: 502 });
    }

    // Upstream timeout — both helpers cap their network call at 8s
    // so we can return a friendly JSON body before Vercel's edge
    // times out at 10s and replaces our response with a bare 502.
    if (/timed out|abort/i.test(msg)) {
      return NextResponse.json({
        error: "payment_gateway_timeout",
        message: "Payment gateway is slow right now. Please try again in a moment.",
        diagnostic: `${gwName} request exceeded 8s timeout (env=${env}).`,
      }, { status: 502 });
    }

    // Network / DNS / TLS error before we got any response.
    if (/network error|fetch failed|ENOTFOUND|ECONNRESET|EAI_AGAIN/i.test(msg)) {
      return NextResponse.json({
        error: "payment_gateway_unreachable",
        message: "Couldn't reach the payment gateway. Please try again in a moment.",
        diagnostic: `Network error talking to ${gwName} (env=${env}): ${msg}`,
      }, { status: 502 });
    }

    // Cashfree returned a non-2xx we don't recognise. Still wrap as
    // 502 + friendly message so the wallet UI never shows the bare
    // status code.
    return NextResponse.json({
      error: "payment_gateway_error",
      message: "Couldn't start the top-up. Please try again, or contact support if this keeps happening.",
      diagnostic: msg,
    }, { status: 502 });
  }
}
