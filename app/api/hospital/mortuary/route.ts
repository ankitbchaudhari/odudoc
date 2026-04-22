import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listRecords,
  createRecord,
  updateRecord,
  deleteRecord,
  type CustodyStatus,
} from "@/lib/hospital/mortuary-store";

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
        status: (searchParams.get("status") as CustodyStatus) || undefined,
        unitId: searchParams.get("unitId") || undefined,
        mlcOnly: searchParams.get("mlcOnly") === "1",
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
    audit(ctx, { action: "create", entityType: "mortuary", module: "mortuary" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (!body.decedentName) return NextResponse.json({ error: "missing_name" }, { status: 400 });
    const res = createRecord(orgId, body);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json({ record: res.record });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "mortuary", module: "mortuary" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const res = updateRecord(String(body.id), orgId, body);
    if (!res.ok) {
      const status = res.error === "not_found" ? 404 : 400;
      return NextResponse.json({ error: res.error }, { status });
    }
    return NextResponse.json({ record: res.record });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "mortuary", module: "mortuary" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    return NextResponse.json({ ok: deleteRecord(String(body.id), orgId) });
  } catch (e) {
    return handleError(e);
  }
}
