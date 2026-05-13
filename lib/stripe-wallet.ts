// Stripe-side wallet top-up.
//
// Counterpart to lib/cashfree.ts's createCheckoutSession() but for
// non-India patients. Creates a Stripe Checkout Session in payment
// mode with metadata.type=wallet_topup so the existing Stripe
// webhook (app/api/webhooks/stripe/route.ts) can route the
// checkout.session.completed event to applyTopUp() on the wallet
// store.
//
// Currency is picked from the patient's ISO-2 country via
// lib/currency.ts — a US patient gets USD, a UK patient GBP, an
// Australian patient AUD, etc. Falls back to USD when the country is
// unknown.

import { stripe } from "./stripe";
import { currencyForCountry, type CurrencyInfo } from "./currency";
import { log } from "./log";

export interface StripeWalletTopupInput {
  orderId: string;
  /** Amount in the patient's local currency MAJOR units (e.g. 500
   *  for $5.00 — Stripe wants minor units so we multiply by 100). */
  amount: number;
  country: string | null | undefined;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerId: string;
  description: string;
  /** Where Stripe redirects after success. We append session_id so
   *  the wallet page can confirm + reload. */
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

export interface StripeWalletTopupResult {
  sessionId: string;
  paymentLink: string;
  currency: CurrencyInfo;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function createStripeWalletCheckout(
  input: StripeWalletTopupInput,
): Promise<StripeWalletTopupResult> {
  // The OduDoc wallet is denominated in INR — every consult, lab,
  // and pharmacy charge debits rupees. If we charged Stripe in USD
  // here we'd hand the patient a 4% FX conversion plus a mismatch
  // between what they type (₹100) and what their card is billed
  // ($100 → ₹9,952). Force INR regardless of patient country; if
  // Stripe's INR support is unavailable for the connected account,
  // the user should use Cashfree.
  const currency: CurrencyInfo = { code: "INR", symbol: "₹", locale: "en-IN" };
  // Stripe currency codes are lowercase ISO 4217.
  const stripeCurrency = currency.code.toLowerCase();
  // Stripe wants minor units (cents/paise). For zero-decimal
  // currencies (JPY, KRW, VND) Stripe expects whole units — keep
  // this list aligned with Stripe's docs.
  const zeroDecimal = new Set(["jpy", "krw", "vnd", "clp", "isk"]);
  const unitAmount = zeroDecimal.has(stripeCurrency)
    ? Math.round(input.amount)
    : Math.round(input.amount * 100);

  // Bound the upstream call so a slow Stripe doesn't push our
  // serverless function past Vercel's edge timeout. The Stripe SDK
  // already has retries, but they can stack on a flaky network — so
  // we wrap the create() in our own race with an 8s deadline.
  const create = stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: stripeCurrency,
          product_data: {
            name: input.description,
            description: `OduDoc wallet top-up · ${currency.symbol}${input.amount}`,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    customer_email: input.customerEmail,
    client_reference_id: input.customerId,
    metadata: input.metadata,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Stripe create session timed out after 8s")), 8_000),
  );

  let session;
  try {
    session = await Promise.race([create, timeout]);
  } catch (err) {
    log.error("stripe.create_wallet_session_failed", err, {
      orderId: input.orderId,
    });
    throw err;
  }

  if (!session.url) {
    throw new Error("Stripe create session succeeded but no checkout URL was returned");
  }
  return {
    sessionId: session.id,
    paymentLink: session.url,
    currency,
  };
}
