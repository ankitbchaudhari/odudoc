// Twilio status callback. Updates session status when the call
// is queued / ringing / in-progress / completed / failed.

import { NextRequest } from "next/server";
import { getCall, endCall } from "@/lib/voice-bot/store";
import { getConfig, verifyTwilioSignature } from "@/lib/voice-bot/providers/twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cfg = getConfig();
  if (!cfg) return new Response("not configured", { status: 503 });
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);

  const ok = verifyTwilioSignature(cfg.authToken, req.url, params, req.headers.get("x-twilio-signature"));
  if (!ok) return new Response("forbidden", { status: 403 });

  const callId = new URL(req.url).searchParams.get("callId");
  const session = callId ? getCall(callId) : null;
  if (!session) return new Response("ok", { status: 200 });

  const callStatus = params.CallStatus;
  if (callStatus === "completed" || callStatus === "failed" || callStatus === "no-answer" || callStatus === "busy") {
    endCall({
      callId: session.id,
      status: callStatus === "completed" ? "completed" : "failed",
      outcome: { twilioStatus: callStatus, callDuration: params.CallDuration },
    });
  }
  return new Response("ok", { status: 200 });
}
