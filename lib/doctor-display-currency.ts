// Map a doctor's country to the currency their dashboard should
// render amounts in. The platform stores transactions in their
// native currency (USD by default for cross-border, but EMR
// invoices, consultations etc. may carry their own currency
// field). At display time the doctor's dashboard converts every
// amount into ONE consistent currency derived from their country
// — so a doctor in India sees ₹ everywhere, a doctor in the US
// sees $ everywhere, etc.
//
// Anything outside our currency catalogue falls back to USD.

import { ALL_CURRENCIES, byCountry, type CurrencyDef } from "./currencies";

export const DEFAULT_DOCTOR_CURRENCY: CurrencyDef =
  ALL_CURRENCIES.find((c) => c.code === "USD")!;

/** Resolve the display currency for a doctor based on their
 *  country (ISO 3166-1 alpha-2). Returns USD if the country is
 *  missing or doesn't map to a known currency. */
export function displayCurrencyForCountry(
  country: string | undefined | null,
): CurrencyDef {
  if (!country) return DEFAULT_DOCTOR_CURRENCY;
  return byCountry(country) || DEFAULT_DOCTOR_CURRENCY;
}

/** Format a number using a CurrencyDef's symbol, position, and
 *  decimal/thousand separator conventions. Pure function — no
 *  Intl.NumberFormat dependency so the same output renders on
 *  the server and on every client locale. */
export function formatAmount(
  amount: number,
  currency: CurrencyDef,
): string {
  if (!Number.isFinite(amount)) amount = 0;
  const decimals = currency.decimals;
  const fixed = amount.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");

  // Thousand-grouping by separator preset.
  let grouped: string;
  let groupSep: string;
  let decimalChar: string;
  switch (currency.decimalSeparator) {
    case "1.234.567,89":
      groupSep = ".";
      decimalChar = ",";
      grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep);
      break;
    case "1 234 567.89":
      groupSep = " ";
      decimalChar = ".";
      grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep);
      break;
    case "1,23,456.70": {
      // Indian grouping: last 3 digits, then groups of 2.
      decimalChar = ".";
      groupSep = ",";
      const sign = intPart.startsWith("-") ? "-" : "";
      const digits = intPart.replace(/^-/, "");
      if (digits.length <= 3) {
        grouped = sign + digits;
      } else {
        const last3 = digits.slice(-3);
        const rest = digits.slice(0, -3);
        const restWithCommas = rest.replace(/\B(?=(\d{2})+(?!\d))/g, groupSep);
        grouped = sign + restWithCommas + groupSep + last3;
      }
      break;
    }
    case "1,234,567.89":
    default:
      groupSep = ",";
      decimalChar = ".";
      grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep);
      break;
  }

  const numeric = decimals > 0 ? `${grouped}${decimalChar}${decPart}` : grouped;

  switch (currency.position) {
    case "right":
      return `${numeric}${currency.symbol}`;
    case "right-space":
      return `${numeric} ${currency.symbol}`;
    case "left-space":
      return `${currency.symbol} ${numeric}`;
    case "left":
    default:
      return `${currency.symbol}${numeric}`;
  }
}

/** Convenience: format an amount stored in `from` currency for
 *  display in `to` currency, using a pre-fetched rate map keyed
 *  by ISO code. Caller is responsible for keeping the rate map
 *  fresh — see lib/currency-convert.ts for getRates(). */
export function formatConverted(
  amount: number,
  fromCurrency: string,
  to: CurrencyDef,
  rates: Record<string, number>,
): string {
  const fromCode = fromCurrency.toUpperCase();
  const toCode = to.code.toUpperCase();
  if (fromCode === toCode) return formatAmount(amount, to);
  const r = rates[toCode];
  if (!Number.isFinite(r) || r <= 0) {
    // FX missing — render the raw amount with the source label so
    // we don't silently mis-state numbers as INR when the rate
    // wasn't fetched.
    return `${amount.toFixed(2)} ${fromCode}`;
  }
  return formatAmount(amount * r, to);
}
