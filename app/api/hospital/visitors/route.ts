import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listPasses,
  createPass,
  updatePass,
  checkOutPass,
  deletePass,
  computeStats,
  type PassStatus,
  type VisitPurpose,
} from "@/lib/hospital/visitors-store";

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
      passes: listPasses({
        organizationId: orgId,
        status: (searchParams.get("status") as PassStatus) || undefined,
        purpose: (searchParams.get("purpose") as VisitPurpose) || undefined,
        patientId: searchParams.get("patientId") || undefined,
        insideOnly: searchParams.get("insideOnly") === "1",
        overstayOnly: searchParams.get("overstayOnly") === "1",
        from: searchParams.get("from") || undefined,
        to: searchParams.get("to") || undefined,
      }),
      stats: computeStats(orgId),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "visitors", module: "visitors" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (body.action === "checkout") {
      if (!body.id)
        return NextResponse.json({ error: "missing_id" }, { status: 400 });
      const p = checkOutPass(String(body.id), orgId);
      if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ pass: p });
    }
    const res = createPass(orgId, body);
    if (!res.ok) {
      return NextResponse.json(
        { error: res.error, blacklistReason: res.blacklistReason },
        { status: res.error === "blacklisted" ? 403 : 400 }
      );
    }
    return NextResponse.json({ pass: res.pass });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "visitors", module: "visitors" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id)
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const p = updatePass(String(body.id), orgId, body);
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ pass: p });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "visitors", module: "visitors" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id)
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    return NextResponse.json({ ok: deletePass(String(body.id), orgId) });
  } catch (e) {
    return handleError(e);
  }
}
