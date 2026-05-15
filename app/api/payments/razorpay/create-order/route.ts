// POST /api/payments/razorpay/create-order
//
// Creates a Razorpay order for a consultation / clinic-visit booking.
// Mirrors /api/payments/cashfree/create — same input shape, same
// downstream usage (the booking shell is persisted on the verify hop).
//
// Response: { orderId, amount (paise), currency, keyId }
//   keyId is the public key the client needs to instantiate the
//   Razorpay modal. NEVER returns the secret.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createRazorpayOrder,
  isRazorpayConfigured,
  razorpayPublicKey,
} from "@/lib/razorpay";
import { parseJson } from "@/lib/api-validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const CreateOrderSchema = z.object({
  // Amount in the smallest unit (paise for INR, cents for USD). Min 100.
  amountPaise: z.number().int().min(100).max(1_000_000_00),
  currency: z.string().trim().min(3).max(8).default("INR"),
  // Short receipt — surfaced in Razorpay dashboard for support lookups.
  // We use the booking id when available; otherwise a synthetic id.
  receipt: z.string().trim().min(1).max(40).optional(),
  // Optional notes the merchant sees in the dashboard. Useful for
  // doctor/clinic linkage when a support ticket lands.
  notes: z.record(z.string(), z.string().max(120)).optional(),
});

export async function POST(req: NextRequest) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { error: "Razorpay is not configured on this deployment." },
      { status: 503 },
    );
  }

  const parsed = await parseJson(req, CreateOrderSchema);
  if (!parsed.ok) return parsed.response;
  const { amountPaise, currency, receipt, notes } = parsed.data;

  try {
    const order = await createRazorpayOrder({
      amountPaise,
      currency,
      receipt: receipt || `od_${Date.now()}`,
      notes,
    });
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: razorpayPublicKey(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "create_order_failed";
    log.error("razorpay.create_order_route_failed", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
