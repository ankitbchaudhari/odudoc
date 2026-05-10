// Exotel voice webhook. Same shape as the Twilio handler — verify
// shared secret, append speech fragment, classify, reply with ExoML.

import { NextRequest } from "next/server";
import {
  classifyIntent, exomlGreeting, exomlReply, getConfig, replyForIntent, verifyExotelSecret,
} from "@/lib/voice-bot/providers/exotel";
import { appendFragment, endCall, getCall, startCall } from "@/lib/voice-bot/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function exoml(xml: string, status = 200) {
  return new Response(xml, { status, headers: { "Content-Type": "text/xml; charset=utf-8" } });
}

export async function POST(req: NextRequest) {
  const cfg = getConfig();
  if (!cfg) return exoml(`<?xml version="1.0" encoding="UTF-8"?><Response><Speak>Service unavailable.</Speak></Response>`, 503);
  if (!verifyExotelSecret(req.url)) return exoml(`<?xml version="1.0" encoding="UTF-8"?><Response><Speak>Authentication failed.</Speak></Response>`, 403);

  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);

  const callId = new URL(req.url).searchParams.get("callId");
  const callSid = params.CallSid;
  const fromPhone = params.From;
  const speech = params.SpeechResult || params.Digits || "";
  const secret = process.env.EXOTEL_WEBHOOK_SECRET || "";

  if (!speech) {
    let session = callId ? getCall(callId) : null;
    if (!session) {
      const r = startCall({ fromPhone });
      if (r.ok) { session = r.session; session.providerSid = callSid; }
    }
    if (!session) return exoml(`<?xml version="1.0" encoding="UTF-8"?><Response><Speak>Service unavailable.</Speak></Response>`, 503);
    return exoml(exomlGreeting(session.id, cfg.publicBaseUrl, secret));
  }

  const session = callId ? getCall(callId) : null;
  if (!session) return exoml(`<?xml version="1.0" encoding="UTF-8"?><Response><Speak>Session expired.</Speak></Response>`, 410);
  appendFragment({ callId: session.id, role: "patient", text: speech });
  const intent = classifyIntent(speech);
  const reply = replyForIntent(intent.intent);
  appendFragment({ callId: session.id, role: "bot", text: reply.reply });
  if (reply.hangup) {
    endCall({ callId: session.id, status: "completed", outcome: { intent: intent.intent, confidence: intent.confidence, finalSpeech: speech } });
  }
  return exoml(exomlReply(reply.reply, reply.hangup, session.id, cfg.publicBaseUrl, secret));
}
