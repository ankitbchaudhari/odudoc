// Vonage Voice API provider.
//
// Auth: JWT signed with VONAGE_PRIVATE_KEY for outbound; webhook
// signature verification uses VONAGE_SIGNATURE_SECRET (Vonage's
// HMAC-SHA-256 of the body keyed on the secret).
// Inbound: Vonage POSTs JSON to the answer_url with from + to +
// uuid + conversation_uuid. We respond with NCCO (Vonage's
// equivalent of TwiML).

import crypto from "node:crypto";

export interface VonageConfig {
  apiKey: string;
  apiSecret: string;
  applicationId: string;
  fromNumber: string;
  publicBaseUrl: string;
  /** Optional — required for outbound JWT auth. */
  privateKey?: string;
}

export function getConfig(): VonageConfig | null {
  const apiKey = process.env.VONAGE_API_KEY;
  const apiSecret = process.env.VONAGE_API_SECRET;
  const applicationId = process.env.VONAGE_APPLICATION_ID;
  const fromNumber = process.env.VONAGE_FROM_NUMBER;
  const publicBaseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL;
  if (!apiKey || !apiSecret || !applicationId || !fromNumber || !publicBaseUrl) return null;
  return {
    apiKey, apiSecret, applicationId, fromNumber, publicBaseUrl,
    privateKey: process.env.VONAGE_PRIVATE_KEY || undefined,
  };
}

/** Vonage signs webhooks with HMAC-SHA-256 keyed on the signature
 *  secret you set in the dashboard. Header is `x-vonage-signature`. */
export function verifyVonageSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const secret = process.env.VONAGE_SIGNATURE_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export { classifyIntent, replyForIntent } from "./twilio";

/** NCCO for greeting. Vonage's input action with "speech" type
 *  captures the patient's utterance and POSTs it to event_url. */
export function nccoGreeting(callId: string, baseUrl: string): unknown[] {
  return [
    { action: "talk", text: "Welcome to OduDoc. Tell me what you need help with.", language: "en-IN" },
    {
      action: "input",
      type: ["speech"],
      speech: { language: "en-in", endOnSilence: 2 },
      eventUrl: [`${baseUrl}/api/voice-bot/vonage/voice?callId=${encodeURIComponent(callId)}`],
      eventMethod: "POST",
    },
  ];
}

export function nccoReply(reply: string, hangup: boolean, callId: string, baseUrl: string): unknown[] {
  if (hangup) return [{ action: "talk", text: reply, language: "en-IN" }];
  return [
    { action: "talk", text: reply, language: "en-IN" },
    {
      action: "input",
      type: ["speech"],
      speech: { language: "en-in", endOnSilence: 2 },
      eventUrl: [`${baseUrl}/api/voice-bot/vonage/voice?callId=${encodeURIComponent(callId)}`],
      eventMethod: "POST",
    },
  ];
}

/** Outbound — uses the Voice API. Requires private key for JWT auth.
 *  We sign a short-lived JWT here rather than pulling in the Vonage
 *  SDK; same shape as the SDK does internally. */
export async function placeOutboundCall(toPhone: string, callId: string): Promise<{ ok: true; uuid: string } | { ok: false; error: string }> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, error: "vonage_not_configured" };
  if (!cfg.privateKey) return { ok: false, error: "vonage_private_key_missing" };

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    application_id: cfg.applicationId,
    iat: now,
    jti: crypto.randomUUID(),
    exp: now + 60,
  };
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const signing = `${enc(header)}.${enc(payload)}`;
  const sig = crypto.createSign("RSA-SHA256").update(signing).sign(cfg.privateKey, "base64url");
  const jwt = `${signing}.${sig}`;

  const r = await fetch("https://api.nexmo.com/v1/calls", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      to: [{ type: "phone", number: toPhone }],
      from: { type: "phone", number: cfg.fromNumber },
      answer_url: [`${cfg.publicBaseUrl}/api/voice-bot/vonage/voice?callId=${encodeURIComponent(callId)}`],
      event_url: [`${cfg.publicBaseUrl}/api/voice-bot/vonage/status?callId=${encodeURIComponent(callId)}`],
    }),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    return { ok: false, error: `vonage_${r.status}: ${txt.slice(0, 200)}` };
  }
  const j = await r.json().catch(() => null) as { uuid?: string } | null;
  if (!j?.uuid) return { ok: false, error: "missing_uuid" };
  return { ok: true, uuid: j.uuid };
}
