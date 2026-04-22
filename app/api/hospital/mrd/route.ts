import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listCharts, createChart, updateChart, deleteChart,
  listRoi, createRoi, updateRoi, deleteRoi,
  computeStats,
  type ChartStatus, type RoiStatus,
} from "@/lib/hospital/mrd-store";

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
      charts: listCharts({
        organizationId: orgId,
        status: (searchParams.get("status") as ChartStatus) || undefined,
        patientId: searchParams.get("patientId") || undefined,
        search: searchParams.get("search") || undefined,
      }),
      roi: listRoi({
        organizationId: orgId,
        status: (searchParams.get("roiStatus") as RoiStatus) || undefined,
        patientId: searchParams.get("patientId") || undefined,
      }),
      stats: computeStats(orgId),
    });
  } catch (e) { return handleError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "mrd", module: "mrd" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (body.kind === "roi") {
      const r = createRoi(orgId, body);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      return NextResponse.json({ roi: r.roi });
    }
    const r = createChart(orgId, body);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ chart: r.chart });
  } catch (e) { return handleError(e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "mrd", module: "mrd" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    if (body.kind === "roi") {
      const r = updateRoi(String(body.id), orgId, body);
      if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ roi: r });
    }
    const c = updateChart(String(body.id), orgId, body);
    if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ chart: c });
  } catch (e) { return handleError(e); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "mrd", module: "mrd" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    if (body.kind === "roi") return NextResponse.json({ ok: deleteRoi(String(body.id), orgId) });
    return NextResponse.json({ ok: deleteChart(String(body.id), orgId) });
  } catch (e) { return handleError(e); }
}
