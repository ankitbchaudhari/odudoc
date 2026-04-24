"use client";

import { useEffect, useState } from "react";

interface Bed { id: string; bedNumber: string; status: string; wardId: string; patientId?: string; patientName?: string; bedType?: string; }
interface Ward { id: string; name: string; wardType?: string; floor?: string; beds: Bed[]; }
interface Admission { id: string; patientId?: string; patientName?: string; wardId?: string; bedNumber?: string; status: string; admissionDate?: string; }

const STATUS_THEME: Record<string, { wrap: string; dot: string }> = {
  occupied: { wrap: "bg-rose-50 border-rose-200 text-rose-800", dot: "bg-rose-500" },
  available: { wrap: "bg-emerald-50 border-emerald-200 text-emerald-800", dot: "bg-emerald-500" },
  free: { wrap: "bg-emerald-50 border-emerald-200 text-emerald-800", dot: "bg-emerald-500" },
  cleaning: { wrap: "bg-amber-50 border-amber-200 text-amber-800", dot: "bg-amber-500" },
  maintenance: { wrap: "bg-slate-50 border-slate-200 text-slate-700", dot: "bg-slate-400" },
  blocked: { wrap: "bg-slate-50 border-slate-200 text-slate-700", dot: "bg-slate-400" },
};

export default function BedCensusPage() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [adm, setAdm] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("");

  async function load() {
    setLoading(true);
    const [wRes, aRes] = await Promise.all([fetch("/api/hospital/wards", { cache: "no-store" }), fetch("/api/hospital/admissions", { cache: "no-store" })]);
    const wData = await wRes.json(); const aData = await aRes.json();
    setWards(wData.wards || []); setAdm(aData.admissions || []);
    setUpdatedAt(new Date().toLocaleTimeString());
    setLoading(false);
  }
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  const totals = wards.reduce((a, w) => { a.total += (w.beds || []).length; for (const b of w.beds || []) { if (b.status === "occupied") a.occupied++; else if (b.status === "available" || b.status === "free") a.free++; else if (b.status === "cleaning") a.cleaning++; else if (b.status === "maintenance" || b.status === "blocked") a.blocked++; else a.other++; } return a; }, { total: 0, occupied: 0, free: 0, cleaning: 0, blocked: 0, other: 0 });
  const occPct = totals.total > 0 ? Math.round((totals.occupied / totals.total) * 100) : 0;
  const activeAdm = adm.filter((a) => a.status === "admitted" || a.status === "active");

  return (
    <div className="mx-auto max-w-7xl">
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-accent-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              {totals.occupied}/{totals.total} beds occupied · {totals.free} free
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Bed Census</h1>
            <p className="mt-1 text-sm text-white/80">Real-time occupancy across all wards{updatedAt ? ` · updated ${updatedAt}` : ""} · auto-refreshes every 60s</p>
          </div>
          <button onClick={load} className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/25">🔄 Refresh</button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
        <StatTile label="Total beds" value={totals.total} tone="slate" />
        <StatTile label="Occupied" value={totals.occupied} tone="rose" />
        <StatTile label="Free" value={totals.free} tone="emerald" />
        <StatTile label="Cleaning" value={totals.cleaning} tone="amber" />
        <StatTile label="Blocked" value={totals.blocked} tone="slate" />
        <StatTile label="Occupancy %" value={occPct} tone="cyan" unit="%" />
      </div>

      {loading && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="h-1 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500" />
          <div className="py-16 text-center text-sm text-gray-400">⏳ Loading bed census…</div>
        </div>
      )}
      {!loading && wards.length === 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="h-1 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500" />
          <div className="py-16 text-center text-sm text-gray-400">🛏️ No wards configured.</div>
        </div>
      )}
      {!loading && wards.map((w) => {
        const bs = w.beds || [];
        const occ = bs.filter((b) => b.status === "occupied").length;
        const pct = bs.length > 0 ? Math.round((occ / bs.length) * 100) : 0;
        return (
          <div key={w.id} className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="h-1 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500" />
            <div className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{w.name}</h2>
                  <div className="text-xs text-gray-500">{w.wardType || "-"}{w.floor ? " · " + w.floor : ""} · {bs.length} beds · {occ} occupied ({pct}%)</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-48 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-700">{pct}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-6 lg:grid-cols-8">
                {bs.map((b) => {
                  const th = STATUS_THEME[b.status] || { wrap: "bg-slate-50 border-slate-200 text-slate-600", dot: "bg-slate-400" };
                  const inAdm = activeAdm.find((a) => a.wardId === w.id && a.bedNumber === b.bedNumber);
                  return (
                    <div key={b.id} className={`rounded-lg border p-2 transition hover:-translate-y-0.5 hover:shadow ${th.wrap}`}>
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold">{b.bedNumber}</div>
                        <span className={`h-1.5 w-1.5 rounded-full ${th.dot}`} />
                      </div>
                      <div className="text-[10px] uppercase opacity-80">{b.status}</div>
                      {b.patientName && <div className="mt-1 truncate text-[10px] font-semibold">{b.patientName}</div>}
                      {!b.patientName && inAdm?.patientName && <div className="mt-1 truncate text-[10px] font-semibold">{inAdm.patientName}</div>}
                      {b.bedType && <div className="text-[10px] opacity-60">{b.bedType}</div>}
                    </div>
                  );
                })}
                {bs.length === 0 && <div className="col-span-full py-8 text-center text-xs text-gray-400">No beds</div>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatTile({ label, value, tone, unit }: { label: string; value: number; tone: "slate" | "amber" | "rose" | "emerald" | "indigo" | "cyan"; unit?: string }) {
  const t: Record<string, string> = {
    slate: "from-slate-50 to-slate-100 text-slate-700 ring-slate-200",
    amber: "from-amber-50 to-orange-100 text-amber-700 ring-amber-200",
    rose: "from-rose-50 to-pink-100 text-rose-700 ring-rose-200",
    emerald: "from-emerald-50 to-teal-100 text-emerald-700 ring-emerald-200",
    indigo: "from-indigo-50 to-blue-100 text-indigo-700 ring-indigo-200",
    cyan: "from-cyan-50 to-sky-100 text-cyan-700 ring-cyan-200",
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br p-4 ring-1 ${t[tone]}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}{unit || ""}</div>
    </div>
  );
}
