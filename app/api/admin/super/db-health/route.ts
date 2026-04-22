// Super-admin-only diagnostic: quick Postgres connectivity probe.
// Hit GET /api/admin/super/db-health to confirm DATABASE_URL is set,
// the Neon client can reach the DB, and a trivial SELECT succeeds.
//
// Useful when the admin dashboard is returning 500 and you need to
// know within one request whether the root cause is Postgres or app
// logic.

import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const hasUrl = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  const started = Date.now();
  try {
    const rows = (await sql`SELECT 1 AS ok`) as Array<{ ok: number }>;
    return NextResponse.json({
      ok: true,
      hasUrl,
      latencyMs: Date.now() - started,
      sample: rows[0],
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        hasUrl,
        latencyMs: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 200 },
    );
  }
}
