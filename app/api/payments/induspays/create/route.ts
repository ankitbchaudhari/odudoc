import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession, calculateCommission } from "@/lib/induspays";

import { log } from "@/lib/log";
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
  try {
    const body = await request.json();
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
    } = body;

    if (!type || !amount || !orderId || !customerName || !customerEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    if (type !== "consultation" && type !== "clinic_subscription") {
      return NextResponse.json(
        { error: "Invalid payment type" },
        { status: 400 }
      );
    }

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
