// Direct Meta WhatsApp Cloud API client.
//
// Sent.dm is our BSP for outbound templates (cheaper than Twilio,
// passes Meta's per-template fees at cost). But sent.dm's REST API
// is strictly template-driven — there's no freeform-text path. Meta's
// own Cloud API DOES support freeform text messages within the 24h
// "customer service window" that opens whenever a user messages us,
// and those messages cost ZERO. That free window is what makes a
// real customer-care chatbot economically viable.
//
// This module talks to Meta's Cloud API directly to:
//   1. Send freeform replies inside the 24h session window
//   2. Receive inbound messages via webhooks
//   3. Verify the webhook handshake Meta requires on configuration
//
// Required env:
//   WHATSAPP_CLOUD_API_TOKEN       - permanent access token from Meta
//                                     App Dashboard → WhatsApp → API Setup
//   WHATSAPP_PHONE_NUMBER_ID       - the numeric id Meta assigns to
//                                     OduDoc's WhatsApp business phone
//                                     (visible on the same page)
//   WHATSAPP_WEBHOOK_VERIFY_TOKEN  - an arbitrary string you pick;
//                                     Meta echoes it back during the
//                                     one-time webhook verification

import { log } from "./log";

const GRAPH_API_VERSION = "v21.0";

function endpoint(path: string): string {
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${path}`;
}

function authHeaders() {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function normalisePhone(to: string): string {
  // Meta expects the recipient in E.164 without the leading "+".
  return to.replace(/^\+/, "");
}

export interface WhatsAppCloudResult {
  ok: boolean;
  skipped?: boolean;
  messageId?: string;
  error?: string;
}

export function isWhatsAppCloudConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_CLOUD_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
  );
}

/** Send a freeform text reply to a WhatsApp user. Only works inside
 *  the 24h customer service window opened by an inbound message from
 *  the same number. Outside that window Meta rejects with error
 *  131047 ("re-engagement required") and the call returns
 *  {ok:false, error:"outside_24h_window"} — callers should fall back
 *  to a template send via sent.dm in that case. */
export async function sendFreeformWhatsApp(
  to: string,
  body: string,
): Promise<WhatsAppCloudResult> {
  return postMessage({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalisePhone(to),
    type: "text",
    text: { body, preview_url: false },
  }, "sendFreeform");
}

/** Send an approved HSM (template) message via Meta Cloud API direct.
 *
 *  Templates are the only legal way to message a user outside the 24h
 *  customer-service window. Each template's `name` must match what
 *  Meta approved in the WA Manager. `languageCode` is typically
 *  "en" or "en_US"; check the approved language on each template.
 *
 *  `bodyVariables` are the positional {{1}}, {{2}}, ... substitutions
 *  in the template body. We package them into the canonical Cloud API
 *  shape (components → body → parameters). Use `headerImageUrl` /
 *  `headerDocumentUrl` for templates with a media header, and `buttons`
 *  for quick-reply or URL-button templates. */
export async function sendTemplateWhatsApp(opts: {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyVariables?: Array<string | number>;
  headerImageUrl?: string;
  headerDocument?: { url: string; filename?: string };
  /** Each entry is a positional sub for a button URL template's {{1}}. */
  buttonUrlVariables?: Array<{ index: number; value: string }>;
}): Promise<WhatsAppCloudResult> {
  const components: Array<Record<string, unknown>> = [];

  if (opts.headerImageUrl) {
    components.push({
      type: "header",
      parameters: [{ type: "image", image: { link: opts.headerImageUrl } }],
    });
  }
  if (opts.headerDocument) {
    components.push({
      type: "header",
      parameters: [{
        type: "document",
        document: {
          link: opts.headerDocument.url,
          filename: opts.headerDocument.filename,
        },
      }],
    });
  }
  if (opts.bodyVariables && opts.bodyVariables.length > 0) {
    components.push({
      type: "body",
      parameters: opts.bodyVariables.map((v) => ({
        type: "text",
        text: String(v),
      })),
    });
  }
  for (const btn of opts.buttonUrlVariables || []) {
    components.push({
      type: "button",
      sub_type: "url",
      index: String(btn.index),
      parameters: [{ type: "text", text: btn.value }],
    });
  }

  return postMessage({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalisePhone(opts.to),
    type: "template",
    template: {
      name: opts.templateName,
      language: { code: opts.languageCode || "en" },
      ...(components.length > 0 ? { components } : {}),
    },
  }, "sendTemplate");
}

/** Send a document (PDF, etc.) via WhatsApp. ONLY works inside the
 *  24h customer-service window — same constraint as sendFreeform.
 *  For outside-window document delivery use sendTemplateWhatsApp with
 *  a headerDocument media-header template. */
export async function sendDocumentWhatsApp(opts: {
  to: string;
  url: string;
  filename?: string;
  caption?: string;
}): Promise<WhatsAppCloudResult> {
  return postMessage({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalisePhone(opts.to),
    type: "document",
    document: {
      link: opts.url,
      filename: opts.filename,
      caption: opts.caption,
    },
  }, "sendDocument");
}

/** Interactive button reply (max 3 buttons, 20 char IDs). Inside the
 *  24h window only — same constraint as freeform. Use this for the
 *  appointment-reminder Reschedule/Cancel/Confirm flow when the
 *  patient has already opened a session by replying to anything. */
export async function sendInteractiveButtonsWhatsApp(opts: {
  to: string;
  bodyText: string;
  buttons: Array<{ id: string; title: string }>;
}): Promise<WhatsAppCloudResult> {
  return postMessage({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalisePhone(opts.to),
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: opts.bodyText },
      action: {
        buttons: opts.buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id.slice(0, 20), title: b.title.slice(0, 20) },
        })),
      },
    },
  }, "sendInteractive");
}

/** Shared transport: one POST to /{phoneNumberId}/messages with the
 *  caller's pre-built payload. Handles auth + error decoding + logging
 *  so each public sender stays a one-liner. */
async function postMessage(
  payload: Record<string, unknown>,
  tag: string,
): Promise<WhatsAppCloudResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const headers = authHeaders();
  if (!headers || !phoneNumberId) return { ok: true, skipped: true };

  try {
    const res = await fetch(endpoint(`${phoneNumberId}/messages`), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let parsed: {
      messages?: Array<{ id: string }>;
      error?: { code?: number; message?: string };
    } = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      /* keep parsed empty */
    }
    if (!res.ok) {
      const errMsg = parsed.error?.message || text.slice(0, 200) || `meta_${res.status}`;
      // Code 131047 = re-engagement required (24h window closed).
      const isWindowClosed = parsed.error?.code === 131047;
      log.warn(`whatsapp_cloud.${tag}.failed`, {
        status: res.status,
        error: errMsg,
        code: parsed.error?.code,
        windowClosed: isWindowClosed,
      });
      return { ok: false, error: isWindowClosed ? "outside_24h_window" : errMsg };
    }
    const messageId = parsed.messages?.[0]?.id;
    log.info(`whatsapp_cloud.${tag}.sent`, {
      messageId,
      to: (payload as { to?: string }).to,
    });
    return { ok: true, messageId };
  } catch (err) {
    log.error(`whatsapp_cloud.${tag}.threw`, err);
    return { ok: false, error: err instanceof Error ? err.message : "unreachable" };
  }
}

/** Health probe — call once on the admin /admin/whatsapp page to
 *  confirm credentials work without sending a real message. Returns
 *  the connected business display name + phone number on success. */
export async function pingWhatsAppCloud(): Promise<{
  ok: boolean;
  displayName?: string;
  verifiedName?: string;
  qualityRating?: string;
  error?: string;
}> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const headers = authHeaders();
  if (!headers || !phoneNumberId) {
    return { ok: false, error: "not_configured" };
  }
  try {
    const res = await fetch(endpoint(phoneNumberId), { headers });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `meta_${res.status}:${body.slice(0, 100)}` };
    }
    const data = (await res.json()) as {
      display_phone_number?: string;
      verified_name?: string;
      quality_rating?: string;
    };
    return {
      ok: true,
      displayName: data.display_phone_number,
      verifiedName: data.verified_name,
      qualityRating: data.quality_rating,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unreachable" };
  }
}
