// Twilio Message Status webhook. Configure in Twilio console for the
// messaging service: https://www.odudoc.com/api/webhooks/twilio/status
//
// Twilio POSTs application/x-www-form-urlencoded with fields:
//   MessageSid, MessageStatus, To, From, ErrorCode, ErrorMessage
// We map MessageStatus → our NotificationStatus and patch the matching
// row by providerRef (== MessageSid we stored on send).
//
// Signature validation uses TWILIO_AUTH_TOKEN + the full webhook URL + the
// sorted-param canonical body (per Twilio's HMAC-SHA1 scheme). We skip
// validation when the secret isn't configured so dev/preview still works.

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { updateByProviderRef, type NotificationStatus } from "@/lib/hospital/notifications-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapStatus(s: string | null): NotificationStatus | null {
  switch ((s || "").toLowerCase()) {
    case "queued":
    case "accepted":
    case "scheduled":
    case "sending":
      return "queued";
    case "sent":
      return "sent";
    case "delivered":
    case "read":
      return "delivered";
    case "failed":
    case "undelivered":
      return "failed";
    default:
      return null;
  }
}

// Twilio canonical signature: https://www.twilio.com/docs/usage/webhooks/webhooks-security
function verifyTwilioSignature(url: string, params: Record<string, string>, signature: string, authToken: string): boolean {
  const sorted = Object.keys(params).sort().map((k) => k + params[k]).join("");
  const data = url + sorted;
  const computed = crypto.createHmac("sha1", authToken).update(data, "utf8").digest("base64");
  // constant-time compare
  if (computed.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const params = Object.fromEntries(new URLSearchParams(raw));
  const signature = req.headers.get("x-twilio-signature");
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (authToken && signature) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const url = `${proto}://${host}${new URL(req.url).pathname}`;
    if (!verifyTwilioSignature(url, params, signature, authToken)) {
      log.warn("twilio.webhook.signature_mismatch", { url });
      return NextResponse.json({ error: "invalid_signature" }, { status: 403 });
    }
  }

  const sid = params.MessageSid;
  const status = mapStatus(params.MessageStatus);
  if (!sid || !status) {
    log.warn("twilio.webhook.ignored", { sid, status: params.MessageStatus });
    return NextResponse.json({ ok: true });
  }

  const patch: Partial<{ status: NotificationStatus; deliveredAt: string; errorMessage: string }> = { status };
  if (status === "delivered") patch.deliveredAt = new Date().toISOString();
  if (status === "failed" && params.ErrorMessage) patch.errorMessage = `${params.ErrorCode || ""}: ${params.ErrorMessage}`.trim();

  const n = updateByProviderRef(sid, patch);
  if (!n) {
    log.info("twilio.webhook.no_match", { sid, status });
  } else {
    log.info("twilio.webhook.status", { sid, orgId: n.organizationId, status });
  }
  return NextResponse.json({ ok: true });
}
