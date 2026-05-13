// Outbound SMS / WhatsApp / Voice via Twilio.
//
// Thin wrapper around the Twilio REST API — we call it via `fetch` directly
// rather than pulling the SDK into every Lambda. Mirrors the pattern used by
// `lib/email.ts`: if the Twilio env isn't configured, `send*()` no-ops and
// returns `{ ok: true, skipped: true }` so local/dev flows keep working.
//
// Required env:
//   TWILIO_ACCOUNT_SID        — starts with "AC..."
//   TWILIO_AUTH_TOKEN         — API token
//   TWILIO_FROM_NUMBER        — default SMS sender (E.164, e.g. "+15551230000")
//   TWILIO_WHATSAPP_FROM      — WhatsApp sender (e.g. "whatsapp:+14155238886")
//   TWILIO_VOICE_FROM         — optional, defaults to TWILIO_FROM_NUMBER

import { log } from "./log";
import { sentDmSend, isSentDmConfigured } from "./sent-dm";

const SID = process.env.TWILIO_ACCOUNT_SID?.trim();
const TOKEN = process.env.TWILIO_AUTH_TOKEN?.trim();
const SMS_FROM = (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER)?.trim();
const WA_FROM = process.env.TWILIO_WHATSAPP_FROM?.trim();
const VOICE_FROM = process.env.TWILIO_VOICE_FROM?.trim() || SMS_FROM;

export interface SmsResult {
  ok: boolean;
  sid?: string;
  error?: string;
  skipped?: boolean;
}

function basicAuth() {
  return "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64");
}

async function twilioPost(body: Record<string, string>): Promise<SmsResult> {
  if (!SID || !TOKEN) {
    log.info("sms.twilio_not_configured", { to: body.To, bodyPreview: body.Body?.slice(0, 60) });
    return { ok: true, skipped: true };
  }
  try {
    const form = new URLSearchParams(body);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: basicAuth(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const data = (await res.json()) as { sid?: string; message?: string; code?: number };
    if (!res.ok) return { ok: false, error: data.message || `twilio_${res.status}` };
    return { ok: true, sid: data.sid };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Send a free-form SMS body. Routes to Twilio because sent.dm is
 *  strictly template-driven — callers that need a templated path
 *  should call sentDmSend() / sendOtpViaSentDm() directly from
 *  lib/sent-dm. Keeping this Twilio-only avoids silent breakage
 *  for arbitrary one-off texts (withdrawal alerts, vital alerts,
 *  etc.) that aren't registered as sent.dm templates. */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (!SMS_FROM) return { ok: true, skipped: true };
  return twilioPost({ To: to, From: SMS_FROM, Body: body });
}

/** Send a templated SMS — tries sent.dm first (cheaper rates +
 *  unified billing with WhatsApp), falls back to Twilio with a
 *  rendered free-form body. `fallbackBody` is the literal text we'd
 *  send via Twilio if sent.dm is unavailable / the template fails.
 *
 *  templateRef: sent.dm template id (UUID) or name.
 *  variables: substitutions matching the template placeholders. */
export async function sendTemplatedSms(
  to: string,
  templateRef: string | undefined,
  variables: Record<string, string>,
  fallbackBody: string,
): Promise<SmsResult> {
  if (isSentDmConfigured() && templateRef) {
    const r = await sentDmSend({
      to,
      channel: "sms",
      template: templateRef,
      variables,
    });
    if (r.ok) return { ok: true, sid: r.messageId };
    log.warn("sms.sent_dm_failed_falling_back_to_twilio", { error: r.error });
  }
  // Fallback: Twilio with the literal body.
  return sendSms(to, fallbackBody);
}

export async function sendWhatsApp(to: string, body: string): Promise<SmsResult> {
  if (!WA_FROM) return { ok: true, skipped: true };
  const normalizedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  return twilioPost({ To: normalizedTo, From: WA_FROM, Body: body });
}

/** Send an approved WhatsApp Business template via Twilio's
 *  Content API. Unlike sendWhatsApp() (which only works inside a
 *  24h reply window), template messages reach any verified WA
 *  number anytime.
 *
 *  contentSid: Twilio Content Sid (HX...) for the approved
 *  template, obtained by syncing the template from Meta to Twilio
 *  (Twilio Console → Messaging → Content Editor).
 *  variables: positional substitutions, e.g.
 *    { "1": "Asha", "2": "Dr. Sharma", "3": "Tomorrow at 4:00 PM" }
 *  Returns the same SmsResult shape as sendWhatsApp(); a missing
 *  contentSid skips with ok:true so callers can fall back to the
 *  freeform path without surfacing errors. */
export async function sendWhatsAppTemplate(
  to: string,
  contentSid: string | undefined,
  variables: Record<string, string>,
  options?: { sentDmTemplate?: string },
): Promise<SmsResult> {
  // Try sent.dm first when its API key + a matching template name
  // are configured. Sent.dm passes Meta's per-template fees through
  // at cost, but skips Twilio's WhatsApp markup — typically 6-7×
  // cheaper for the same approved Meta template.
  if (isSentDmConfigured() && options?.sentDmTemplate) {
    const r = await sentDmSend({
      to,
      channel: "whatsapp",
      template: options.sentDmTemplate,
      variables,
    });
    if (r.ok) return { ok: true, sid: r.messageId };
    log.warn("wa.sent_dm_failed_falling_back_to_twilio", { error: r.error });
  }
  // Twilio fallback (or primary when sent.dm isn't configured).
  if (!WA_FROM) return { ok: true, skipped: true };
  if (!contentSid) return { ok: true, skipped: true };
  const normalizedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  return twilioPost({
    To: normalizedTo,
    From: WA_FROM,
    ContentSid: contentSid,
    ContentVariables: JSON.stringify(variables),
  });
}

export async function sendVoice(to: string, twiml: string): Promise<SmsResult> {
  if (!SID || !TOKEN || !VOICE_FROM) {
    log.info("voice.twilio_not_configured", { to });
    return { ok: true, skipped: true };
  }
  try {
    const form = new URLSearchParams({
      To: to,
      From: VOICE_FROM,
      Twiml: twiml,
    });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Calls.json`, {
      method: "POST",
      headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok) return { ok: false, error: data.message || `twilio_${res.status}` };
    return { ok: true, sid: data.sid };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function sayTwiml(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<Response><Say voice="alice">${escaped}</Say></Response>`;
}

export function isSmsConfigured(): boolean {
  return Boolean(SID && TOKEN && SMS_FROM);
}
