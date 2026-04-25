// Public health-check endpoint.
//
// Designed for Vercel monitoring + external uptime watchers (BetterStack,
// Pingdom, UptimeRobot). Returns:
//   - 200 OK when every required dependency answers
//   - 503 Service Unavailable when a required dependency is down
//
// Per-dependency latencies and statuses are returned in the JSON body so
// dashboards can surface which one is unhappy. Each probe runs in
// parallel under a 3-second timeout so a slow upstream can't pin the
// request open.
//
// DB is "required" — site can't serve. Redis is optional (rate-limit
// no-ops when unconfigured). Stripe is optional (only matters at
// checkout). HEAD is exposed for monitors that only read status codes.

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isRateLimitConfigured } from "@/lib/rate-limit";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProbeResult {
  ok: boolean;
  ms: number;
  detail?: string;
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function probeDb(): Promise<ProbeResult> {
  const t0 = Date.now();
  try {
    const rows = (await withTimeout(
      sql`SELECT 1 AS ok`,
      3000,
      "db",
    )) as unknown as Array<{ ok: number }>;
    if (rows[0]?.ok !== 1) return { ok: false, ms: Date.now() - t0, detail: "unexpected_result" };
    return { ok: true, ms: Date.now() - t0 };
  } catch (err) {
    return { ok: false, ms: Date.now() - t0, detail: (err as Error).message };
  }
}

async function probeRedis(): Promise<ProbeResult> {
  if (!isRateLimitConfigured()) {
    return { ok: true, ms: 0, detail: "not_configured" };
  }
  const t0 = Date.now();
  try {
    const r = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    const pong = await withTimeout(r.ping(), 3000, "redis");
    if (pong !== "PONG") return { ok: false, ms: Date.now() - t0, detail: `unexpected:${pong}` };
    return { ok: true, ms: Date.now() - t0 };
  } catch (err) {
    return { ok: false, ms: Date.now() - t0, detail: (err as Error).message };
  }
}

async function probeStripe(): Promise<ProbeResult> {
  // No public ping endpoint; we hit /v1/balance with our key. Treat
  // "no key configured" as ok=true / not_required so dev/preview
  // deploys without Stripe creds still pass the overall health check.
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return { ok: true, ms: 0, detail: "not_configured" };
  const t0 = Date.now();
  try {
    const r = await withTimeout(
      fetch("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${key}` },
      }),
      3000,
      "stripe",
    );
    if (!r.ok) return { ok: false, ms: Date.now() - t0, detail: `http_${r.status}` };
    return { ok: true, ms: Date.now() - t0 };
  } catch (err) {
    return { ok: false, ms: Date.now() - t0, detail: (err as Error).message };
  }
}

export async function GET() {
  const t0 = Date.now();
  const [db, redis, stripe] = await Promise.all([probeDb(), probeRedis(), probeStripe()]);
  const okay = db.ok; // Redis + Stripe are non-blocking
  return NextResponse.json(
    {
      status: okay ? "ok" : "degraded",
      uptimeSeconds: typeof process.uptime === "function" ? Math.round(process.uptime()) : null,
      checkedAt: new Date().toISOString(),
      totalMs: Date.now() - t0,
      checks: { db, redis, stripe },
      env: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
      region: process.env.VERCEL_REGION || null,
      deployedAt: process.env.VERCEL_DEPLOYMENT_ID || null,
    },
    {
      status: okay ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}

// Cheap HEAD for uptime tools that only care about status code.
export async function HEAD() {
  const db = await probeDb();
  return new NextResponse(null, {
    status: db.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
