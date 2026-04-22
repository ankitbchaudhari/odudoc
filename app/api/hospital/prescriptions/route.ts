import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listPrescriptions,
  createPrescription,
  updatePrescription,
  deletePrescription,
  type PrescriptionStatus,
} from "@/lib/hospital/prescriptions-store";
import { getPatientById } from "@/lib/patients-store";
import { getEncounterById } from "@/lib/encounters-store";

import { parseJson, z } from "@/lib/validate";
import {
  prescriptionCreateSchema,
  prescriptionUpdateSchema,
  idBodySchema,
} from "@/lib/hospital/schemas";
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
      prescriptions: listPrescriptions({
        organizationId: orgId,
        patientId: searchParams.get("patientId") || undefined,
        encounterId: searchParams.get("encounterId") || undefined,
        status: (searchParams.get("status") as PrescriptionStatus) || undefined,
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "prescriptions", module: "prescriptions" });
    const __parsed_1 = await parseJson(req, prescriptionCreateSchema);
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body = __parsed_1;
    // Tenant integrity.
    const patient = getPatientById(body.patientId, orgId);
    if (!patient) {
      return NextResponse.json({ error: "patient_not_found_in_org" }, { status: 404 });
    }
    if (body.encounterId) {
      const enc = getEncounterById(body.encounterId, orgId);
      if (!enc || enc.patientId !== patient.id) {
        return NextResponse.json(
          { error: "encounter_not_found_or_mismatch" },
          { status: 404 }
        );
      }
    }
    const rx = createPrescription(orgId, body);
    return NextResponse.json({ prescription: rx });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "prescriptions", module: "prescriptions" });
    const __parsed_2 = await parseJson(req, prescriptionUpdateSchema);
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body = __parsed_2;
    const updated = updatePrescription(body.id, orgId, body);
    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ prescription: updated });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "prescriptions", module: "prescriptions" });
    const __parsed_3 = await parseJson(req, idBodySchema);
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const ok = deletePrescription(__parsed_3.id, orgId);
    return NextResponse.json({ ok });
  } catch (e) {
    return handleError(e);
  }
}
