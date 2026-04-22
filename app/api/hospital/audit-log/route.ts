import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import { listEntries, createEntry, deleteEntry, computeStats, type AuditAction, type Severity } from "@/lib/hospital/audit-log-store";

import { parseJson, z } from "@/lib/validate";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handleError(e: unknown) {
  if (e instanceof TenantError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: "internal" }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const { searchParams } = new URL(req.url);
    return NextResponse.json({
      entries: listEntries({
        organizationId: orgId,
        action: (searchParams.get("action") as AuditAction) || undefined,
        severity: (searchParams.get("severity") as Severity) || undefined,
        module: searchParams.get("module") || undefined,
        entityType: searchParams.get("entityType") || undefined,
        entityId: searchParams.get("entityId") || undefined,
        actorId: searchParams.get("actorId") || undefined,
        from: searchParams.get("from") || undefined,
        to: searchParams.get("to") || undefined,
      }),
      stats: computeStats(orgId),
    });
  } catch (e) { return handleError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const r = createEntry(orgId, await req.json());
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ entry: r.record });
  } catch (e) { return handleError(e); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    return NextResponse.json({ ok: deleteEntry(String(body.id), orgId) });
  } catch (e) { return handleError(e); }
}
