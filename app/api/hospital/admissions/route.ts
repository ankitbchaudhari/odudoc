import { NextRequest, NextResponse } from "next/server";
import { requireOrg, requireActiveBilling, TenantError } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listAdmissions,
  admitPatient,
  transferBed,
  dischargePatient,
  cancelAdmission,
  updateAdmissionNotes,
  estimateRoomCharge,
  type AdmissionStatus,
} from "@/lib/hospital/admissions-store";
import { getPatientById } from "@/lib/patients-store";

import { parseJson, z } from "@/lib/validate";
import { admissionCreateSchema, admissionPatchSchema } from "@/lib/hospital/schemas";
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
    const list = listAdmissions({
      organizationId: orgId,
      patientId: searchParams.get("patientId") || undefined,
      status: (searchParams.get("status") as AdmissionStatus) || undefined,
      wardId: searchParams.get("wardId") || undefined,
    });
    const withCharges = list.map((a) => ({
      ...a,
      roomChargeEstimate: estimateRoomCharge(a.id, orgId),
    }));
    return NextResponse.json({ admissions: withCharges });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    const __parsed_1 = await parseJson(req, admissionCreateSchema);
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body = __parsed_1;
    const patient = getPatientById(body.patientId, orgId);
    if (!patient) {
      return NextResponse.json({ error: "patient_not_found_in_org" }, { status: 404 });
    }
    const res = admitPatient(orgId, body);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    audit(ctx, { action: "create", entityType: "admission", entityId: res.admission.id, module: "admissions", after: res.admission });
    return NextResponse.json({ admission: res.admission });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    const __parsed_2 = await parseJson(req, admissionPatchSchema);
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body = __parsed_2;

    if (body.transferBedId) {
      const res = transferBed(body.id, orgId, body.transferBedId);
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
      audit(ctx, { action: "update", entityType: "admission", entityId: body.id, module: "admissions", reason: "bed_transfer", after: res.admission });
      return NextResponse.json({ admission: res.admission });
    }
    if (body.discharge) {
      const a = dischargePatient(body.id, orgId, body.discharge);
      if (!a) return NextResponse.json({ error: "not_found_or_not_active" }, { status: 400 });
      audit(ctx, { action: "update", entityType: "admission", entityId: body.id, module: "admissions", reason: "discharge", severity: "warning", after: a });
      return NextResponse.json({ admission: a });
    }
    if (body.cancel) {
      const a = cancelAdmission(body.id, orgId);
      if (!a) return NextResponse.json({ error: "not_found_or_not_active" }, { status: 400 });
      audit(ctx, { action: "update", entityType: "admission", entityId: body.id, module: "admissions", reason: "cancel", after: a });
      return NextResponse.json({ admission: a });
    }

    const a = updateAdmissionNotes(body.id, orgId, body);
    if (!a) return NextResponse.json({ error: "not_found" }, { status: 404 });
    audit(ctx, { action: "update", entityType: "admission", entityId: body.id, module: "admissions" });
    return NextResponse.json({ admission: a });
  } catch (e) {
    return handleError(e);
  }
}
