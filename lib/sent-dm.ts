// sent.dm client — unified SMS / WhatsApp / RCS via one POST.
//
// Endpoint: POST https://api.sent.dm/v3/messages
// Auth:     x-api-key header
// Body:     { to: [E.164], channel: ["sms"|"whatsapp"|"sent"], template: { id|name, parameters } }
//
// Sent.dm is template-driven for every send. Even SMS bodies are
// rendered from a template on their side — there's no free-form path.
// That means each distinct message we want to send (OTP, appointment
// confirm, lab ready, Rx delivered, etc.) needs its own template
// approved on sent.dm first. We address templates by name (WhatsApp,
// approved by Meta) or UUID (their internal id, fine for SMS).
//
// Configuration:
//   SENTDM_API_KEY                              — required
//   SENTDM_TEMPLATE_OTP                         — UUID/name of the OTP template
//   SENTDM_TEMPLATE_APPOINTMENT_CONFIRM         — appointment confirmation
//   SENTDM_TEMPLATE_LAB_READY                   — lab result ready
//   SENTDM_TEMPLATE_RX_DELIVERED                — Rx delivered
//
// On failure the caller should fall back to Twilio.

import { log } from "./log";

export interface SentDmResult {
  ok: boolean;
  skipped?: boolean;
  messageId?: string;
  requestId?: string;
  error?: string;
}

export function isSentDmConfigured(): boolean {
  return Boolean(process.env.SENTDM_API_KEY);
}

export interface SendMessageInput {
  /** E.164 recipient(s). One or many. */
  to: string | string[];
  /** Channel preference. `"sent"` lets sent.dm auto-pick (WA first,
   *  SMS fallback). Use a specific channel when you need control. */
  channel?: "sms" | "whatsapp" | "rcs" | "sent";
  /** Approved template — UUID or name. */
  template: string;
  /** Positional or named substitutions for the template. */
  variables?: Record<string, string>;
  /** Optional dedupe key — sent.dm honours `Idempotency-Key`. */
  idempotencyKey?: string;
}

/** Low-level send — fire one template message via sent.dm. Returns
 *  {ok, messageId, requestId} on 2xx, or {ok:false, error} otherwise.
 *  When SENTDM_API_KEY is unset we skip with {ok:true, skipped:true}
 *  so callers can wrap this in a "try sent.dm first then Twilio"
 *  chain without surfacing config errors. */
export async function sentDmSend(input: SendMessageInput): Promise<SentDmResult> {
  const key = process.env.SENTDM_API_KEY;
  if (!key) return { ok: true, skipped: true };

  const to = Array.isArray(input.to) ? input.to : [input.to];
  // Sent.dm requires E.164. Add the + if the caller forgot.
  const normalized = to.map((n) => (n.startsWith("+") ? n : `+${n.replace(/^\+/, "")}`));

  const body: Record<string, unknown> = {
    to: normalized,
    channel: [input.channel || "sent"],
    template: {
      // Accept either a UUID (template.id) or a name (template.name).
      // We can't tell which is which without a regex, but sent.dm
      // accepts either field — try name when the value isn't a uuid.
      ...(isUuid(input.template) ? { id: input.template } : { name: input.template }),
      parameters: input.variables || {},
    },
  };

  const headers: Record<string, string> = {
    "x-api-key": key,
    "accept": "application/json",
    "content-type": "application/json",
  };
  if (input.idempotencyKey) headers["Idempotency-Key"] = input.idempotencyKey;

  try {
    const res = await fetch("https://api.sent.dm/v3/messages", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let payload: { success?: boolean; data?: { recipients?: Array<{ message_id?: string }> }; meta?: { request_id?: string }; error?: { message?: string } } = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      /* non-JSON response — keep payload empty, surface raw text in error */
    }
    if (!res.ok || payload.success === false) {
      const errMsg = payload.error?.message || text.slice(0, 200) || `sent.dm_${res.status}`;
      log.warn("sent_dm.send_failed", {
        status: res.status,
        error: errMsg,
        template: input.template,
        to: normalized[0],
      });
      return { ok: false, error: errMsg };
    }
    const messageId = payload.data?.recipients?.[0]?.message_id;
    const requestId = payload.meta?.request_id;
    log.info("sent_dm.sent", { messageId, requestId, channel: input.channel || "sent" });
    return { ok: true, messageId, requestId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "sent_dm_unreachable";
    log.error("sent_dm.threw", err);
    return { ok: false, error: msg };
  }
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

// ── Convenience helpers for the common templated flows ─────────────
// Each helper resolves the right template id from env and falls back
// to {ok:false} if the template isn't configured yet — the caller
// should treat that the same as a send failure and fall back to a
// different transport.

export async function sendOtpViaSentDm(
  to: string,
  code: string,
  idempotencyKey?: string,
): Promise<SentDmResult> {
  const template = process.env.SENTDM_TEMPLATE_OTP;
  if (!template) return { ok: false, error: "SENTDM_TEMPLATE_OTP not set" };
  return sentDmSend({
    to,
    channel: "sms",
    template,
    variables: { code, otp: code },
    idempotencyKey,
  });
}

export async function sendAppointmentConfirmViaSentDm(
  to: string,
  variables: { patientName: string; doctorName: string; dateTime: string },
  idempotencyKey?: string,
): Promise<SentDmResult> {
  const template = process.env.SENTDM_TEMPLATE_APPOINTMENT_CONFIRM;
  if (!template) return { ok: false, error: "SENTDM_TEMPLATE_APPOINTMENT_CONFIRM not set" };
  return sentDmSend({
    to,
    channel: "whatsapp",
    template,
    // Sent.dm accepts named params, mirroring the Meta template.
    variables: {
      patient_name: variables.patientName,
      doctor_name: variables.doctorName,
      datetime: variables.dateTime,
    },
    idempotencyKey,
  });
}

export async function sendLabReadyViaSentDm(
  to: string,
  variables: { patientName: string; testName: string; viewUrl: string },
  idempotencyKey?: string,
): Promise<SentDmResult> {
  const template = process.env.SENTDM_TEMPLATE_LAB_READY;
  if (!template) return { ok: false, error: "SENTDM_TEMPLATE_LAB_READY not set" };
  return sentDmSend({
    to,
    channel: "whatsapp",
    template,
    variables: {
      patient_name: variables.patientName,
      test_name: variables.testName,
      view_url: variables.viewUrl,
    },
    idempotencyKey,
  });
}

export async function sendRxDeliveredViaSentDm(
  to: string,
  variables: { patientName: string; orderId: string },
  idempotencyKey?: string,
): Promise<SentDmResult> {
  const template = process.env.SENTDM_TEMPLATE_RX_DELIVERED;
  if (!template) return { ok: false, error: "SENTDM_TEMPLATE_RX_DELIVERED not set" };
  return sentDmSend({
    to,
    channel: "whatsapp",
    template,
    variables: {
      patient_name: variables.patientName,
      order_id: variables.orderId,
    },
    idempotencyKey,
  });
}
