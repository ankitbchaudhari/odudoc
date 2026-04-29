// Re-issue the payment-link token on an invoice.
//
// Two scenarios this handles:
//   1. Legacy invoices created before EMR v3 don't have a publicToken
//      at all. POST here mints one so the doctor can copy a pay link.
//   2. The doctor wants to invalidate a previously-shared link
//      (patient lost the message thread, partner forwarded it, etc.)
//      and rotate to a fresh URL. Same endpoint.
//
// Always returns the freshly-tokened invoice. Idempotent in the sense
// that calling twice produces two valid tokens — the older URL just
// stops working as soon as a newer one is minted (since each token
// must match the row exactly via getInvoiceByPublicToken).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  regenerateInvoicePublicToken,
  reloadInvoices,
  resolveClinic,
  canWrite,
  writeAudit,
} from "@/lib/emr-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!canWrite(clinic.role, "invoices")) {
    return NextResponse.json(
      { error: "Your role can't update invoices." },
      { status: 403 }
    );
  }

  const { id } = await ctx.params;
  await reloadInvoices();
  const scope = clinic.role === "admin" ? undefined : clinic.ownerEmail;
  const invoice = await regenerateInvoicePublicToken(id, scope);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invoice.status === "paid" || invoice.status === "void") {
    // Token still rotated, but warn the caller — paying a paid/void
    // invoice is rejected by the public pay endpoint anyway.
    return NextResponse.json({
      invoice,
      warning: `Invoice is ${invoice.status}; payment link will not accept charges.`,
    });
  }

  await writeAudit({
    ownerEmail: invoice.doctorEmail,
    actorEmail: clinic.userEmail,
    action: "invoice.update",
    resource: "invoice",
    resourceId: invoice.id,
    meta: { number: invoice.number, regeneratedToken: true },
  });

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("emr.invoice.token_regen_persist_failed", err, { invoiceId: id });
    return NextResponse.json(
      { error: "EMR service temporarily unavailable. Please retry." },
      { status: 503 }
    );
  }
  return NextResponse.json({ invoice });
}
