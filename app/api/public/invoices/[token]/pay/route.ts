// Public invoice pay — creates a Stripe Checkout session for the
// invoice and redirects the patient through Stripe's hosted form.
// Anyone with the publicToken can pay; payment cancels can be
// retried freely.

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  getInvoiceByPublicToken,
  setInvoiceCheckoutSession,
  reloadInvoices,
} from "@/lib/emr-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { token } = await ctx.params;
    if (!token || token.length < 12) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
    let body: { email?: string };
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    await reloadInvoices();
    const invoice = await getInvoiceByPublicToken(token);
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (invoice.status === "paid") {
      return NextResponse.json({ error: "Already paid" }, { status: 400 });
    }
    if (invoice.status === "void") {
      return NextResponse.json({ error: "Invoice voided" }, { status: 410 });
    }
    if (!Number.isFinite(invoice.total) || invoice.total <= 0) {
      return NextResponse.json({ error: "Invoice total invalid" }, { status: 400 });
    }

    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.odudoc.com";
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: body.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ? body.email : undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            // Stripe currency codes are lowercase. We accept "USD"/"INR"
            // etc. on the way in and fold to lowercase here.
            currency: invoice.currency.toLowerCase(),
            unit_amount: Math.round(invoice.total * 100),
            product_data: {
              name: `Invoice ${invoice.number}`,
              description: invoice.lineItems
                .slice(0, 4)
                .map((l) => `${l.description} x${l.quantity}`)
                .join(", ") || "Clinic services",
            },
          },
        },
      ],
      success_url: `${base}/pay/${token}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/pay/${token}?canceled=1`,
      metadata: {
        kind: "emr-public-invoice-payment",
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        publicToken: token,
      },
      payment_intent_data: {
        metadata: {
          kind: "emr-public-invoice-payment",
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
        },
      },
    });

    if (checkout.id) {
      await setInvoiceCheckoutSession(invoice.id, checkout.id);
    }

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    log.error("emr.public_invoice.checkout_failed", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please retry." },
      { status: 500 }
    );
  }
}
