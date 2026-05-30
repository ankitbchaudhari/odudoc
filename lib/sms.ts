// Outbound SMS / WhatsApp / Voice.
//
// Routing (after Twilio account was disabled May 2026):
//   - SMS templates → sent.dm (channel: "sms")
//   - WhatsApp templates → Meta Cloud API direct > sent.dm (no Twilio)
//   - WhatsApp freeform → Meta Cloud API direct (free inside 24h window)
//   - Voice → not supported (Twilio gone, no sent.dm equivalent)
//
// Freeform SMS isn't supported anywhere now — sent.dm is template-only.
// Callers that used to `sendSms(to, freeformBody)` for ad-hoc alerts
// need to either (a) register a sent.dm template for that alert and
// switch to `sendTemplatedSms`, or (b) route via WhatsApp Cloud
// freeform inside the 24h window. Existing call sites continue to
// return `{ok:true, skipped:true}` so they don't crash, but no SMS
// actually sends. The log line "sms.freeform_unsupported" surfaces
// every such call so we can find + migrate them.
//
// The Twilio code paths are kept as dead branches (gated on
// `SID && TOKEN`) so re-enabling Twilio is one env-var flip away
// if the account is reinstated.

import { log } from "./log";
import { sentDmSend, isSentDmConfigured } from "./sent-dm";
import {
  isWhatsAppCloudConfigured,
  sendTemplateWhatsApp,
  sendFreeformWhatsApp,
} from "./whatsapp-cloud";

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

/** Send a free-form SMS body.
 *
 *  WARNING: freeform SMS is unsupported after the Twilio account was
 *  disabled (May 2026). Sent.dm is strictly template-driven so
 *  arbitrary one-off bodies have nowhere to go. Returns
 *  `{ok:true, skipped:true}` so existing callers don't crash, but no
 *  SMS is actually sent. Migrate to `sendTemplatedSms()` with an
 *  approved sent.dm template, or use WhatsApp Cloud freeform when
 *  the recipient has messaged us in the last 24h.
 *
 *  The Twilio path is left in place behind the `SID && TOKEN` gate so
 *  re-enabling Twilio is one env-var flip away. */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (SID && TOKEN && SMS_FROM) {
    // Twilio path — only taken if creds get re-enabled.
    return twilioPost({ To: to, From: SMS_FROM, Body: body });
  }
  log.warn("sms.freeform_unsupported", {
    to,
    bodyPreview: body.slice(0, 60),
    hint: "Twilio disabled; sent.dm is template-only. Use sendTemplatedSms or migrate the alert to an approved template.",
  });
  return { ok: true, skipped: true };
}

/** Send a templated SMS — routes through sent.dm.
 *
 *  templateRef: sent.dm template id (UUID) or name.
 *  variables: substitutions matching the template placeholders.
 *  fallbackBody: kept in the signature for backwards compat. Used by
 *    the Twilio fallback (if creds get re-enabled) AND surfaced in
 *    the log line when no path is available so an admin can spot
 *    what would have been sent.
 */
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
    log.warn("sms.sent_dm_failed", { error: r.error, template: templateRef });
    // Fall through to Twilio if still configured — usually a no-op
    // since the account is disabled.
  }
  return sendSms(to, fallbackBody);
}

/** Send a freeform WhatsApp text. Routes through Meta Cloud API
 *  direct — works only inside the 24h customer-service window opened
 *  by an inbound message from the recipient. Outside that window,
 *  Meta returns error 131047 (re-engagement required) and callers
 *  must fall back to a template send via sendWhatsAppTemplate. */
export async function sendWhatsApp(to: string, body: string): Promise<SmsResult> {
  if (isWhatsAppCloudConfigured()) {
    const r = await sendFreeformWhatsApp(to, body);
    if (r.ok) return { ok: true, sid: r.messageId };
    return { ok: false, error: r.error };
  }
  // Twilio path — only taken if creds get re-enabled.
  if (SID && TOKEN && WA_FROM) {
    const normalizedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    return twilioPost({ To: normalizedTo, From: WA_FROM, Body: body });
  }
  log.info("whatsapp.freeform_skipped_unconfigured", { to });
  return { ok: true, skipped: true };
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
  options?: {
    sentDmTemplate?: string;
    /** Direct Cloud API template name (HSM name in WA Manager). When
     *  WHATSAPP_CLOUD_API_TOKEN + WHATSAPP_PHONE_NUMBER_ID are set
     *  this is preferred — saves the BSP fee Twilio/sent.dm add on top
     *  of Meta's per-template cost. */
    metaTemplate?: string;
    /** Language code for the Meta template — must match the locale
     *  the template was approved in. Defaults to "en". */
    metaLanguageCode?: string;
  },
): Promise<SmsResult> {
  // Path 1: Meta WhatsApp Cloud API direct — no BSP markup, cheapest.
  // Preferred when both the template name is provided and Cloud is
  // configured. Falls through to sent.dm / Twilio on failure so any
  // transient Meta hiccup still gets delivered.
  if (isWhatsAppCloudConfigured() && options?.metaTemplate) {
    // Cloud API uses positional body params. Caller passes variables
    // keyed by "1","2",..., matching the {{1}}, {{2}} substitutions
    // in the approved Meta template.
    const bodyVariables = Object.keys(variables)
      .filter((k) => /^\d+$/.test(k))
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => variables[k]);
    const r = await sendTemplateWhatsApp({
      to,
      templateName: options.metaTemplate,
      languageCode: options.metaLanguageCode,
      bodyVariables,
    });
    if (r.ok) return { ok: true, sid: r.messageId };
    log.warn("wa.meta_cloud_failed_falling_back", { error: r.error });
  }

  // Path 2: sent.dm BSP — cheaper than Twilio for template traffic
  // when Cloud isn't configured, or when the template hasn't been
  // synced to Meta Cloud yet.
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

  // Path 3: Twilio fallback — dead branch since the Twilio account
  // was disabled. Kept gated on SID + TOKEN so flipping creds back
  // on instantly restores it without a code change.
  if (SID && TOKEN && WA_FROM && contentSid) {
    const normalizedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    return twilioPost({
      To: normalizedTo,
      From: WA_FROM,
      ContentSid: contentSid,
      ContentVariables: JSON.stringify(variables),
    });
  }
  return { ok: true, skipped: true };
}

/** Voice calls via Twilio. Sent.dm doesn't offer voice; if Twilio is
 *  disabled, returns `{ok:true, skipped:true}` and logs a warning so
 *  the missing voice channel is visible without crashing the caller.
 *  Re-enabling Twilio creds restores voice. */
export async function sendVoice(to: string, twiml: string): Promise<SmsResult> {
  if (!SID || !TOKEN || !VOICE_FROM) {
    log.warn("voice.unsupported", {
      to,
      hint: "Twilio disabled and no replacement voice provider wired. Voice alerts won't fire.",
    });
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

/** True when *any* configured channel can deliver a templated SMS.
 *  Twilio (disabled) returns true only if creds are back. sent.dm is
 *  the live path while Twilio is down. */
export function isSmsConfigured(): boolean {
  return isSentDmConfigured() || Boolean(SID && TOKEN && SMS_FROM);
}
