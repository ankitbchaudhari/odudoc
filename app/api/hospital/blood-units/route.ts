import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  inventorySummary,
  type BloodGroup,
  type BloodComponent,
  type UnitStatus,
} from "@/lib/hospital/bloodbank-store";

import { parseJson, z } from "@/lib/validate";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handleError(e: unknown) {
  if (e instanceof TenantError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  return NextResponse.json({ error: "internal" }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const { searchParams } = new URL(req.url);
    return NextResponse.json({
      units: listUnits({
        organizationId: orgId,
        bloodGroup: (searchParams.get("bloodGroup") as BloodGroup) || undefined,
        component:
          (searchParams.get("component") as BloodComponent) || undefined,
        status: (searchParams.get("status") as UnitStatus) || undefined,
        donorId: searchParams.get("donorId") || undefined,
      }),
      inventory: inventorySummary(orgId),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "blood-units", module: "blood-units" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (!body.bloodGroup || !body.component) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    return NextResponse.json({ unit: createUnit(orgId, body) });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "blood-units", module: "blood-units" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const u = updateUnit(String(body.id), orgId, body);
    if (!u) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ unit: u });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "blood-units", module: "blood-units" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    return NextResponse.json({ ok: deleteUnit(String(body.id), orgId) });
  } catch (e) {
    return handleError(e);
  }
}
