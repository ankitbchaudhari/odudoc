// Super-admin only: read the platform audit log.
//
// GET /api/admin/super/audit-log?action=&orgId=&actorEmail=&sinceIso=&limit=

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import {
  listAuditEntries,
  reloadAuditLog,
  type AuditAction,
} from "@/lib/audit-log-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Pull fresh — the log is written by many routes across many Lambdas,
  // so our in-memory copy can easily be stale vs Postgres.
  await reloadAuditLog();

  const sp = req.nextUrl.searchParams;
  const action = sp.get("action") as AuditAction | null;
  const orgId = sp.get("orgId");
  const actorEmail = sp.get("actorEmail");
  const sinceIso = sp.get("sinceIso");
  const limitParam = sp.get("limit");
  const limit = limitParam ? Math.max(1, Math.min(500, Number(limitParam) || 200)) : 200;

  const entries = listAuditEntries({
    action: action || undefined,
    orgId: orgId || undefined,
    actorEmail: actorEmail || undefined,
    sinceIso: sinceIso || undefined,
    limit,
  });

  return NextResponse.json({ entries });
}
