"use client";

// Lab orders queue with full status flow + result entry.

import { useCallback, useEffect, useState } from "react";
import DepartmentShell, { StatTile } from "@/components/DepartmentShell";
import StatusBadge from "@/components/StatusBadge";

type Status = "pending" | "collected" | "in_progress" | "ready" | "delivered" | "rejected" | "cancelled";

interface Order {
  id: string;
  patientName: string;
  patientId: string;
  testName: string;
  panel?: string;
  status: Status;
  resultValue?: string;
  refRange?: string;
  abnormal?: boolean;
  reportedAt?: string;
  reportedBy?: string;
  orderedBy: string;
  createdAt: string;
}

const TABS: Status[] = ["pending", "collected", "in_progress", "ready", "delivered"];

export default function LaboratoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<Status | "All">("pending");
  const [busy, setBusy] = useState(false);
  const [resultFor, setResultFor] = useState<string | null>(null);
  const [resultForm, setResultForm] = useState({ resultValue: "", refRange: "", abnormal: false });
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ patientId: "", patientName: "", testName: "", panel: "", notes: "" });

  const load = useCallback(async () => {
    const sp = new URLSearchParams();
    if (tab !== "All") sp.set("status", tab);
    const r = await fetch(`/api/emr/lab-orders?${sp}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setOrders(d.orders || []);
    }
  }, [tab]);
  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);

  const flip = async (id: string, status: Status) => {
    setBusy(true);
    await fetch(`/api/emr/lab-orders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load(); setBusy(false);
  };

  const submitResult = async () => {
    if (!resultFor) return;
    setBusy(true);
    await fetch(`/api/emr/lab-orders/${resultFor}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "ready", ...resultForm }),
    });
    setResultFor(null);
    setResultForm({ resultValue: "", refRange: "", abnormal: false });
    await load(); setBusy(false);
  };

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    await fetch("/api/emr/lab-orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ patientId: "", patientName: "", testName: "", panel: "", notes: "" });
    setShowNew(false);
    await load(); setBusy(false);
  };

  const counts: Record<Status, number> = {
    pending: 0, collected: 0, in_progress: 0, ready: 0, delivered: 0, rejected: 0, cancelled: 0,
  };
  for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1;

  return (
    <DepartmentShell
      eyebrow="Hospital · Laboratory"
      glyph="🧪"
      title="Laboratory console"
      subtitle="Sample collection queue, result entry, abnormal flags, turnaround tracking."
      gradient="from-emerald-600 via-teal-600 to-cyan-600"
      actions={
        <>
          <button onClick={() => setShowNew((v) => !v)} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-emerald-700 shadow-md hover:-translate-y-0.5">+ Order test</button>
          <button onClick={load} className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/25">↻ Refresh</button>
        </>
      }
    >
      <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile label="Pending" value={counts.pending} emoji="⏳" tone="amber" />
        <StatTile label="In progress" value={counts.in_progress + counts.collected} emoji="⚙️" tone="sky" />
        <StatTile label="Ready" value={counts.ready} emoji="✓" tone="emerald" />
        <StatTile label="Delivered today" value={counts.delivered} emoji="📦" tone="teal" />
      </div>

      {showNew && (
        <form onSubmit={submitNew} className="mb-6 rounded-3xl border border-white/60 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Order a test</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Inp label="Patient ID" required value={form.patientId} onChange={(v) => setForm({ ...form, patientId: v })} />
            <Inp label="Patient name" required value={form.patientName} onChange={(v) => setForm({ ...form, patientName: v })} />
            <Inp label="Test" required value={form.testName} onChange={(v) => setForm({ ...form, testName: v })} placeholder="CBC / HbA1c / LFT" />
            <Inp label="Panel" value={form.panel} onChange={(v) => setForm({ ...form, panel: v })} placeholder="Lipid profile" />
            <div className="sm:col-span-2"><Inp label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} /></div>
          </div>
          <button type="submit" disabled={busy} className="mt-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:-translate-y-0.5 disabled:opacity-50">
            {busy ? "Saving…" : "Order test"}
          </button>
        </form>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {(["All", ...TABS] as Array<Status | "All">).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tab === t ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}>
            {t === "All" ? "All" : t.replace("_", " ")}
          </button>
        ))}
      </div>

      <section className="space-y-2">
        {orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-12 text-center shadow-sm">
            <span className="text-4xl">🧫</span>
            <p className="mt-3 text-sm font-semibold text-slate-900">No orders in this filter</p>
          </div>
        ) : orders.map((o) => (
          <article key={o.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{o.patientName}</p>
                  <StatusBadge status={o.status} />
                  {o.abnormal && <StatusBadge status="abnormal" />}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {o.testName}{o.panel ? ` · ${o.panel}` : ""} · ordered by {o.orderedBy}
                </p>
                {o.resultValue && (
                  <p className="mt-1 text-sm">
                    <span className="font-semibold text-slate-900">Result: {o.resultValue}</span>
                    {o.refRange && <span className="ml-2 text-xs text-slate-500">(ref: {o.refRange})</span>}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {o.status === "pending" && (
                  <>
                    <Btn onClick={() => flip(o.id, "collected")}>Mark collected</Btn>
                    <Btn onClick={() => flip(o.id, "rejected")} tone="ghost">Reject</Btn>
                  </>
                )}
                {o.status === "collected" && (
                  <Btn onClick={() => flip(o.id, "in_progress")}>Start running</Btn>
                )}
                {o.status === "in_progress" && (
                  <Btn onClick={() => setResultFor(o.id)}>Enter result</Btn>
                )}
                {o.status === "ready" && (
                  <Btn onClick={() => flip(o.id, "delivered")}>Deliver</Btn>
                )}
              </div>
            </div>
            {resultFor === o.id && (
              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <Inp label="Result value" value={resultForm.resultValue} onChange={(v) => setResultForm({ ...resultForm, resultValue: v })} placeholder="e.g. 7.8 mmol/L" />
                  <Inp label="Reference range" value={resultForm.refRange} onChange={(v) => setResultForm({ ...resultForm, refRange: v })} placeholder="3.9–7.1" />
                  <label className="flex items-end gap-2 text-sm">
                    <input type="checkbox" checked={resultForm.abnormal} onChange={(e) => setResultForm({ ...resultForm, abnormal: e.target.checked })} />
                    <span>Mark abnormal</span>
                  </label>
                </div>
                <div className="mt-2 flex gap-2">
                  <Btn onClick={submitResult}>Save & mark ready</Btn>
                  <Btn onClick={() => setResultFor(null)} tone="ghost">Cancel</Btn>
                </div>
              </div>
            )}
          </article>
        ))}
      </section>
    </DepartmentShell>
  );
}

function Inp(p: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">{p.label}{p.required && <span className="ml-0.5 text-rose-500">*</span>}</span>
      <input type={p.type || "text"} required={p.required} value={p.value} onChange={(e) => p.onChange(e.target.value)} placeholder={p.placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
    </label>
  );
}
function Btn({ onClick, children, tone = "primary" }: { onClick: () => void; children: React.ReactNode; tone?: "primary" | "ghost" }) {
  const cls = tone === "primary"
    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm hover:-translate-y-0.5"
    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
  return <button onClick={onClick} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${cls}`}>{children}</button>;
}
