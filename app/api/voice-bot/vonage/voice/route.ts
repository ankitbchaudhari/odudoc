import { NextRequest, NextResponse } from "next/server";
import {
  classifyIntent, getConfig, nccoGreeting, nccoReply, replyForIntent, verifyVonageSignature,
} from "@/lib/voice-bot/providers/vonage";
import { appendFragment, endCall, getCall, startCall } from "@/lib/voice-bot/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface VonageVoiceBody {
  uuid?: string; conversation_uuid?: string;
  from?: string; to?: string;
  speech?: { results?: Array<{ text?: string; confidence?: number }> };
}

export async function POST(req: NextRequest) {
  const cfg = getConfig();
  if (!cfg) return NextResponse.json([{ action: "talk", text: "Service unavailable." }], { status: 503 });
  const raw = await req.text();
  if (!verifyVonageSignature(raw, req.headers.get("x-vonage-signature"))) {
    return NextResponse.json([{ action: "talk", text: "Authentication failed." }], { status: 403 });
  }
  let body: VonageVoiceBody = {};
  try { body = JSON.parse(raw) as VonageVoiceBody; } catch { /* */ }

  const callId = new URL(req.url).searchParams.get("callId");
  const speech = body.speech?.results?.[0]?.text || "";

  if (!speech) {
    let session = callId ? getCall(callId) : null;
    if (!session) {
      const r = startCall({ fromPhone: body.from || "" });
      if (r.ok) { session = r.session; if (body.uuid) session.providerSid = body.uuid; }
    }
    if (!session) return NextResponse.json([{ action: "talk", text: "Service unavailable." }], { status: 503 });
    return NextResponse.json(nccoGreeting(session.id, cfg.publicBaseUrl));
  }

  const session = callId ? getCall(callId) : null;
  if (!session) return NextResponse.json([{ action: "talk", text: "Session expired." }], { status: 410 });
  appendFragment({ callId: session.id, role: "patient", text: speech });
  const intent = classifyIntent(speech);
  const reply = replyForIntent(intent.intent);
  appendFragment({ callId: session.id, role: "bot", text: reply.reply });
  if (reply.hangup) {
    endCall({ callId: session.id, status: "completed", outcome: { intent: intent.intent, confidence: intent.confidence, finalSpeech: speech } });
  }
  return NextResponse.json(nccoReply(reply.reply, reply.hangup, session.id, cfg.publicBaseUrl));
}
