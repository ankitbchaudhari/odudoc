// GET /api/payments/cashfree/verify?orderId=<id>
//
// Called from the return_url after the patient completes payment.
// Defence in depth — the webhook is the source of truth for state
// transitions, but the patient's UI needs an immediate yes/no on
// whether the payment landed so we don't tell them "Pending" when
// it's actually done.
//
// Hits Cashfree's GET /orders/{order_id} to read the authoritative
// order status + the order_tags we set at creation time. The tags
// tell us whether this was a consultation payment or a wallet topup
// so we can credit the right thing if the webhook hasn't fired yet.
//
// applyTopUp and markConsultationPaid are both idempotent (keyed on
// the order id / payment id) so a later webhook firing is safe.

import { NextRequest, NextResponse } from "next/server";
import { getOrderStatus } from "@/lib/cashfree";
import { markPaid as markConsultationPaid, reloadConsultations } from "@/lib/consultations-store";
import { applyTopUp, reloadWallet } from "@/lib/wallet/store";
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

    let creditedHere = false;

    if (status.paid) {
      const type = status.tags.type;
      try {
        if (type === "wallet_topup") {
          // Wallet topup → credit the user's wallet. applyTopUp is
          // idempotent on providerSid (cfOrderId here) so a later
          // webhook firing for the same payment is a no-op.
          const userId = status.tags.userId;
          const amount = Number(status.tags.amount || status.amount || 0);
          if (userId && amount > 0) {
            await reloadWallet();
            const r = applyTopUp({
              userId,
              amountRupees: Math.floor(amount),
              providerSid: status.cfOrderId,
              note: `Cashfree top-up ${orderId} (verified on return)`,
            });
            if (r.ok) {
              creditedHere = true;
              log.info("cashfree.verify.wallet_credited", { orderId, userId, amount });
            } else {
              log.warn("cashfree.verify.wallet_credit_rejected", { orderId, error: r.error });
            }
          } else {
            log.warn("cashfree.verify.wallet_topup_missing_tags", {
              orderId,
              hasUserId: Boolean(userId),
              amount,
            });
          }
        } else if (type === "consultation" || type === undefined) {
          // Fall back to the consultation path for orders without
          // explicit type tags — preserves the pre-tag-aware behaviour.
          await reloadConsultations();
          markConsultationPaid(orderId, "");
        }
        await awaitAllFlushesStrict();
      } catch (err) {
        log.error("cashfree.verify.handler_threw", err, { orderId, type });
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
      type: status.tags.type,
      creditedHere,
    });
  } catch (err) {
    log.error("payments.cashfree.verify_failed", err, { orderId });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Verify failed" },
      { status: 502 },
    );
  }
}
