"use client";

// Admin view of AI feedback aggregates — foundation for the re-ranker.
// Once enough rows accumulate, this page becomes the "ML training
// dataset health" dashboard.

import { useEffect, useState } from "react";

interface Stats {
  total: number;
  accepted: number;
  edited: number;
  rejected: number;
  ignored: number;
  acceptanceRate: number;
  bySurface: Record<string, number>;
}

export default function AdminFeedbackPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/feedback").then(async (r) => {
      if (!r.ok) {
        setError((await r.json()).error || `HTTP ${r.status}`);
        return;
      }
      setStats(await r.json());
    }).catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-xl p-12 text-center">
        <p className="text-rose-700">{error}</p>
      </div>
    );
  }
  if (!stats) {
    return <div className="p-12 text-center text-sm text-slate-500">Loading…</div>;
  }

  const pct = (n: number) => stats.total > 0 ? Math.round((n / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-pink-50/30">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 p-8 text-white shadow-xl">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Admin · ML training data</p>
          <h1 className="mt-1 text-3xl font-bold">AI feedback dashboard</h1>
          <p className="mt-2 max-w-md text-sm text-white/90">
            Every accept/edit/reject signal across AI surfaces. Foundation
            for the re-ranker that will tune Gemini suggestions to your
            patient population.
          </p>
        </div>

        <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-5">
          <Stat label="Total signals" value={stats.total.toLocaleString()} />
          <Stat label="Accepted" value={`${stats.accepted} · ${pct(stats.accepted)}%`} tone="emerald" />
          <Stat label="Edited" value={`${stats.edited} · ${pct(stats.edited)}%`} tone="cyan" />
          <Stat label="Rejected" value={`${stats.rejected} · ${pct(stats.rejected)}%`} tone="rose" />
          <Stat label="Acceptance rate" value={`${Math.round(stats.acceptanceRate * 100)}%`} tone="violet" hint="accepted + edited" />
        </div>

        <section className="rounded-3xl border border-white/60 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">By surface</h2>
          <div className="mt-3 space-y-2">
            {Object.keys(stats.bySurface).length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-6 text-center text-xs text-slate-500">
                No feedback yet. As doctors interact with AI suggestions, signals will appear here.
              </p>
            ) : Object.entries(stats.bySurface)
              .sort(([, a], [, b]) => b - a)
              .map(([surface, count]) => {
                const p = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={surface}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">{surface}</span>
                      <span className="text-slate-500"><b className="text-slate-900">{count}</b> · {p.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${p}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50/60 via-white to-fuchsia-50/40 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">What happens next</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li>• Suggestions accepted on past visits get a small ranking boost.</li>
            <li>• Rejected suggestions drop in the order on similar future cases.</li>
            <li>• Once we hit ~5K signals per surface, a weekly batch job retrains a lightweight re-ranker that further tunes Gemini's raw output.</li>
            <li>• Patient identifiers are <b>not</b> stored on feedback rows — only suggestion text + verdict.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "slate", hint }: { label: string; value: string; tone?: "slate" | "emerald" | "cyan" | "rose" | "violet"; hint?: string }) {
  const palette: Record<string, string> = {
    slate: "from-slate-50 to-white ring-slate-100 text-slate-700",
    emerald: "from-emerald-50 to-white ring-emerald-100 text-emerald-700",
    cyan: "from-cyan-50 to-white ring-cyan-100 text-cyan-700",
    rose: "from-rose-50 to-white ring-rose-100 text-rose-700",
    violet: "from-violet-50 to-white ring-violet-100 text-violet-700",
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br p-5 shadow-sm ring-1 ${palette[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.15em]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
