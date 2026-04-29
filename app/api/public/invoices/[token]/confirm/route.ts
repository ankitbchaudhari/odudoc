// Public payment confirmation — hit by the success_url redirect from
// Stripe. Verifies payment status and marks the invoice paid. Idempotent
// on stripeSessionId so a refresh / replay doesn't double-stamp.

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  getInvoiceByPublicToken,
  markInvoicePaidOnline,
  reloadInvoices,
  writeAudit,
} from "@/lib/emr-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { token } = await ctx.params;
    const sessionId = req.nextUrl.searchParams.get("session_id");
    if (!token || !sessionId) {
      return NextResponse.json({ error: "token and session_id required" }, { status: 400 });
    }

    await reloadInvoices();
    const invoice = await getInvoiceByPublicToken(token);
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Cross-check: the session must reference this invoice by id so
    // an attacker can't paste another clinic's session_id.
    const checkout = await stripe.checkout.sessions.retrieve(sessionId);
    if (checkout.metadata?.invoiceId !== invoice.id) {
      return NextResponse.json(
        { error: "Payment session does not match this invoice." },
        { status: 403 }
      );
    }
    if (checkout.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed yet." },
        { status: 402 }
      );
    }

    const updated = await markInvoicePaidOnline({
      invoiceId: invoice.id,
      stripeSessionId: sessionId,
      paymentMethod: "card",
    });

    if (updated) {
      await writeAudit({
        ownerEmail: invoice.doctorEmail,
        actorEmail: `patient:${token.slice(0, 12)}`,
        action: "invoice.paid_online",
        resource: "invoice",
        resourceId: invoice.id,
        meta: {
          invoiceNumber: invoice.number,
          amount: invoice.total,
          currency: invoice.currency,
          stripeSessionId: sessionId,
        },
      });
    }

    try {
      await awaitAllFlushesStrict();
    } catch (err) {
      log.error("emr.public_invoice.persist_failed", err, { invoiceId: invoice.id });
      // Don't fail the patient's redirect — Stripe has the money,
      // and a retry on this endpoint will idempotently complete.
    }
    return NextResponse.json({ ok: true, invoice: { number: invoice.number, total: invoice.total, currency: invoice.currency } });
  } catch (err) {
    log.error("emr.public_invoice.confirm_failed", err);
    return NextResponse.json(
      { error: "Could not confirm payment. Please contact the clinic." },
      { status: 500 }
    );
  }
}
