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
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return { ok: true, skipped: true };

  // Meta expects the recipient in E.164 without the leading "+".
  const normalizedTo = to.replace(/^\+/, "");

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: normalizedTo,
          type: "text",
          text: { body, preview_url: false },
        }),
      },
    );
    const text = await res.text();
    let payload: {
      messages?: Array<{ id: string }>;
      error?: { code?: number; message?: string };
    } = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      /* keep payload empty */
    }
    if (!res.ok) {
      const errMsg = payload.error?.message || text.slice(0, 200) || `meta_${res.status}`;
      // Code 131047 = re-engagement required (24h window closed).
      // Surface it cleanly so callers can fall back to a template send.
      const isWindowClosed = payload.error?.code === 131047;
      log.warn("whatsapp_cloud.send_failed", {
        status: res.status,
        error: errMsg,
        code: payload.error?.code,
        windowClosed: isWindowClosed,
      });
      return { ok: false, error: isWindowClosed ? "outside_24h_window" : errMsg };
    }
    const messageId = payload.messages?.[0]?.id;
    log.info("whatsapp_cloud.sent", { messageId, to: normalizedTo });
    return { ok: true, messageId };
  } catch (err) {
    log.error("whatsapp_cloud.threw", err);
    return { ok: false, error: err instanceof Error ? err.message : "unreachable" };
  }
}
