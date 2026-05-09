import { NextResponse } from "next/server";
import { PAYMENTS_DISABLED_UNTIL, paymentsDisabled } from "@/lib/payments-config";
import { isCashfreeConfigured } from "@/lib/cashfree";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    disabled: paymentsDisabled(),
    until: PAYMENTS_DISABLED_UNTIL,
    // Surface which gateways are wired so the BookingModal can render
    // the right buttons. Stripe is implied (legacy default); flagging
    // Cashfree explicitly because its client SDK only loads when both
    // env keys + the JS bundle URL are reachable.
    gateways: {
      stripe: Boolean(process.env.STRIPE_SECRET_KEY),
      cashfree: isCashfreeConfigured(),
    },
  });
}
