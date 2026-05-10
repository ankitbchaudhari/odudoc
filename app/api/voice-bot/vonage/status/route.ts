import { NextRequest } from "next/server";
import { getCall, endCall } from "@/lib/voice-bot/store";
import { verifyVonageSignature } from "@/lib/voice-bot/providers/vonage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface VonageStatusBody {
  uuid?: string;
  status?: string;     // "started" | "ringing" | "answered" | "completed" | "failed"
  duration?: string;
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyVonageSignature(raw, req.headers.get("x-vonage-signature"))) return new Response("forbidden", { status: 403 });
  let body: VonageStatusBody = {};
  try { body = JSON.parse(raw) as VonageStatusBody; } catch { /* */ }
  const callId = new URL(req.url).searchParams.get("callId");
  const session = callId ? getCall(callId) : null;
  if (!session) return new Response("ok", { status: 200 });
  if (body.status === "completed" || body.status === "failed") {
    endCall({
      callId: session.id,
      status: body.status === "completed" ? "completed" : "failed",
      outcome: { vonageStatus: body.status, duration: body.duration },
    });
  }
  return new Response("ok", { status: 200 });
}
