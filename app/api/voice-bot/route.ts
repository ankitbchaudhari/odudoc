// Voice-call bot API.
//
// Provider-agnostic. Active only when VOICE_BOT_PROVIDER is set;
// otherwise every endpoint returns 503 with reason="voice_bot_not_configured".
//
// POST { action: "start" | "fragment" | "end" }
// GET  ?callId= → single session
// GET  ?patientUserId= → patient's calls (admin only)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  appendFragment, endCall, getCall, isConfigured, listSessions, startCall, activeProvider,
} from "@/lib/voice-bot/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function role(session: Awaited<ReturnType<typeof getServerSession>> | null): string | undefined {
  const u = (session as { user?: { role?: string } } | null)?.user;
  return u?.role;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const callId = url.searchParams.get("callId");
  if (callId) {
    const s = getCall(callId);
    if (!s) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ call: s, configured: isConfigured(), provider: activeProvider() });
  }
  const patientUserId = url.searchParams.get("patientUserId");
  if (patientUserId && role(session) !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    configured: isConfigured(),
    provider: activeProvider(),
    sessions: listSessions({ patientUserId: patientUserId || undefined, limit: 50 }),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isConfigured()) {
    return NextResponse.json({
      error: "voice_bot_not_configured",
      hint: "Set VOICE_BOT_PROVIDER + VOICE_BOT_API_KEY in env to enable.",
    }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const action = body.action;
  if (action === "start") {
    if (!body.fromPhone) return NextResponse.json({ error: "missing_phone" }, { status: 400 });
    const r = startCall({ fromPhone: String(body.fromPhone), toPhone: body.toPhone, patientUserId: body.patientUserId });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ call: r.session });
  }
  if (action === "fragment") {
    if (!body.callId || !body.role || !body.text) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    const s = appendFragment({ callId: body.callId, role: body.role, text: body.text });
    if (!s) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ call: s });
  }
  if (action === "end") {
    if (!body.callId) return NextResponse.json({ error: "missing_call_id" }, { status: 400 });
    const s = endCall({ callId: body.callId, outcome: body.outcome, status: body.status });
    if (!s) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ call: s });
  }
  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
