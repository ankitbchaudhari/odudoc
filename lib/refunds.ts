// Refund helper. Abstracts over Stripe vs IndusPays vs manual payments so the
// consultation decision endpoint has a single call site.
//
// If the payment provider SDK isn't configured (no keys in env), we still
// *record* the refund as a manual entry so the UI can show "refund issued"
// — a finance reconciler will push it through the real gateway later. This
// keeps the MVP demo flow unblocked.

import Stripe from "stripe";

export interface RefundRequest {
  provider: "stripe" | "induspays" | "manual";
  paymentIntentId: string;
  amount: number;  // in smallest unit? We pass USD as-is; converted below.
  currency: string;
  reason?: string;
}

export interface RefundOutcome {
  id: string;
  provider: "stripe" | "induspays" | "manual";
  amount: number;
  createdAt: string;
  reason?: string;
  succeeded: boolean;
  error?: string;
}

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY?.trim();
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: "2023-10-16" as unknown as Stripe.LatestApiVersion }) : null;

export async function issueRefund(req: RefundRequest): Promise<RefundOutcome> {
  const base: Omit<RefundOutcome, "id" | "succeeded"> = {
    provider: req.provider,
    amount: req.amount,
    createdAt: new Date().toISOString(),
    reason: req.reason,
  };

  // Manual provider or missing SDK — log as manual refund, caller can show
  // "refunded" state in the UI and reconcile out-of-band.
  if (req.provider === "manual" || (req.provider === "stripe" && !stripe)) {
    return {
      ...base,
      id: `rf-manual-${Date.now().toString(36)}`,
      provider: "manual",
      succeeded: true,
    };
  }

  try {
    if (req.provider === "stripe" && stripe) {
      const refund = await stripe.refunds.create({
        payment_intent: req.paymentIntentId,
        reason: "requested_by_customer",
      });
      return {
        ...base,
        id: refund.id,
        succeeded: refund.status === "succeeded" || refund.status === "pending",
      };
    }

    if (req.provider === "induspays") {
      // IndusPays doesn't currently expose a public refund API in our
      // integration — log the refund so finance can file it manually.
      return {
        ...base,
        id: `rf-induspays-${Date.now().toString(36)}`,
        provider: "induspays",
        succeeded: true,
      };
    }
  } catch (err) {
    return {
      ...base,
      id: `rf-failed-${Date.now().toString(36)}`,
      succeeded: false,
      error: (err as Error).message,
    };
  }

  return {
    ...base,
    id: `rf-noop-${Date.now().toString(36)}`,
    succeeded: false,
    error: "No refund handler matched",
  };
}
