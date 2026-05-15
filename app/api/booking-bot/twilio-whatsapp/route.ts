// Twilio WhatsApp / SMS booking webhook.
//
// Configure this URL in Twilio's WhatsApp sandbox or business sender
// → "When a message comes in" → POST. Same number can serve SMS too.
// We reuse the Twilio signature verifier from the voice plug-in.

import { NextRequest } from "next/server";
import { getConfig, verifyTwilioSignature } from "@/lib/voice-bot/providers/twilio";
import { appendMessage, findOrCreate, nextTurn, setStage, reloadBookingBot, type Channel } from "@/lib/booking-bot/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function twiml(xml: string, status = 200) {
  return new Response(xml, { status, headers: { "Content-Type": "text/xml; charset=utf-8" } });
}

export async function POST(req: NextRequest) {
  const cfg = getConfig();
  if (!cfg) return twiml(`<?xml version="1.0"?><Response><Message>Service unavailable.</Message></Response>`, 503);

  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);
  const ok = verifyTwilioSignature(cfg.authToken, req.url, params, req.headers.get("x-twilio-signature"));
  if (!ok) return twiml(`<?xml version="1.0"?><Response><Message>Authentication failed.</Message></Response>`, 403);

  // Twilio prefixes WhatsApp numbers with "whatsapp:". Strip + use
  // that prefix to detect the channel.
  const rawFrom = params.From || "";
  const channel: Channel = rawFrom.startsWith("whatsapp:") ? "whatsapp" : "sms";
  const fromPhone = rawFrom.replace(/^whatsapp:/, "");
  const text = params.Body || "";
  if (!fromPhone || !text) return twiml(`<?xml version="1.0"?><Response/>`);

  // Reload so a conversation row created by a sibling Lambda on a
  // prior message is visible — otherwise the bot restarts the
  // patient's flow from "awaiting_intent" on every other turn.
  await reloadBookingBot();
  const conversation = findOrCreate(channel, fromPhone);
  appendMessage(conversation, "patient", text);
  const turn = nextTurn(conversation, text);
  appendMessage(conversation, "bot", turn.reply);
  setStage(conversation, turn.stage, turn.slots);

  // TwiML <Message> response — Twilio relays it back to the user
  // on the same channel without us calling the REST API.
  const escaped = turn.reply.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return twiml(`<?xml version="1.0"?>\n<Response><Message>${escaped}</Message></Response>`);
}
