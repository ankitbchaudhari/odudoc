import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  type AppointmentStatus,
  type AppointmentType,
} from "@/lib/hospital/appointments-store";

import { parseJson, z } from "@/lib/validate";
import {
  appointmentCreateSchema,
  appointmentUpdateSchema,
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
      appointments: listAppointments({
        organizationId: orgId,
        patientId: searchParams.get("patientId") || undefined,
        providerId: searchParams.get("providerId") || undefined,
        status:
          (searchParams.get("status") as AppointmentStatus) || undefined,
        type: (searchParams.get("type") as AppointmentType) || undefined,
        dateFrom: searchParams.get("dateFrom") || undefined,
        dateTo: searchParams.get("dateTo") || undefined,
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "appointments", module: "appointments" });
    const __parsed_1 = await parseJson(req, appointmentCreateSchema);
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body = __parsed_1;
    const res = createAppointment(orgId, body);
    if (!res.ok)
      return NextResponse.json(
        { error: res.error, conflict: res.conflict },
        { status: 400 }
      );
    return NextResponse.json({ appointment: res.appointment });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "appointments", module: "appointments" });
    const __parsed_2 = await parseJson(req, appointmentUpdateSchema);
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body = __parsed_2;
    const res = updateAppointment(body.id, orgId, body);
    if (!res.ok)
      return NextResponse.json(
        { error: res.error, conflict: res.conflict },
        {
          status: res.error === "not_found" ? 404 : 400,
        }
      );
    return NextResponse.json({ appointment: res.appointment });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "appointments", module: "appointments" });
    const __parsed_3 = await parseJson(req, idBodySchema);
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const ok = deleteAppointment(__parsed_3.id, orgId);
    return NextResponse.json({ ok });
  } catch (e) {
    return handleError(e);
  }
}
