"use client";

// Admin AI cost / usage dashboard. Three views, one page:
//   - hero: total calls, tokens, error rate over the window
//   - byRoute: per-feature breakdown (which AI features are getting used)
//   - byCaller: per-doctor breakdown (for billing clinics)
//
// Token-to-USD math is approximate — Gemini Flash pricing changes
// occasionally and the per-feature ratio of input/output varies. The
// "approx cost" column is a rough guide, not a billing-grade figure.

import { useEffect, useState } from "react";

interface Totals { calls: number; tokens: number; errors: number }
interface Route { route: string; calls: number; tokens: number; errors: number; avgLatencyMs: number }
interface Caller { callerEmail: string; calls: number; tokens: number; scribeMinutes: number }

// $0.10 / 1M input tokens + $0.40 / 1M output tokens for Gemini Flash
// (Apr 2026). We don't track input vs output in the summary aggregates,
// so blend at 70% input / 30% output as a rough mix.
const COST_PER_M_TOKENS = 0.10 * 0.7 + 0.40 * 0.3;

function approxCostUsd(tokens: number): string {
  const usd = (tokens / 1_000_000) * COST_PER_M_TOKENS;
  return `$${usd.toFixed(2)}`;
}

export default function AdminAiUsage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<{
    totals: Totals;
    byRoute: Route[];
    byCaller: Caller[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/ai-usage?days=${days}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI usage &amp; cost</h2>
          <p className="mt-1 text-sm text-gray-500">
            Per-feature and per-doctor breakdown of Gemini calls. Approximate cost based on Flash pricing.
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((n) => (
            <button
              key={n}
              onClick={() => setDays(n)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                days === n
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Last {n} days
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Hero numbers */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total calls</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {loading ? "…" : (data?.totals.calls ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total tokens</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {loading ? "…" : (data?.totals.tokens ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Approx cost</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {loading ? "…" : approxCostUsd(data?.totals.tokens ?? 0)}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Errors</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">
            {loading ? "…" : (data?.totals.errors ?? 0).toLocaleString()}
          </p>
          {!!data?.totals.calls && (
            <p className="mt-0.5 text-[11px] text-gray-400">
              {((data.totals.errors / data.totals.calls) * 100).toFixed(1)}% error rate
            </p>
          )}
        </div>
      </div>

      <div className="mb-6 overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3 font-semibold text-gray-900">By feature</div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-5 py-2 font-medium">Route</th>
              <th className="px-5 py-2 font-medium">Calls</th>
              <th className="px-5 py-2 font-medium">Tokens</th>
              <th className="px-5 py-2 font-medium">Approx cost</th>
              <th className="px-5 py-2 font-medium">Avg latency</th>
              <th className="px-5 py-2 font-medium">Errors</th>
            </tr>
          </thead>
          <tbody>
            {(data?.byRoute || []).map((r) => (
              <tr key={r.route} className="border-b border-gray-50">
                <td className="px-5 py-2 font-mono text-xs text-gray-800">{r.route}</td>
                <td className="px-5 py-2">{r.calls.toLocaleString()}</td>
                <td className="px-5 py-2">{r.tokens.toLocaleString()}</td>
                <td className="px-5 py-2 text-emerald-700">{approxCostUsd(r.tokens)}</td>
                <td className="px-5 py-2 text-gray-500">{r.avgLatencyMs} ms</td>
                <td className={`px-5 py-2 ${r.errors > 0 ? "text-rose-600" : "text-gray-400"}`}>
                  {r.errors}
                </td>
              </tr>
            ))}
            {!loading && (data?.byRoute || []).length === 0 && (
              <tr><td colSpan={6} className="px-5 py-6 text-center text-sm text-gray-400">No AI calls yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3 font-semibold text-gray-900">By doctor</div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-5 py-2 font-medium">Caller</th>
              <th className="px-5 py-2 font-medium">Calls</th>
              <th className="px-5 py-2 font-medium">Tokens</th>
              <th className="px-5 py-2 font-medium">Approx cost</th>
              <th className="px-5 py-2 font-medium">Scribe minutes</th>
            </tr>
          </thead>
          <tbody>
            {(data?.byCaller || []).map((c) => (
              <tr key={c.callerEmail} className="border-b border-gray-50">
                <td className="px-5 py-2 text-xs text-gray-800">{c.callerEmail}</td>
                <td className="px-5 py-2">{c.calls.toLocaleString()}</td>
                <td className="px-5 py-2">{c.tokens.toLocaleString()}</td>
                <td className="px-5 py-2 text-emerald-700">{approxCostUsd(c.tokens)}</td>
                <td className="px-5 py-2">{c.scribeMinutes ? `${c.scribeMinutes} min` : "—"}</td>
              </tr>
            ))}
            {!loading && (data?.byCaller || []).length === 0 && (
              <tr><td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-400">No usage to attribute.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
