// Mux webhook receiver. Events we care about: video.live_stream.active
// (live), video.asset.ready (recording done), video.asset.errored.

import { NextRequest } from "next/server";
import { getConfig, verifyWebhookSignature } from "@/lib/surgery-video/providers/mux";
import { endSession, findByProviderVideoId, startSession } from "@/lib/surgery-video/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MuxEvent {
  type?: string;
  data?: {
    id?: string;
    live_stream_id?: string;
    duration?: number;
    passthrough?: string;
    playback_ids?: Array<{ id?: string }>;
  };
}

export async function POST(req: NextRequest) {
  if (!getConfig()) return new Response("not configured", { status: 503 });
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("mux-signature"))) {
    return new Response("forbidden", { status: 403 });
  }
  let evt: MuxEvent | null = null;
  try { evt = JSON.parse(raw) as MuxEvent; } catch { /* */ }
  if (!evt) return new Response("ok", { status: 200 });

  const livestreamId = evt.data?.live_stream_id || evt.data?.id;
  if (!livestreamId) return new Response("ok", { status: 200 });
  const session = findByProviderVideoId(livestreamId);
  if (!session) return new Response("ok", { status: 200 });

  const playbackId = evt.data?.playback_ids?.[0]?.id;
  switch (evt.type) {
    case "video.live_stream.active":
      startSession(session.id, session.organizationId, playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : undefined);
      break;
    case "video.asset.ready":
      endSession(session.id, session.organizationId, {
        recordingUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : undefined,
        durationSeconds: evt.data?.duration ? Math.round(evt.data.duration) : undefined,
      });
      break;
    case "video.asset.errored":
    case "video.live_stream.errored":
      endSession(session.id, session.organizationId, { notes: "Mux reported an ingest or transcoding error." });
      break;
  }
  return new Response("ok", { status: 200 });
}
