// Public invoice read API — patient-facing. No auth required; the
// random publicToken on the URL is the capability.

import { NextRequest, NextResponse } from "next/server";
import {
  getInvoiceByPublicToken,
  getPatientById,
  reloadInvoices,
  reloadPatients,
} from "@/lib/emr-store";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params;
  if (!token || token.length < 12) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }
  await reloadInvoices();
  const invoice = await getInvoiceByPublicToken(token);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invoice.status === "void") {
    return NextResponse.json({ error: "Invoice voided" }, { status: 410 });
  }

  // Add minimal patient info so the page can show "Bill to" — we
  // only return the patient's name, NOT phone / address / clinical
  // data. The patient already knows who they are.
  await reloadPatients();
  const patient = await getPatientById(invoice.patientId);

  return NextResponse.json({
    invoice: {
      number: invoice.number,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      lineItems: invoice.lineItems,
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      currency: invoice.currency,
      status: invoice.status,
      notes: invoice.notes,
      paidAt: invoice.paidAt,
    },
    patientName: patient ? `${patient.firstName} ${patient.lastName}`.trim() : null,
    clinicName: invoice.doctorEmail, // best we have on the public surface
  });
}
