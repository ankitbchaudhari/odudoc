// Regional pricing engine.
//
// Public surface that everything else (the pricing page, the admin
// editor, future doctor-fee and shop integrations) builds on:
//
//   resolvePrice(productKey, country)
//     → { currency, monthlyMinor?, annualMinor?, oneTimeMinor?, source }
//
// `source` is "override" when the admin explicitly set a price for that
// (productKey, country) pair in site settings, "fx" when we converted
// the catalogue's base USD price via live FX, or "base" when no
// conversion is needed (or we couldn't reach the FX provider).
//
// "Custom" priced products (Enterprise tiers, "talk to us") carry
// `monthlyMinor = null` and a `customLabel` instead. Admin can still
// add per-country footnote text, but no numeric override.
//
// Amounts are stored in minor units (cents / paise / yen) so we never
// have to think about float rounding. `formatPriceMinor` turns them
// back into a display string using the existing CurrencyDef plumbing.

import { byCountry as currencyByCountry, type CurrencyDef } from "./currencies";
import { getRates } from "./currency-convert";
import { formatAmount } from "./doctor-display-currency";
import { getSettings, ensureHydrated } from "./settings-store";

export type PricingProductKind = "subscription" | "one-time";

export interface PricingProduct {
  key: string;            // stable id used by admin overrides + URLs
  audience: "patient" | "clinic";
  name: string;           // human label for the admin UI
  description?: string;
  kind: PricingProductKind;
  // USD base prices in MAJOR units (dollars). Conversion to minor and
  // FX happens in the resolver.
  baseMonthlyUsd: number | null; // null for "Custom" / "Free as 0"
  baseAnnualUsd: number | null;
  baseOneTimeUsd?: number | null;
  // Set true for "talk to us" tiers — admins shouldn't try to set a
  // numeric price; only the customLabel/footnote field is editable.
  isCustom?: boolean;
}

// Source of truth for what the admin can localize. Keys ARE the
// admin-facing identifier; do not rename without a migration that
// rewrites every saved override row.
export const PRICING_PRODUCTS: PricingProduct[] = [
  // ── B2B SaaS tiers shown on /pricing (For patients tab — which is
  // actually the B2B card per spec v6.3; patient consultations are
  // free, the subscription pays for the platform). Plan IDs match
  // lib/data.ts pricingPlans exactly. ──
  {
    key: "plan:starter",
    audience: "patient",
    name: "Starter",
    description: "Solo doctor or single OPD.",
    kind: "subscription",
    baseMonthlyUsd: 49,
    baseAnnualUsd: 490,
  },
  {
    key: "plan:clinic-pro",
    audience: "patient",
    name: "Clinic Pro",
    description: "Small clinic up to 10 staff. OPD-only, in-clinic pharmacy, TPA cashless.",
    kind: "subscription",
    baseMonthlyUsd: 149,
    baseAnnualUsd: 1490,
  },
  {
    key: "plan:hospital",
    audience: "patient",
    name: "Hospital",
    description: "Hospitals + multi-branch chains. Full admin panel, 150+ modules.",
    kind: "subscription",
    baseMonthlyUsd: 499,
    baseAnnualUsd: 4990,
  },
  {
    key: "plan:enterprise",
    audience: "patient",
    name: "Enterprise (talk to sales)",
    description: "Pharma chain, insurance, hospital networks. Custom contract.",
    kind: "subscription",
    baseMonthlyUsd: null,
    baseAnnualUsd: null,
    isCustom: true,
  },
  // ── Clinic / doctor self-serve tiers shown on /pricing (For clinics
  // & doctors tab — components/pricing/ClinicPricing). Different from
  // the B2B card above; this is the solo-doctor commercial offer. ──
  {
    key: "clinic:free",
    audience: "clinic",
    name: "Clinic — Free",
    description: "Free tier — only the commission-on-paid-consult footnote is country-specific.",
    kind: "subscription",
    baseMonthlyUsd: 0,
    baseAnnualUsd: 0,
  },
  {
    key: "clinic:practice",
    audience: "clinic",
    name: "Clinic — Practice",
    kind: "subscription",
    baseMonthlyUsd: 50,
    baseAnnualUsd: 500,
  },
  {
    key: "clinic:enterprise",
    audience: "clinic",
    name: "Clinic — Enterprise",
    kind: "subscription",
    baseMonthlyUsd: null,
    baseAnnualUsd: null,
    isCustom: true,
  },
];

export function productByKey(key: string): PricingProduct | undefined {
  return PRICING_PRODUCTS.find((p) => p.key === key);
}

// ─────────────────────────────────────────────────────────────────────
// Admin override shape — stored in settings.regionalPricing (an array).
// One row per (productKey, country). Either side can be omitted — e.g.
// the admin only sets monthly for India and leaves annual as FX.
// `currency` is informational — the row's amount is always in that
// currency's minor units. We default it to country's primary currency
// at write time.
// ─────────────────────────────────────────────────────────────────────
export interface RegionalPriceOverride {
  productKey: string;
  country: string;          // ISO-2 uppercase, or "*" for "all countries that don't have a more-specific row"
  currency: string;         // ISO 4217, uppercase
  monthlyMinor?: number;
  annualMinor?: number;
  oneTimeMinor?: number;
  // Free-text override for the "$50 per clinic per month" style
  // footnote shown under the price. Admin can localize this too.
  footnote?: string;
}

function findOverride(
  overrides: RegionalPriceOverride[],
  productKey: string,
  country: string,
): RegionalPriceOverride | undefined {
  // Country-specific row wins over the "*" fallback.
  const exact = overrides.find(
    (r) => r.productKey === productKey && r.country.toUpperCase() === country,
  );
  if (exact) return exact;
  return overrides.find(
    (r) => r.productKey === productKey && r.country === "*",
  );
}

export interface ResolvedPrice {
  productKey: string;
  country: string;
  currency: CurrencyDef;
  // Display strings (already formatted with symbol + separators) for
  // direct rendering. Null when the product has no price for that
  // billing cadence (e.g. one-time products have no monthly).
  monthly: string | null;
  annual: string | null;
  oneTime: string | null;
  // Raw minor-unit numbers so callers can do math (e.g. "save X
  // annually") instead of parsing the formatted strings.
  monthlyMinor: number | null;
  annualMinor: number | null;
  oneTimeMinor: number | null;
  // "override" if the admin explicitly set this country's price;
  // "fx" if we converted from USD via live rates; "base" for free or
  // custom-priced products where conversion is a no-op.
  source: "override" | "fx" | "base";
  // Carries the admin-supplied per-country footnote (e.g. localized
  // commission/percentage wording) when present.
  footnote: string | null;
  // True for "talk to us" tiers — UI should show customLabel instead
  // of a numeric price.
  isCustom: boolean;
}

// Convert a USD MAJOR value (e.g. 49) into the target currency's MINOR
// units (e.g. 4067 INR paise → returned as 406700 paise per 49 USD at
// ~83 INR/USD, depending on live rates). Uses cached FX from
// lib/currency-convert. Returns null if FX lookup fails outright.
async function usdMajorToMinor(
  usdMajor: number,
  target: CurrencyDef,
): Promise<number | null> {
  if (target.code === "USD") {
    return Math.round(usdMajor * Math.pow(10, target.decimals));
  }
  try {
    const rates = await getRates("USD");
    const r = rates[target.code];
    if (!r || !Number.isFinite(r) || r <= 0) return null;
    const targetMajor = usdMajor * r;
    return Math.round(targetMajor * Math.pow(10, target.decimals));
  } catch {
    return null;
  }
}

// Round a minor-unit value to a "nice" psychologically-friendly number
// — important for FX'd amounts which would otherwise read like ₹4067
// instead of ₹3999 or ₹4099. We pick the nearest 99/49 step inside the
// currency's natural rounding bucket. Admins who want a tighter price
// can override.
function niceRound(minor: number, decimals: number): number {
  if (minor <= 0) return minor;
  const major = minor / Math.pow(10, decimals);
  // Choose a rounding bucket by magnitude.
  // < 10 → round to 0.99 (e.g. $0.99, $4.99)
  // 10..100 → round to nearest 9 then add the .99 (e.g. 49, 99)
  // 100..1000 → nearest 99 (e.g. 199, 499, 999)
  // 1000+ → nearest 99 step (e.g. 1999, 4999, 9999)
  let nice: number;
  if (major < 10) {
    nice = Math.round(major) - 0.01;
    if (nice < 0.49) nice = 0.49;
  } else if (major < 100) {
    nice = Math.round(major / 10) * 10 - 1;
  } else if (major < 1000) {
    nice = Math.round(major / 100) * 100 - 1;
  } else {
    nice = Math.round(major / 1000) * 1000 - 1;
  }
  return Math.round(nice * Math.pow(10, decimals));
}

function format(
  minor: number | null,
  currency: CurrencyDef,
): string | null {
  if (minor === null) return null;
  const major = minor / Math.pow(10, currency.decimals);
  return formatAmount(major, currency);
}

export async function resolvePrice(
  productKey: string,
  countryRaw: string | null | undefined,
): Promise<ResolvedPrice | null> {
  const product = productByKey(productKey);
  if (!product) return null;

  await ensureHydrated();
  const country = (countryRaw || "US").toUpperCase();
  const currency =
    currencyByCountry(country) ||
    currencyByCountry("US")!;

  const overrides =
    (getSettings() as unknown as { regionalPricing?: RegionalPriceOverride[] })
      .regionalPricing || [];
  const override = findOverride(overrides, productKey, country);

  // Custom-priced products: no numeric resolution, just return the
  // admin's footnote if any.
  if (product.isCustom) {
    return {
      productKey,
      country,
      currency,
      monthly: null,
      annual: null,
      oneTime: null,
      monthlyMinor: null,
      annualMinor: null,
      oneTimeMinor: null,
      source: override ? "override" : "base",
      footnote: override?.footnote || null,
      isCustom: true,
    };
  }

  // Determine each cadence: override wins; else FX-convert base.
  let monthlyMinor: number | null = null;
  let annualMinor: number | null = null;
  let oneTimeMinor: number | null = null;
  let source: ResolvedPrice["source"] = "base";

  if (override?.monthlyMinor !== undefined) {
    monthlyMinor = override.monthlyMinor;
    source = "override";
  } else if (product.baseMonthlyUsd !== null) {
    const raw = await usdMajorToMinor(product.baseMonthlyUsd, currency);
    if (raw !== null) {
      monthlyMinor = product.baseMonthlyUsd > 0 ? niceRound(raw, currency.decimals) : 0;
      source = currency.code === "USD" ? "base" : "fx";
    } else {
      // FX failed — fall back to base USD value in USD shape so the
      // page still renders a number. Source stays "base".
      monthlyMinor = Math.round(
        product.baseMonthlyUsd * Math.pow(10, currency.decimals),
      );
    }
  }

  if (override?.annualMinor !== undefined) {
    annualMinor = override.annualMinor;
    source = source === "base" ? "override" : source;
    if (source !== "fx") source = "override";
  } else if (product.baseAnnualUsd !== null) {
    const raw = await usdMajorToMinor(product.baseAnnualUsd, currency);
    if (raw !== null) {
      annualMinor = product.baseAnnualUsd > 0 ? niceRound(raw, currency.decimals) : 0;
      if (source !== "override") {
        source = currency.code === "USD" ? "base" : "fx";
      }
    } else {
      annualMinor = Math.round(
        product.baseAnnualUsd * Math.pow(10, currency.decimals),
      );
    }
  }

  if (override?.oneTimeMinor !== undefined) {
    oneTimeMinor = override.oneTimeMinor;
    if (source !== "fx") source = "override";
  } else if (product.baseOneTimeUsd != null) {
    const raw = await usdMajorToMinor(product.baseOneTimeUsd, currency);
    if (raw !== null) {
      oneTimeMinor = product.baseOneTimeUsd > 0 ? niceRound(raw, currency.decimals) : 0;
      if (source === "base" && currency.code !== "USD") source = "fx";
    } else {
      oneTimeMinor = Math.round(
        product.baseOneTimeUsd * Math.pow(10, currency.decimals),
      );
    }
  }

  return {
    productKey,
    country,
    currency,
    monthly: format(monthlyMinor, currency),
    annual: format(annualMinor, currency),
    oneTime: format(oneTimeMinor, currency),
    monthlyMinor,
    annualMinor,
    oneTimeMinor,
    source,
    footnote: override?.footnote || null,
    isCustom: false,
  };
}

// Convenience: resolve ALL products for one country in a single
// awaited call. Used by /api/pricing and the admin editor.
export async function resolveAllPrices(
  country: string | null | undefined,
): Promise<ResolvedPrice[]> {
  return Promise.all(
    PRICING_PRODUCTS.map((p) => resolvePrice(p.key, country)),
  ).then((arr) => arr.filter((x): x is ResolvedPrice => !!x));
}
