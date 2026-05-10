// Cloudflare Stream webhook.
//
// Cloudflare POSTs lifecycle events to this URL when a recording
// finishes uploading, a live input connects, recording becomes
// ready, etc. We verify the HMAC-SHA-256 signature, look up the
// matching session by the videoId we stored at provision time, and
// flip the session into "live" / "completed" with the recording URL.
//
// Configure the webhook in Cloudflare's dashboard against this URL,
// and set CLOUDFLARE_STREAM_WEBHOOK_SECRET in env to match.

import { NextRequest } from "next/server";
import { verifyWebhookSignature, getConfig } from "@/lib/surgery-video/providers/cloudflare";
import {
  endSession, findByProviderVideoId, startSession,
} from "@/lib/surgery-video/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CloudflareEvent {
  uid?: string;
  status?: { state?: string };
  duration?: number;
  size?: number;
  preview?: string;
  playback?: { hls?: string; dash?: string };
  meta?: { sessionId?: string; source?: string };
  // Live-input shape:
  liveInput?: { uid?: string };
  state?: string;
}

export async function POST(req: NextRequest) {
  if (!getConfig()) return new Response("not configured", { status: 503 });
  const raw = await req.text();
  const ok = await verifyWebhookSignature(raw, req.headers.get("webhook-signature"));
  if (!ok) return new Response("forbidden", { status: 403 });

  let evt: CloudflareEvent | null = null;
  try { evt = JSON.parse(raw) as CloudflareEvent; } catch { /* malformed */ }
  if (!evt) return new Response("ok", { status: 200 });

  // Cloudflare sends both upload events (uid at top level) and
  // live-input events (liveInput.uid). Try both.
  const videoId = evt.uid || evt.liveInput?.uid;
  if (!videoId) return new Response("ok", { status: 200 });

  const session = findByProviderVideoId(videoId);
  if (!session) return new Response("ok", { status: 200 });

  // State transitions we care about.
  const cfState = evt.status?.state || evt.state;
  if (cfState === "live" || cfState === "connected") {
    startSession(session.id, session.organizationId, evt.playback?.hls);
  } else if (cfState === "ready" || cfState === "recordingReady" || cfState === "recording-ready") {
    endSession(session.id, session.organizationId, {
      recordingUrl: evt.playback?.hls,
      durationSeconds: evt.duration ? Math.round(evt.duration) : undefined,
      bytes: evt.size,
    });
  } else if (cfState === "error" || cfState === "errored") {
    endSession(session.id, session.organizationId, {
      notes: "Cloudflare reported an error during ingest or transcoding.",
    });
  }
  return new Response("ok", { status: 200 });
}
