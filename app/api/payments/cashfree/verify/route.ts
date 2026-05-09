// GET /api/payments/cashfree/verify?orderId=<id>
//
// Called from the return_url after the patient completes payment.
// Defence in depth — the webhook is the source of truth for state
// transitions, but the patient's UI needs an immediate yes/no on
// whether the payment landed so we don't tell them "Pending" when
// it's actually done.
//
// Hits Cashfree's GET /orders/{order_id} so we know for certain
// whether the order is PAID, regardless of what the redirect URL
// query string claimed.

import { NextRequest, NextResponse } from "next/server";
import { getOrderStatus } from "@/lib/cashfree";
import { markPaid as markConsultationPaid } from "@/lib/consultations-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "orderId required" }, { status: 400 });
  }

  try {
    const status = await getOrderStatus(orderId);

    // Belt-and-braces: if the webhook hasn't fired yet and the order
    // is genuinely paid per Cashfree, mark the consultation paid here
    // too. markPaid is idempotent so a later webhook replay is safe.
    if (status.paid) {
      try {
        markConsultationPaid(orderId, "");
        await awaitAllFlushesStrict();
      } catch (err) {
        log.error("cashfree.verify.mark_paid_threw", err, { orderId });
      }
    }

    return NextResponse.json({
      ok: true,
      orderId: status.orderId,
      cfOrderId: status.cfOrderId,
      orderStatus: status.orderStatus,
      paid: status.paid,
      amount: status.amount,
      currency: status.currency,
    });
  } catch (err) {
    log.error("payments.cashfree.verify_failed", err, { orderId });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Verify failed" },
      { status: 502 },
    );
  }
}
