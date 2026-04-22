import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listBookings,
  createBooking,
  updateBooking,
  cancelBooking,
  deleteBooking,
  type SurgeryStatus,
} from "@/lib/hospital/surgery-store";
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
      bookings: listBookings({
        organizationId: orgId,
        patientId: searchParams.get("patientId") || undefined,
        otId: searchParams.get("otId") || undefined,
        status: (searchParams.get("status") as SurgeryStatus) || undefined,
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
    audit(ctx, { action: "create", entityType: "surgeries", module: "surgeries" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (
      !body.patientId ||
      !body.otId ||
      !body.procedureName ||
      !body.primarySurgeon ||
      !body.scheduledStart ||
      !body.scheduledEnd
    ) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const patient = getPatientById(String(body.patientId), orgId);
    if (!patient) {
      return NextResponse.json({ error: "patient_not_found_in_org" }, { status: 404 });
    }
    const res = createBooking(orgId, body);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json({ booking: res.booking });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "surgeries", module: "surgeries" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    if (body.cancel) {
      const b = cancelBooking(String(body.id), orgId);
      if (!b) return NextResponse.json({ error: "not_found_or_completed" }, { status: 400 });
      return NextResponse.json({ booking: b });
    }
    const res = updateBooking(String(body.id), orgId, body);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json({ booking: res.booking });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "surgeries", module: "surgeries" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const ok = deleteBooking(String(body.id), orgId);
    if (!ok) return NextResponse.json({ error: "in_progress_or_not_found" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
