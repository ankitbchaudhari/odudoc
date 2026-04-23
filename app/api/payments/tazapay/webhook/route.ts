// Tazapay sends webhook events as JSON with an HMAC-SHA256 signature
// over the raw body in the `X-Tazapay-Signature` header. We verify
// the signature with the API Secret from admin settings, then map
// the status back to our consultation payment state.
//
// Interesting event types:
//   checkout.success / payment.paid     → consultation Paid
//   checkout.failed  / payment.failed   → consultation PaymentFailed
//   refund.succeeded                    → logged (no state change here)
//
// Our convention: `reference_id` on the Tazapay checkout is the
// consultation id, so we look the consultation up directly.

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/tazapay";
import { getConsultation, markPaid, markPaymentFailed } from "@/lib/consultations-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";

interface TazapayWebhookBody {
  event?: string;
  type?: string;
  data?: {
    reference_id?: string;
    id?: string;
    state?: string;
    status?: string;
    metadata?: Record<string, string>;
  };
  // Some Tazapay shapes put fields at the top level.
  reference_id?: string;
  id?: string;
  state?: string;
  status?: string;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature =
    req.headers.get("x-tazapay-signature") ||
    req.headers.get("tazapay-signature") ||
    "";
  if (!verifyWebhookSignature(rawBody, signature)) {
    log.error("tazapay.webhook.bad_signature", undefined, { signature: signature.slice(0, 16) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: TazapayWebhookBody;
  try {
    event = JSON.parse(rawBody) as TazapayWebhookBody;
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
        state === "success";
      const isFailure =
        eventType.includes("fail") ||
        state === "failed" ||
        state === "cancelled" ||
        state === "canceled";
      if (isSuccess) markPaid(referenceId, `tazapay_${paymentId || referenceId}`);
      else if (isFailure) markPaymentFailed(referenceId);
    } catch (err) {
      log.error("tazapay.webhook.update_failed", err);
    }
  }

  return NextResponse.json({ ok: true, event: eventType, state });
}
