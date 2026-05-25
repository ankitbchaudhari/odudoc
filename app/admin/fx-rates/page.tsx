"use client";

// Super-admin FX engine dashboard.
//
// Lets the admin pick a primary + secondary FX provider, see the
// current live USD rate table, see which provider successfully served
// it last, and manually force a refresh. Provider preference is saved
// via the existing /api/admin/settings PATCH; manual refresh hits
// /api/admin/fx-rates POST which bypasses the 1-hour cache.

import { useEffect, useMemo, useState } from "react";

type ProviderId =
  | "open-er-api"
  | "exchangerate-host"
  | "frankfurter"
  | "fawazahmed0";

interface FxProvider {
  id: ProviderId;
  name: string;
  url: string;
  description: string;
}

interface ProviderStatus {
  providerId: ProviderId;
  lastAttemptAt: number | null;
  ok: boolean | null;
  error?: string;
}

interface FxStatus {
  primaryProvider: ProviderId;
  secondaryProvider: ProviderId;
  activeProvider: ProviderId | null;
  usdRates: Record<string, number> | null;
  usdFetchedAt: number | null;
  providers: ProviderStatus[];
  cacheTtlMs: number;
}

const SAMPLE_CURRENCIES = [
  "INR",
  "EUR",
  "GBP",
  "AUD",
  "CAD",
  "JPY",
  "AED",
  "SGD",
  "ZAR",
  "BRL",
  "MXN",
  "CNY",
];

function relativeTime(ts: number | null): string {
  if (!ts) return "never";
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20";

export default function AdminFxRates() {
  const [providers, setProviders] = useState<FxProvider[]>([]);
  const [status, setStatus] = useState<FxStatus | null>(null);
  const [draftPrimary, setDraftPrimary] = useState<ProviderId | "">("");
  const [draftSecondary, setDraftSecondary] = useState<ProviderId | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(
    null
  );

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/fx-rates", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as {
        providers: FxProvider[];
        status: FxStatus;
      };
      setProviders(data.providers);
      setStatus(data.status);
      setDraftPrimary(data.status.primaryProvider);
      setDraftSecondary(data.status.secondaryProvider);
    } catch (err) {
      showToast((err as Error).message, true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function showToast(text: string, err = false) {
    setToast({ text, err });
    setTimeout(() => setToast(null), 2500);
  }

  async function savePreferences() {
    if (!draftPrimary || !draftSecondary) return;
    if (draftPrimary === draftSecondary) {
      showToast("Primary and secondary must be different.", true);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fx: {
            primaryProvider: draftPrimary,
            secondaryProvider: draftSecondary,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      showToast("✓ Provider preference saved");
      await load();
    } catch (err) {
      showToast((err as Error).message, true);
    } finally {
      setSaving(false);
    }
  }

  async function refreshNow() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/fx-rates", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        providers: FxProvider[];
        ok: boolean;
        error?: string;
        status: FxStatus;
      };
      setProviders(data.providers);
      setStatus(data.status);
      showToast(
        data.ok
          ? `✓ Refreshed from ${data.status.activeProvider || "—"}`
          : `Refresh failed: ${data.error || "unknown error"}`,
        !data.ok,
      );
    } catch (err) {
      showToast((err as Error).message, true);
    } finally {
      setRefreshing(false);
    }
  }

  const dirty =
    status &&
    (draftPrimary !== status.primaryProvider ||
      draftSecondary !== status.secondaryProvider);

  const providerById = useMemo(() => {
    const m = new Map<ProviderId, FxProvider>();
    providers.forEach((p) => m.set(p.id, p));
    return m;
  }, [providers]);

  const sampleRows = useMemo(() => {
    if (!status?.usdRates) return [] as Array<{ code: string; rate: number }>;
    return SAMPLE_CURRENCIES.map((c) => ({
      code: c,
      rate: status.usdRates![c],
    })).filter((r) => typeof r.rate === "number" && isFinite(r.rate));
  }, [status]);

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            💱 Currency conversion engine
          </div>
          <h1 className="text-2xl font-bold">FX rates</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/90">
            Configure which free provider supplies live exchange rates
            for the platform. Used wherever a doctor / vendor / merchant
            sets their price in their own currency and a visitor in
            another country needs to see it converted. Rates cache for
            1 hour; force a refresh below to test a provider change.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white p-6 text-sm text-gray-500 shadow-sm ring-1 ring-gray-100">
          Loading…
        </div>
      ) : !status ? (
        <div className="rounded-xl bg-white p-6 text-sm text-red-600 shadow-sm ring-1 ring-gray-100">
          Couldn&apos;t load status.
        </div>
      ) : (
        <>
          {/* Provider preference */}
          <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-base font-bold text-gray-900">
              Provider preference
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              We try the primary first and fall through to the
              secondary on error. If both fail, the remaining providers
              are tried as silent further fallbacks.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Primary
                </span>
                <select
                  className={`mt-1 ${inputCls}`}
                  value={draftPrimary}
                  onChange={(e) =>
                    setDraftPrimary(e.target.value as ProviderId)
                  }
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {draftPrimary && (
                  <p className="mt-1 text-xs text-gray-500">
                    {providerById.get(draftPrimary as ProviderId)?.description}
                  </p>
                )}
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Secondary (fallback)
                </span>
                <select
                  className={`mt-1 ${inputCls}`}
                  value={draftSecondary}
                  onChange={(e) =>
                    setDraftSecondary(e.target.value as ProviderId)
                  }
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {draftSecondary && (
                  <p className="mt-1 text-xs text-gray-500">
                    {providerById.get(draftSecondary as ProviderId)?.description}
                  </p>
                )}
              </label>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={savePreferences}
                disabled={saving || !dirty}
                className="rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save preference"}
              </button>
              {!dirty && (
                <span className="text-xs text-gray-500">
                  No changes to save.
                </span>
              )}
            </div>
          </div>

          {/* Live status */}
          <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Live status
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  USD rate table, served from in-memory cache. TTL{" "}
                  {Math.round(status.cacheTtlMs / 60_000)} minutes.
                </p>
              </div>
              <button
                type="button"
                onClick={refreshNow}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                <svg
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {refreshing ? "Refreshing…" : "Refresh now"}
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat
                label="Active provider"
                value={
                  status.activeProvider
                    ? providerById.get(status.activeProvider)?.name ||
                      status.activeProvider
                    : "—"
                }
              />
              <Stat
                label="USD table fetched"
                value={relativeTime(status.usdFetchedAt)}
              />
              <Stat
                label="Currencies in table"
                value={
                  status.usdRates
                    ? String(Object.keys(status.usdRates).length)
                    : "—"
                }
              />
            </div>

            {/* Sample rates */}
            {sampleRows.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-lg border border-gray-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                    <tr>
                      <th className="px-3 py-2">1 USD =</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sampleRows.map((r) => (
                      <tr key={r.code}>
                        <td className="px-3 py-1.5 font-mono text-gray-700">
                          {r.code}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-gray-900">
                          {r.rate.toLocaleString(undefined, {
                            maximumFractionDigits: 4,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Per-provider health */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-base font-bold text-gray-900">
              Provider health
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Last attempt for each provider, in chronological-of-call
              order. Failed attempts show the upstream error.
            </p>
            <div className="mt-4 space-y-2">
              {status.providers.map((p) => {
                const meta = providerById.get(p.providerId);
                return (
                  <div
                    key={p.providerId}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm"
                  >
                    <span
                      className={`inline-flex h-2 w-2 rounded-full ${
                        p.ok === true
                          ? "bg-emerald-500"
                          : p.ok === false
                            ? "bg-red-500"
                            : "bg-gray-300"
                      }`}
                    />
                    <span className="font-semibold text-gray-900">
                      {meta?.name || p.providerId}
                    </span>
                    <span className="text-xs text-gray-500">
                      {relativeTime(p.lastAttemptAt)}
                    </span>
                    {p.ok === false && p.error && (
                      <span className="ml-auto rounded bg-red-50 px-2 py-0.5 font-mono text-[11px] text-red-700">
                        {p.error}
                      </span>
                    )}
                    {p.ok === true && (
                      <span className="ml-auto rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        OK
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}
