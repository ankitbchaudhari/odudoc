import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listLabOrders,
  createLabOrder,
  updateLabOrder,
  deleteLabOrder,
  setLabResults,
  type LabOrderStatus,
  type LabPriority,
} from "@/lib/hospital/lab-orders-store";
import { getPatientById } from "@/lib/patients-store";
import { getEncounterById } from "@/lib/encounters-store";

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
      orders: listLabOrders({
        organizationId: orgId,
        patientId: searchParams.get("patientId") || undefined,
        encounterId: searchParams.get("encounterId") || undefined,
        status: (searchParams.get("status") as LabOrderStatus) || undefined,
        priority: (searchParams.get("priority") as LabPriority) || undefined,
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "lab-orders", module: "lab-orders" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (!body.patientId || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const patient = getPatientById(String(body.patientId), orgId);
    if (!patient) {
      return NextResponse.json({ error: "patient_not_found_in_org" }, { status: 404 });
    }
    if (body.encounterId) {
      const enc = getEncounterById(String(body.encounterId), orgId);
      if (!enc || enc.patientId !== patient.id) {
        return NextResponse.json(
          { error: "encounter_not_found_or_mismatch" },
          { status: 404 }
        );
      }
    }
    const order = createLabOrder(orgId, {
      patientId: String(body.patientId),
      encounterId: body.encounterId,
      orderingDoctor: body.orderingDoctor,
      priority: body.priority as LabPriority,
      clinicalNotes: body.clinicalNotes,
      items: body.items,
      orderedAt: body.orderedAt,
    });
    return NextResponse.json({ order });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "lab-orders", module: "lab-orders" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

    // Special case: a results payload updates individual items.
    if (Array.isArray(body.results)) {
      const updated = setLabResults(String(body.id), orgId, body.results);
      if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ order: updated });
    }

    const updated = updateLabOrder(String(body.id), orgId, body);
    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ order: updated });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "lab-orders", module: "lab-orders" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const ok = deleteLabOrder(String(body.id), orgId);
    return NextResponse.json({ ok });
  } catch (e) {
    return handleError(e);
  }
}
