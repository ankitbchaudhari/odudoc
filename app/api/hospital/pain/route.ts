import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { listAssessments, createAssessment, deleteAssessment, listPlans, createPlan, updatePlan, deletePlan, computeStats, type PlanStatus } from "@/lib/hospital/pain-store";

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
      assessments: listAssessments({
        organizationId: orgId,
        patientId: searchParams.get("patientId") || undefined,
        from: searchParams.get("from") || undefined,
        to: searchParams.get("to") || undefined,
      }),
      plans: listPlans({
        organizationId: orgId,
        status: (searchParams.get("planStatus") as PlanStatus) || undefined,
        patientId: searchParams.get("patientId") || undefined,
      }),
      stats: computeStats(orgId),
    });
  } catch (e) { return handleError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "pain", module: "pain" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (body.kind === "plan") {
      const r = createPlan(orgId, body);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      return NextResponse.json({ plan: r.plan });
    }
    const r = createAssessment(orgId, body);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ assessment: r.assessment });
  } catch (e) { return handleError(e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "pain", module: "pain" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const p = updatePlan(String(body.id), orgId, body);
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ plan: p });
  } catch (e) { return handleError(e); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "pain", module: "pain" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    if (body.kind === "plan") return NextResponse.json({ ok: deletePlan(String(body.id), orgId) });
    return NextResponse.json({ ok: deleteAssessment(String(body.id), orgId) });
  } catch (e) { return handleError(e); }
}
