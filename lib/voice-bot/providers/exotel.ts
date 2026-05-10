// Exotel voice provider — India-focused alternative to Twilio.
//
// Auth: Basic auth with API_KEY:API_TOKEN.
// Inbound: Exotel POSTs application/x-www-form-urlencoded to our
//   "Voice URL" with CallSid + From + RecordingUrl + DialCallStatus.
// Outbound: POST to /Calls/connect.json with From + To.
// Response shape for IVR-style dialogue uses Exotel ExoML, not TwiML.
// We respond with passthru ExoML for greeting + speech capture.

export interface ExotelConfig {
  sid: string;          // Exotel SID (subdomain prefix)
  apiKey: string;
  apiToken: string;
  fromNumber: string;
  publicBaseUrl: string;
}

export function getConfig(): ExotelConfig | null {
  const sid = process.env.EXOTEL_SID;
  const apiKey = process.env.EXOTEL_API_KEY;
  const apiToken = process.env.EXOTEL_API_TOKEN;
  const fromNumber = process.env.EXOTEL_FROM_NUMBER || process.env.EXOTEL_PHONE_NUMBER;
  const publicBaseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL;
  if (!sid || !apiKey || !apiToken || !fromNumber || !publicBaseUrl) return null;
  return { sid, apiKey, apiToken, fromNumber, publicBaseUrl };
}

/** Exotel doesn't sign webhooks like Twilio — they rely on IP allowlists.
 *  We accept a shared secret in EXOTEL_WEBHOOK_SECRET on a query param
 *  ?secret= as a defence-in-depth check. Set the same value in your
 *  Exotel App's Voice URL. */
export function verifyExotelSecret(url: string): boolean {
  const expected = process.env.EXOTEL_WEBHOOK_SECRET;
  if (!expected) return false;
  try {
    const u = new URL(url);
    return u.searchParams.get("secret") === expected;
  } catch { return false; }
}

/** Place an outbound call via Exotel. */
export async function placeOutboundCall(toPhone: string, callId: string): Promise<{ ok: true; sid: string } | { ok: false; error: string }> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, error: "exotel_not_configured" };
  const url = `https://${cfg.apiKey}:${cfg.apiToken}@api.exotel.com/v1/Accounts/${cfg.sid}/Calls/connect.json`;
  const params = new URLSearchParams({
    From: cfg.fromNumber,
    To: toPhone,
    CallerId: cfg.fromNumber,
    Url: `${cfg.publicBaseUrl}/api/voice-bot/exotel/voice?callId=${encodeURIComponent(callId)}&secret=${encodeURIComponent(process.env.EXOTEL_WEBHOOK_SECRET || "")}`,
    StatusCallback: `${cfg.publicBaseUrl}/api/voice-bot/exotel/status?callId=${encodeURIComponent(callId)}&secret=${encodeURIComponent(process.env.EXOTEL_WEBHOOK_SECRET || "")}`,
    StatusCallbackContentType: "application/x-www-form-urlencoded",
  });
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    return { ok: false, error: `exotel_${r.status}: ${txt.slice(0, 200)}` };
  }
  const j = await r.json().catch(() => null) as { Call?: { Sid?: string } } | null;
  if (!j?.Call?.Sid) return { ok: false, error: "missing_sid" };
  return { ok: true, sid: j.Call.Sid };
}

// Reuse Twilio's intent classifier + reply templates — they're
// provider-agnostic. Keeps the IVR copy consistent across carriers.
export { classifyIntent, replyForIntent } from "./twilio";

/** Exotel ExoML for the greeting. We use Passthru → Speak → Gather
 *  so the call leg routes back to our webhook with the patient's
 *  speech as a query param when Exotel's ASR returns. */
export function exomlGreeting(callId: string, baseUrl: string, secret: string): string {
  const action = `${baseUrl}/api/voice-bot/exotel/voice?callId=${encodeURIComponent(callId)}&secret=${encodeURIComponent(secret)}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${action}" method="POST" input="speech" timeout="5">
    <Speak voice="female" language="en-IN">Welcome to OduDoc. Tell me what you need help with.</Speak>
  </Gather>
  <Speak voice="female" language="en-IN">I did not catch that. Goodbye.</Speak>
</Response>`.trim();
}

export function exomlReply(reply: string, hangup: boolean, callId: string, baseUrl: string, secret: string): string {
  const escaped = reply.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (hangup) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response><Speak voice="female" language="en-IN">${escaped}</Speak></Response>`.trim();
  }
  const action = `${baseUrl}/api/voice-bot/exotel/voice?callId=${encodeURIComponent(callId)}&secret=${encodeURIComponent(secret)}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Speak voice="female" language="en-IN">${escaped}</Speak>
  <Gather action="${action}" method="POST" input="speech" timeout="5">
    <Speak voice="female" language="en-IN">Anything else?</Speak>
  </Gather>
</Response>`.trim();
}
