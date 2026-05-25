// Currency conversion.
//
// Multiple free, keyless providers — admin picks the primary +
// secondary in /admin/fx-rates, and the engine falls back from one to
// the next on error. Provider list is intentionally short and curated
// to ones that have been reliable in production:
//
//   open-er-api      https://open.er-api.com         ECB-backed daily
//   exchangerate-host https://api.exchangerate.host  CurrencyLayer-backed
//   frankfurter      https://api.frankfurter.app     ECB-only, free
//   fawazahmed0      https://cdn.jsdelivr.net/gh/fawazahmed0/...
//                                                    Daily GH-published table
//
// Module-level Map<base, RateTable> caches each base for an hour so
// concurrent callers and back-to-back page renders reuse the same
// fetch. On total provider failure we surface stale cache if any, then
// an empty rates map as last resort — callers already handle empty by
// passing the source amount through unconverted.
//
// IMPORTANT: this file is imported by client components (BookingModal,
// CurrencySwitcher, etc) for its `convertSync` helper, so it MUST NOT
// import anything Node-only (settings-store, postgres, fs). The
// provider preference is therefore held in a module-level mutable that
// the server-only settings hydrator pushes into via setActiveProviders.

export type FxProviderId =
  | "open-er-api"
  | "exchangerate-host"
  | "frankfurter"
  | "fawazahmed0";

export interface FxProvider {
  id: FxProviderId;
  name: string;
  url: string;        // Marketing URL — shown in the admin UI
  description: string;
}

// Public catalogue for the admin picker. Order is the default
// preference order if the admin hasn't picked anything explicitly.
export const FX_PROVIDERS: FxProvider[] = [
  {
    id: "open-er-api",
    name: "Open Exchange Rates API",
    url: "https://open.er-api.com",
    description: "ECB-backed daily rates. Free, no key. Updates ~once/day.",
  },
  {
    id: "exchangerate-host",
    name: "exchangerate.host",
    url: "https://exchangerate.host",
    description: "CurrencyLayer-backed. Free, no key. Includes historical endpoints.",
  },
  {
    id: "frankfurter",
    name: "Frankfurter",
    url: "https://www.frankfurter.app",
    description: "ECB-only. Free, no key, no rate limit. Limited to ECB-tracked currencies.",
  },
  {
    id: "fawazahmed0",
    name: "Currency-API (fawazahmed0)",
    url: "https://github.com/fawazahmed0/currency-api",
    description: "Daily-updated table on jsDelivr CDN. Free, no key, ~150 currencies.",
  },
];

export interface RateTable {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
  // Which provider actually answered this fetch — useful for the
  // admin UI when the primary fails and we silently rotated to the
  // secondary.
  providerId: FxProviderId;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache: Map<string, RateTable> = new Map();
const inflight: Map<string, Promise<RateTable>> = new Map();

// Track last-attempt status per provider for the admin status panel.
interface ProviderStatus {
  providerId: FxProviderId;
  lastAttemptAt: number | null;
  ok: boolean | null;
  error?: string;
  lastBase?: string;
}
const providerStatus: Map<FxProviderId, ProviderStatus> = new Map();

// ─────────────────────────────────────────────────────────────────────
// Per-provider fetchers. All normalize to RateTable shape.
// ─────────────────────────────────────────────────────────────────────

async function fetchOpenErApi(base: string): Promise<Record<string, number>> {
  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = (await r.json()) as {
    result?: string;
    rates?: Record<string, number>;
  };
  if (j.result !== "success" || !j.rates || typeof j.rates !== "object") {
    throw new Error("bad payload");
  }
  return j.rates;
}

async function fetchExchangeRateHost(
  base: string,
): Promise<Record<string, number>> {
  const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = (await r.json()) as { rates?: Record<string, number> };
  if (!j.rates || typeof j.rates !== "object" || Object.keys(j.rates).length === 0) {
    throw new Error("bad payload");
  }
  return j.rates;
}

async function fetchFrankfurter(
  base: string,
): Promise<Record<string, number>> {
  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = (await r.json()) as { rates?: Record<string, number> };
  if (!j.rates || typeof j.rates !== "object" || Object.keys(j.rates).length === 0) {
    throw new Error("bad payload");
  }
  // Frankfurter omits the base from the rates table — add it back as
  // 1:1 so callers can do same-currency lookups without a branch.
  return { ...j.rates, [base.toUpperCase()]: 1 };
}

async function fetchFawazahmed0(
  base: string,
): Promise<Record<string, number>> {
  const lower = base.toLowerCase();
  const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${encodeURIComponent(lower)}.json`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = (await r.json()) as Record<string, unknown>;
  const tableLower = j[lower] as Record<string, number> | undefined;
  if (!tableLower || typeof tableLower !== "object") {
    throw new Error("bad payload");
  }
  // Normalize keys to uppercase ISO codes (project-wide convention).
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(tableLower)) {
    if (typeof v === "number") out[k.toUpperCase()] = v;
  }
  return out;
}

const FETCHERS: Record<
  FxProviderId,
  (base: string) => Promise<Record<string, number>>
> = {
  "open-er-api": fetchOpenErApi,
  "exchangerate-host": fetchExchangeRateHost,
  frankfurter: fetchFrankfurter,
  fawazahmed0: fetchFawazahmed0,
};

async function tryProvider(
  id: FxProviderId,
  base: string,
): Promise<Record<string, number>> {
  const fetcher = FETCHERS[id];
  if (!fetcher) throw new Error(`unknown provider ${id}`);
  try {
    const rates = await fetcher(base);
    providerStatus.set(id, {
      providerId: id,
      lastAttemptAt: Date.now(),
      ok: true,
      lastBase: base,
    });
    return rates;
  } catch (e) {
    providerStatus.set(id, {
      providerId: id,
      lastAttemptAt: Date.now(),
      ok: false,
      error: (e as Error).message,
      lastBase: base,
    });
    throw e;
  }
}

// Mutable provider preference. Defaults to the catalogue order; the
// server-only settings-store hydrator overwrites this via
// setActiveProviders() once it reads the admin's saved preference.
// Holding the order as a plain module variable (rather than reading
// settings here) keeps this file safe to bundle into client code.
let activePrimary: FxProviderId = "open-er-api";
let activeSecondary: FxProviderId = "exchangerate-host";

export function setActiveProviders(
  primary: FxProviderId,
  secondary: FxProviderId,
): void {
  activePrimary = primary;
  activeSecondary = secondary;
}

export function getActiveProviders(): {
  primary: FxProviderId;
  secondary: FxProviderId;
} {
  return { primary: activePrimary, secondary: activeSecondary };
}

function resolveProviderOrder(): FxProviderId[] {
  // Admin's choices first, then any leftover providers as further
  // fallbacks. Dedupe to avoid trying the same provider twice.
  const order: FxProviderId[] = [activePrimary, activeSecondary];
  for (const p of FX_PROVIDERS) {
    if (!order.includes(p.id)) order.push(p.id);
  }
  return order;
}

async function fetchRates(base: string): Promise<RateTable> {
  const order = resolveProviderOrder();
  let lastErr: Error | null = null;
  for (const id of order) {
    try {
      const rates = await tryProvider(id, base);
      return { base, rates, fetchedAt: Date.now(), providerId: id };
    } catch (e) {
      lastErr = e as Error;
      // Try the next provider.
    }
  }
  throw lastErr || new Error("all FX providers failed");
}

export async function getRates(
  base: string,
): Promise<Record<string, number>> {
  const key = base.toUpperCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rates;
  }
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

// ─────────────────────────────────────────────────────────────────────
// Admin status surface — drives /admin/fx-rates.
// ─────────────────────────────────────────────────────────────────────

export interface FxStatus {
  primaryProvider: FxProviderId;
  secondaryProvider: FxProviderId;
  // The provider that actually served the last successful USD fetch,
  // i.e. what the public site is currently relying on.
  activeProvider: FxProviderId | null;
  // RateTable for USD (the most-used base) if we have one cached.
  usdRates: Record<string, number> | null;
  usdFetchedAt: number | null;
  // Per-provider attempt log so the admin can see which providers
  // succeeded / failed and why.
  providers: ProviderStatus[];
  cacheTtlMs: number;
}

export function getFxStatus(): FxStatus {
  const usd = cache.get("USD");
  return {
    primaryProvider: activePrimary,
    secondaryProvider: activeSecondary,
    activeProvider: usd?.providerId ?? null,
    usdRates: usd?.rates ?? null,
    usdFetchedAt: usd?.fetchedAt ?? null,
    providers: FX_PROVIDERS.map(
      (p) =>
        providerStatus.get(p.id) || {
          providerId: p.id,
          lastAttemptAt: null,
          ok: null,
        },
    ),
    cacheTtlMs: CACHE_TTL_MS,
  };
}

// Force a fresh fetch of the USD table, bypassing the 1-hour cache.
// Surfaces success/failure to the admin in the same status shape so
// they can see immediately whether their provider change is healthy.
export async function refreshFxRates(
  base = "USD",
): Promise<{ ok: boolean; status: FxStatus; error?: string }> {
  cache.delete(base.toUpperCase());
  inflight.delete(base.toUpperCase());
  try {
    await getRates(base);
    return { ok: true, status: getFxStatus() };
  } catch (e) {
    return { ok: false, status: getFxStatus(), error: (e as Error).message };
  }
}
