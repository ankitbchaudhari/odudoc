import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listRecords,
  createRecord,
  updateRecord,
  deleteRecord,
  type WasteCategory,
  type WasteColor,
  type WasteStatus,
} from "@/lib/hospital/biowaste-store";

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
      records: listRecords({
        organizationId: orgId,
        status: (searchParams.get("status") as WasteStatus) || undefined,
        category: (searchParams.get("category") as WasteCategory) || undefined,
        color: (searchParams.get("color") as WasteColor) || undefined,
        vendorId: searchParams.get("vendorId") || undefined,
        from: searchParams.get("from") || undefined,
        to: searchParams.get("to") || undefined,
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "biowaste", module: "biowaste" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    return NextResponse.json({ record: createRecord(orgId, body) });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "biowaste", module: "biowaste" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const r = updateRecord(String(body.id), orgId, body);
    if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ record: r });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "biowaste", module: "biowaste" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    return NextResponse.json({ ok: deleteRecord(String(body.id), orgId) });
  } catch (e) {
    return handleError(e);
  }
}
