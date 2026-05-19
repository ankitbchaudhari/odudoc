// Custodial escrow integration via Razorpay Route.
//
// Razorpay Route is the only Indian-licensed escrow option that
// Vercel-deployed apps can integrate with via API alone (no PCI
// scope on our side). Funds are collected from the patient's
// card / UPI, held in a Razorpay "linked account" sub-ledger,
// and released to the destination hospital only when the
// surgeon's sign-off webhook fires.
//
// Production wiring:
//   RAZORPAY_KEY_ID=rzp_live_…
//   RAZORPAY_KEY_SECRET=…
//   RAZORPAY_ROUTE_PARENT_ACCOUNT=acc_… (your platform's master)
//
// In the absence of those env vars, every call returns a "stub"
// response with `live: false` so the medical-tourism store's
// state machine can still drive — the UI just shows a "pending
// integration" pill. Real money movement requires the env vars +
// KYC of every destination hospital as a sub-account.

interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  parentAccount: string;
}

function getConfig(): RazorpayConfig | null {
  const k = process.env.RAZORPAY_KEY_ID?.trim();
  const s = process.env.RAZORPAY_KEY_SECRET?.trim();
  const p = process.env.RAZORPAY_ROUTE_PARENT_ACCOUNT?.trim();
  if (!k || !s || !p) return null;
  return { keyId: k, keySecret: s, parentAccount: p };
}

function authHeader(c: RazorpayConfig): string {
  return `Basic ${Buffer.from(`${c.keyId}:${c.keySecret}`).toString("base64")}`;
}

export interface FundResult {
  live: boolean;
  /** Razorpay order id when live; stub id otherwise. */
  orderId: string;
  /** What the client invokes on Razorpay checkout. */
  checkoutPayload?: {
    key: string;
    order_id: string;
    amount: number;
    currency: string;
  };
}

/** Create a funding intent against an escrow hold. The patient's
 *  checkout flow consumes the returned `checkoutPayload`. */
export async function createFundIntent(input: {
  escrowId: string;
  amountUsd: number;
  destinationAccountId: string;
}): Promise<FundResult> {
  const c = getConfig();
  if (!c) {
    return {
      live: false,
      orderId: `stub_${input.escrowId}`,
    };
  }

  const amountInr = Math.round(input.amountUsd * 83 * 100); // USD→INR→paise, 83 fx rate placeholder
  const body = {
    amount: amountInr,
    currency: "INR",
    receipt: input.escrowId,
    notes: { escrowId: input.escrowId },
    transfers: [
      {
        account: input.destinationAccountId,
        amount: amountInr,
        currency: "INR",
        on_hold: 1, // funds held on the linked account until release
      },
    ],
  };
  const r = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: authHeader(c), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    return { live: false, orderId: `stub_${input.escrowId}` };
  }
  const j = await r.json();
  return {
    live: true,
    orderId: j.id,
    checkoutPayload: {
      key: c.keyId,
      order_id: j.id,
      amount: amountInr,
      currency: "INR",
    },
  };
}

/** Release the on-hold transfer once the surgeon signs off. */
export async function releaseEscrow(transferId: string): Promise<{ ok: boolean; live: boolean }> {
  const c = getConfig();
  if (!c) return { ok: true, live: false };
  const r = await fetch(`https://api.razorpay.com/v1/transfers/${transferId}`, {
    method: "PATCH",
    headers: { Authorization: authHeader(c), "Content-Type": "application/json" },
    body: JSON.stringify({ on_hold: 0 }),
  });
  return { ok: r.ok, live: true };
}

/** Refund if procedure cancelled / not performed. */
export async function refundEscrow(paymentId: string): Promise<{ ok: boolean; live: boolean }> {
  const c = getConfig();
  if (!c) return { ok: true, live: false };
  const r = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
    method: "POST",
    headers: { Authorization: authHeader(c), "Content-Type": "application/json" },
  });
  return { ok: r.ok, live: true };
}

export function razorpayStatus(): { configured: boolean } {
  return { configured: !!getConfig() };
}
