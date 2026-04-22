// Super-admin audit viewer — cross-tenant. Returns the union of every
// org's audit log, newest first. Supports ?orgId, ?actorId, ?action,
// ?module filters.
//
// Intentionally paginated small (default 200, max 1000) — the audit log
// grows quickly and we don't want the admin UI to OOM.

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { listEntries } from "@/lib/hospital/audit-log-store";
import { listOrganizations } from "@/lib/organizations-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId") || undefined;
  const actorId = searchParams.get("actorId") || undefined;
  const action = searchParams.get("action") || undefined;
  const module_ = searchParams.get("module") || undefined;
  const severity = searchParams.get("severity") || undefined;
  const limit = Math.min(1000, Math.max(1, Number(searchParams.get("limit")) || 200));

  const orgs = orgId ? [{ id: orgId }] : listOrganizations().map((o) => ({ id: o.id }));
  const rows = orgs
    .flatMap((o) => listEntries({
      organizationId: o.id,
      action: action as never,
      severity: severity as never,
      module: module_,
      actorId,
    }))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit);

  return NextResponse.json({
    count: rows.length,
    entries: rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      occurredAt: r.occurredAt,
      actorName: r.actorName,
      actorRole: r.actorRole,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      entityLabel: r.entityLabel,
      severity: r.severity,
      module: r.module,
      reason: r.reason,
    })),
  });
}
