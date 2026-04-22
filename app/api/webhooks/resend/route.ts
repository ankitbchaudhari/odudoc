// Resend webhook. Configure in the Resend dashboard:
//   URL:    https://www.odudoc.com/api/webhooks/resend
//   Events: email.sent, email.delivered, email.bounced, email.complained
//
// Resend uses Svix signatures (svix-id, svix-timestamp, svix-signature).
// We verify with RESEND_WEBHOOK_SECRET (the "whsec_..." value shown once
// when you create the endpoint).

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { updateByProviderRef, type NotificationStatus } from "@/lib/hospital/notifications-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ResendEvent {
  type?: string;
  data?: { email_id?: string; to?: string[] | string };
}

function mapEventType(type: string): NotificationStatus | null {
  switch (type) {
    case "email.sent":
    case "email.delivery_delayed":
      return "sent";
    case "email.delivered":
    case "email.opened":
    case "email.clicked":
      return "delivered";
    case "email.bounced":
    case "email.complained":
      return "bounced";
    case "email.failed":
      return "failed";
    default:
      return null;
  }
}

// Svix signature format: "v1,<base64>" (possibly multiple space-separated).
function verifySvix(secret: string, id: string, timestamp: string, body: string, header: string): boolean {
  const key = secret.startsWith("whsec_") ? Buffer.from(secret.slice(6), "base64") : Buffer.from(secret);
  const toSign = `${id}.${timestamp}.${body}`;
  const expected = crypto.createHmac("sha256", key).update(toSign).digest("base64");
  const expectedTag = `v1,${expected}`;
  const presented = header.split(" ");
  for (const p of presented) {
    try {
      if (p.length === expectedTag.length && crypto.timingSafeEqual(Buffer.from(p), Buffer.from(expectedTag))) return true;
    } catch { /* length mismatch */ }
  }
  return false;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const sigHeader = req.headers.get("svix-signature");
  const svixId = req.headers.get("svix-id");
  const svixTs = req.headers.get("svix-timestamp");

  if (secret && sigHeader && svixId && svixTs) {
    if (!verifySvix(secret, svixId, svixTs, body, sigHeader)) {
      log.warn("resend.webhook.signature_mismatch", {});
      return NextResponse.json({ error: "invalid_signature" }, { status: 403 });
    }
  }

  let event: ResendEvent;
  try { event = JSON.parse(body) as ResendEvent; }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const type = event.type || "";
  const emailId = event.data?.email_id;
  const mapped = mapEventType(type);
  if (!emailId || !mapped) {
    log.info("resend.webhook.ignored", { type, emailId });
    return NextResponse.json({ ok: true });
  }

  const patch: Partial<{ status: NotificationStatus; deliveredAt: string; errorMessage: string }> = { status: mapped };
  if (mapped === "delivered") patch.deliveredAt = new Date().toISOString();
  if (mapped === "bounced" || mapped === "failed") patch.errorMessage = type;

  const n = updateByProviderRef(emailId, patch);
  if (!n) log.info("resend.webhook.no_match", { emailId, type });
  else log.info("resend.webhook.status", { emailId, orgId: n.organizationId, type, mapped });

  return NextResponse.json({ ok: true });
}
