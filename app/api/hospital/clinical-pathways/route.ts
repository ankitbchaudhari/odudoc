import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listDefinitions, getDefinition, createDefinition, updateDefinition, deleteDefinition,
  listEnrollments, createEnrollment, updateEnrollment, deleteEnrollment,
  computeStats,
  type PathwayStatus, type PathwayCategory, type EnrollmentStatus,
} from "@/lib/hospital/clinical-pathways-store";

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
    const id = searchParams.get("id");
    if (id) {
      const d = getDefinition(id, orgId);
      if (!d) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ definition: d });
    }
    return NextResponse.json({
      definitions: listDefinitions({
        organizationId: orgId,
        status: (searchParams.get("status") as PathwayStatus) || undefined,
        category: (searchParams.get("category") as PathwayCategory) || undefined,
      }),
      enrollments: listEnrollments({
        organizationId: orgId,
        status: (searchParams.get("enrollStatus") as EnrollmentStatus) || undefined,
        pathwayId: searchParams.get("pathwayId") || undefined,
        patientId: searchParams.get("patientId") || undefined,
      }),
      stats: computeStats(orgId),
    });
  } catch (e) { return handleError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "clinical-pathways", module: "clinical-pathways" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (body.kind === "enrollment") {
      const r = createEnrollment(orgId, body);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      return NextResponse.json({ enrollment: r.record });
    }
    const r = createDefinition(orgId, body);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ definition: r.record });
  } catch (e) { return handleError(e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "clinical-pathways", module: "clinical-pathways" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    if (body.kind === "enrollment") {
      const r = updateEnrollment(String(body.id), orgId, body);
      if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ enrollment: r });
    }
    const r = updateDefinition(String(body.id), orgId, body);
    if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ definition: r });
  } catch (e) { return handleError(e); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "clinical-pathways", module: "clinical-pathways" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    if (body.kind === "enrollment") return NextResponse.json({ ok: deleteEnrollment(String(body.id), orgId) });
    return NextResponse.json({ ok: deleteDefinition(String(body.id), orgId) });
  } catch (e) { return handleError(e); }
}
