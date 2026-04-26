// HMAC-signed short-lived URLs for admin access to KYC documents.
//
// Why we need this
// ----------------
// Doctor applications upload identity / license / degree scans to
// files.odudoc.com (or Vercel Blob in dev). The historical pattern
// stored the *public* fetch URL (https://files.odudoc.com/path/to.pdf)
// directly on the application record. That URL is a permanent,
// auth-less handle to the document — paste it into Slack and anyone
// can fetch a passport scan.
//
// The signed-URL flow replaces that with a short-lived link that
// only an authenticated admin can mint, and that an authenticated
// admin must present again at fetch time. Every fetch is recorded in
// the access-log store so we have an audit trail of who viewed what
// when.
//
// Token shape
// -----------
// Tokens are URL-safe base64 of `{exp}.{path}.{sig}` where sig is
// HMAC-SHA256 of `{exp}|{path}` keyed on FILES_SIGNING_SECRET. Falls
// back to FILES_UPLOAD_SECRET if FILES_SIGNING_SECRET isn't set, so
// the system works without an extra env var; rotate at will.

import crypto from "crypto";

const SIGNING_SECRET = (
  process.env.FILES_SIGNING_SECRET ||
  process.env.FILES_UPLOAD_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  ""
).trim();

const DEFAULT_TTL_SECONDS = 5 * 60; // 5 minutes — admin clicks once, fetches once.

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function sign(exp: number, path: string): string {
  if (!SIGNING_SECRET) {
    throw new Error("FILES_SIGNING_SECRET / FILES_UPLOAD_SECRET / NEXTAUTH_SECRET must be set");
  }
  return b64url(
    crypto
      .createHmac("sha256", SIGNING_SECRET)
      .update(`${exp}|${path}`)
      .digest(),
  );
}

export interface SignedTokenInput {
  /** The path on files.odudoc.com (no leading slash, no host). */
  path: string;
  /** Override default 5-minute TTL. Capped at 1 hour for safety. */
  ttlSeconds?: number;
}

export function mintToken({ path, ttlSeconds }: SignedTokenInput): string {
  const ttl = Math.min(ttlSeconds ?? DEFAULT_TTL_SECONDS, 60 * 60);
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const sig = sign(exp, path);
  // Pack everything into a single opaque token so the URL stays simple.
  return b64url(Buffer.from(`${exp}.${path}.${sig}`, "utf8"));
}

export interface VerifiedToken {
  ok: true;
  path: string;
  exp: number;
}
export interface InvalidToken {
  ok: false;
  reason: string;
}

export function verifyToken(token: string): VerifiedToken | InvalidToken {
  try {
    const decoded = fromB64url(token).toString("utf8");
    const firstDot = decoded.indexOf(".");
    const lastDot = decoded.lastIndexOf(".");
    if (firstDot < 0 || lastDot <= firstDot) return { ok: false, reason: "malformed" };
    const expStr = decoded.slice(0, firstDot);
    const path = decoded.slice(firstDot + 1, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const exp = Number(expStr);
    if (!Number.isFinite(exp)) return { ok: false, reason: "bad_exp" };
    if (Math.floor(Date.now() / 1000) > exp) return { ok: false, reason: "expired" };
    const expected = sign(exp, path);
    // Constant-time compare so a malicious caller can't time the HMAC.
    if (
      sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return { ok: false, reason: "bad_signature" };
    }
    return { ok: true, path, exp };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}

/** Convert a raw files.odudoc.com URL (or a bare path) into the
 *  pathname segment we sign over. Strips host + leading slashes. */
export function pathFromUrlOrPath(urlOrPath: string): string {
  if (!urlOrPath) return "";
  try {
    const u = new URL(urlOrPath);
    return u.pathname.replace(/^\/+/, "");
  } catch {
    return urlOrPath.replace(/^\/+/, "");
  }
}
