import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listCases, createCase, updateCase, deleteCase,
  listFractures, createFracture, updateFracture, deleteFracture,
  computeStats,
  type CaseStatus, type CaseType, type Region, type FractureStatus,
} from "@/lib/hospital/ortho-store";

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
      cases: listCases({
        organizationId: orgId,
        status: (searchParams.get("caseStatus") as CaseStatus) || undefined,
        region: (searchParams.get("region") as Region) || undefined,
        caseType: (searchParams.get("caseType") as CaseType) || undefined,
        patientId: searchParams.get("patientId") || undefined,
      }),
      fractures: listFractures({
        organizationId: orgId,
        status: (searchParams.get("fxStatus") as FractureStatus) || undefined,
        patientId: searchParams.get("patientId") || undefined,
      }),
      stats: computeStats(orgId),
    });
  } catch (e) { return handleError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "orthopedics", module: "orthopedics" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (body.kind === "fracture") {
      const r = createFracture(orgId, body);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      return NextResponse.json({ fracture: r.record });
    }
    const r = createCase(orgId, body);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ case: r.record });
  } catch (e) { return handleError(e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "orthopedics", module: "orthopedics" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    if (body.kind === "fracture") {
      const f = updateFracture(String(body.id), orgId, body);
      if (!f) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ fracture: f });
    }
    const c = updateCase(String(body.id), orgId, body);
    if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ case: c });
  } catch (e) { return handleError(e); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "orthopedics", module: "orthopedics" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const ok = body.kind === "fracture"
      ? deleteFracture(String(body.id), orgId)
      : deleteCase(String(body.id), orgId);
    return NextResponse.json({ ok });
  } catch (e) { return handleError(e); }
}
