// ConnectPay sends webhook events as JSON with an HMAC-SHA256 signature
// over the raw body in the `X-Connectpay-Signature` header. We verify
// the signature with the API Secret from admin settings, then map the
// status back to our consultation payment state.
//
// Interesting event types:
//   checkout.success / payment.paid     → consultation Paid
//   checkout.failed  / payment.failed   → consultation PaymentFailed
//   refund.succeeded                    → logged (no state change here)
//
// Our convention: `reference_id` on the ConnectPay checkout is the
// consultation id, so we look the consultation up directly.

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/connectpay";
import { getConsultation, markPaid, markPaymentFailed } from "@/lib/consultations-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";

interface ConnectPayWebhookBody {
  event?: string;
  type?: string;
  data?: {
    reference_id?: string;
    id?: string;
    state?: string;
    status?: string;
    metadata?: Record<string, string>;
  };
  // Some ConnectPay shapes put fields at the top level.
  reference_id?: string;
  id?: string;
  state?: string;
  status?: string;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature =
    req.headers.get("x-connectpay-signature") ||
    req.headers.get("connectpay-signature") ||
    req.headers.get("x-signature") ||
    "";
  if (!verifyWebhookSignature(rawBody, signature)) {
    log.error("connectpay.webhook.bad_signature", undefined, { signature: signature.slice(0, 16) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: ConnectPayWebhookBody;
  try {
    event = JSON.parse(rawBody) as ConnectPayWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = (event.event || event.type || "").toLowerCase();
  const data = event.data || event;
  const referenceId = data.reference_id || "";
  const paymentId = data.id || "";
  const state = (data.state || data.status || "").toLowerCase();

  if (referenceId && getConsultation(referenceId)) {
    try {
      const isSuccess =
        eventType.includes("success") ||
        eventType === "payment.paid" ||
        state === "paid" ||
        state === "success" ||
        state === "completed";
      const isFailure =
        eventType.includes("fail") ||
        state === "failed" ||
        state === "cancelled" ||
        state === "canceled";
      if (isSuccess) markPaid(referenceId, `connectpay_${paymentId || referenceId}`);
      else if (isFailure) markPaymentFailed(referenceId);
    } catch (err) {
      log.error("connectpay.webhook.update_failed", err);
    }
  }

  return NextResponse.json({ ok: true, event: eventType, state });
}
