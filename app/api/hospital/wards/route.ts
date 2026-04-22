import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listWards,
  createWard,
  updateWard,
  deleteWard,
  addBed,
  updateBed,
  removeBed,
  type WardType,
} from "@/lib/hospital/wards-store";

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
      wards: listWards({
        organizationId: orgId,
        type: (searchParams.get("type") as WardType) || undefined,
        activeOnly: searchParams.get("activeOnly") === "1",
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "wards", module: "wards" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (!body.name || !body.type) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const w = createWard(orgId, {
      name: String(body.name),
      type: body.type,
      floor: body.floor,
      dailyRate: body.dailyRate,
      active: body.active,
      notes: body.notes,
    });
    return NextResponse.json({ ward: w });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "wards", module: "wards" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

    if (body.addBed) {
      const b = addBed(String(body.id), orgId, body.addBed);
      if (!b) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ bed: b });
    }
    if (body.updateBed) {
      const b = updateBed(String(body.id), String(body.updateBed.bedId), orgId, body.updateBed);
      if (!b) return NextResponse.json({ error: "not_found_or_blocked" }, { status: 400 });
      return NextResponse.json({ bed: b });
    }
    if (body.removeBedId) {
      const ok = removeBed(String(body.id), String(body.removeBedId), orgId);
      if (!ok) return NextResponse.json({ error: "blocked_or_not_found" }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    const w = updateWard(String(body.id), orgId, body);
    if (!w) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ward: w });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "wards", module: "wards" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const ok = deleteWard(String(body.id), orgId);
    if (!ok) return NextResponse.json({ error: "has_occupied_beds_or_not_found" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
