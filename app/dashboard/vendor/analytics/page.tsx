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
    return <div className="p-12 text-center text-gray-500">Loading analytics…</div>;
  }
  if (err) {
    return (
      <div className="mx-auto max-w-xl p-12 text-center">
        <p className="text-gray-700">{err}</p>
        <Link href="/dashboard/vendor" className="mt-4 inline-block text-sm text-primary-600 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }
  if (!data) return null;

  const maxRev = Math.max(1, ...data.timeseries.map((p) => p.revenue));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Analytics</h1>
            <p className="mt-1 text-sm text-gray-500">Revenue, top products, and payout totals — last {data.window.days} days.</p>
          </div>
          <div className="flex gap-2">
            {WINDOWS.map((w) => (
              <button key={w} onClick={() => setDays(w)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  days === w ? "bg-primary-600 text-white" : "bg-white text-gray-700 border border-gray-200"
                }`}>
                {w}d
              </button>
            ))}
            <Link href="/dashboard/vendor" className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
              ← Dashboard
            </Link>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Revenue" value={`$${data.totals.revenue.toFixed(2)}`} />
          <Stat label="Orders" value={String(data.totals.orders)} />
          <Stat label="Units sold" value={String(data.totals.units)} />
          <Stat label="Avg. order value" value={`$${data.totals.avgOrderValue.toFixed(2)}`} />
          <Stat label="Pending payout" value={`$${data.totals.pendingPayout.toFixed(2)}`} tone="amber" />
          <Stat label="Paid out" value={`$${data.totals.paidPayout.toFixed(2)}`} tone="green" />
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Revenue over time</h2>
          {data.timeseries.every((p) => p.revenue === 0) ? (
            <p className="py-10 text-center text-sm text-gray-400">No revenue in this window yet.</p>
          ) : (
            <div className="flex h-48 items-end gap-1">
              {data.timeseries.map((p) => (
                <div key={p.date} className="group relative flex-1">
                  <div
                    className="w-full rounded-t bg-primary-500 transition-colors group-hover:bg-primary-700"
                    style={{ height: `${(p.revenue / maxRev) * 100}%`, minHeight: p.revenue > 0 ? "2px" : "0" }}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[10px] text-white group-hover:block">
                    {p.date}: ${p.revenue.toFixed(2)} · {p.orders} order(s)
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex justify-between text-[10px] text-gray-400">
            <span>{data.timeseries[0]?.date}</span>
            <span>{data.timeseries[data.timeseries.length - 1]?.date}</span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Top products</h2>
            {data.topProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No sales yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500">
                  <tr className="border-b border-gray-100">
                    <th className="py-2">Product</th>
                    <th className="py-2 text-right">Units</th>
                    <th className="py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((p) => (
                    <tr key={p.name} className="border-b border-gray-50">
                      <td className="py-2 font-medium text-gray-900">{p.name}</td>
                      <td className="py-2 text-right text-gray-700">{p.units}</td>
                      <td className="py-2 text-right text-gray-700">${p.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Order status</h2>
            {data.statusBreakdown.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No orders in this window.</p>
            ) : (
              <div className="space-y-2">
                {data.statusBreakdown.map((s) => {
                  const total = data.statusBreakdown.reduce((a, b) => a + b.count, 0);
                  const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                  return (
                    <div key={s.status}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="font-medium text-gray-700">{s.status}</span>
                        <span className="text-gray-500">{s.count} · {pct}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100">
                        <div className="h-2 rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: "amber" | "green" }) {
  const toneBg = tone === "amber"
    ? "bg-amber-50 text-amber-900"
    : tone === "green"
    ? "bg-green-50 text-green-900"
    : "bg-white text-gray-900";
  return (
    <div className={`rounded-xl p-5 shadow-sm ${toneBg}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs opacity-70">{label}</p>
    </div>
  );
}
