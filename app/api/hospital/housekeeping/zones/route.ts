import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listZones,
  createZone,
  updateZone,
  deleteZone,
} from "@/lib/hospital/housekeeping-store";

import { parseJson, z } from "@/lib/validate";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handleError(e: unknown) {
  if (e instanceof TenantError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  return NextResponse.json({ error: "internal" }, { status: 500 });
}

export async function GET() {
  try {
    const { orgId } = await requireOrg();
    return NextResponse.json({ zones: listZones(orgId) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "housekeeping", module: "housekeeping" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (!body.name) return NextResponse.json({ error: "missing_name" }, { status: 400 });
    return NextResponse.json({ zone: createZone(orgId, body) });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "housekeeping", module: "housekeeping" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const zone = updateZone(String(body.id), orgId, body);
    if (!zone) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ zone });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "housekeeping", module: "housekeeping" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const ok = deleteZone(String(body.id), orgId);
    if (!ok)
      return NextResponse.json(
        { error: "has_open_tasks_or_not_found" },
        { status: 400 }
      );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
