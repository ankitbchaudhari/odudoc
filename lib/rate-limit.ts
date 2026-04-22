// Sliding-window rate limiter on Upstash Redis.
// Env-gated: if UPSTASH_REDIS_REST_URL/TOKEN aren't set, limit() always
// allows. That means local/dev and self-hosted deployments don't need Redis.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const URL = process.env.UPSTASH_REDIS_REST_URL?.trim();
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

let redis: Redis | null = null;
const limiters = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (!URL || !TOKEN) return null;
  if (!redis) redis = new Redis({ url: URL, token: TOKEN });
  return redis;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  skipped?: boolean;
}

/**
 * Check a sliding-window rate limit.
 *   await limit("login", ip, 10, "1 m")  // 10 per minute per ip
 */
export async function limit(
  bucket: string,
  identifier: string,
  max: number,
  window: `${number} ${"s" | "m" | "h" | "d"}`,
): Promise<RateLimitResult> {
  const r = getRedis();
  if (!r) return { success: true, limit: max, remaining: max, reset: Date.now(), skipped: true };
  const key = `${bucket}:${max}:${window}`;
  let rl = limiters.get(key);
  if (!rl) {
    rl = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(max, window),
      prefix: `odudoc-rl-${bucket}`,
      analytics: false,
    });
    limiters.set(key, rl);
  }
  const res = await rl.limit(identifier);
  return { success: res.success, limit: res.limit, remaining: res.remaining, reset: res.reset };
}

export function isRateLimitConfigured(): boolean {
  return Boolean(URL && TOKEN);
}
