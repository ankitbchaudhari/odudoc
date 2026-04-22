// GDPR / DPDP-style data export. Returns a JSON dump of every app_kv
// record filtered to this tenant's organizationId. Streams as a single
// JSON download — client can save-as for offline archive.
//
// Only the org's "admin" role (or super-admin) can trigger an export.
// An audit entry is written so tenants have a trail of exports.

import { NextRequest, NextResponse } from "next/server";
import { requireOrgRole } from "@/lib/tenant";
import { sql } from "@/lib/db";
import { audit } from "@/lib/audit";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  let ctx;
  try { ctx = await requireOrgRole(["admin"]); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }

  const orgId = ctx.organization?.id;
  if (!orgId) return NextResponse.json({ error: "no_active_org" }, { status: 400 });

  const rows = (await sql`SELECT key, data FROM app_kv`) as Array<{ key: string; data: unknown }>;

  const dump: Record<string, unknown> = {};
  let totalRecords = 0;
  for (const row of rows) {
    // We only export arrays keyed by organizationId. Any other shape is
    // global/shared infra and not part of the tenant export.
    if (!Array.isArray(row.data)) continue;
    const filtered = (row.data as Array<Record<string, unknown>>).filter(
      (r) => r && typeof r === "object" && (r as { organizationId?: string }).organizationId === orgId,
    );
    if (filtered.length > 0) {
      dump[row.key] = filtered;
      totalRecords += filtered.length;
    }
  }

  audit(ctx, {
    action: "export",
    entityType: "organization",
    entityId: orgId,
    entityLabel: ctx.organization?.name,
    module: "compliance",
    severity: "warning",
    reason: "gdpr_data_export",
  });
  log.info("compliance.org_export", { orgId, tables: Object.keys(dump).length, totalRecords });

  const payload = {
    organization: {
      id: ctx.organization?.id,
      name: ctx.organization?.name,
      slug: ctx.organization?.slug,
      country: ctx.organization?.country,
    },
    exportedAt: new Date().toISOString(),
    exportedBy: ctx.email,
    totals: { tables: Object.keys(dump).length, records: totalRecords },
    data: dump,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="odudoc-export-${ctx.organization?.slug || orgId}-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
