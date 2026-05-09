// POST /api/payments/cashfree/create
//
// Creates a Cashfree hosted-checkout order. Used for both:
//   - patient paying a consultation fee (30 % commission to OduDoc)
//   - clinic paying the monthly subscription
//
// Mirrors /api/payments/induspays/create — same body shape, same
// commission split — so the client can flip provider with no code
// change beyond the `provider` field on the booking flow.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCheckoutSession, calculateCommission } from "@/lib/cashfree";
import { parseJson } from "@/lib/api-validate";
import { log } from "@/lib/log";

const CashfreeCreateSchema = z.object({
  type: z.enum(["consultation", "clinic_subscription"]),
  amount: z.number().positive().max(10_000_000),
  currency: z.enum(["INR", "USD", "EUR", "GBP", "SGD"]).default("INR"),
  orderId: z.string().trim().min(1).max(64),
  customerName: z.string().trim().min(1).max(120),
  customerEmail: z.string().trim().email().max(200),
  customerPhone: z.string().trim().min(7).max(32),
  customerId: z.string().trim().max(64).optional(),
  description: z.string().trim().min(1).max(500),
  doctorId: z.string().trim().max(64).optional(),
  clinicId: z.string().trim().max(64).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, CashfreeCreateSchema);
  if (!parsed.ok) return parsed.response;
  const {
    type,
    amount,
    currency,
    orderId,
    customerName,
    customerEmail,
    customerPhone,
    customerId,
    description,
    doctorId,
    clinicId,
  } = parsed.data;

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.odudoc.com";

    // Stash classification + revenue split on the order so the
    // webhook can route the post-payment side-effects without
    // re-computing.
    const metadata: Record<string, string> = { type, orderId };
    if (type === "consultation") {
      const { commission, doctorPayout } = calculateCommission(amount);
      metadata.doctorId = doctorId || "";
      metadata.commission = commission.toString();
      metadata.doctorPayout = doctorPayout.toString();
    } else {
      metadata.clinicId = clinicId || "";
      metadata.plan = "clinic_monthly";
    }

    const session = await createCheckoutSession({
      orderId,
      amount,
      currency,
      customerName,
      customerEmail,
      customerPhone,
      customerId,
      description,
      returnUrl: `${appUrl}/payment/success?provider=cashfree&orderId=${encodeURIComponent(orderId)}`,
      notifyUrl: `${appUrl}/api/payments/cashfree/webhook`,
      metadata,
    });

    return NextResponse.json({
      ok: true,
      provider: "cashfree",
      paymentSessionId: session.paymentSessionId,
      orderId: session.orderId,
      cfOrderId: session.cfOrderId,
      orderStatus: session.orderStatus,
      paymentLink: session.paymentLink,
    });
  } catch (err) {
    log.error("payments.cashfree.create_failed", err, { orderId });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 },
    );
  }
}
