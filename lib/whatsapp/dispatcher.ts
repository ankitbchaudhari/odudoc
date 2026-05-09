// Outbound WhatsApp dispatcher.
//
// Wraps lib/sms.sendWhatsApp with template-rendering + conversation
// logging + opt-in enforcement. Feature owners (appointment system,
// lab module, pharmacy) call this rather than hitting Twilio directly
// so every message is auditable and every reply lands in the right
// thread.

import { sendWhatsApp } from "../sms";
import { TEMPLATES, renderTemplate, type WhatsAppTemplate } from "./templates";
import {
  ensureConversation,
  appendMessage,
  type WAConversation,
} from "./conversations-store";

export interface SendInput {
  patientUserId: string;
  organizationId: string;
  patientName: string;
  patientPhone: string;
  templateName: string;
  vars: Record<string, string | number | undefined>;
  /** Override the opt-in gate for emergency / safety messages. We
   *  always allow transactional templates without explicit opt-in
   *  but the caller can pin-flag this for audit. */
  forceTransactional?: boolean;
}

export interface SendResult {
  ok: boolean;
  /** When true the message was rejected because the patient has
   *  opted out of marketing — no message was sent. */
  skippedOptOut?: boolean;
  /** When true the provider is not configured (sandbox / staging). */
  skippedProvider?: boolean;
  conversationId?: string;
  messageId?: string;
  providerSid?: string;
  error?: string;
}

export async function sendTemplated(input: SendInput): Promise<SendResult> {
  const tmpl: WhatsAppTemplate | undefined = TEMPLATES[input.templateName];
  if (!tmpl) return { ok: false, error: `unknown_template:${input.templateName}` };

  const conv = ensureConversation({
    patientUserId: input.patientUserId,
    organizationId: input.organizationId,
    patientPhone: input.patientPhone,
    patientName: input.patientName,
  });

  // Marketing-template opt-in enforcement. Transactional + auth
  // templates ride on the service-relationship lawful basis and don't
  // require it. Honour cooldown if the patient recently opted out.
  if (tmpl.category === "marketing") {
    if (conv.optInStatus !== "opted_in") {
      return { ok: false, skippedOptOut: true, conversationId: conv.id };
    }
  }
  if (conv.cooldownUntil && new Date(conv.cooldownUntil).getTime() > Date.now()) {
    return { ok: false, skippedOptOut: true, conversationId: conv.id };
  }

  const body = renderTemplate(input.templateName, input.vars);
  const result = await sendWhatsApp(input.patientPhone, body);
  const message = appendMessage(conv.id, {
    direction: "outbound",
    channel: "whatsapp",
    body,
    templateName: input.templateName,
    providerSid: result.sid,
    status: result.skipped ? "queued" : result.ok ? "sent" : "failed",
  });

  return {
    ok: result.ok,
    skippedProvider: result.skipped || undefined,
    conversationId: conv.id,
    messageId: message?.id,
    providerSid: result.sid,
    error: result.error,
  };
}

/** Send a free-form (non-template) message, e.g. when a staff member
 *  replies inside the conversation console. WhatsApp policy allows
 *  free-form replies inside the 24h customer-service window after the
 *  patient's last inbound message; outside that window only templates
 *  are permitted. We surface that constraint in the result so the UI
 *  can warn before sending. */
export async function sendFreeform(input: {
  conversationId: string;
  patientPhone: string;
  body: string;
  staffEmail?: string;
}): Promise<SendResult> {
  const result = await sendWhatsApp(input.patientPhone, input.body);
  const message = appendMessage(input.conversationId, {
    direction: "outbound",
    channel: "whatsapp",
    body: input.body,
    providerSid: result.sid,
    status: result.skipped ? "queued" : result.ok ? "sent" : "failed",
    staffEmail: input.staffEmail,
  });
  return {
    ok: result.ok,
    skippedProvider: result.skipped || undefined,
    conversationId: input.conversationId,
    messageId: message?.id,
    providerSid: result.sid,
    error: result.error,
  };
}

/** Helper for callers who already know they want to log a conversation
 *  even when the provider is in sandbox. Returns the conversation
 *  with the new outbound row appended. */
export function logSimulatedOutbound(
  conv: WAConversation,
  body: string,
  templateName?: string,
): WAConversation {
  appendMessage(conv.id, {
    direction: "outbound",
    channel: "whatsapp",
    body,
    templateName,
    status: "queued",
  });
  return conv;
}
