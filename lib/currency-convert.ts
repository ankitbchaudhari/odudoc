// Currency conversion stub.
//
// Exposes the API surface (`convert`, `getRates`) that the rest of the app
// can wire against today, even though we have no live FX feed yet. Callers
// get type-safe code on the happy path; the actual rates land in a follow-up.
//
// Intended provider: https://exchangerate.host (free, no API key, ECB-backed
// daily rates). open.er-api.com is the obvious fallback. Whichever wins,
// rates should be cached in-memory like the rest of the codebase (a simple
// `Map<base, { fetchedAt, rates }>` with a 1-hour TTL).
//
// Until then: convert() returns the input amount unchanged so the visible
// "Pay in: [USD]" UI works end-to-end and downstream code (payment intents,
// invoices) stays well-typed.

export interface RateTable {
  // base: source currency code, e.g. "USD"
  base: string;
  // rate per 1 unit of base, keyed by target code: rates["EUR"] = 0.93
  rates: Record<string, number>;
  fetchedAt: number;
}

export async function convert(
  amount: number,
  from: string,
  to: string,
): Promise<number> {
  if (!from || !to || from.toUpperCase() === to.toUpperCase()) return amount;
  // TODO: call getRates(from) and multiply. See file header for provider notes.
  return amount;
}

export async function getRates(base: string): Promise<Record<string, number>> {
  // TODO: fetch from https://exchangerate.host or open.er-api.com, cache for ~1h.
  void base;
  return {};
}
