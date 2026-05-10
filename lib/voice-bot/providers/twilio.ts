// Twilio provider plug-in for the voice-call appointment bot.
//
// Wires a real telephony stack on top of the provider-agnostic
// /lib/voice-bot/store. Two surfaces:
//
//   1. TwiML response generators — verifyTwilioSignature returns
//      whether a request from Twilio is authentic; voiceTwimlForCall
//      hands Twilio the IVR prompt + speech-collection config; on
//      <Gather> completion, /api/voice-bot/twilio/voice receives
//      the speech result and we append it to the session transcript.
//
//   2. Outbound dial — placeOutboundCall uses Twilio's REST API to
//      call a patient back; transcript fragments come in via the
//      same webhook plumbing.
//
// Idempotent on Twilio's CallSid — replaying a webhook (Twilio's
// retry semantic on 5xx) will not duplicate transcript rows.

import crypto from "node:crypto";

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  publicBaseUrl: string;       // for absolute callback URLs
}

export function getConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const publicBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_BASE_URL;
  if (!accountSid || !authToken || !fromNumber || !publicBaseUrl) return null;
  return { accountSid, authToken, fromNumber, publicBaseUrl };
}

/** Twilio signs every webhook request with HMAC-SHA1. We verify so
 *  a third party can't post fake "patient said X" fragments into our
 *  store. Spec: https://www.twilio.com/docs/usage/webhooks/webhooks-security */
export function verifyTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader) return false;
  // Twilio expects: full URL + sorted form params concatenated.
  const sortedKeys = Object.keys(params).sort();
  const concatenated = sortedKeys.reduce((acc, k) => acc + k + params[k], url);
  const expected = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(concatenated, "utf-8"))
    .digest("base64");
  // Constant-time compare.
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** TwiML for the initial IVR greeting. Twilio's <Gather> with
 *  input=speech captures the patient's answer and POSTs it back to
 *  our webhook with SpeechResult set. */
export function voiceTwimlForGreeting(callId: string, baseUrl: string, opts: { lang?: string } = {}): string {
  const lang = opts.lang || "en-IN";
  const action = `${baseUrl}/api/voice-bot/twilio/voice?callId=${encodeURIComponent(callId)}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" language="${lang}" action="${action}" method="POST" speechTimeout="auto" speechModel="phone_call">
    <Say voice="Polly.Aditi" language="${lang}">Welcome to OduDoc. Tell me, in one sentence, what you need help with — book a doctor, refill a prescription, ask about a lab result, or talk to a person.</Say>
  </Gather>
  <Say voice="Polly.Aditi" language="${lang}">I didn't catch that. Goodbye.</Say>
</Response>`.trim();
}

/** TwiML follow-up after the bot has classified intent. */
export function voiceTwimlForReply(reply: string, callId: string, baseUrl: string, opts: { hangup?: boolean; lang?: string } = {}): string {
  const lang = opts.lang || "en-IN";
  const escaped = reply.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (opts.hangup) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="${lang}">${escaped}</Say>
  <Hangup/>
</Response>`.trim();
  }
  const action = `${baseUrl}/api/voice-bot/twilio/voice?callId=${encodeURIComponent(callId)}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="${lang}">${escaped}</Say>
  <Gather input="speech" language="${lang}" action="${action}" method="POST" speechTimeout="auto" speechModel="phone_call">
    <Say voice="Polly.Aditi" language="${lang}">Anything else?</Say>
  </Gather>
  <Hangup/>
</Response>`.trim();
}

/** Place an outbound call — used when a doctor schedules a callback
 *  reminder for a patient who can't operate the app. */
export async function placeOutboundCall(toPhone: string, callId: string): Promise<{ ok: true; sid: string } | { ok: false; error: string }> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, error: "twilio_not_configured" };
  const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Calls.json`;
  const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64");
  const params = new URLSearchParams({
    From: cfg.fromNumber,
    To: toPhone,
    Url: `${cfg.publicBaseUrl}/api/voice-bot/twilio/voice?callId=${encodeURIComponent(callId)}`,
    StatusCallback: `${cfg.publicBaseUrl}/api/voice-bot/twilio/status?callId=${encodeURIComponent(callId)}`,
    StatusCallbackMethod: "POST",
  });
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    return { ok: false, error: `twilio_${r.status}: ${txt.slice(0, 200)}` };
  }
  const j = await r.json().catch(() => null) as { sid?: string } | null;
  if (!j?.sid) return { ok: false, error: "missing_sid" };
  return { ok: true, sid: j.sid };
}

/** Tiny intent classifier — keyword-based, deterministic. The bot
 *  responds based on this; the real LLM-backed classifier ships as
 *  a separate /api/ai-credit-gated call later.
 */
export function classifyIntent(transcript: string): {
  intent: "book_appointment" | "cancel_appointment" | "reschedule" | "callback_request" | "lab_result_question" | "rx_refill" | "general";
  confidence: "high" | "low";
} {
  const t = transcript.toLowerCase();
  if (/book|appointment|schedule|consult/.test(t)) return { intent: "book_appointment", confidence: "high" };
  if (/cancel/.test(t)) return { intent: "cancel_appointment", confidence: "high" };
  if (/reschedul|change.*time|move/.test(t)) return { intent: "reschedule", confidence: "high" };
  if (/refill|repeat.*medic|prescription/.test(t)) return { intent: "rx_refill", confidence: "high" };
  if (/lab|report|result|test/.test(t)) return { intent: "lab_result_question", confidence: "high" };
  if (/talk.*person|human|agent|callback/.test(t)) return { intent: "callback_request", confidence: "high" };
  return { intent: "general", confidence: "low" };
}

/** Deterministic reply templates — keep them short, the IVR plays
 *  audio. */
export function replyForIntent(intent: ReturnType<typeof classifyIntent>["intent"]): { reply: string; hangup: boolean } {
  switch (intent) {
    case "book_appointment":     return { reply: "I will text you a booking link. A doctor will confirm within four hours. Goodbye.", hangup: true };
    case "cancel_appointment":   return { reply: "I will mark your next appointment for cancellation. The clinic will confirm by SMS. Goodbye.", hangup: true };
    case "reschedule":           return { reply: "I will text you the reschedule link. Goodbye.", hangup: true };
    case "rx_refill":            return { reply: "I will queue a refill request with your pharmacy. They will SMS you the price and delivery time. Goodbye.", hangup: true };
    case "lab_result_question":  return { reply: "I will text you a link to your latest reports. Goodbye.", hangup: true };
    case "callback_request":     return { reply: "I will arrange a callback within thirty minutes. Goodbye.", hangup: true };
    case "general":
    default:                     return { reply: "I did not understand. Please try again, or visit OduDoc dot com to book online. Goodbye.", hangup: true };
  }
}
