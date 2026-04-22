// Lightweight health check — no auth required. Pings Postgres with a short
// timeout so uptime monitors get a real answer about whether the DB is live.
// Returns 200 if Postgres is reachable, 503 otherwise.

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const budgetMs = 3000;
  try {
    const result = await Promise.race([
      sql`SELECT 1 as ok`,
      new Promise((_, rej) => setTimeout(() => rej(new Error("postgres_timeout")), budgetMs)),
    ]);
    const rows = result as Array<{ ok: number }>;
    if (rows?.[0]?.ok !== 1) throw new Error("postgres_unexpected_response");
    return NextResponse.json({
      status: "ok",
      postgres: "ok",
      latencyMs: Date.now() - started,
      deployedAt: process.env.VERCEL_DEPLOYMENT_ID || null,
      region: process.env.VERCEL_REGION || null,
      env: process.env.VERCEL_ENV || process.env.NODE_ENV,
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "degraded",
        postgres: "error",
        error: (err as Error).message,
        latencyMs: Date.now() - started,
      },
      { status: 503 },
    );
  }
}
