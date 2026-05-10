// Provision Mux upload or live stream for a surgery session.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createDirectUpload, createLiveStream, getConfig } from "@/lib/surgery-video/providers/mux";
import { getSession, setProviderDetails } from "@/lib/surgery-video/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function role(session: Awaited<ReturnType<typeof getServerSession>> | null): string | undefined {
  const u = (session as { user?: { role?: string } } | null)?.user;
  return u?.role;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (role(session) !== "admin" && role(session) !== "staff" && role(session) !== "doctor") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!getConfig()) {
    return NextResponse.json({ error: "mux_not_configured", hint: "Set MUX_TOKEN_ID + MUX_TOKEN_SECRET." }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const { sessionId, organizationId, mode } = body as { sessionId?: string; organizationId?: string; mode?: "upload" | "live" };
  if (!sessionId || !organizationId || (mode !== "upload" && mode !== "live")) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const surg = getSession(sessionId, organizationId);
  if (!surg) return NextResponse.json({ error: "session_not_found" }, { status: 404 });

  if (mode === "upload") {
    const r = await createDirectUpload({ sessionId });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
    setProviderDetails(sessionId, organizationId, { providerVideoId: r.uploadId });
    try { await awaitAllFlushesStrict(); } catch { /* */ }
    return NextResponse.json({ uploadURL: r.uploadURL, uploadId: r.uploadId });
  }
  const r = await createLiveStream({ sessionId });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
  setProviderDetails(sessionId, organizationId, {
    providerVideoId: r.id,
    ingestUrl: r.rtmpsUrl,
    ingestKey: r.streamKey,
    livePlaybackUrl: `https://stream.mux.com/${r.playbackId}.m3u8`,
  });
  try { await awaitAllFlushesStrict(); } catch { /* */ }
  return NextResponse.json({
    id: r.id,
    rtmpsUrl: r.rtmpsUrl,
    rtmpsKey: r.streamKey,
    playbackHlsUrl: `https://stream.mux.com/${r.playbackId}.m3u8`,
    note: "Mux playback URLs require signing — wire MUX_SIGNING_KEY_* before live viewers can play.",
  });
}
