// Country → display currency mapping. We don't do FX conversion — the
// org's invoices are already stored in whatever the local pharmacy /
// hospital charged in. This is purely about the SYMBOL the dashboard
// renders so an Indian hospital sees ₹, a US hospital sees $, and so
// on. Falls back to USD when the country is unknown or unset, which
// is the safe "neutral" default for a global SaaS.
//
// Add a new country here once and every money-formatting call site
// across the admin console picks it up.

export interface CurrencyInfo {
  /** ISO-4217 code, e.g. "INR". */
  code: string;
  /** Glyph shown before the amount. We prefer the local symbol
   *  (₹, ¥, ₦) over the ISO code for readability. */
  symbol: string;
  /** Optional Intl locale used by Number.toLocaleString to group
   *  thousands the right way for that country (1,00,000 vs 100,000). */
  locale?: string;
}

const COUNTRY_CURRENCY: Record<string, CurrencyInfo> = {
  // South Asia
  IN: { code: "INR", symbol: "₹", locale: "en-IN" },
  PK: { code: "PKR", symbol: "₨", locale: "en-PK" },
  BD: { code: "BDT", symbol: "৳", locale: "bn-BD" },
  LK: { code: "LKR", symbol: "₨", locale: "si-LK" },
  NP: { code: "NPR", symbol: "₨", locale: "ne-NP" },

  // Americas
  US: { code: "USD", symbol: "$", locale: "en-US" },
  CA: { code: "CAD", symbol: "$", locale: "en-CA" },
  MX: { code: "MXN", symbol: "$", locale: "es-MX" },
  BR: { code: "BRL", symbol: "R$", locale: "pt-BR" },

  // UK / EU
  GB: { code: "GBP", symbol: "£", locale: "en-GB" },
  IE: { code: "EUR", symbol: "€", locale: "en-IE" },
  DE: { code: "EUR", symbol: "€", locale: "de-DE" },
  FR: { code: "EUR", symbol: "€", locale: "fr-FR" },
  ES: { code: "EUR", symbol: "€", locale: "es-ES" },
  IT: { code: "EUR", symbol: "€", locale: "it-IT" },
  NL: { code: "EUR", symbol: "€", locale: "nl-NL" },
  PT: { code: "EUR", symbol: "€", locale: "pt-PT" },

  // Middle East
  AE: { code: "AED", symbol: "د.إ", locale: "ar-AE" },
  SA: { code: "SAR", symbol: "﷼", locale: "ar-SA" },
  QA: { code: "QAR", symbol: "﷼", locale: "ar-QA" },
  KW: { code: "KWD", symbol: "د.ك", locale: "ar-KW" },
  BH: { code: "BHD", symbol: ".د.ب", locale: "ar-BH" },
  OM: { code: "OMR", symbol: "﷼", locale: "ar-OM" },

  // Africa
  NG: { code: "NGN", symbol: "₦", locale: "en-NG" },
  KE: { code: "KES", symbol: "KSh", locale: "en-KE" },
  ZA: { code: "ZAR", symbol: "R", locale: "en-ZA" },
  EG: { code: "EGP", symbol: "£", locale: "ar-EG" },
  GH: { code: "GHS", symbol: "₵", locale: "en-GH" },
  TZ: { code: "TZS", symbol: "TSh", locale: "en-TZ" },
  UG: { code: "UGX", symbol: "USh", locale: "en-UG" },
  ET: { code: "ETB", symbol: "Br", locale: "am-ET" },
  RW: { code: "RWF", symbol: "FRw", locale: "rw-RW" },
  MA: { code: "MAD", symbol: "د.م.", locale: "ar-MA" },

  // Asia-Pacific
  SG: { code: "SGD", symbol: "S$", locale: "en-SG" },
  MY: { code: "MYR", symbol: "RM", locale: "ms-MY" },
  ID: { code: "IDR", symbol: "Rp", locale: "id-ID" },
  TH: { code: "THB", symbol: "฿", locale: "th-TH" },
  VN: { code: "VND", symbol: "₫", locale: "vi-VN" },
  PH: { code: "PHP", symbol: "₱", locale: "en-PH" },
  CN: { code: "CNY", symbol: "¥", locale: "zh-CN" },
  JP: { code: "JPY", symbol: "¥", locale: "ja-JP" },
  KR: { code: "KRW", symbol: "₩", locale: "ko-KR" },
  HK: { code: "HKD", symbol: "HK$", locale: "en-HK" },
  TW: { code: "TWD", symbol: "NT$", locale: "zh-TW" },
  AU: { code: "AUD", symbol: "A$", locale: "en-AU" },
  NZ: { code: "NZD", symbol: "NZ$", locale: "en-NZ" },
};

const DEFAULT_CURRENCY: CurrencyInfo = {
  code: "USD",
  symbol: "$",
  locale: "en-US",
};

/** Best-effort lookup. Accepts 2-letter ISO codes ("IN"), full names
 *  ("India"), or anything in between — we normalise the common cases. */
export function currencyForCountry(countryRaw?: string | null): CurrencyInfo {
  if (!countryRaw) return DEFAULT_CURRENCY;
  const c = countryRaw.trim();
  if (!c) return DEFAULT_CURRENCY;

  // Direct ISO-2 match.
  const upper = c.toUpperCase();
  if (upper.length === 2 && COUNTRY_CURRENCY[upper]) {
    return COUNTRY_CURRENCY[upper];
  }

  // Common full-name aliases. Keep this short; org admin can pick the
  // proper ISO code from the org settings dropdown long-term.
  const aliases: Record<string, string> = {
    INDIA: "IN",
    "UNITED STATES": "US",
    USA: "US",
    "U.S.A.": "US",
    AMERICA: "US",
    "UNITED KINGDOM": "GB",
    UK: "GB",
    "GREAT BRITAIN": "GB",
    "UNITED ARAB EMIRATES": "AE",
    UAE: "AE",
    "SAUDI ARABIA": "SA",
    SOUTHAFRICA: "ZA",
    "SOUTH AFRICA": "ZA",
    "SOUTH KOREA": "KR",
    KOREA: "KR",
    "HONG KONG": "HK",
    NEWZEALAND: "NZ",
    "NEW ZEALAND": "NZ",
  };
  const aliased = aliases[upper];
  if (aliased && COUNTRY_CURRENCY[aliased]) {
    return COUNTRY_CURRENCY[aliased];
  }

  return DEFAULT_CURRENCY;
}

/** Format an amount with the right symbol + locale grouping. Pass
 *  `compact: true` for "₹1.2L" style short-form on dashboard tiles. */
export function formatMoney(
  amount: number | null | undefined,
  currency: CurrencyInfo = DEFAULT_CURRENCY,
  opts: { compact?: boolean; decimals?: number } = {},
): string {
  if (amount == null || Number.isNaN(amount)) return `${currency.symbol}0`;
  const n = Math.round(amount * 100) / 100;
  const formatted = opts.compact
    ? new Intl.NumberFormat(currency.locale, {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n)
    : new Intl.NumberFormat(currency.locale, {
        minimumFractionDigits: opts.decimals ?? 0,
        maximumFractionDigits: opts.decimals ?? 0,
      }).format(n);
  return `${currency.symbol}${formatted}`;
}
