import { NextResponse } from "next/server";
import { PAYMENTS_DISABLED_UNTIL, paymentsDisabled } from "@/lib/payments-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    disabled: paymentsDisabled(),
    until: PAYMENTS_DISABLED_UNTIL,
  });
}
