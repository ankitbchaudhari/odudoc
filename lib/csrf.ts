// Lightweight CSRF defense for cookie-session routes.
//
// Strategy: for any state-changing method (POST/PUT/PATCH/DELETE), the
// request's Origin (or Referer fallback) must match the current host, OR
// be one of the explicitly trusted origins (configured via
// CSRF_TRUSTED_ORIGINS, comma-separated). Cross-origin requests fail fast.
//
// This pairs with SameSite=Lax cookies (the NextAuth default), which
// already blocks most CSRF; this check is a belt-and-suspenders defense
// against browser bugs and same-site cookie leaks.
//
// Safe (GET/HEAD/OPTIONS) methods are always allowed — callers don't need
// to check for those.
//
// Webhook routes (Stripe, Twilio, etc.) sign their payloads and should
// call `skipCsrfFor(req)` rather than this function. They're excluded by
// virtue of not importing this module.

// Minimal request shape we actually need — avoids a hard dep on NextRequest
// so this helper works in both route handlers and the tenant module without
// forcing a dynamic import of next/server.
export interface CsrfRequestLike {
  method: string;
  headers: { get(name: string): string | null };
  url: string;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function trustedOrigins(): string[] {
  return (process.env.CSRF_TRUSTED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function sameOrigin(req: CsrfRequestLike): boolean {
  const method = req.method.toUpperCase();
  if (SAFE_METHODS.has(method)) return true;

  // Prefer Origin; fall back to Referer for older browsers / server fetches.
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const claimed = origin || (referer ? new URL(referer).origin : null);

  // No origin header at all — common for server-to-server calls and some
  // tooling. Allow through; those callers authenticate via session cookie
  // or API token and aren't browser-originated CSRF vectors.
  if (!claimed) return true;

  // Derive the request host from the Host header (proxy-aware via
  // X-Forwarded-Host if Vercel sets it).
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host) return false;

  // Build expected origin. Vercel always HTTPS in prod; fall back to the
  // request's URL protocol for localhost.
  const proto = req.headers.get("x-forwarded-proto") || new URL(req.url).protocol.replace(":", "");
  const expected = `${proto}://${host}`;

  if (claimed === expected) return true;
  if (trustedOrigins().includes(claimed)) return true;
  return false;
}

export class CsrfError extends Error {
  status = 403;
  constructor() { super("csrf_origin_mismatch"); }
}

/**
 * Throws `CsrfError` if the request is a state-changing cross-origin call
 * from an untrusted origin. Call at the top of mutating route handlers.
 */
export function assertSameOrigin(req: CsrfRequestLike): void {
  if (!sameOrigin(req)) throw new CsrfError();
}
