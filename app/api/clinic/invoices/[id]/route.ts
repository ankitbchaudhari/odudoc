// GET    /api/clinic/invoices/:id  — fetch one invoice (clinic staff)
// POST   /api/clinic/invoices/:id  — actions: ?action=mark_paid | void

import { NextRequest, NextResponse } from "next/server";
import { getClinicSession } from "@/lib/clinic-session";
import {
  getInvoiceById,
  markInvoicePaid,
  voidInvoice,
  reloadInvoices,
} from "@/lib/clinic-invoices-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  await reloadInvoices();
  const inv = getInvoiceById(params.id);
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (inv.clinicId !== session.clinicId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ invoice: inv });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  if (session.role !== "manager") {
    return NextResponse.json(
      { error: "Only managers can mark invoices paid or void them." },
      { status: 403 },
    );
  }
  await reloadInvoices();
  const inv = getInvoiceById(params.id);
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (inv.clinicId !== session.clinicId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const action = new URL(req.url).searchParams.get("action");
  if (action === "mark_paid") {
    return NextResponse.json({ invoice: markInvoicePaid(params.id) });
  }
  if (action === "void") {
    const body = await req.json().catch(() => ({}));
    const reason = (body?.reason as string | undefined) || "no reason given";
    return NextResponse.json({ invoice: voidInvoice(params.id, reason) });
  }
  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
