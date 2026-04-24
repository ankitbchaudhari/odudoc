import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCheckoutSession, calculateCommission } from "@/lib/induspays";
import { parseJson } from "@/lib/api-validate";
import { log } from "@/lib/log";

const IndusCreateSchema = z.object({
  type: z.enum(["consultation", "clinic_subscription"]),
  amount: z.number().positive().max(10000000),
  orderId: z.string().trim().min(1).max(64),
  customerName: z.string().trim().min(1).max(120),
  customerEmail: z.string().trim().email().max(200),
  customerPhone: z.string().trim().max(32).optional(),
  description: z.string().trim().min(1).max(500),
  doctorId: z.string().trim().max(64).optional(),
  clinicId: z.string().trim().max(64).optional(),
});
/**
 * POST /api/payments/induspays/create
 *
 * Creates an IndusPays hosted checkout session.
 * Used for BOTH:
 *   - Patient paying a consultation fee (30% goes to OduDoc as commission)
 *   - Clinic paying the $100/month subscription after 30-day trial
 *
 * Body:
 *   {
 *     type: "consultation" | "clinic_subscription",
 *     amount: number,          // USD
 *     orderId: string,
 *     customerName: string,
 *     customerEmail: string,
 *     customerPhone?: string,
 *     description: string,
 *     doctorId?: string,       // required if type === "consultation"
 *     clinicId?: string        // required if type === "clinic_subscription"
 *   }
 */
export async function POST(request: NextRequest) {
  const parsed = await parseJson(request, IndusCreateSchema);
  if (!parsed.ok) return parsed.response;
  const {
    type,
    amount,
    orderId,
    customerName,
    customerEmail,
    customerPhone,
    description,
    doctorId,
    clinicId,
  } = parsed.data;

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.odudoc.com";

    const metadata: Record<string, string> = {
      type,
      orderId,
    };

    if (type === "consultation") {
      const { commission, doctorPayout } = calculateCommission(amount);
      metadata.doctorId = doctorId || "";
      metadata.commission = commission.toString();
      metadata.doctorPayout = doctorPayout.toString();
    } else {
      metadata.clinicId = clinicId || "";
      metadata.plan = "clinic_monthly_100";
    }

    const session = await createCheckoutSession({
      orderId,
      amount,
      currency: "USD",
      customerName,
      customerEmail,
      customerPhone,
      description,
      returnUrl: `${appUrl}/payment/success?orderId=${encodeURIComponent(orderId)}`,
      cancelUrl: `${appUrl}/payment/cancel?orderId=${encodeURIComponent(orderId)}`,
      webhookUrl: `${appUrl}/api/payments/induspays/webhook`,
      metadata,
    });

    if (!session.success) {
      return NextResponse.json(
        { error: session.error || "Failed to create IndusPays session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
      orderId,
    });
  } catch (error) {
    log.error("IndusPays checkout error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
