import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listAssets, createAsset, updateAsset, deleteAsset,
  listLogs, createLog, updateLog, deleteLog,
  computeStats,
  type GasType, type AssetType, type AssetStatus, type LogKind,
} from "@/lib/hospital/medical-gas-store";

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
      assets: listAssets({
        organizationId: orgId,
        gasType: (searchParams.get("gasType") as GasType) || undefined,
        assetType: (searchParams.get("assetType") as AssetType) || undefined,
        status: (searchParams.get("status") as AssetStatus) || undefined,
      }),
      logs: listLogs({
        organizationId: orgId,
        assetId: searchParams.get("assetId") || undefined,
        kind: (searchParams.get("kind") as LogKind) || undefined,
        limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 200,
      }),
      stats: computeStats(orgId),
    });
  } catch (e) { return handleError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "medical-gas", module: "medical-gas" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (body.kind === "log" || body.recordKind === "log") {
      const r = createLog(orgId, body);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      return NextResponse.json({ log: r.record });
    }
    const r = createAsset(orgId, body);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ asset: r.record });
  } catch (e) { return handleError(e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "medical-gas", module: "medical-gas" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    if (body.recordKind === "log") {
      const r = updateLog(String(body.id), orgId, body);
      if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ log: r });
    }
    const r = updateAsset(String(body.id), orgId, body);
    if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ asset: r });
  } catch (e) { return handleError(e); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "medical-gas", module: "medical-gas" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    if (body.recordKind === "log") return NextResponse.json({ ok: deleteLog(String(body.id), orgId) });
    return NextResponse.json({ ok: deleteAsset(String(body.id), orgId) });
  } catch (e) { return handleError(e); }
}
