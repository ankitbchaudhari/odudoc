import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  listEncounters,
  createEncounter,
  updateEncounter,
  deleteEncounter,
  type EncounterStatus,
  type EncounterType,
} from "@/lib/encounters-store";
import { getPatientById } from "@/lib/patients-store";

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
      encounters: listEncounters({
        organizationId: orgId,
        patientId: searchParams.get("patientId") || undefined,
        status: (searchParams.get("status") as EncounterStatus) || undefined,
        type: (searchParams.get("type") as EncounterType) || undefined,
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const body = await req.json();
    if (!body.patientId || !body.type) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    // Tenant integrity: the patient must belong to this org.
    const patient = getPatientById(String(body.patientId), orgId);
    if (!patient) {
      return NextResponse.json(
        { error: "patient_not_found_in_org" },
        { status: 404 }
      );
    }
    const enc = createEncounter(orgId, {
      patientId: String(body.patientId),
      type: body.type as EncounterType,
      doctorName: body.doctorName,
      department: body.department,
      chiefComplaint: body.chiefComplaint,
      historyOfPresentIllness: body.historyOfPresentIllness,
      examination: body.examination,
      diagnosis: body.diagnosis,
      treatmentPlan: body.treatmentPlan,
      vitals: body.vitals,
      notes: body.notes,
      startedAt: body.startedAt,
    });
    return NextResponse.json({ encounter: enc });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const updated = updateEncounter(String(body.id), orgId, body);
    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ encounter: updated });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const ok = deleteEncounter(String(body.id), orgId);
    return NextResponse.json({ ok });
  } catch (e) {
    return handleError(e);
  }
}
