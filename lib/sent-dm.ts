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
import { isPhoneOptedOut } from "./notifications/phone-opt-out-store";

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

  // Respect chatbot-side STOP opt-outs. The chatbot writes to the
  // phone-opt-out store when a patient replies STOP. Outbound to
  // those numbers is dropped — except OTP / Authentication
  // templates, which carriers consider transactional regardless of
  // opt-out (and which the patient explicitly requested by typing
  // their phone into a login form).
  const isOtpTemplate =
    /\b(otp|verify|auth|verification)\b/i.test(input.template);
  if (!isOtpTemplate) {
    const filtered = normalized.filter((n) => {
      if (isPhoneOptedOut(n)) {
        log.info("sent_dm.skipped_opted_out", { to: n, template: input.template });
        return false;
      }
      return true;
    });
    if (filtered.length === 0) {
      return { ok: true, skipped: true, error: "all_recipients_opted_out" };
    }
    // Replace the recipient list in place so the downstream body
    // build sees the filtered set.
    normalized.length = 0;
    normalized.push(...filtered);
  }

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
  opts?: { name?: string; idempotencyKey?: string },
): Promise<SentDmResult> {
  const template = process.env.SENTDM_TEMPLATE_OTP;
  if (!template) return { ok: false, error: "SENTDM_TEMPLATE_OTP not set" };
  return sentDmSend({
    to,
    channel: "sms",
    template,
    // Pass both code aliases (`code`, `otp`) and the patient's first
    // name so the same call works regardless of which variable names
    // the approved sent.dm template uses. Sent.dm ignores unused keys.
    variables: {
      code,
      otp: code,
      name: opts?.name || "there",
      first_name: opts?.name || "there",
      // sent.dm enforces camelCase variable names. Include the
      // camelCase aliases so templates renamed to {{verificationCode}}
      // / {{userName}} / {{firstName}} all resolve correctly.
      verificationCode: code,
      otpCode: code,
      userName: opts?.name || "there",
      firstName: opts?.name || "there",
    },
    idempotencyKey: opts?.idempotencyKey,
  });
}

export async function sendAppointmentConfirmViaSentDm(
  to: string,
  variables: { patientName: string; doctorName: string; date: string; time: string },
  idempotencyKey?: string,
): Promise<SentDmResult> {
  const template = process.env.SENTDM_TEMPLATE_APPOINTMENT_CONFIRM;
  if (!template) return { ok: false, error: "SENTDM_TEMPLATE_APPOINTMENT_CONFIRM not set" };
  return sentDmSend({
    to,
    channel: "whatsapp",
    template,
    // Imported template uses {{var_1}}..{{var_4}} placeholders.
    // Also pass the friendly aliases (patient_name, etc.) so any
    // future template using named placeholders works without code
    // changes. Sent.dm ignores unused keys.
    variables: {
      // Positional (var_1..var_4) for templates that haven't been
      // renamed yet.
      var_1: variables.patientName,
      var_2: variables.doctorName,
      var_3: variables.date,
      var_4: variables.time,
      // Snake-case + camelCase aliases. sent.dm requires camelCase
      // for variable names so the renamed template uses these.
      patient_name: variables.patientName,
      doctor_name: variables.doctorName,
      date: variables.date,
      time: variables.time,
      patientName: variables.patientName,
      doctorName: variables.doctorName,
      appointmentDate: variables.date,
      appointmentTime: variables.time,
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
      "1": variables.patientName,
      "2": variables.orderId,
      patient_name: variables.patientName,
      order_id: variables.orderId,
      patientName: variables.patientName,
      orderId: variables.orderId,
    },
    idempotencyKey,
  });
}

// ── New high-priority templates (May 2026 batch) ──────────────────

export async function sendAppointmentReminderViaSentDm(
  to: string,
  variables: { patientName: string; doctorName: string; date: string; time: string },
  idempotencyKey?: string,
): Promise<SentDmResult> {
  const template = process.env.SENTDM_TEMPLATE_APPOINTMENT_REMINDER;
  if (!template) return { ok: false, error: "SENTDM_TEMPLATE_APPOINTMENT_REMINDER not set" };
  return sentDmSend({
    to,
    channel: "whatsapp",
    template,
    variables: {
      "1": variables.patientName,
      "2": variables.doctorName,
      "3": variables.date,
      "4": variables.time,
      patient_name: variables.patientName,
      doctor_name: variables.doctorName,
      date: variables.date,
      time: variables.time,
      patientName: variables.patientName,
      doctorName: variables.doctorName,
    },
    idempotencyKey,
  });
}

export async function sendAppointmentCancelledViaSentDm(
  to: string,
  variables: { patientName: string; doctorName: string; dateTime: string; refundAmount: string | number },
  idempotencyKey?: string,
): Promise<SentDmResult> {
  const template = process.env.SENTDM_TEMPLATE_APPOINTMENT_CANCELLED;
  if (!template) return { ok: false, error: "SENTDM_TEMPLATE_APPOINTMENT_CANCELLED not set" };
  return sentDmSend({
    to,
    channel: "whatsapp",
    template,
    variables: {
      "1": variables.patientName,
      "2": variables.doctorName,
      "3": variables.dateTime,
      "4": String(variables.refundAmount),
      patient_name: variables.patientName,
      doctor_name: variables.doctorName,
      datetime: variables.dateTime,
      refund_amount: String(variables.refundAmount),
      patientName: variables.patientName,
      doctorName: variables.doctorName,
      refundAmount: String(variables.refundAmount),
    },
    idempotencyKey,
  });
}

export async function sendPrescriptionReadyViaSentDm(
  to: string,
  variables: { patientName: string; doctorName: string },
  idempotencyKey?: string,
): Promise<SentDmResult> {
  const template = process.env.SENTDM_TEMPLATE_PRESCRIPTION_READY;
  if (!template) return { ok: false, error: "SENTDM_TEMPLATE_PRESCRIPTION_READY not set" };
  return sentDmSend({
    to,
    channel: "whatsapp",
    template,
    variables: {
      "1": variables.patientName,
      "2": variables.doctorName,
      patient_name: variables.patientName,
      doctor_name: variables.doctorName,
      patientName: variables.patientName,
      doctorName: variables.doctorName,
    },
    idempotencyKey,
  });
}

export async function sendWelcomePatientViaSentDm(
  to: string,
  variables: { patientName: string },
  idempotencyKey?: string,
): Promise<SentDmResult> {
  const template = process.env.SENTDM_TEMPLATE_WELCOME_PATIENT;
  if (!template) return { ok: false, error: "SENTDM_TEMPLATE_WELCOME_PATIENT not set" };
  return sentDmSend({
    to,
    channel: "whatsapp",
    template,
    variables: {
      "1": variables.patientName,
      patient_name: variables.patientName,
      patientName: variables.patientName,
      name: variables.patientName,
    },
    idempotencyKey,
  });
}

export async function sendDoctorNewAppointmentViaSentDm(
  to: string,
  variables: {
    doctorName: string;
    patientName: string;
    date: string;
    time: string;
    chiefComplaint: string;
  },
  idempotencyKey?: string,
): Promise<SentDmResult> {
  const template = process.env.SENTDM_TEMPLATE_DOCTOR_NEW_APPOINTMENT;
  if (!template) return { ok: false, error: "SENTDM_TEMPLATE_DOCTOR_NEW_APPOINTMENT not set" };
  return sentDmSend({
    to,
    channel: "whatsapp",
    template,
    variables: {
      "1": variables.doctorName,
      "2": variables.patientName,
      "3": variables.date,
      "4": variables.time,
      "5": variables.chiefComplaint,
      doctor_name: variables.doctorName,
      patient_name: variables.patientName,
      date: variables.date,
      time: variables.time,
      chief_complaint: variables.chiefComplaint,
      doctorName: variables.doctorName,
      patientName: variables.patientName,
      chiefComplaint: variables.chiefComplaint,
    },
    idempotencyKey,
  });
}

// ── Medium-priority templates (May 2026 second batch) ─────────────

export async function sendPaymentFailedViaSentDm(
  to: string,
  variables: { patientName: string; amount: string | number; doctorName: string },
  idempotencyKey?: string,
): Promise<SentDmResult> {
  const template = process.env.SENTDM_TEMPLATE_PAYMENT_FAILED;
  if (!template) return { ok: false, error: "SENTDM_TEMPLATE_PAYMENT_FAILED not set" };
  return sentDmSend({
    to, channel: "whatsapp", template,
    variables: {
      "1": variables.patientName, "2": String(variables.amount), "3": variables.doctorName,
      patient_name: variables.patientName, amount: String(variables.amount), doctor_name: variables.doctorName,
      patientName: variables.patientName, doctorName: variables.doctorName,
    },
    idempotencyKey,
  });
}

export async function sendWalletTopupViaSentDm(
  to: string,
  variables: { patientName: string; amount: string | number; balance: string | number },
  idempotencyKey?: string,
): Promise<SentDmResult> {
  const template = process.env.SENTDM_TEMPLATE_WALLET_TOPUP;
  if (!template) return { ok: false, error: "SENTDM_TEMPLATE_WALLET_TOPUP not set" };
  return sentDmSend({
    to, channel: "whatsapp", template,
    variables: {
      "1": variables.patientName, "2": String(variables.amount), "3": String(variables.balance),
      patient_name: variables.patientName, amount: String(variables.amount), balance: String(variables.balance),
      patientName: variables.patientName,
    },
    idempotencyKey,
  });
}

export async function sendWithdrawalProcessedViaSentDm(
  to: string,
  variables: { doctorName: string; amount: string | number; accountLast4: string; reference: string },
  idempotencyKey?: string,
): Promise<SentDmResult> {
  const template = process.env.SENTDM_TEMPLATE_WITHDRAWAL_PROCESSED;
  if (!template) return { ok: false, error: "SENTDM_TEMPLATE_WITHDRAWAL_PROCESSED not set" };
  return sentDmSend({
    to, channel: "whatsapp", template,
    variables: {
      "1": variables.doctorName, "2": String(variables.amount),
      "3": variables.accountLast4, "4": variables.reference,
      doctor_name: variables.doctorName, amount: String(variables.amount),
      account_last4: variables.accountLast4, reference: variables.reference,
      doctorName: variables.doctorName,
    },
    idempotencyKey,
  });
}

export async function sendRefundProcessedViaSentDm(
  to: string,
  variables: { patientName: string; amount: string | number; reason: string; reference: string },
  idempotencyKey?: string,
): Promise<SentDmResult> {
  const template = process.env.SENTDM_TEMPLATE_REFUND_PROCESSED;
  if (!template) return { ok: false, error: "SENTDM_TEMPLATE_REFUND_PROCESSED not set" };
  return sentDmSend({
    to, channel: "whatsapp", template,
    variables: {
      "1": variables.patientName, "2": String(variables.amount),
      "3": variables.reason, "4": variables.reference,
      patient_name: variables.patientName, amount: String(variables.amount),
      reason: variables.reason, reference: variables.reference,
      patientName: variables.patientName,
    },
    idempotencyKey,
  });
}

export async function sendFollowupReminderViaSentDm(
  to: string,
  variables: { patientName: string; timeElapsed: string; doctorName: string },
  idempotencyKey?: string,
): Promise<SentDmResult> {
  const template = process.env.SENTDM_TEMPLATE_FOLLOWUP_REMINDER;
  if (!template) return { ok: false, error: "SENTDM_TEMPLATE_FOLLOWUP_REMINDER not set" };
  return sentDmSend({
    to, channel: "whatsapp", template,
    variables: {
      "1": variables.patientName, "2": variables.timeElapsed, "3": variables.doctorName,
      patient_name: variables.patientName, time_elapsed: variables.timeElapsed, doctor_name: variables.doctorName,
      patientName: variables.patientName, doctorName: variables.doctorName,
    },
    idempotencyKey,
  });
}

// ── Low-priority templates (less typical but ready when needed) ───

export async function sendVitalAlertViaSentDm(
  to: string,
  variables: { patientName: string; vitalType: string; value: string },
  idempotencyKey?: string,
): Promise<SentDmResult> {
  const template = process.env.SENTDM_TEMPLATE_VITAL_ALERT;
  if (!template) return { ok: false, error: "SENTDM_TEMPLATE_VITAL_ALERT not set" };
  return sentDmSend({
    to, channel: "whatsapp", template,
    variables: {
      "1": variables.patientName, "2": variables.vitalType, "3": variables.value,
      patient_name: variables.patientName, vital_type: variables.vitalType, value: variables.value,
      patientName: variables.patientName, vitalType: variables.vitalType,
    },
    idempotencyKey,
  });
}

export async function sendCarePlanReminderViaSentDm(
  to: string,
  variables: { patientName: string; condition: string; todayAction: string },
  idempotencyKey?: string,
): Promise<SentDmResult> {
  const template = process.env.SENTDM_TEMPLATE_CARE_PLAN_REMINDER;
  if (!template) return { ok: false, error: "SENTDM_TEMPLATE_CARE_PLAN_REMINDER not set" };
  return sentDmSend({
    to, channel: "whatsapp", template,
    variables: {
      "1": variables.patientName, "2": variables.condition, "3": variables.todayAction,
      patient_name: variables.patientName, condition: variables.condition, today_action: variables.todayAction,
      patientName: variables.patientName, todayAction: variables.todayAction,
    },
    idempotencyKey,
  });
}

export async function sendInsurancePreauthViaSentDm(
  to: string,
  variables: { patientName: string; procedure: string; hospital: string; status: string; context: string },
  idempotencyKey?: string,
): Promise<SentDmResult> {
  const template = process.env.SENTDM_TEMPLATE_INSURANCE_PREAUTH;
  if (!template) return { ok: false, error: "SENTDM_TEMPLATE_INSURANCE_PREAUTH not set" };
  return sentDmSend({
    to, channel: "whatsapp", template,
    variables: {
      "1": variables.patientName, "2": variables.procedure,
      "3": variables.hospital, "4": variables.status, "5": variables.context,
      patient_name: variables.patientName, procedure: variables.procedure,
      hospital: variables.hospital, status: variables.status, context: variables.context,
      patientName: variables.patientName,
    },
    idempotencyKey,
  });
}
