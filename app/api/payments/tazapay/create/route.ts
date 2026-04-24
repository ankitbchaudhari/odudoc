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
import { z } from "zod";
import { createCheckoutSession } from "@/lib/tazapay";
import { parseJson } from "@/lib/api-validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const TazapayCreateSchema = z.object({
  referenceId: z.string().trim().min(1).max(64),
  amount: z.number().positive().max(10000000),
  currency: z.string().trim().length(3).default("USD"),
  customerName: z.string().trim().min(1).max(120),
  customerEmail: z.string().trim().email().max(200),
  customerPhone: z.string().trim().max(32).optional(),
  description: z.string().trim().min(1).max(500),
  metadata: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, TazapayCreateSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const { referenceId, amount, customerName, customerEmail, description } = body;
  const currency = body.currency.toUpperCase();
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
