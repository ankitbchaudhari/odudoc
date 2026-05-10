// Mux video provider — alternate to Cloudflare Stream.
//
// Auth: Basic with MUX_TOKEN_ID:MUX_TOKEN_SECRET.
// Two paths:
//   - Direct upload: POST /video/v1/uploads — returns a one-shot
//     PUT URL the encoder pushes to.
//   - Live stream: POST /video/v1/live-streams — returns RTMPS
//     ingest URL + stream key + playback ID. Auto-records.
// Webhook signature: HMAC-SHA-256 with MUX_WEBHOOK_SIGNING_SECRET,
// header `mux-signature: t=<ts>,v1=<sig>`.

import crypto from "node:crypto";

export interface MuxConfig {
  tokenId: string;
  tokenSecret: string;
  publicBaseUrl: string;
}

export function getConfig(): MuxConfig | null {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  const publicBaseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL;
  if (!tokenId || !tokenSecret || !publicBaseUrl) return null;
  return { tokenId, tokenSecret, publicBaseUrl };
}

function authHeader(cfg: MuxConfig): string {
  return "Basic " + Buffer.from(`${cfg.tokenId}:${cfg.tokenSecret}`).toString("base64");
}

export async function createDirectUpload(opts: {
  sessionId: string; mp4Support?: boolean;
}): Promise<{ ok: true; uploadURL: string; uploadId: string } | { ok: false; error: string }> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, error: "mux_not_configured" };
  const r = await fetch("https://api.mux.com/video/v1/uploads", {
    method: "POST",
    headers: { Authorization: authHeader(cfg), "Content-Type": "application/json" },
    body: JSON.stringify({
      cors_origin: cfg.publicBaseUrl,
      new_asset_settings: {
        playback_policy: ["signed"],
        mp4_support: opts.mp4Support ? "standard" : "none",
        passthrough: JSON.stringify({ sessionId: opts.sessionId, source: "odudoc-surgery-video" }),
      },
    }),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    return { ok: false, error: `mux_${r.status}: ${txt.slice(0, 200)}` };
  }
  const j = await r.json().catch(() => null) as { data?: { url?: string; id?: string } } | null;
  if (!j?.data?.url || !j.data.id) return { ok: false, error: "missing_upload_fields" };
  return { ok: true, uploadURL: j.data.url, uploadId: j.data.id };
}

export async function createLiveStream(opts: {
  sessionId: string;
}): Promise<{ ok: true; id: string; streamKey: string; rtmpsUrl: string; playbackId: string } | { ok: false; error: string }> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, error: "mux_not_configured" };
  const r = await fetch("https://api.mux.com/video/v1/live-streams", {
    method: "POST",
    headers: { Authorization: authHeader(cfg), "Content-Type": "application/json" },
    body: JSON.stringify({
      playback_policy: ["signed"],
      new_asset_settings: { playback_policy: ["signed"] },
      passthrough: JSON.stringify({ sessionId: opts.sessionId, source: "odudoc-surgery-video" }),
      // Default reduced_latency = false (broader compatibility);
      // operators can flip to low_latency for OT live observation.
      latency_mode: "reduced_latency",
    }),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    return { ok: false, error: `mux_${r.status}: ${txt.slice(0, 200)}` };
  }
  const j = await r.json().catch(() => null) as
    | { data?: { id?: string; stream_key?: string; playback_ids?: Array<{ id?: string }> } }
    | null;
  const id = j?.data?.id;
  const streamKey = j?.data?.stream_key;
  const playbackId = j?.data?.playback_ids?.[0]?.id;
  if (!id || !streamKey || !playbackId) return { ok: false, error: "missing_live_stream_fields" };
  return {
    ok: true, id, streamKey,
    rtmpsUrl: "rtmps://global-live.mux.com:443/app",
    playbackId,
  };
}

/** Sign a short-lived JWT for playback. Mux signed URLs use JWT
 *  signed with the playback signing key (separate from the API
 *  token). Caller passes both the playbackId and the signing key
 *  configuration via env. */
export async function signedPlaybackUrl(playbackId: string, opts: { ttlSeconds?: number } = {}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const keyId = process.env.MUX_SIGNING_KEY_ID;
  const keySecret = process.env.MUX_SIGNING_KEY_PRIVATE; // base64-encoded private key
  if (!keyId || !keySecret) return { ok: false, error: "mux_signing_key_not_configured" };
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid: keyId };
  const payload = {
    sub: playbackId,
    aud: "v",            // 'v' for video playback
    exp: now + (opts.ttlSeconds ?? 3600),
    kid: keyId,
  };
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const signing = `${enc(header)}.${enc(payload)}`;
  const privateKeyPem = Buffer.from(keySecret, "base64").toString("utf-8");
  const sig = crypto.createSign("RSA-SHA256").update(signing).sign(privateKeyPem, "base64url");
  const jwt = `${signing}.${sig}`;
  return { ok: true, url: `https://stream.mux.com/${playbackId}.m3u8?token=${jwt}` };
}

/** Mux's webhook signature: header `mux-signature: t=<ts>,v1=<hex>`.
 *  HMAC-SHA-256 of `<ts>.<rawBody>` keyed on the signing secret. */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const secret = process.env.MUX_WEBHOOK_SIGNING_SECRET;
  if (!secret) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k.trim(), (v || "").trim()];
    }),
  );
  if (!parts.t || !parts.v1) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parts.t}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
