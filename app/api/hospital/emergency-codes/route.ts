import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listCodes,
  createCode,
  updateCode,
  deleteCode,
  markArrived,
  computeStats,
  type CodeType,
  type CodeStatus,
} from "@/lib/hospital/emergency-codes-store";

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
      codes: listCodes({
        organizationId: orgId,
        codeType: (searchParams.get("codeType") as CodeType) || undefined,
        status: (searchParams.get("status") as CodeStatus) || undefined,
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
    audit(ctx, { action: "create", entityType: "emergency-codes", module: "emergency-codes" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    // Support action: "arrived" as a fast-path team-arrival marker
    if (body.action === "arrived" && body.id) {
      const c = markArrived(String(body.id), orgId);
      if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ code: c });
    }
    const res = createCode(orgId, body);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json({ code: res.code });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "emergency-codes", module: "emergency-codes" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const c = updateCode(String(body.id), orgId, body);
    if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ code: c });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "emergency-codes", module: "emergency-codes" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    return NextResponse.json({ ok: deleteCode(String(body.id), orgId) });
  } catch (e) {
    return handleError(e);
  }
}
