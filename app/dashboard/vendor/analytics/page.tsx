"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface TimeseriesPoint { date: string; revenue: number; orders: number; units: number }
interface TopProduct { name: string; units: number; revenue: number }
interface StatusRow { status: string; count: number }
interface Analytics {
  window: { days: number; from: string; to: string };
  totals: {
    revenue: number; orders: number; units: number;
    avgOrderValue: number; pendingPayout: number; paidPayout: number;
  };
  timeseries: TimeseriesPoint[];
  topProducts: TopProduct[];
  statusBreakdown: StatusRow[];
}

const WINDOWS = [7, 30, 90] as const;

export default function VendorAnalyticsPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/login?next=/dashboard/vendor/analytics");
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    setLoading(true);
    fetch(`/api/vendors/me/analytics?days=${days}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Failed to load");
        return res.json();
      })
      .then((d: Analytics) => { setData(d); setErr(null); })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [authStatus, days]);

  if (loading || authStatus !== "authenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-pink-50/40 p-12 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500" />
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading analytics…</p>
      </div>
    );
  }
  if (err) {
    return (
      <div className="mx-auto max-w-xl p-12 text-center">
        <p className="text-gray-700 dark:text-slate-300">{err}</p>
        <Link href="/dashboard/vendor" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }
  if (!data) return null;

  const maxRev = Math.max(1, ...data.timeseries.map((p) => p.revenue));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-pink-50/40">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-8 text-white shadow-xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-pink-300/30 blur-3xl"
          />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                Pharmacy insights
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Analytics</h1>
              <p className="mt-2 max-w-md text-sm text-white/90">
                Revenue, top products, and payout totals — last {data.window.days} days.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full bg-white/15 p-1 backdrop-blur-sm">
                {WINDOWS.map((w) => (
                  <button
                    key={w}
                    onClick={() => setDays(w)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      days === w
                        ? "bg-white dark:bg-slate-900 text-indigo-700 shadow-sm"
                        : "text-white/80 hover:text-white"
                    }`}
                  >
                    {w}d
                  </button>
                ))}
              </div>
              <Link
                href="/dashboard/vendor"
                className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <Stat label="Revenue" value={`$${data.totals.revenue.toFixed(2)}`} tone="indigo" emoji="💵" />
          <Stat label="Orders" value={String(data.totals.orders)} tone="sky" emoji="🧾" />
          <Stat label="Units sold" value={String(data.totals.units)} tone="violet" emoji="📦" />
          <Stat label="Avg. order value" value={`$${data.totals.avgOrderValue.toFixed(2)}`} tone="fuchsia" emoji="📊" />
          <Stat label="Pending payout" value={`$${data.totals.pendingPayout.toFixed(2)}`} tone="amber" emoji="⏳" />
          <Stat label="Paid out" value={`$${data.totals.paidPayout.toFixed(2)}`} tone="emerald" emoji="✅" />
        </div>

        {/* Revenue chart */}
        <div className="mb-6 overflow-hidden rounded-3xl border border-white/60 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-base shadow-sm">
              📈
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Revenue over time</h2>
          </div>
          {data.timeseries.every((p) => p.revenue === 0) ? (
            <p className="py-12 text-center text-sm text-slate-400">No revenue in this window yet.</p>
          ) : (
            <div className="flex h-52 items-end gap-1">
              {data.timeseries.map((p) => (
                <div key={p.date} className="group relative flex-1">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-indigo-500 via-violet-500 to-fuchsia-500 transition-all group-hover:from-indigo-600 group-hover:to-pink-500"
                    style={{ height: `${(p.revenue / maxRev) * 100}%`, minHeight: p.revenue > 0 ? "2px" : "0" }}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] text-white shadow-lg group-hover:block">
                    <b>{p.date}</b>: ${p.revenue.toFixed(2)} · {p.orders} order(s)
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex justify-between text-[10px] font-medium text-slate-400">
            <span>{data.timeseries[0]?.date}</span>
            <span>{data.timeseries[data.timeseries.length - 1]?.date}</span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Top products */}
          <div className="overflow-hidden rounded-3xl border border-white/60 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-base shadow-sm">
                🏆
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Top products</h2>
            </div>
            {data.topProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No sales yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.topProducts.map((p, i) => (
                  <li
                    key={p.name}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-gradient-to-r from-white to-emerald-50/30 px-3 py-2.5"
                  >
                    <span
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        i === 0
                          ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                          : i === 1
                            ? "bg-slate-200 text-slate-700 dark:text-slate-300"
                            : i === 2
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{p.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{p.units} units</span>
                    <span className="text-sm font-bold text-emerald-700">${p.revenue.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Order status */}
          <div className="overflow-hidden rounded-3xl border border-white/60 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 text-base shadow-sm">
                🎯
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Order status</h2>
            </div>
            {data.statusBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No orders in this window.</p>
            ) : (
              <div className="space-y-3">
                {data.statusBreakdown.map((s, i) => {
                  const total = data.statusBreakdown.reduce((a, b) => a + b.count, 0);
                  const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                  const colors = [
                    "from-sky-500 to-blue-500",
                    "from-emerald-500 to-teal-500",
                    "from-amber-400 to-orange-500",
                    "from-fuchsia-500 to-pink-500",
                    "from-violet-500 to-purple-500",
                    "from-rose-500 to-red-500",
                  ];
                  const grad = colors[i % colors.length];
                  return (
                    <div key={s.status}>
                      <div className="mb-1.5 flex items-baseline justify-between text-xs">
                        <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">{s.status}</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          <b className="text-slate-900 dark:text-slate-100">{s.count}</b> · {pct}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-2 rounded-full bg-gradient-to-r ${grad} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const TONES: Record<string, { ring: string; bg: string; text: string }> = {
  indigo:   { ring: "ring-indigo-100",  bg: "bg-gradient-to-br from-indigo-50 to-white",   text: "text-indigo-700"   },
  sky:      { ring: "ring-sky-100",     bg: "bg-gradient-to-br from-sky-50 to-white",      text: "text-sky-700"      },
  violet:   { ring: "ring-violet-100",  bg: "bg-gradient-to-br from-violet-50 to-white",   text: "text-violet-700"   },
  fuchsia:  { ring: "ring-fuchsia-100", bg: "bg-gradient-to-br from-fuchsia-50 to-white",  text: "text-fuchsia-700"  },
  amber:    { ring: "ring-amber-100",   bg: "bg-gradient-to-br from-amber-50 to-white",    text: "text-amber-700"    },
  emerald:  { ring: "ring-emerald-100", bg: "bg-gradient-to-br from-emerald-50 to-white",  text: "text-emerald-700"  },
};

function Stat({
  label, value, tone = "indigo", emoji,
}: { label: string; value: string; tone?: keyof typeof TONES; emoji: string }) {
  const t = TONES[tone];
  return (
    <div className={`rounded-2xl p-5 shadow-sm ring-1 ${t.ring} ${t.bg}`}>
      <div className="flex items-center justify-between">
        <span className="text-lg">{emoji}</span>
        <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${t.text}`}>{label}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
