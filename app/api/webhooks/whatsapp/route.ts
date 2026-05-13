// GET / POST /api/webhooks/whatsapp
//
// Meta's WhatsApp Cloud API delivers inbound messages here. Two
// distinct flows hit the same path:
//
//   GET  — Webhook verification handshake. Meta calls this once on
//          configuration (and occasionally to re-verify). We echo
//          back hub.challenge if hub.verify_token matches the env
//          var we control. Without this step Meta refuses to enable
//          the webhook subscription.
//
//   POST — Inbound message event. Meta posts a JSON payload every
//          time a user sends us a message. We extract the text +
//          sender, run the chatbot router for an intent + reply,
//          send the reply back via Meta Cloud API (FREE inside the
//          24h customer-service window opened by this very message),
//          and persist any side-effects (opt-out for STOP, etc.).
//
// Must respond fast — Meta retries with exponential backoff if we
// take longer than ~5s, which could double-send replies. Acknowledge
// with 200 and process async-ish (within the same request, but no
// blocking external calls beyond the reply send).

import { NextRequest, NextResponse } from "next/server";
import { chatbotRespond } from "@/lib/whatsapp-chatbot";
import { sendFreeformWhatsApp } from "@/lib/whatsapp-cloud";
import { recordOptOut, removeOptOut } from "@/lib/notifications/phone-opt-out-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Meta's verification handshake. They GET our webhook URL with three
// query params; we must echo `hub.challenge` if the verify token
// matches. If we don't match, Meta marks the webhook unverified and
// won't deliver inbound messages.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token && expected && token === expected) {
    log.info("whatsapp_webhook.verified");
    // Plain text response — Meta requires the challenge echoed as-is,
    // not JSON-wrapped.
    return new Response(challenge || "", { status: 200, headers: { "content-type": "text/plain" } });
  }
  log.warn("whatsapp_webhook.verify_failed", { mode, hasToken: !!token, hasExpected: !!expected });
  return new Response("forbidden", { status: 403 });
}

// Inbound message payload. Meta wraps each event in
//   { entry: [{ changes: [{ value: { messages: [...], contacts: [...] } }] }] }
// We don't reply to every event type — only `text` messages get bot
// responses. Status events (sent / delivered / read) are logged then
// ignored.
interface MetaWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
          button?: { text: string; payload?: string };
          interactive?: { button_reply?: { id: string; title: string } };
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          recipient_id: string;
        }>;
        contacts?: Array<{ wa_id: string; profile?: { name?: string } }>;
      };
    }>;
  }>;
}

export async function POST(req: NextRequest) {
  let payload: MetaWebhookPayload = {};
  try {
    payload = (await req.json()) as MetaWebhookPayload;
  } catch (err) {
    log.warn("whatsapp_webhook.bad_json", {
      error: err instanceof Error ? err.message : String(err),
    });
    // Return 200 anyway — Meta retries on non-200, and we'd just keep
    // getting the same malformed body. Logged for inspection.
    return NextResponse.json({ ok: true });
  }

  // ACK fast: collect all the work-to-do, fire-and-forget the replies.
  const work: Promise<unknown>[] = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value) continue;

      // Delivery status events — log only, no reply needed.
      if (value.statuses) {
        for (const s of value.statuses) {
          log.info("whatsapp_webhook.status", {
            id: s.id, status: s.status, to: s.recipient_id,
          });
        }
      }

      // Inbound messages — the interesting case.
      for (const msg of value.messages || []) {
        // Extract the text body across all message subtypes Meta sends.
        const body =
          msg.text?.body ??
          msg.button?.text ??
          msg.interactive?.button_reply?.title ??
          "";

        if (!body) {
          log.info("whatsapp_webhook.non_text_inbound", { type: msg.type, from: msg.from });
          continue;
        }

        const reply = chatbotRespond({
          body,
          from: msg.from,
          receivedAt: new Date(Number(msg.timestamp) * 1000).toISOString(),
        });

        log.info("whatsapp_webhook.chatbot_reply", {
          from: msg.from,
          intent: reply.intent,
          inboundPreview: body.slice(0, 60),
        });

        // Side-effects keyed by intent. Persist them BEFORE sending
        // the reply so the patient's next outbound dispatch sees the
        // updated preference (e.g. STOP -> opt-out flag respected on
        // the next OTP we'd otherwise send).
        if (reply.intent === "stop") {
          work.push(
            (async () => {
              try {
                // msg.from from Meta omits the leading "+". The
                // store normalises either way.
                recordOptOut(msg.from);
              } catch (err) {
                log.warn("whatsapp_webhook.opt_out_persist_failed", {
                  error: err instanceof Error ? err.message : String(err),
                });
              }
            })(),
          );
        } else if (reply.intent === "start") {
          work.push(
            (async () => {
              try {
                removeOptOut(msg.from);
              } catch (err) {
                log.warn("whatsapp_webhook.opt_out_remove_failed", {
                  error: err instanceof Error ? err.message : String(err),
                });
              }
            })(),
          );
        }

        // Send the reply via Meta Cloud API freeform — FREE within
        // the 24h window opened by this inbound message. Fire-and-
        // forget so Meta sees a quick 200 on this webhook.
        work.push(
          sendFreeformWhatsApp(msg.from, reply.body).then((r) => {
            if (!r.ok) {
              log.warn("whatsapp_webhook.reply_failed", {
                to: msg.from, error: r.error, intent: reply.intent,
              });
            }
          }),
        );
      }
    }
  }

  // Wait for all replies + side-effects with a soft deadline so we
  // ACK Meta within their ~5s retry window. If something hangs we
  // return 200 anyway — replies that race past the deadline still
  // get sent (the work array continues running until completion),
  // but Meta gets its ACK.
  try {
    await Promise.race([
      Promise.allSettled(work),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  } catch (err) {
    log.warn("whatsapp_webhook.work_settled_threw", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ ok: true });
}
