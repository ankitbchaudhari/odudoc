import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  addPayment,
  removePayment,
  type InvoiceStatus,
} from "@/lib/hospital/invoices-store";
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
      invoices: listInvoices({
        organizationId: orgId,
        patientId: searchParams.get("patientId") || undefined,
        status: (searchParams.get("status") as InvoiceStatus) || undefined,
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "invoices", module: "invoices" });
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
    const inv = createInvoice(orgId, {
      patientId: String(body.patientId),
      encounterId: body.encounterId,
      items: body.items,
      currency: body.currency,
      dueAt: body.dueAt,
      notes: body.notes,
      issue: !!body.issue,
    });
    return NextResponse.json({ invoice: inv });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "invoices", module: "invoices" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

    // Payment add/remove special paths.
    if (body.addPayment) {
      const updated = addPayment(String(body.id), orgId, body.addPayment);
      if (!updated) return NextResponse.json({ error: "not_found_or_void" }, { status: 404 });
      return NextResponse.json({ invoice: updated });
    }
    if (body.removePaymentId) {
      const updated = removePayment(String(body.id), orgId, String(body.removePaymentId));
      if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ invoice: updated });
    }

    const updated = updateInvoice(String(body.id), orgId, body);
    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ invoice: updated });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "invoices", module: "invoices" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const ok = deleteInvoice(String(body.id), orgId);
    return NextResponse.json({ ok });
  } catch (e) {
    return handleError(e);
  }
}
