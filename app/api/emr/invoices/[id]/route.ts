// EMR invoice detail — GET, PATCH (mark sent/paid/void, edit notes), DELETE.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  reloadInvoices,
  resolveClinic,
  canWrite,
  writeAudit,
  type InvoiceStatus,
} from "@/lib/emr-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await reloadInvoices();
  const scope = clinic.role === "admin" ? undefined : clinic.ownerEmail;
  const invoice = await getInvoiceById(id, scope);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ invoice });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!canWrite(clinic.role, "invoices")) {
    return NextResponse.json({ error: "Your role can't update invoices." }, { status: 403 });
  }

  const { id } = await ctx.params;
  let body: {
    status?: InvoiceStatus;
    notes?: string;
    paidAt?: string;
    paymentMethod?: string;
    dueDate?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const scope = clinic.role === "admin" ? undefined : clinic.ownerEmail;
  const patch: Parameters<typeof updateInvoice>[1] = {};
  if (body.status) patch.status = body.status;
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.dueDate !== undefined) patch.dueDate = body.dueDate;
  if (body.paymentMethod !== undefined) patch.paymentMethod = body.paymentMethod;
  // Auto-stamp paidAt when transitioning to paid.
  if (body.status === "paid") {
    patch.paidAt = body.paidAt || new Date().toISOString();
  }

  const invoice = await updateInvoice(id, patch, scope);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await writeAudit({
    ownerEmail: invoice.doctorEmail,
    actorEmail: clinic.userEmail,
    action: "invoice.update",
    resource: "invoice",
    resourceId: invoice.id,
    meta: {
      number: invoice.number,
      newStatus: patch.status,
      paymentMethod: patch.paymentMethod,
    },
  });

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("emr.invoice.update_persist_failed", err, { invoiceId: id });
    return NextResponse.json(
      { error: "EMR service temporarily unavailable. Please retry." },
      { status: 503 }
    );
  }
  return NextResponse.json({ invoice });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (clinic.role !== "owner" && clinic.role !== "admin") {
    return NextResponse.json({ error: "Only the clinic owner can delete invoices." }, { status: 403 });
  }
  const { id } = await ctx.params;
  await reloadInvoices();
  const scope = clinic.role === "admin" ? undefined : clinic.ownerEmail;
  const existing = await getInvoiceById(id, scope);
  const ok = await deleteInvoice(id, scope);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing) {
    await writeAudit({
      ownerEmail: existing.doctorEmail,
      actorEmail: clinic.userEmail,
      action: "invoice.delete",
      resource: "invoice",
      resourceId: id,
      meta: { number: existing.number, total: existing.total },
    });
  }
  return NextResponse.json({ ok: true });
}
