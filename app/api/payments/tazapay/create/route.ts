// Tazapay hosted-checkout bootstrapper.
//
// POST body:
//   { referenceId, amount, currency, customerName, customerEmail,
//     customerPhone?, description, metadata? }
//
// Returns { checkoutUrl, sessionId } — the client redirects the
// customer to checkoutUrl. Webhook notifications arrive at
// /api/payments/tazapay/webhook.

import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/tazapay";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: {
    referenceId?: string;
    amount?: number;
    currency?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    description?: string;
    metadata?: Record<string, string>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const referenceId = (body.referenceId || "").trim();
  const amount = Number(body.amount);
  const currency = (body.currency || "USD").trim().toUpperCase();
  const customerName = (body.customerName || "").trim();
  const customerEmail = (body.customerEmail || "").trim();
  const description = (body.description || "").trim();

  if (!referenceId || !Number.isFinite(amount) || amount <= 0 || !customerName || !customerEmail || !description) {
    return NextResponse.json(
      { error: "referenceId, amount, customerName, customerEmail and description are required" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.odudoc.com";

  try {
    const session = await createCheckoutSession({
      referenceId,
      amount,
      currency,
      customerName,
      customerEmail,
      customerPhone: body.customerPhone,
      description,
      successUrl: `${appUrl}/payment/success?gw=tazapay&orderId=${encodeURIComponent(referenceId)}`,
      cancelUrl: `${appUrl}/payment/cancel?gw=tazapay&orderId=${encodeURIComponent(referenceId)}`,
      webhookUrl: `${appUrl}/api/payments/tazapay/webhook`,
      metadata: body.metadata || {},
    });
    if (!session.success) {
      return NextResponse.json({ error: session.error || "Tazapay create failed" }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
      referenceId,
    });
  } catch (err) {
    log.error("tazapay.create_failed", err);
    const msg = err instanceof Error ? err.message : "Tazapay create failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
