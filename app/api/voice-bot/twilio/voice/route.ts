// Twilio voice webhook.
//
// Twilio POSTs application/x-www-form-urlencoded to this URL on
// every IVR turn. We verify the X-Twilio-Signature, append the
// patient's transcribed speech to the session, classify intent,
// and respond with the next TwiML chunk.
//
// CallSid (Twilio's stable id) is captured into the providerSid so
// the front-office UI can match a transcript back to the call log.

import { NextRequest, NextResponse } from "next/server";
import {
  classifyIntent, getConfig, replyForIntent, verifyTwilioSignature,
  voiceTwimlForGreeting, voiceTwimlForReply,
} from "@/lib/voice-bot/providers/twilio";
import {
  appendFragment, getCall, startCall, endCall,
} from "@/lib/voice-bot/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function twimlResponse(xml: string, status = 200): Response {
  return new Response(xml, {
    status,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export async function POST(req: NextRequest) {
  const cfg = getConfig();
  if (!cfg) {
    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Service unavailable.</Say></Response>`, 503);
  }

  // Twilio sends form data, not JSON.
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);

  // Verify signature against the absolute URL Twilio actually hit.
  // Behind a proxy, NextRequest.url is correct because Next reflects
  // the original URL.
  const url = req.url;
  const ok = verifyTwilioSignature(cfg.authToken, url, params, req.headers.get("x-twilio-signature"));
  if (!ok) {
    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Authentication failed.</Say></Response>`, 403);
  }

  const callId = new URL(req.url).searchParams.get("callId");
  const callSid = params.CallSid;
  const fromPhone = params.From;
  const speech = params.SpeechResult || "";

  // First IVR turn — no SpeechResult yet; play the greeting.
  if (!speech) {
    let session = callId ? getCall(callId) : null;
    // Fresh inbound call: create a session keyed on Twilio's CallSid
    // so retries in flight don't double-create.
    if (!session) {
      const r = startCall({ fromPhone });
      if (r.ok) {
        session = r.session;
        session.providerSid = callSid;
      }
    }
    if (session) {
      return twimlResponse(voiceTwimlForGreeting(session.id, cfg.publicBaseUrl, { lang: params.Language }));
    }
    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Service unavailable.</Say></Response>`, 503);
  }

  // We have a transcribed utterance. Append + classify + reply.
  const session = callId ? getCall(callId) : null;
  if (!session) {
    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Session expired.</Say><Hangup/></Response>`, 410);
  }
  appendFragment({ callId: session.id, role: "patient", text: speech });

  const intent = classifyIntent(speech);
  const reply = replyForIntent(intent.intent);
  appendFragment({ callId: session.id, role: "bot", text: reply.reply });

  if (reply.hangup) {
    endCall({ callId: session.id, status: "completed", outcome: { intent: intent.intent, confidence: intent.confidence, finalSpeech: speech } });
  }

  return twimlResponse(voiceTwimlForReply(reply.reply, session.id, cfg.publicBaseUrl, { hangup: reply.hangup, lang: params.Language }));
}

// Placeholder GET for Twilio's URL-validity probe.
export async function GET() {
  return NextResponse.json({ ok: true, configured: !!getConfig() });
}
