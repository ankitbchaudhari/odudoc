// POST /api/payments/razorpay/webhook
//
// Razorpay posts every payment event here. Signature is HMAC-SHA256
// of the raw body keyed with RAZORPAY_WEBHOOK_SECRET, sent in the
// `x-razorpay-signature` header. We MUST verify before doing any
// side-effect — accepting an unsigned webhook lets an attacker mark
// any order paid.
//
// Mirrors /api/payments/cashfree/webhook so the two providers behave
// identically downstream: the same wallet credit / consultation
// mark-paid helpers are called, and the same pending-payment buffer
// handles the "webhook fired before our booking row was persisted"
// race.
//
// Event types we care about (others are ignored with a 200):
//   - payment.captured  → terminal SUCCESS, route by order.notes.type
//   - payment.authorized → also SUCCESS for auto-capture orders
//   - payment.failed     → log only, analytics
//   - order.paid         → emitted alongside payment.captured on the
//                          recommended Standard Checkout flow
//
// Idempotency: applyTopUp + markConsultationPaid both key on the
// provider payment id so a webhook firing twice is a safe no-op.
// We also short-circuit on Razorpay's event id when present.

import { NextRequest, NextResponse } from "next/server";
import {
  verifyRazorpayWebhookSignature,
  getRazorpayOrder,
} from "@/lib/razorpay";
import {
  markPaid as markConsultationPaid,
  reloadConsultations,
} from "@/lib/consultations-store";
import { applyTopUp, reloadWallet } from "@/lib/wallet/store";
import { recordPendingPayment } from "@/lib/cashfree-pending-buffer";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  status: string;
  amount: number; // paise
  currency: string;
  method?: string;
  notes?: Record<string, string>;
  email?: string;
  contact?: string;
}

interface RazorpayWebhookEvent {
  event?: string;
  account_id?: string;
  contains?: string[];
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
    order?: { entity?: Record<string, unknown> };
  };
  created_at?: number;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  const eventId = req.headers.get("x-razorpay-event-id"); // Razorpay's webhook id, used for replay short-circuit

  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    log.warn("razorpay.webhook.signature_invalid", {
      hasSignature: Boolean(signature),
      bytes: rawBody.length,
    });
    return NextResponse.json(
      { ok: false, error: "invalid_signature" },
      { status: 401 },
    );
  }

  let evt: RazorpayWebhookEvent;
  try {
    evt = JSON.parse(rawBody) as RazorpayWebhookEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const eventName = evt.event || "";
  const payment = evt.payload?.payment?.entity;

  // We only act on terminal payment-success events. payment.failed
  // is logged for analytics; order.paid duplicates payment.captured
  // and would otherwise double-credit if not de-duped at this layer.
  const isSuccess =
    eventName === "payment.captured" || eventName === "payment.authorized";
  const isFailure = eventName === "payment.failed";

  if (!payment) {
    log.info("razorpay.webhook.no_payment_entity", { event: eventName });
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (isFailure) {
    log.info("razorpay.webhook.payment_failed", {
      orderId: payment.order_id,
      paymentId: payment.id,
      method: payment.method,
    });
    return NextResponse.json({ ok: true });
  }

  if (!isSuccess) {
    // order.paid + others — already covered by payment.captured.
    return NextResponse.json({ ok: true, skipped: eventName });
  }

  // Authoritative server-side order fetch — Razorpay's webhook payload
  // includes notes on the payment object, but we re-read the ORDER
  // notes (set server-side at creation) as the trust anchor. Skipping
  // this would let a forged webhook with attacker-controlled payment
  // notes credit any user's wallet.
  let orderNotes: Record<string, string> = {};
  let orderAmountPaise = 0;
  try {
    const order = await getRazorpayOrder(payment.order_id);
    orderNotes = (order.notes || {}) as Record<string, string>;
    orderAmountPaise = Number(order.amount || 0);
  } catch (err) {
    log.error("razorpay.webhook.order_fetch_failed", err, {
      orderId: payment.order_id,
      paymentId: payment.id,
    });
    // Fail closed — Razorpay retries on 5xx, so we'll see this event
    // again. Better to retry than to credit on questionable data.
    return NextResponse.json(
      { ok: false, error: "order_fetch_failed" },
      { status: 500 },
    );
  }

  const type = orderNotes.type;
  const orderId = orderNotes.internalOrderId || payment.order_id;

  try {
    if (type === "wallet_topup") {
      // Patient funded their OduDoc wallet via Razorpay. Credit the
      // wallet + push an in-app notification. Idempotent on
      // providerSid (the Razorpay payment id) so a duplicate webhook
      // is a safe no-op.
      const userId = orderNotes.userId;
      const amount = Number(
        orderNotes.amount || Math.round(orderAmountPaise / 100) || 0,
      );
      if (userId && amount > 0) {
        await reloadWallet();
        const r = applyTopUp({
          userId,
          amountRupees: Math.floor(amount),
          providerSid: payment.id,
          note: `Razorpay top-up ${orderId}`,
        });
        if (r.ok) {
          log.info("razorpay.webhook.wallet_topup_credited", {
            orderId,
            userId,
            amount,
            paymentId: payment.id,
            eventId,
          });
        } else {
          log.warn("razorpay.webhook.wallet_topup_rejected", {
            orderId,
            error: r.error,
          });
        }
      } else {
        log.warn("razorpay.webhook.wallet_topup_missing_notes", {
          orderId,
          hasUserId: Boolean(userId),
          amount,
        });
      }
    } else if (type === "consultation") {
      await reloadConsultations();
      const updated = markConsultationPaid(orderId, payment.id);
      if (!updated) {
        // Race: the booking row hasn't been persisted yet (the booking
        // flow mints the internalOrderId client-side before POSTing
        // to /api/bookings/free). Park the payment so the booking
        // route can claim it on persist. Reusing the Cashfree buffer
        // keeps a single reconciliation surface; the cron that scans
        // it doesn't care which provider parked the row.
        recordPendingPayment({
          orderId,
          paymentId: payment.id,
          amountRupees: Math.floor(payment.amount / 100),
          tags: orderNotes,
        });
        log.warn("razorpay.webhook.consultation_buffered", {
          orderId,
          paymentId: payment.id,
          amount: payment.amount,
        });
      } else {
        log.info("razorpay.webhook.consultation_paid", {
          orderId,
          paymentId: payment.id,
          amount: payment.amount,
        });
      }
    } else if (type === "clinic_subscription") {
      log.info("razorpay.webhook.clinic_subscription_paid", {
        orderId,
        clinicId: orderNotes.clinicId,
        amount: payment.amount,
      });
      // Subscription accounting lives in lib/clinic-billing-store —
      // mirror Cashfree's behaviour once that wiring is generalised.
    } else {
      // Untyped or unknown — buffer for later claim. Matches what
      // Cashfree does for the same edge.
      recordPendingPayment({
        orderId,
        paymentId: payment.id,
        amountRupees: Math.floor(payment.amount / 100),
        tags: orderNotes,
      });
      log.info("razorpay.webhook.untyped_buffered", { orderId, type });
    }
  } catch (err) {
    log.error("razorpay.webhook.handler_threw", err, { orderId });
    // 500 → Razorpay retries with exponential backoff. Idempotency
    // on our side means a replay is safe.
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Best-effort flush of the persistent stores so a follow-up read
  // (e.g. user refreshes the wallet page) sees the credit immediately.
  try {
    await awaitAllFlushesStrict();
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true });
}
