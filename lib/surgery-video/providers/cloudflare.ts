// Cloudflare Stream provider for surgery video.
//
// Three primitives we use:
//   1. Direct Creator Upload — server requests a one-shot upload URL,
//      the OT camera / encoder pushes the recording directly to
//      Cloudflare. We never proxy bytes.
//   2. Live Inputs — for actual live surgery streaming, we mint a
//      live input with RTMPS or WebRTC ingest. The encoder streams
//      to Cloudflare; viewers watch via HLS.
//   3. Signed playback URLs — every viewer link is short-lived and
//      tied to a session id so leaked URLs expire fast.
//
// Webhook: Cloudflare hits /api/surgery-video/cloudflare/webhook
// when a recording finishes uploading; we record the playback +
// recording URLs back to the session.

export interface CloudflareConfig {
  accountId: string;
  apiToken: string;
  /** Stream subdomain — videodelivery.net by default. */
  customerSubdomain?: string;
  /** Public base URL for our webhook callbacks. */
  publicBaseUrl: string;
}

export function getConfig(): CloudflareConfig | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  const publicBaseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL;
  if (!accountId || !apiToken || !publicBaseUrl) return null;
  return {
    accountId,
    apiToken,
    customerSubdomain: process.env.CLOUDFLARE_STREAM_SUBDOMAIN || undefined,
    publicBaseUrl,
  };
}

/** One-shot upload URL the operator's encoder pushes the recording
 *  to. Pre-signed, short-lived. Returns the videoId we attach to
 *  the surgery session. */
export async function createDirectUpload(opts: {
  sessionId: string;
  maxDurationSeconds?: number;
  /** True if this is a live stream, not a stored recording. */
  requireSignedURLs?: boolean;
}): Promise<{ ok: true; uploadURL: string; videoId: string } | { ok: false; error: string }> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, error: "cloudflare_not_configured" };
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        maxDurationSeconds: opts.maxDurationSeconds ?? 4 * 60 * 60, // 4-hour cap
        requireSignedURLs: opts.requireSignedURLs ?? true,
        meta: { sessionId: opts.sessionId, source: "odudoc-surgery-video" },
      }),
    },
  );
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    return { ok: false, error: `cloudflare_${r.status}: ${txt.slice(0, 200)}` };
  }
  const j = await r.json().catch(() => null) as
    | { result?: { uploadURL?: string; uid?: string } }
    | null;
  if (!j?.result?.uploadURL || !j.result.uid) {
    return { ok: false, error: "missing_upload_url" };
  }
  return { ok: true, uploadURL: j.result.uploadURL, videoId: j.result.uid };
}

/** Mint a live input — RTMPS / WebRTC ingest endpoints for the
 *  in-OT encoder, plus an HLS playback URL viewers can watch. */
export async function createLiveInput(opts: {
  sessionId: string;
  /** Auto-record the stream so viewers get the recording too. */
  recordOnly?: boolean;
}): Promise<{ ok: true; uid: string; rtmpsUrl: string; rtmpsKey: string; playbackHlsUrl: string } | { ok: false; error: string }> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, error: "cloudflare_not_configured" };
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/stream/live_inputs`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meta: { sessionId: opts.sessionId, source: "odudoc-surgery-video" },
        recording: { mode: "automatic", requireSignedURLs: true },
      }),
    },
  );
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    return { ok: false, error: `cloudflare_${r.status}: ${txt.slice(0, 200)}` };
  }
  const j = await r.json().catch(() => null) as
    | { result?: { uid?: string; rtmps?: { url?: string; streamKey?: string }; uid_signed?: string } }
    | null;
  if (!j?.result?.uid || !j.result.rtmps?.url || !j.result.rtmps?.streamKey) {
    return { ok: false, error: "missing_live_input_fields" };
  }
  const subdomain = cfg.customerSubdomain || "videodelivery.net";
  return {
    ok: true,
    uid: j.result.uid,
    rtmpsUrl: j.result.rtmps.url,
    rtmpsKey: j.result.rtmps.streamKey,
    playbackHlsUrl: `https://${subdomain}/${j.result.uid}/manifest/video.m3u8`,
  };
}

/** Mint a short-lived signed playback token. Cloudflare's tokens are
 *  Cloudflare-side JWTs — we just request one for a videoId. */
export async function signedPlaybackUrl(videoId: string, opts: { ttlSeconds?: number } = {}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, error: "cloudflare_not_configured" };
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/stream/${videoId}/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ exp: Math.floor(Date.now() / 1000) + (opts.ttlSeconds ?? 3600) }),
    },
  );
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    return { ok: false, error: `cloudflare_${r.status}: ${txt.slice(0, 200)}` };
  }
  const j = await r.json().catch(() => null) as { result?: { token?: string } } | null;
  if (!j?.result?.token) return { ok: false, error: "missing_token" };
  const subdomain = cfg.customerSubdomain || "videodelivery.net";
  return { ok: true, url: `https://${subdomain}/${j.result.token}/manifest/video.m3u8` };
}

/** Cloudflare's webhook signature uses HMAC-SHA-256 of the body
 *  with a secret you configure when you create the webhook. We
 *  read the secret from CLOUDFLARE_STREAM_WEBHOOK_SECRET. */
export async function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader) return false;
  const secret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
  if (!secret) return false;
  // Cloudflare sends `time=X,sig1=Y` format. Pull sig1.
  const m = signatureHeader.match(/sig1=([0-9a-f]+)/i);
  if (!m) return false;
  const expectedHex = m[1].toLowerCase();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const computedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Constant-time compare on hex strings.
  if (computedHex.length !== expectedHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) diff |= computedHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  return diff === 0;
}
