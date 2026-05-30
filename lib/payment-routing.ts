// Payment provider routing.
//
// Maps a visitor's ISO country code to the best available payment
// gateway, given which gateways the admin has actually enabled in
// /admin/settings. Stripe is always offered as the global default;
// regional providers are surfaced in addition when they're configured.
//
// Country buckets are intentionally broad — we don't want to maintain
// a 195-row table. Tweak the lists if a region shifts provider:
//
//   PayU       India, parts of LatAm + Eastern Europe
//   Tazapay    APAC, Africa, GCC (good cross-border into India)
//   ConnectPay US/EU alternative to Stripe (HMAC-signed REST flow)
//
// The admin still has the kill switch — a provider only appears in
// the offering set if `paymentGateways.find(g => g.id === X).enabled`
// is true AND its keys are non-empty.

import { getSettings } from "./settings-store";
import { isCashfreeConfigured } from "./cashfree";
import { isRazorpayConfigured } from "./razorpay";

export type PaymentProviderId =
  | "stripe"
  | "payu"
  | "tazapay"
  | "connectpay"
  | "cashfree"
  | "razorpay";

export interface PaymentProvider {
  id: PaymentProviderId;
  name: string;
  description: string;
  /** Branding emoji for the UI tile. */
  icon: string;
}

const PROVIDER_META: Record<PaymentProviderId, PaymentProvider> = {
  stripe: {
    id: "stripe",
    name: "Stripe",
    description: "Cards, Apple Pay, Google Pay — global",
    icon: "💳",
  },
  payu: {
    id: "payu",
    name: "PayU",
    description: "UPI, Indian cards, net banking — best for India",
    icon: "🇮🇳",
  },
  tazapay: {
    id: "tazapay",
    name: "Tazapay",
    description: "Cross-border across APAC, Africa, GCC",
    icon: "🌏",
  },
  connectpay: {
    id: "connectpay",
    name: "ConnectPay",
    description: "Hosted checkout — US / EU alternative",
    icon: "🌐",
  },
  cashfree: {
    id: "cashfree",
    name: "Cashfree",
    description: "UPI, Indian cards, net banking, Paytm — India fallback",
    icon: "🇮🇳",
  },
  razorpay: {
    id: "razorpay",
    name: "Razorpay",
    description: "UPI, Indian cards, net banking, wallets — India primary",
    icon: "🇮🇳",
  },
};

// Razorpay is our primary domestic merchant — same countries as
// Cashfree's UPI rail, plus everywhere else INR settles (Razorpay
// supports international cards too, but the India-list is where it
// wins on conversion + fees).
const RAZORPAY_COUNTRIES = new Set([
  "IN", // primary
  // Razorpay's international cards rail also handles cross-border for these:
  "BD", "LK", "NP", "BT",
]);

const CASHFREE_COUNTRIES = new Set([
  "IN", // legacy primary, now fallback behind Razorpay
  "BD", "LK", "NP", "BT",
]);

const PAYU_COUNTRIES = new Set([
  "IN", "PL", "RO", "CZ", "HU", "TR", "ZA", "MX", "CO", "AR", "PE",
]);
const TAZAPAY_COUNTRIES = new Set([
  // APAC
  "SG", "MY", "ID", "TH", "VN", "PH", "HK", "TW", "JP", "KR", "BD", "PK", "LK", "NP",
  // GCC
  "AE", "SA", "QA", "KW", "OM", "BH",
  // Africa
  "NG", "KE", "GH", "ZA", "EG", "TZ", "UG", "MA", "DZ", "TN", "ET",
]);
const CONNECTPAY_COUNTRIES = new Set([
  "US", "CA", "GB", "IE", "DE", "FR", "ES", "IT", "NL", "BE", "AT", "PT",
  "SE", "NO", "DK", "FI", "CH", "PL", "AU", "NZ",
]);

/**
 * Return the ordered list of providers a visitor in `country` should
 * see at checkout. The first entry is the suggested default.
 */
export function providersForCountry(country?: string): PaymentProvider[] {
  const cc = (country || "").toUpperCase();
  const enabled = new Set<PaymentProviderId>();
  const settings = getSettings();
  for (const gw of settings.paymentGateways) {
    if (!gw.enabled) continue;
    if (
      gw.id === "stripe" ||
      gw.id === "payu" ||
      gw.id === "tazapay" ||
      gw.id === "connectpay" ||
      gw.id === "cashfree" ||
      gw.id === "razorpay"
    ) {
      // Some providers also need keys to be non-empty before the lib
      // helpers will accept a request. Enabled-without-keys is a
      // half-configured state that should not be offered.
      const hasKeys =
        gw.id === "stripe"
          ? Boolean(process.env.STRIPE_SECRET_KEY) // Stripe uses env, not the row
          : gw.id === "cashfree"
            ? isCashfreeConfigured() // Cashfree uses env vars too
            : gw.id === "razorpay"
              ? isRazorpayConfigured() // Razorpay uses env vars too
              : Boolean(gw.publicKey && gw.secretKey);
      if (hasKeys) enabled.add(gw.id);
    }
  }
  // Stripe is always present if configured — it's our global default.
  if (process.env.STRIPE_SECRET_KEY) enabled.add("stripe");
  // Razorpay + Cashfree are enabled by env presence, no admin row needed.
  if (isRazorpayConfigured()) enabled.add("razorpay");
  if (isCashfreeConfigured()) enabled.add("cashfree");

  // Build the regional preference list for this country, then any
  // remaining enabled providers in a stable fallback order.
  const preferred: PaymentProviderId[] = [];
  // Razorpay leads in India + neighbouring countries — it's the
  // platform's primary merchant (Account & Settings), the lowest-
  // friction rail for UPI, and matches the BookingModal default.
  // Cashfree stays as the domestic fallback when Razorpay isn't
  // configured.
  if (cc && RAZORPAY_COUNTRIES.has(cc) && enabled.has("razorpay")) preferred.push("razorpay");
  if (cc && CASHFREE_COUNTRIES.has(cc) && enabled.has("cashfree")) preferred.push("cashfree");
  if (cc && PAYU_COUNTRIES.has(cc) && enabled.has("payu")) preferred.push("payu");
  if (cc && TAZAPAY_COUNTRIES.has(cc) && enabled.has("tazapay")) preferred.push("tazapay");
  if (cc && CONNECTPAY_COUNTRIES.has(cc) && enabled.has("connectpay")) preferred.push("connectpay");
  if (enabled.has("stripe")) preferred.push("stripe");

  // Append any enabled providers we haven't surfaced yet (e.g. PayU is
  // enabled but the visitor isn't in a PayU country — still offer it
  // as a secondary option for travellers / VPN users).
  for (const id of [
    "stripe",
    "razorpay",
    "cashfree",
    "payu",
    "tazapay",
    "connectpay",
  ] as const) {
    if (enabled.has(id) && !preferred.includes(id)) preferred.push(id);
  }

  return preferred.map((id) => PROVIDER_META[id]);
}

/** Default suggested provider for a country. Falls back to Stripe. */
export function suggestedProvider(country?: string): PaymentProvider {
  const list = providersForCountry(country);
  return list[0] ?? PROVIDER_META.stripe;
}
