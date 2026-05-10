// Provision Cloudflare Stream upload or live input for a surgery
// session. Called by /admin/surgery-video after the session row
// is created, or directly during scheduling.
//
// POST { sessionId, organizationId, mode: "upload" | "live" }
//   - "upload" → returns a one-shot uploadURL the encoder PUTs the
//     recording to. Patient + observers see the recording after.
//   - "live" → returns RTMPS ingest URL + stream key for the in-OT
//     encoder, plus the HLS playback URL viewers tune in to.
//
// Auth: hospital admin / staff / lead surgeon.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createDirectUpload, createLiveInput, getConfig } from "@/lib/surgery-video/providers/cloudflare";
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
    return NextResponse.json({
      error: "cloudflare_not_configured",
      hint: "Set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_STREAM_API_TOKEN in env.",
    }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const { sessionId, organizationId, mode } = body as { sessionId?: string; organizationId?: string; mode?: "upload" | "live" };
  if (!sessionId || !organizationId || (mode !== "upload" && mode !== "live")) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const surg = getSession(sessionId, organizationId);
  if (!surg) return NextResponse.json({ error: "session_not_found" }, { status: 404 });

  if (mode === "upload") {
    const r = await createDirectUpload({
      sessionId, maxDurationSeconds: 4 * 60 * 60, requireSignedURLs: true,
    });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
    setProviderDetails(sessionId, organizationId, { providerVideoId: r.videoId });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ uploadURL: r.uploadURL, videoId: r.videoId, expires: "1h" });
  }
  // live
  const r = await createLiveInput({ sessionId });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
  setProviderDetails(sessionId, organizationId, {
    providerVideoId: r.uid,
    ingestUrl: r.rtmpsUrl,
    ingestKey: r.rtmpsKey,
    livePlaybackUrl: r.playbackHlsUrl,
  });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  // Return ingest details ONLY to the lead surgeon / admin — the
  // stream key is a secret. Playback URL is fine to surface to
  // observers later via the gated /api/surgery-video?id= route.
  return NextResponse.json({
    uid: r.uid,
    rtmpsUrl: r.rtmpsUrl,
    rtmpsKey: r.rtmpsKey,
    playbackHlsUrl: r.playbackHlsUrl,
  });
}
