"use client";

import { useEffect, useState } from "react";

interface Bed { id: string; bedNumber: string; status: string; wardId: string; patientId?: string; patientName?: string; bedType?: string; }
interface Ward { id: string; name: string; wardType?: string; floor?: string; beds: Bed[]; }
interface Admission { id: string; patientId?: string; patientName?: string; wardId?: string; bedNumber?: string; status: string; admissionDate?: string; }

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
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Bed Census</h1><p className="text-sm text-slate-500">Real-time occupancy across all wards{updatedAt ? ` · updated ${updatedAt}` : ""} · auto-refreshes every 60s</p></div>
        <button onClick={load} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white">Refresh</button>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
        <StatTile label="Total beds" value={totals.total} tone="slate" />
        <StatTile label="Occupied" value={totals.occupied} tone="rose" />
        <StatTile label="Free" value={totals.free} tone="emerald" />
        <StatTile label="Cleaning" value={totals.cleaning} tone="amber" />
        <StatTile label="Blocked" value={totals.blocked} tone="slate" />
        <StatTile label="Occupancy %" value={occPct} tone="indigo" unit="%" />
      </div>
      {loading && <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">Loading bed census...</div>}
      {!loading && wards.length === 0 && <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">No wards configured.</div>}
      {!loading && wards.map((w) => {
        const bs = w.beds || [];
        const occ = bs.filter((b) => b.status === "occupied").length;
        const pct = bs.length > 0 ? Math.round((occ / bs.length) * 100) : 0;
        return (
          <div key={w.id} className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{w.name}</h2>
                <div className="text-xs text-slate-500">{w.wardType || "-"}{w.floor ? " · " + w.floor : ""} · {bs.length} beds · {occ} occupied ({pct}%)</div>
              </div>
              <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-rose-400" style={{ width: `${pct}%` }} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-6 lg:grid-cols-8">
              {bs.map((b) => {
                const cls = b.status === "occupied" ? "bg-rose-50 border-rose-200 text-rose-800" : b.status === "available" || b.status === "free" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : b.status === "cleaning" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-slate-50 border-slate-200 text-slate-600";
                const inAdm = activeAdm.find((a) => a.wardId === w.id && a.bedNumber === b.bedNumber);
                return (
                  <div key={b.id} className={`rounded-lg border p-2 ${cls}`}>
                    <div className="text-xs font-bold">{b.bedNumber}</div>
                    <div className="text-[10px] uppercase opacity-80">{b.status}</div>
                    {b.patientName && <div className="truncate text-[10px] font-semibold mt-1">{b.patientName}</div>}
                    {!b.patientName && inAdm?.patientName && <div className="truncate text-[10px] font-semibold mt-1">{inAdm.patientName}</div>}
                    {b.bedType && <div className="text-[10px] opacity-60">{b.bedType}</div>}
                  </div>
                );
              })}
              {bs.length === 0 && <div className="col-span-full p-4 text-center text-xs text-slate-400">No beds</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatTile({ label, value, tone, unit }: { label: string; value: number; tone: "slate" | "amber" | "rose" | "emerald" | "indigo"; unit?: string }) {
  const t: Record<string, string> = { slate: "bg-slate-50 text-slate-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700", indigo: "bg-indigo-50 text-indigo-700" };
  return <div className={`rounded-xl p-4 ${t[tone]}`}><div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div><div className="mt-1 text-2xl font-bold">{value}{unit || ""}</div></div>;
}
