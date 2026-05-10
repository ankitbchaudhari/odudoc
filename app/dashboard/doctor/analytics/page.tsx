"use client";

// Doctor analytics dashboard. KPI strip, daily timeline sparkline,
// top patient complaint buckets, earnings breakdown.

import { useCallback, useEffect, useState } from "react";

interface AnalyticsResp {
  doctor: { id: string; name: string; specialty: string; rating: number; consultationCount: number };
  windowDays: number;
  kpis: {
    bookingsTotal: number; completed: number; cancelled: number; upcoming: number;
    conversionPct: number; ratingAvg: number | null; ratingCount: number;
    grossRupees: number; platformCutRupees: number; doctorEarningsRupees: number;
    wowDelta: number;
  };
  timeline: Array<{ date: string; bookings: number; completed: number; revenue: number }>;
  topComplaints: Array<{ name: string; count: number }>;
}

function fmtINR(n: number) { return `₹${Math.round(n).toLocaleString("en-IN")}`; }

export default function DoctorAnalyticsPage() {
  const [data, setData] = useState<AnalyticsResp | null>(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/doctor-analytics?days=${days}`, { cache: "no-store" });
    if (r.ok) { setData(await r.json()); setError(null); }
    else {
      const body = await r.json().catch(() => ({}));
      setError(body.error || `Failed (${r.status})`);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  if (error) return <div className="mx-auto max-w-5xl p-6"><p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800">{error === "not_a_doctor" ? "This page is only for doctors signed in to OduDoc." : error}</p></div>;
  if (!data) return <div className="mx-auto max-w-5xl p-6"><p className="text-sm text-slate-400">Loading…</p></div>;

  const k = data.kpis;
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My analytics</h1>
          <p className="mt-1 text-sm text-slate-500">{data.doctor.name} · {data.doctor.specialty}</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {[7, 30, 90, 365].map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${days === d ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{d}d</button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Tile label="Bookings" v={String(k.bookingsTotal)} sub={`${k.wowDelta >= 0 ? "↑" : "↓"} ${Math.abs(k.wowDelta)}% vs prior 7d`} />
        <Tile label="Completed" v={String(k.completed)} accent="emerald" sub={`${k.conversionPct}% conversion`} />
        <Tile label="Upcoming" v={String(k.upcoming)} accent="indigo" />
        <Tile label="Rating" v={k.ratingAvg !== null ? k.ratingAvg.toFixed(2) : "—"} sub={k.ratingCount > 0 ? `${k.ratingCount} reviews` : "no reviews yet"} />
      </div>

      {/* Earnings breakdown */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Tile label="Gross revenue" v={fmtINR(k.grossRupees)} />
        <Tile label="Platform fee (30%)" v={fmtINR(k.platformCutRupees)} accent="rose" />
        <Tile label="Your earnings" v={fmtINR(k.doctorEarningsRupees)} accent="emerald" />
      </div>

      {/* Daily timeline */}
      <section className="mt-8 rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-bold text-slate-900">Daily activity</p>
        <Sparkline timeline={data.timeline} />
      </section>

      {/* Top complaints */}
      {data.topComplaints.length > 0 && (
        <section className="mt-6 rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-bold text-slate-900">Top patient complaints</p>
          <div className="flex flex-wrap gap-2">
            {data.topComplaints.map((c) => (
              <span key={c.name} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {c.name} <span className="ml-1 font-bold text-indigo-600">{c.count}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <p className="mt-8 text-center text-[10px] text-slate-400">
        Numbers refresh on page load. Earnings reflect the standard 70/30 split with the platform.
      </p>
    </div>
  );
}

function Tile({ label, v, sub, accent }: { label: string; v: string; sub?: string; accent?: "emerald" | "rose" | "indigo" }) {
  const cls = accent === "emerald" ? "text-emerald-700"
    : accent === "rose" ? "text-rose-700"
    : accent === "indigo" ? "text-indigo-700"
    : "text-slate-900";
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${cls}`}>{v}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}

function Sparkline({ timeline }: { timeline: AnalyticsResp["timeline"] }) {
  if (timeline.length === 0) return <p className="text-sm text-slate-400">No data.</p>;
  const max = Math.max(1, ...timeline.map((d) => Math.max(d.bookings, d.completed)));
  const w = 800; const h = 80;
  const step = w / Math.max(1, timeline.length - 1);
  const path = (key: "bookings" | "completed") =>
    timeline.map((d, i) => `${i === 0 ? "M" : "L"}${i * step},${h - (d[key] / max) * h}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h + 16}`} className="h-24 w-full">
        <path d={path("bookings")} stroke="#7c3aed" strokeWidth={2} fill="none" />
        <path d={path("completed")} stroke="#10b981" strokeWidth={2} fill="none" />
      </svg>
      <div className="mt-1 flex gap-3 text-[11px] text-slate-500">
        <span><span className="inline-block h-2 w-2 rounded-full bg-violet-600 align-middle" /> bookings</span>
        <span><span className="inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" /> completed</span>
      </div>
    </div>
  );
}
