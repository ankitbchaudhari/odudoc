// Voice-bot follow-up SMS sender.
//
// When the IVR promises "I'll text you a link", this is what actually
// sends the SMS. Each intent maps to a specific deep link on
// odudoc.com — the caller taps it from their SMS and lands on the
// right page already signed-in (via OTP) or as a guest with their
// phone pre-filled.
//
// Best-effort: errors are logged but never bubble up to the TwiML
// response — the caller has already heard the spoken confirmation.

import { notify } from "@/lib/notifications/notify";
import { log } from "@/lib/log";

type Intent =
  | "book_appointment"
  | "cancel_appointment"
  | "reschedule"
  | "callback_request"
  | "lab_result_question"
  | "rx_refill"
  | "general";

const BASE = "https://www.odudoc.com";

function deepLinkFor(intent: Intent, phone: string): string {
  // phone may be raw E.164 — encode for URL safely.
  const p = encodeURIComponent(phone);
  switch (intent) {
    case "book_appointment":     return `${BASE}/consult?phone=${p}&src=ivr`;
    case "cancel_appointment":   return `${BASE}/dashboard/consultations?phone=${p}&action=cancel&src=ivr`;
    case "reschedule":           return `${BASE}/dashboard/consultations?phone=${p}&action=reschedule&src=ivr`;
    case "rx_refill":            return `${BASE}/dashboard/adherence?phone=${p}&action=refill&src=ivr`;
    case "lab_result_question":  return `${BASE}/dashboard/labs?phone=${p}&src=ivr`;
    case "callback_request":     return `${BASE}/help?phone=${p}&src=ivr`;
    default:                     return `${BASE}/?phone=${p}&src=ivr`;
  }
}

const BODY: Record<Intent, (link: string) => string> = {
  book_appointment:    (l) => `OduDoc: tap to book a doctor — ${l}\nReply STOP to opt out.`,
  cancel_appointment:  (l) => `OduDoc: tap to cancel your appointment — ${l}`,
  reschedule:          (l) => `OduDoc: tap to reschedule — ${l}`,
  rx_refill:           (l) => `OduDoc: tap to confirm Rx refill — ${l}`,
  lab_result_question: (l) => `OduDoc: tap to view your latest reports — ${l}`,
  callback_request:    (l) => `OduDoc: our team will call you within 30 min. Open ${l} to track.`,
  general:             (l) => `OduDoc: visit ${l} to book or get help.`,
};

export async function sendFollowupSms(opts: {
  intent: Intent;
  phone: string;
}): Promise<{ ok: boolean; sid?: string; error?: string }> {
  if (!opts.phone) return { ok: false, error: "no_phone" };
  const link = deepLinkFor(opts.intent, opts.phone);
  const body = BODY[opts.intent](link);
  try {
    const r = await notify({
      channel: "sms",
      to: opts.phone,
      body,
      category: "appointment",
    });
    if (!r.ok) {
      log.warn("voice_followup.failed", { intent: opts.intent, error: r.error });
      return { ok: false, error: r.error };
    }
    log.info("voice_followup.sent", { intent: opts.intent, sid: r.providerId });
    return { ok: true, sid: r.providerId };
  } catch (e) {
    log.error("voice_followup.threw", { intent: opts.intent, error: String(e) });
    return { ok: false, error: String(e) };
  }
}
