import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listLogs,
  createLog,
  deleteLog,
  type LogType,
} from "@/lib/hospital/biomedical-store";

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
      logs: listLogs({
        organizationId: orgId,
        assetId: searchParams.get("assetId") || undefined,
        type: (searchParams.get("type") as LogType) || undefined,
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "biomedical", module: "biomedical" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (!body.assetId || !body.description) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const log = createLog(orgId, body);
    if (!log) return NextResponse.json({ error: "asset_not_found" }, { status: 404 });
    return NextResponse.json({ log });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "biomedical", module: "biomedical" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    return NextResponse.json({ ok: deleteLog(String(body.id), orgId) });
  } catch (e) {
    return handleError(e);
  }
}
