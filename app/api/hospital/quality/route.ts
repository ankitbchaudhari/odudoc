import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listIndicators, createIndicator, updateIndicator, deleteIndicator,
  listMeasurements, createMeasurement, updateMeasurement, deleteMeasurement,
  computeStats,
  type IndicatorCategory, type IndicatorStatus,
} from "@/lib/hospital/quality-store";

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
      indicators: listIndicators({
        organizationId: orgId,
        category: (searchParams.get("category") as IndicatorCategory) || undefined,
        status: (searchParams.get("status") as IndicatorStatus) || undefined,
      }),
      measurements: listMeasurements({
        organizationId: orgId,
        indicatorId: searchParams.get("indicatorId") || undefined,
        missedOnly: searchParams.get("missedOnly") === "1",
      }),
      stats: computeStats(orgId),
    });
  } catch (e) { return handleError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "quality", module: "quality" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (body.kind === "measurement") {
      const r = createMeasurement(orgId, body);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      return NextResponse.json({ measurement: r.record });
    }
    const r = createIndicator(orgId, body);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ indicator: r.record });
  } catch (e) { return handleError(e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "quality", module: "quality" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    if (body.kind === "measurement") {
      const m = updateMeasurement(String(body.id), orgId, body);
      if (!m) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ measurement: m });
    }
    const i = updateIndicator(String(body.id), orgId, body);
    if (!i) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ indicator: i });
  } catch (e) { return handleError(e); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "quality", module: "quality" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const ok = body.kind === "measurement"
      ? deleteMeasurement(String(body.id), orgId)
      : deleteIndicator(String(body.id), orgId);
    return NextResponse.json({ ok });
  } catch (e) { return handleError(e); }
}
