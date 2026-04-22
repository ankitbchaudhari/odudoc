import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  type Modality,
  type RadiologyStatus,
  type RadiologyPriority,
} from "@/lib/hospital/radiology-store";
import { getPatientById } from "@/lib/patients-store";

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
      orders: listOrders({
        organizationId: orgId,
        patientId: searchParams.get("patientId") || undefined,
        modality: (searchParams.get("modality") as Modality) || undefined,
        status: (searchParams.get("status") as RadiologyStatus) || undefined,
        priority: (searchParams.get("priority") as RadiologyPriority) || undefined,
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "radiology", module: "radiology" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (!body.patientId || !body.modality || !body.studyName) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const patient = getPatientById(String(body.patientId), orgId);
    if (!patient) {
      return NextResponse.json({ error: "patient_not_found_in_org" }, { status: 404 });
    }
    const o = createOrder(orgId, body);
    return NextResponse.json({ order: o });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "radiology", module: "radiology" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const o = updateOrder(String(body.id), orgId, body);
    if (!o) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ order: o });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "radiology", module: "radiology" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const ok = deleteOrder(String(body.id), orgId);
    return NextResponse.json({ ok });
  } catch (e) {
    return handleError(e);
  }
}
