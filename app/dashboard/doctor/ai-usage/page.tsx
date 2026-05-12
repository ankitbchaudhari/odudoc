"use client";

// Clinic-facing AI usage view. Every doctor sees their own AI consumption
// per feature with an approximate USD cost — useful for clinics to
// validate that the AI add-on is paying for itself, and as a hard
// counterpoint to the $400/month/doctor that US ambient-scribe vendors
// charge for what we ship by default.

import { useEffect, useState } from "react";

interface RouteRow {
  route: string;
  calls: number;
  tokens: number;
  errors: number;
  avgLatencyMs: number;
}

interface ApiResponse {
  days: number;
  totals: { calls: number; tokens: number; errors: number };
  byRoute: RouteRow[];
}

// Gemini Flash blended pricing (April 2026): $0.10 / 1M input + $0.40 / 1M
// output, mixed roughly 70 / 30 across our route shapes. Not exact — the
// /admin/ai-usage table calls this approximate too. Good enough to make
// pricing decisions.
const COST_PER_M_TOKENS = 0.10 * 0.7 + 0.40 * 0.3;
function approxCostUsd(tokens: number): string {
  const usd = (tokens / 1_000_000) * COST_PER_M_TOKENS;
  return `$${usd.toFixed(2)}`;
}

const FRIENDLY_NAMES: Record<string, string> = {
  "ai-emr.patient-summary": "Patient summary",
  "ai-prescription": "Prescription helper",
  "ai-drug-check": "Drug-interaction check",
  "ai-icd10": "ICD-10 auto-coder",
  "ai-differential": "Differential diagnosis",
  "ai-intake": "Pre-visit intake",
  "ai-postvisit": "Post-visit Q&A",
  "ai-scribe": "Ambient scribe",
  "ai-scribe.chunk": "Scribe (chunked transcribe)",
  "ai-scribe.finalize": "Scribe (SOAP finalize)",
  "ai-translate-rx": "Prescription translator",
  "ai-dictionary.term": "Dictionary (terms)",
  "ai-dictionary.drug": "Dictionary (drugs)",
};

export default function ClinicAiUsagePage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/clinic/ai-usage?days=${days}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My AI Usage</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Per-feature breakdown of your AI consumption with approximate cost. Decision support to validate the AI add-on at a glance.
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((n) => (
            <button
              key={n}
              onClick={() => setDays(n)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                days === n
                  ? "border-violet-500 bg-violet-50 text-violet-700"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Last {n} days
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      {/* Hero numbers */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Calls</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {loading ? "…" : (data?.totals.calls ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tokens</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {loading ? "…" : (data?.totals.tokens ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Approx cost</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {loading ? "…" : approxCostUsd(data?.totals.tokens ?? 0)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            For comparison: Abridge bills ~$400/dr/mo
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Errors</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">
            {loading ? "…" : (data?.totals.errors ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">
          By feature · last {days} days
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-xs uppercase text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-5 py-2 font-medium">Feature</th>
              <th className="px-5 py-2 font-medium">Calls</th>
              <th className="px-5 py-2 font-medium">Tokens</th>
              <th className="px-5 py-2 font-medium">Approx cost</th>
              <th className="px-5 py-2 font-medium">Avg latency</th>
              <th className="px-5 py-2 font-medium">Errors</th>
            </tr>
          </thead>
          <tbody>
            {(data?.byRoute || []).map((r) => (
              <tr key={r.route} className="border-b border-slate-50">
                <td className="px-5 py-2 text-slate-800 dark:text-slate-200">
                  {FRIENDLY_NAMES[r.route] || r.route}
                  <span className="ml-2 text-[10px] font-mono text-slate-400">{r.route}</span>
                </td>
                <td className="px-5 py-2">{r.calls.toLocaleString()}</td>
                <td className="px-5 py-2">{r.tokens.toLocaleString()}</td>
                <td className="px-5 py-2 text-emerald-700">{approxCostUsd(r.tokens)}</td>
                <td className="px-5 py-2 text-slate-500 dark:text-slate-400">{r.avgLatencyMs} ms</td>
                <td className={`px-5 py-2 ${r.errors > 0 ? "text-rose-600" : "text-slate-400"}`}>
                  {r.errors}
                </td>
              </tr>
            ))}
            {!loading && (data?.byRoute || []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                  No AI calls yet in this window. Use any AI feature in the EMR to start populating this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Cost figure uses Gemini 2.0 Flash blended pricing ($0.10/M input + $0.40/M output, ~70/30 input/output mix). Approximate — your invoice from Google may differ slightly. For exact billing reconciliation, the platform admin can pull the underlying ai_usage table.
      </p>
    </div>
  );
}
