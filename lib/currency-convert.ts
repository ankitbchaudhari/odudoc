// Currency conversion.
//
// Live FX rates from https://open.er-api.com (free, no API key, daily rates
// from a basket of central banks). One module-level Map<base, RateTable>
// caches each base for an hour so concurrent callers and back-to-back
// page renders reuse the same fetch — matches the in-memory pattern used
// elsewhere in the codebase.
//
// Failure modes are silent: if the upstream is unreachable or returns a
// malformed payload, convert() falls back to the input amount unchanged
// and getRates() returns an empty object. That keeps checkout from
// hard-crashing when a third-party FX feed has a bad day; the visitor
// just sees prices in the site's default currency until rates recover.

export interface RateTable {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache: Map<string, RateTable> = new Map();
const inflight: Map<string, Promise<RateTable>> = new Map();

async function fetchRates(base: string): Promise<RateTable> {
  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`FX HTTP ${r.status}`);
  const j = (await r.json()) as { result?: string; rates?: Record<string, number> };
  if (j.result !== "success" || !j.rates || typeof j.rates !== "object") {
    throw new Error("FX bad payload");
  }
  return { base, rates: j.rates, fetchedAt: Date.now() };
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
