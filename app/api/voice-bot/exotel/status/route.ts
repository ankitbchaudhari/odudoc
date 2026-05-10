import { NextRequest } from "next/server";
import { getCall, endCall } from "@/lib/voice-bot/store";
import { verifyExotelSecret } from "@/lib/voice-bot/providers/exotel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!verifyExotelSecret(req.url)) return new Response("forbidden", { status: 403 });
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);
  const callId = new URL(req.url).searchParams.get("callId");
  const session = callId ? getCall(callId) : null;
  if (!session) return new Response("ok", { status: 200 });
  const status = params.CallStatus || params.DialCallStatus;
  if (status === "completed" || status === "failed" || status === "no-answer" || status === "busy") {
    endCall({
      callId: session.id,
      status: status === "completed" ? "completed" : "failed",
      outcome: { exotelStatus: status, recordingUrl: params.RecordingUrl },
    });
  }
  return new Response("ok", { status: 200 });
}
