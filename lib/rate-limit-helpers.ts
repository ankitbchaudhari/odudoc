// Thin helpers for applying rate limits inside Next.js route handlers.
// Uses lib/rate-limit.ts underneath — no-ops when Upstash isn't configured.

import { NextRequest, NextResponse } from "next/server";
import { limit, type RateLimitResult } from "./rate-limit";

/** Best-effort client IP extraction for rate-limit identifiers. */
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri;
  return "anon";
}

/**
 * Enforce a rate limit; return a 429 NextResponse if exceeded, null if allowed.
 *
 *   const blocked = await enforceRateLimit(req, "login", 10, "1 m");
 *   if (blocked) return blocked;
 */
export async function enforceRateLimit(
  req: NextRequest,
  bucket: string,
  max: number,
  window: `${number} ${"s" | "m" | "h" | "d"}`,
  extraKey?: string,
): Promise<NextResponse | null> {
  const id = extraKey ? `${clientIp(req)}:${extraKey}` : clientIp(req);
  const res: RateLimitResult = await limit(bucket, id, max, window);
  if (res.success) return null;
  const retryAfter = Math.max(1, Math.round((res.reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: "rate_limited", retryAfterSeconds: retryAfter },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(res.limit),
        "X-RateLimit-Remaining": String(res.remaining),
        "X-RateLimit-Reset": String(res.reset),
      },
    },
  );
}
