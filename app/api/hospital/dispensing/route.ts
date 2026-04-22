import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listDispenses,
  createDispense,
  cancelDispense,
  updateDispenseNotes,
  type DispenseStatus,
} from "@/lib/hospital/dispensing-store";
import { getPatientById } from "@/lib/patients-store";
import { getPrescriptionById } from "@/lib/hospital/prescriptions-store";

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
      dispenses: listDispenses({
        organizationId: orgId,
        patientId: searchParams.get("patientId") || undefined,
        prescriptionId: searchParams.get("prescriptionId") || undefined,
        status: (searchParams.get("status") as DispenseStatus) || undefined,
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "dispensing", module: "dispensing" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (!body.patientId || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const patient = getPatientById(String(body.patientId), orgId);
    if (!patient) {
      return NextResponse.json(
        { error: "patient_not_found_in_org" },
        { status: 404 }
      );
    }
    if (body.prescriptionId) {
      const rx = getPrescriptionById(String(body.prescriptionId), orgId);
      if (!rx || rx.patientId !== patient.id) {
        return NextResponse.json(
          { error: "prescription_not_found_or_mismatch" },
          { status: 404 }
        );
      }
    }
    const res = createDispense(orgId, {
      prescriptionId: body.prescriptionId,
      patientId: String(body.patientId),
      encounterId: body.encounterId,
      items: body.items,
      dispensedBy: body.dispensedBy,
      notes: body.notes,
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: res.error, itemId: res.itemId },
        { status: 400 }
      );
    }
    return NextResponse.json({ dispense: res.dispense });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "dispensing", module: "dispensing" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    if (body.cancel) {
      const d = cancelDispense(String(body.id), orgId);
      if (!d) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ dispense: d });
    }
    const d = updateDispenseNotes(String(body.id), orgId, { notes: body.notes });
    if (!d) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ dispense: d });
  } catch (e) {
    return handleError(e);
  }
}
