// POST /api/payments/cashfree/webhook
//
// Cashfree posts here for every payment event. Signature is
// HMAC-SHA256 of `timestamp + rawBody` keyed with the secret key,
// base64-encoded, sent in the `x-webhook-signature` header. We MUST
// verify before doing any side-effect — accepting unsigned webhooks
// lets an attacker mark any order paid.

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignatureDetailed, isWebhookReplay, markWebhookProcessed } from "@/lib/cashfree";
import { markPaid as markConsultationPaid } from "@/lib/consultations-store";
import { applyTopUp } from "@/lib/wallet/store";
import { pushNotification } from "@/lib/notifications/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CashfreeWebhookEvent {
  type?: string;
  data?: {
    order?: {
      order_id?: string;
      order_amount?: number;
      order_currency?: string;
      order_tags?: Record<string, string>;
    };
    payment?: {
      cf_payment_id?: string | number;
      payment_status?: string;
      payment_amount?: number;
      payment_currency?: string;
      payment_message?: string;
      payment_time?: string;
      payment_method?: Record<string, unknown>;
    };
  };
  event_time?: string;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature");
  const timestamp = req.headers.get("x-webhook-timestamp");

  // Defence: reject anything we can't authenticate. Cashfree resends
  // on 5xx so a 401 here is the polite "stop and check your config".
  const verify = verifyWebhookSignatureDetailed(rawBody, signature, timestamp);
  if (!verify.ok) {
    log.warn("cashfree.webhook.signature_invalid", {
      reason: verify.reason,
      hasSignature: Boolean(signature),
      hasTimestamp: Boolean(timestamp),
      bytes: rawBody.length,
    });
    // Reason "timestamp_too_old" is the replay attack signal; surface it
    // as 401 with the reason in the body so ops can see it in logs.
    return NextResponse.json({ ok: false, error: "invalid_signature", reason: verify.reason }, { status: 401 });
  }

  let evt: CashfreeWebhookEvent & { event_id?: string };
  try {
    evt = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // Replay-on-our-side check: if we've already processed this event
  // id (Cashfree retries on our 5xx), short-circuit with 200 so the
  // webhook doesn't fire twice.
  if (isWebhookReplay(evt.event_id)) {
    log.info("cashfree.webhook.replay_short_circuit", { eventId: evt.event_id });
    return NextResponse.json({ ok: true, replay: true });
  }

  const order = evt.data?.order;
  const payment = evt.data?.payment;
  const orderId = order?.order_id;
  const status = payment?.payment_status || "";

  if (!orderId) {
    log.warn("cashfree.webhook.missing_order_id", { type: evt.type });
    return NextResponse.json({ ok: true, ignored: true });
  }

  // Only act on terminal SUCCESS events. PENDING / FAILED / USER_DROPPED
  // are interesting for analytics but don't move our consultation state.
  if (status === "SUCCESS") {
    const tags = order?.order_tags || {};
    const type = tags.type;
    try {
      if (type === "consultation") {
        const cfPaymentId = String(payment?.cf_payment_id ?? "");
        markConsultationPaid(orderId, cfPaymentId);
        log.info("cashfree.webhook.consultation_paid", {
          orderId,
          cfPaymentId,
          amount: payment?.payment_amount,
          currency: payment?.payment_currency,
        });
      } else if (type === "clinic_subscription") {
        // Subscription accounting lives in lib/clinic-billing-store.ts;
        // mirror what induspays does once that wiring is generalised.
        log.info("cashfree.webhook.clinic_subscription_paid", {
          orderId,
          clinicId: tags.clinicId,
          amount: payment?.payment_amount,
        });
      } else if (type === "wallet_topup") {
        // Patient funded their OduDoc wallet via Cashfree. Credit the
        // wallet + push an in-app notification.
        const userId = tags.userId;
        const amount = Number(tags.amount || payment?.payment_amount || 0);
        if (userId && amount > 0) {
          const r = applyTopUp({
            userId,
            amountRupees: Math.floor(amount),
            providerSid: String(payment?.cf_payment_id ?? ""),
            note: `Cashfree top-up ${orderId}`,
          });
          if (r.ok && r.wallet) {
            pushNotification({
              userId,
              kind: "wallet_topup",
              severity: "success",
              title: `₹${amount} added to wallet`,
              body: r.bonus ? `Plus ₹${r.bonus.amountRupees} bonus credited. New balance ₹${r.wallet.balanceRupees + r.wallet.bonusBalanceRupees}.`
                            : `New balance ₹${r.wallet.balanceRupees + r.wallet.bonusBalanceRupees}.`,
              link: "/dashboard/wallet",
              reference: orderId,
            });
            log.info("cashfree.webhook.wallet_topup_credited", { orderId, userId, amount });
          } else {
            log.warn("cashfree.webhook.wallet_topup_rejected", { orderId, error: r.error });
          }
        } else {
          log.warn("cashfree.webhook.wallet_topup_missing_tags", { orderId, hasUserId: Boolean(userId), amount });
        }
      } else {
        log.info("cashfree.webhook.unknown_type", { orderId, type });
      }
    } catch (err) {
      log.error("cashfree.webhook.handler_threw", err, { orderId });
      // Return 500 so Cashfree retries. Idempotency on our side
      // means a replay is safe.
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    try {
      await awaitAllFlushesStrict();
    } catch (err) {
      log.error("cashfree.webhook.persist_failed", err, { orderId });
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  } else {
    log.info("cashfree.webhook.event", { type: evt.type, status, orderId });
  }

  // Mark event as processed so a Cashfree retry of the same payload
  // (after a network glitch or our slow 200) is short-circuited next
  // time around.
  markWebhookProcessed(evt.event_id);

  return NextResponse.json({ ok: true });
}
