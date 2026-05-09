// POST /api/payments/cashfree/webhook
//
// Cashfree posts here for every payment event. Signature is
// HMAC-SHA256 of `timestamp + rawBody` keyed with the secret key,
// base64-encoded, sent in the `x-webhook-signature` header. We MUST
// verify before doing any side-effect — accepting unsigned webhooks
// lets an attacker mark any order paid.

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/cashfree";
import { markPaid as markConsultationPaid } from "@/lib/consultations-store";
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
  if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
    log.warn("cashfree.webhook.signature_invalid", {
      hasSignature: Boolean(signature),
      hasTimestamp: Boolean(timestamp),
      bytes: rawBody.length,
    });
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  let evt: CashfreeWebhookEvent;
  try {
    evt = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
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

  return NextResponse.json({ ok: true });
}
