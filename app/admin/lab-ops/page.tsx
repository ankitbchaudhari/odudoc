"use client";

// Lab operations console — diagnostic chain admin works through here.
// KPI strip + lab picker + incoming orders queue with state-transition
// buttons + bulk seed for demos.

import { useCallback, useEffect, useState } from "react";

interface LabMeta { labId: string; labName: string; city?: string; pincode?: string; testCount: number }
interface OrderLine { testCode: string; testName?: string; pricedRupees: number; mrpRupees: number; resultText?: string; resultUrl?: string }
interface LabOrder {
  id: string; patientUserId: string; patientName: string; patientPhone?: string;
  fulfilment: "home_collection" | "in_lab"; address?: string; scheduledFor?: string;
  labId: string; labName: string;
  source: string; doctorName?: string;
  lines: OrderLine[];
  subtotalRupees: number; collectionFeeRupees: number; totalRupees: number;
  marketplaceFeePct: number; labNetRupees: number;
  status: string; events: Array<{ at: string; status: string; note?: string }>;
  paymentStatus: string; reportUrl?: string;
  createdAt: string;
}

const NEXT_BUTTON: Record<string, { label: string; to: string; tone: string } | null> = {
  placed: { label: "Confirm", to: "confirmed", tone: "bg-sky-600" },
  confirmed: { label: "Sample collected", to: "sample_collected", tone: "bg-indigo-600" },
  sample_collected: { label: "Mark in-lab", to: "in_lab", tone: "bg-violet-600" },
  in_lab: { label: "Upload report", to: "reported", tone: "bg-emerald-600" },
  reported: { label: "Close order", to: "closed", tone: "bg-emerald-700" },
  closed: null, cancelled: null,
};
const STATUS_PILL: Record<string, string> = {
  placed: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  sample_collected: "bg-indigo-100 text-indigo-800",
  in_lab: "bg-violet-100 text-violet-800",
  reported: "bg-emerald-100 text-emerald-800",
  closed: "bg-emerald-200 text-emerald-900",
  cancelled: "bg-slate-200 text-slate-600",
};

function fmtINR(n: number): string { return `₹${Math.round(n).toLocaleString("en-IN")}`; }

export default function LabOpsPage() {
  const [labs, setLabs] = useState<LabMeta[]>([]);
  const [labId, setLabId] = useState("");
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const loadLabs = useCallback(async () => {
    const r = await fetch("/api/lab-marketplace/catalog", { cache: "no-store" });
    if (r.ok) {
      const list = (await r.json()).labs || [];
      setLabs(list);
      if (list.length > 0 && !labId) setLabId(list[0].labId);
    }
  }, [labId]);

  const loadOrders = useCallback(async () => {
    if (!labId) return;
    const r = await fetch(`/api/lab-marketplace/orders?view=lab&labId=${labId}`, { cache: "no-store" });
    if (r.ok) setOrders((await r.json()).orders || []);
  }, [labId]);

  useEffect(() => { loadLabs(); }, [loadLabs]);
  useEffect(() => { loadOrders(); const t = setInterval(loadOrders, 15000); return () => clearInterval(t); }, [loadOrders]);

  const seed = async () => {
    const r = await fetch("/api/lab-marketplace/catalog", { method: "POST" });
    if (r.ok) { setToast({ kind: "ok", text: "Seeded demo labs." }); await loadLabs(); }
  };

  const transition = async (id: string, to: string, extra: Record<string, unknown> = {}) => {
    const r = await fetch(`/api/lab-marketplace/orders/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, ...extra }),
    });
    if (r.ok) { setToast({ kind: "ok", text: `→ ${to.replace("_", " ")}.` }); await loadOrders(); }
    else { setToast({ kind: "err", text: "Action failed." }); }
  };

  const reportFor = async (po: LabOrder) => {
    const reportUrl = window.prompt("Paste report PDF/URL (optional):", "") || undefined;
    const results: Record<string, { resultText?: string }> = {};
    for (const ln of po.lines) {
      const v = window.prompt(`${ln.testName || ln.testCode} — result text (optional):`, "");
      if (v !== null) results[ln.testCode] = { resultText: v };
    }
    await transition(po.id, "reported", { reportUrl, results });
  };

  const orderCount = (status: string) => orders.filter((o) => o.status === status).length;

  return (
    <div>
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lab Operations</h2>
          <p className="mt-1 text-sm text-gray-500">Incoming lab orders. Confirm, collect samples, run, report.</p>
        </div>
        <div className="flex items-end gap-2">
          {labs.length === 0 && <button onClick={seed} className="rounded-md border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600">Seed demo</button>}
          {labs.length > 0 && (
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Lab</label>
              <select value={labId} onChange={(e) => setLabId(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                {labs.map((l) => <option key={l.labId} value={l.labId}>{l.labName} ({l.testCount} tests)</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="mb-5 grid gap-3 sm:grid-cols-5">
        <Kpi label="Placed" v={orderCount("placed")} accent="amber" />
        <Kpi label="Confirmed" v={orderCount("confirmed")} accent="sky" />
        <Kpi label="Sample collected" v={orderCount("sample_collected")} accent="indigo" />
        <Kpi label="In lab" v={orderCount("in_lab")} accent="violet" />
        <Kpi label="Reported" v={orderCount("reported")} accent="emerald" />
      </div>

      {orders.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm">No orders for this lab yet.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const next = NEXT_BUTTON[o.status];
            return (
              <li key={o.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-[240px]">
                    <p className="font-bold text-slate-900">{o.patientName} <span className="text-[11px] font-mono text-slate-500">{o.patientPhone || ""}</span></p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Placed {new Date(o.createdAt).toLocaleString()} · {o.fulfilment === "home_collection" ? "🏠 Home" : "🏥 In-lab"}
                      {o.doctorName ? ` · Dr ${o.doctorName}` : ""}
                    </p>
                    {o.fulfilment === "home_collection" && o.address && <p className="mt-1 text-[11px] text-slate-700"><strong>Address:</strong> {o.address}</p>}
                    {o.scheduledFor && <p className="text-[11px] text-slate-500"><strong>Slot:</strong> {new Date(o.scheduledFor).toLocaleString()}</p>}
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${STATUS_PILL[o.status]}`}>{o.status.replace("_", " ")}</span>
                    <p className="mt-1 text-lg font-bold text-slate-900">{fmtINR(o.totalRupees)}</p>
                    <p className="text-[10px] text-slate-500">After {o.marketplaceFeePct}% fee: {fmtINR(o.labNetRupees)}</p>
                  </div>
                </div>
                <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
                  {o.lines.map((l, i) => (
                    <li key={i} className="rounded-md bg-slate-50 px-2 py-1">
                      <div className="flex justify-between">
                        <span className="text-slate-700"><strong>{l.testName || l.testCode}</strong></span>
                        <span className="font-mono font-semibold text-slate-700">{fmtINR(l.pricedRupees)}</span>
                      </div>
                      {l.resultText && <p className="mt-0.5 text-[10px] text-emerald-700">Result: {l.resultText}</p>}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  {next && o.status !== "in_lab" && (
                    <button onClick={() => transition(o.id, next.to)} className={`rounded-md ${next.tone} px-3 py-1.5 text-xs font-bold text-white`}>{next.label}</button>
                  )}
                  {o.status === "in_lab" && (
                    <button onClick={() => reportFor(o)} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Upload report</button>
                  )}
                  {(o.status === "placed" || o.status === "confirmed") && (
                    <button onClick={() => transition(o.id, "cancelled", { note: window.prompt("Cancel reason?") || undefined })} className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600">Cancel</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Kpi({ label, v, accent }: { label: string; v: number; accent: "amber" | "sky" | "indigo" | "violet" | "emerald" }) {
  const cls = accent === "amber" ? "text-amber-700"
    : accent === "sky" ? "text-sky-700"
    : accent === "indigo" ? "text-indigo-700"
    : accent === "violet" ? "text-violet-700"
    : "text-emerald-700";
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${cls}`}>{v}</p>
    </div>
  );
}
