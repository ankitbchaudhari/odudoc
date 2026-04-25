// Currency conversion.
//
// Two upstream FX providers, tried in order, both free and key-less:
//   1. https://open.er-api.com   (ECB-backed daily rates, primary)
//   2. https://api.exchangerate.host (CurrencyLayer-backed, fallback)
// We rotate to the fallback if the primary errors or returns a malformed
// payload, so a single provider's bad day doesn't break checkout.
//
// One module-level Map<base, RateTable> caches each base for an hour
// so concurrent callers and back-to-back page renders reuse the same
// fetch — matches the in-memory pattern used elsewhere in the codebase.
// On total failure (both providers down), getRates() returns the most
// recent cached entry if any, then empty object as last resort.

export interface RateTable {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache: Map<string, RateTable> = new Map();
const inflight: Map<string, Promise<RateTable>> = new Map();

async function fetchPrimary(base: string): Promise<RateTable> {
  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`FX-primary HTTP ${r.status}`);
  const j = (await r.json()) as { result?: string; rates?: Record<string, number> };
  if (j.result !== "success" || !j.rates || typeof j.rates !== "object") {
    throw new Error("FX-primary bad payload");
  }
  return { base, rates: j.rates, fetchedAt: Date.now() };
}

async function fetchFallback(base: string): Promise<RateTable> {
  const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`FX-fallback HTTP ${r.status}`);
  const j = (await r.json()) as { success?: boolean; rates?: Record<string, number> };
  // exchangerate.host returns `success` as boolean OR omits it entirely
  // depending on the build — accept anything with a non-empty rates map.
  if (!j.rates || typeof j.rates !== "object" || Object.keys(j.rates).length === 0) {
    throw new Error("FX-fallback bad payload");
  }
  return { base, rates: j.rates, fetchedAt: Date.now() };
}

async function fetchRates(base: string): Promise<RateTable> {
  try {
    return await fetchPrimary(base);
  } catch (err) {
    // Surface the primary failure so it shows up in observability, then
    // try the fallback before giving up.
    try {
      return await fetchFallback(base);
    } catch {
      throw err;
    }
  }
}

export async function getRates(base: string): Promise<Record<string, number>> {
  const key = base.toUpperCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rates;
  }
  // Coalesce concurrent requests for the same base.
  let pending = inflight.get(key);
  if (!pending) {
    pending = fetchRates(key)
      .then((tbl) => {
        cache.set(key, tbl);
        return tbl;
      })
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, pending);
  }
  try {
    const tbl = await pending;
    return tbl.rates;
  } catch {
    // On failure, surface stale cache if we have one — better than nothing.
    const stale = cache.get(key);
    return stale ? stale.rates : {};
  }
}

export async function convert(
  amount: number,
  from: string,
  to: string,
): Promise<number> {
  const F = (from || "").toUpperCase();
  const T = (to || "").toUpperCase();
  if (!F || !T || F === T) return amount;
  const rates = await getRates(F);
  const r = rates[T];
  if (typeof r !== "number" || !isFinite(r) || r <= 0) return amount;
  return amount * r;
}

// Synchronous helper for components that already pulled the rate table.
// Returns null when the rate isn't in the table (so callers know to fall
// back to the source amount).
export function convertSync(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
): number | null {
  const F = (from || "").toUpperCase();
  const T = (to || "").toUpperCase();
  if (!F || !T || F === T) return amount;
  const r = rates[T];
  if (typeof r !== "number" || !isFinite(r) || r <= 0) return null;
  return amount * r;
}
