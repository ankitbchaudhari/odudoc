"use client";

// Super-admin editor for regional pricing overrides.
//
// One page per (country) selection. Lists every product from
// PRICING_PRODUCTS with its USD base + live FX preview + an editable
// override field. Saves overrides for the picked country only — to
// edit another country, change the dropdown and edit there. The save
// is a list-replace (the PATCH body carries the full overrides list)
// because the existing settings store treats top-level arrays as
// replace-on-save, which is also what the admin UI mental model
// expects ("save my changes for this country").

import { useEffect, useMemo, useState } from "react";
import { ISO_COUNTRIES } from "@/lib/iso-countries";
import type {
  RegionalPricingEntry,
  SiteSettings,
} from "@/lib/settings-store";

interface ResolvedRow {
  productKey: string;
  currency: { code: string; symbol: string; decimals: number };
  monthly: string | null;
  annual: string | null;
  monthlyMinor: number | null;
  annualMinor: number | null;
  source: "override" | "fx" | "base";
  footnote: string | null;
  isCustom: boolean;
}

interface ProductMeta {
  key: string;
  audience: string;
  name: string;
  description?: string;
  baseMonthlyUsd: number | null;
  baseAnnualUsd: number | null;
  isCustom?: boolean;
}

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20";

// Convert minor-unit number → string for an <input> (e.g. 4999 → "49.99").
function minorToInput(minor: number | undefined, decimals: number): string {
  if (minor === undefined || minor === null) return "";
  return (minor / Math.pow(10, decimals)).toString();
}

// Convert <input> string back to minor. Empty string → undefined (= no
// override). Anything malformed → undefined so the save doesn't silently
// store a junk value.
function inputToMinor(value: string, decimals: number): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const num = parseFloat(trimmed);
  if (!Number.isFinite(num) || num < 0) return undefined;
  return Math.round(num * Math.pow(10, decimals));
}

export default function AdminRegionalPricing() {
  const [country, setCountry] = useState("US");
  const [products, setProducts] = useState<ProductMeta[] | null>(null);
  const [resolved, setResolved] = useState<ResolvedRow[]>([]);
  const [overrides, setOverrides] = useState<RegionalPricingEntry[]>([]);
  // Local editor state keyed by productKey. Cleared on country change.
  const [draft, setDraft] = useState<
    Record<
      string,
      { monthly: string; annual: string; footnote: string }
    >
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(
    null
  );

  // Fetch the catalogue once. The /api/pricing endpoint returns
  // resolved rows but doesn't carry the static base USD — we load that
  // from a tiny helper endpoint added below.
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/regional-pricing/catalogue", {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as { products: ProductMeta[] };
        setProducts(data.products);
      } catch (err) {
        showToast((err as Error).message, true);
      }
    })();
  }, []);

  // Re-resolve every time the country changes — gets us the live FX
  // preview alongside the current override (if any).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [pricingRes, settingsRes] = await Promise.all([
          fetch(`/api/pricing?country=${encodeURIComponent(country)}`, {
            cache: "no-store",
          }),
          fetch("/api/admin/settings", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (!pricingRes.ok)
          throw new Error(`Pricing HTTP ${pricingRes.status}`);
        if (!settingsRes.ok)
          throw new Error(`Settings HTTP ${settingsRes.status}`);
        const pricingData = await pricingRes.json();
        const settingsData = (await settingsRes.json()) as {
          settings: SiteSettings;
        };
        if (cancelled) return;
        const rowList = Object.values(
          pricingData.products as Record<string, ResolvedRow>,
        );
        setResolved(rowList);
        const all = settingsData.settings.regionalPricing || [];
        setOverrides(all);

        // Seed the draft with whatever this country already has saved.
        const draftSeed: Record<
          string,
          { monthly: string; annual: string; footnote: string }
        > = {};
        for (const row of rowList) {
          const existing = all.find(
            (o) =>
              o.productKey === row.productKey &&
              o.country.toUpperCase() === country.toUpperCase(),
          );
          draftSeed[row.productKey] = {
            monthly: minorToInput(
              existing?.monthlyMinor,
              row.currency.decimals,
            ),
            annual: minorToInput(
              existing?.annualMinor,
              row.currency.decimals,
            ),
            footnote: existing?.footnote || "",
          };
        }
        setDraft(draftSeed);
      } catch (err) {
        showToast((err as Error).message, true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [country]);

  function showToast(text: string, err = false) {
    setToast({ text, err });
    setTimeout(() => setToast(null), 2500);
  }

  function updateDraft(
    key: string,
    field: "monthly" | "annual" | "footnote",
    val: string,
  ) {
    setDraft((d) => ({
      ...d,
      [key]: { ...d[key], [field]: val },
    }));
  }

  async function save() {
    if (resolved.length === 0) return;
    setSaving(true);
    try {
      // Rebuild the overrides list: keep every row that's NOT for the
      // currently-edited country, then append the freshly-edited rows
      // for this country (skipping ones the admin cleared).
      const kept = overrides.filter(
        (o) => o.country.toUpperCase() !== country.toUpperCase(),
      );
      const fresh: RegionalPricingEntry[] = [];
      for (const row of resolved) {
        const d = draft[row.productKey];
        if (!d) continue;
        const monthlyMinor = inputToMinor(d.monthly, row.currency.decimals);
        const annualMinor = inputToMinor(d.annual, row.currency.decimals);
        const footnote = d.footnote.trim();
        // Only persist a row if at least one field is non-empty —
        // empty draft = "no override, use FX fallback".
        if (
          monthlyMinor === undefined &&
          annualMinor === undefined &&
          !footnote
        ) {
          continue;
        }
        fresh.push({
          productKey: row.productKey,
          country: country.toUpperCase(),
          currency: row.currency.code,
          monthlyMinor,
          annualMinor,
          footnote: footnote || undefined,
        });
      }
      const next = [...kept, ...fresh];
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regionalPricing: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setOverrides(next);
      // Re-resolve so the FX preview now reflects the saved override.
      const pricingRes = await fetch(
        `/api/pricing?country=${encodeURIComponent(country)}`,
        { cache: "no-store" },
      );
      if (pricingRes.ok) {
        const d = await pricingRes.json();
        setResolved(Object.values(d.products as Record<string, ResolvedRow>));
      }
      showToast("✓ Saved");
    } catch (err) {
      showToast((err as Error).message, true);
    } finally {
      setSaving(false);
    }
  }

  const productMap = useMemo(() => {
    const m = new Map<string, ProductMeta>();
    products?.forEach((p) => m.set(p.key, p));
    return m;
  }, [products]);

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-600 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            💱 Per-country pricing
          </div>
          <h1 className="text-2xl font-bold">Regional pricing</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/90">
            Set per-country prices for every plan. Where no row exists,
            the public pricing page falls back to a live FX conversion
            of the base USD price.
          </p>
        </div>
      </div>

      {/* Country picker */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <label className="block text-xs font-bold uppercase tracking-wide text-gray-600">
          Edit pricing for country
        </label>
        <div className="mt-2 flex items-center gap-3">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={`${inputCls} max-w-md`}
          >
            {ISO_COUNTRIES.map((c) => (
              <option key={c.iso} value={c.iso}>
                {c.name} ({c.iso})
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500">
            Currency:{" "}
            <span className="font-mono font-semibold text-gray-700">
              {resolved[0]?.currency.code || "—"}
            </span>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white p-6 text-sm text-gray-500 shadow-sm ring-1 ring-gray-100">
          Loading…
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Base USD</th>
                <th className="px-4 py-3">FX / current</th>
                <th className="px-4 py-3">Override monthly</th>
                <th className="px-4 py-3">Override annual</th>
                <th className="px-4 py-3">Footnote</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {resolved.map((row) => {
                const meta = productMap.get(row.productKey);
                return (
                  <tr key={row.productKey}>
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-gray-900">
                        {meta?.name || row.productKey}
                      </p>
                      {meta?.description && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {meta.description}
                        </p>
                      )}
                      <code className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                        {row.productKey}
                      </code>
                    </td>
                    <td className="px-4 py-3 align-top text-gray-700">
                      {meta?.isCustom ? (
                        <span className="text-xs italic text-gray-400">
                          Custom
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <p>${meta?.baseMonthlyUsd ?? "—"}/mo</p>
                          <p className="text-xs text-gray-500">
                            ${meta?.baseAnnualUsd ?? "—"}/yr
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-gray-700">
                      {row.isCustom ? (
                        <span className="text-xs italic text-gray-400">
                          —
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <p className="font-medium">
                            {row.monthly || "—"}/mo
                          </p>
                          <p className="text-xs text-gray-500">
                            {row.annual || "—"}/yr
                          </p>
                          <span
                            className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              row.source === "override"
                                ? "bg-emerald-100 text-emerald-700"
                                : row.source === "fx"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {row.source}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {meta?.isCustom ? (
                        <span className="text-xs italic text-gray-400">—</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">
                            {row.currency.symbol}
                          </span>
                          <input
                            className={inputCls}
                            type="number"
                            min="0"
                            step={Math.pow(10, -row.currency.decimals)}
                            placeholder="(use FX)"
                            value={draft[row.productKey]?.monthly ?? ""}
                            onChange={(e) =>
                              updateDraft(
                                row.productKey,
                                "monthly",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {meta?.isCustom ? (
                        <span className="text-xs italic text-gray-400">—</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">
                            {row.currency.symbol}
                          </span>
                          <input
                            className={inputCls}
                            type="number"
                            min="0"
                            step={Math.pow(10, -row.currency.decimals)}
                            placeholder="(use FX)"
                            value={draft[row.productKey]?.annual ?? ""}
                            onChange={(e) =>
                              updateDraft(
                                row.productKey,
                                "annual",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <input
                        className={inputCls}
                        placeholder="Optional"
                        value={draft[row.productKey]?.footnote ?? ""}
                        onChange={(e) =>
                          updateDraft(
                            row.productKey,
                            "footnote",
                            e.target.value,
                          )
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
        >
          {saving ? "Saving…" : `Save ${country} prices`}
        </button>
        <p className="text-xs text-gray-500">
          Clear a field to revert that price to live FX conversion.
        </p>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${
            toast.err ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
