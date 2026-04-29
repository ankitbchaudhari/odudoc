// EMR invoices API — list (by patient or by owner) + create.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listInvoicesForPatient,
  listInvoicesForOwner,
  createInvoice,
  reloadInvoices,
  resolveClinic,
  canWrite,
  type EmrInvoiceLineItem,
  type InvoiceStatus,
} from "@/lib/emr-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await reloadInvoices();
  const patientId = req.nextUrl.searchParams.get("patientId");
  const status = (req.nextUrl.searchParams.get("status") || undefined) as
    | InvoiceStatus
    | undefined;
  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const scope = clinic.role === "admin" ? undefined : clinic.ownerEmail;
  if (patientId) {
    const invoices = await listInvoicesForPatient(patientId, scope);
    return NextResponse.json({ invoices });
  }
  const invoices = await listInvoicesForOwner(ownerEmail, status);
  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!canWrite(clinic.role, "invoices")) {
    return NextResponse.json({ error: "Your role can't raise invoices." }, { status: 403 });
  }

  let body: {
    patientId?: string;
    issueDate?: string;
    dueDate?: string;
    lineItems?: EmrInvoiceLineItem[];
    taxRate?: number;
    currency?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patientId = (body.patientId || "").trim();
  if (!patientId) {
    return NextResponse.json({ error: "patientId required" }, { status: 400 });
  }
  if (!Array.isArray(body.lineItems) || body.lineItems.length === 0) {
    return NextResponse.json(
      { error: "At least one line item is required" },
      { status: 400 }
    );
  }

  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const invoice = await createInvoice({
    ownerEmail,
    authoredBy: clinic.userEmail,
    patientId,
    issueDate: body.issueDate,
    dueDate: body.dueDate,
    lineItems: body.lineItems,
    taxRate: body.taxRate,
    currency: body.currency,
    notes: body.notes,
  });

  if (invoice.lineItems.length === 0) {
    // Server filtered every line — surface that to the client.
    return NextResponse.json(
      { error: "All line items were invalid (need description + quantity > 0)" },
      { status: 400 }
    );
  }

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("emr.invoice.persist_failed", err, { ownerEmail, patientId });
    return NextResponse.json(
      { error: "EMR service is temporarily unavailable — invoice not saved." },
      { status: 503 }
    );
  }
  return NextResponse.json({ invoice }, { status: 201 });
}
