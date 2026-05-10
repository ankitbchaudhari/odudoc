"use client";

// Pharmacy operations console.
//
// Admin / pharmacist picks the pharmacy, sees incoming orders,
// transitions them through the fulfillment stages.

import { useCallback, useEffect, useState } from "react";

interface PharmacyMeta { pharmacyId: string; pharmacyName: string; city?: string; pincode?: string; itemCount: number }
interface OrderLine { drugName: string; brand?: string; strength?: string; quantity: number; pricedRupees: number; mrpRupees: number }
interface FulfillmentOrder {
  id: string; patientUserId: string; patientName: string; patientPhone?: string;
  deliveryAddress: string;
  pharmacyId: string; pharmacyName: string;
  lines: OrderLine[];
  subtotalRupees: number; deliveryFeeRupees: number; totalRupees: number;
  marketplaceFeePct: number; pharmacyNetRupees: number;
  status: string; events: Array<{ at: string; status: string; note?: string }>;
  estimatedDeliveryHours: number; paymentStatus: string;
  createdAt: string;
}

const NEXT_BUTTON: Record<string, { label: string; to: string; tone: string } | null> = {
  placed: { label: "Accept", to: "accepted", tone: "bg-emerald-600" },
  accepted: { label: "Mark packed", to: "packed", tone: "bg-indigo-600" },
  packed: { label: "Out for delivery", to: "out_for_delivery", tone: "bg-violet-600" },
  out_for_delivery: { label: "Mark delivered", to: "delivered", tone: "bg-emerald-600" },
  delivered: null,
  cancelled: null,
  rejected: null,
};

const STATUS_PILL: Record<string, string> = {
  placed: "bg-amber-100 text-amber-800",
  accepted: "bg-sky-100 text-sky-800",
  packed: "bg-indigo-100 text-indigo-800",
  out_for_delivery: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-600",
  rejected: "bg-rose-100 text-rose-800",
};

function fmtINR(n: number) { return `₹${Math.round(n).toLocaleString("en-IN")}`; }

export default function PharmacyOpsPage() {
  const [pharmacies, setPharmacies] = useState<PharmacyMeta[]>([]);
  const [pharmacyId, setPharmacyId] = useState<string>("");
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const loadPharmacies = useCallback(async () => {
    const r = await fetch("/api/rx-fulfillment/stock", { cache: "no-store" });
    if (r.ok) {
      const list = (await r.json()).pharmacies || [];
      setPharmacies(list);
      if (list.length > 0 && !pharmacyId) setPharmacyId(list[0].pharmacyId);
    }
  }, [pharmacyId]);

  const loadOrders = useCallback(async () => {
    if (!pharmacyId) return;
    const r = await fetch(`/api/rx-fulfillment/orders?view=pharmacy&pharmacyId=${pharmacyId}`, { cache: "no-store" });
    if (r.ok) setOrders((await r.json()).orders || []);
  }, [pharmacyId]);

  useEffect(() => { loadPharmacies(); }, [loadPharmacies]);
  useEffect(() => { loadOrders(); const t = setInterval(loadOrders, 15000); return () => clearInterval(t); }, [loadOrders]);

  const transition = async (id: string, to: string, note?: string) => {
    const r = await fetch(`/api/rx-fulfillment/orders/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, note }),
    });
    if (r.ok) { setToast({ kind: "ok", text: `Updated to ${to.replace("_", " ")}.` }); await loadOrders(); }
    else { setToast({ kind: "err", text: "Update failed." }); }
  };

  const reject = async (id: string) => {
    const note = window.prompt("Reason for rejection?", "out of stock");
    if (note === null) return;
    await transition(id, "rejected", note);
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

      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pharmacy Operations</h2>
          <p className="mt-1 text-sm text-gray-500">Incoming Rx fulfillment orders. Accept, pack, dispatch, and mark delivered.</p>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pharmacy</label>
          <select value={pharmacyId} onChange={(e) => setPharmacyId(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {pharmacies.map((p) => <option key={p.pharmacyId} value={p.pharmacyId}>{p.pharmacyName} ({p.itemCount} SKUs)</option>)}
          </select>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mb-5 grid gap-3 sm:grid-cols-5">
        <Kpi label="Placed" v={orderCount("placed")} accent="amber" />
        <Kpi label="Accepted" v={orderCount("accepted")} accent="sky" />
        <Kpi label="Packed" v={orderCount("packed")} accent="indigo" />
        <Kpi label="Out for delivery" v={orderCount("out_for_delivery")} accent="violet" />
        <Kpi label="Delivered" v={orderCount("delivered")} accent="emerald" />
      </div>

      {orders.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-400">No orders for this pharmacy.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const next = NEXT_BUTTON[o.status];
            return (
              <li key={o.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-[240px]">
                    <p className="font-bold text-slate-900">{o.patientName} <span className="text-[11px] text-slate-500 font-mono">{o.patientPhone || ""}</span></p>
                    <p className="mt-0.5 text-xs text-slate-500">Placed {new Date(o.createdAt).toLocaleString()} · ETA {o.estimatedDeliveryHours}h</p>
                    <p className="mt-1 text-xs text-slate-700"><strong>Address:</strong> {o.deliveryAddress}</p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${STATUS_PILL[o.status]}`}>{o.status.replace("_", " ")}</span>
                    <p className="mt-1 text-lg font-bold text-slate-900">{fmtINR(o.totalRupees)}</p>
                    <p className="text-[10px] text-slate-500">After fee: {fmtINR(o.pharmacyNetRupees)}</p>
                  </div>
                </div>
                <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
                  {o.lines.map((l, i) => (
                    <li key={i} className="flex justify-between rounded-md bg-slate-50 px-2 py-1">
                      <span className="text-slate-700"><strong>{l.drugName}</strong>{l.strength ? ` ${l.strength}` : ""}{l.brand ? ` (${l.brand})` : ""} × {l.quantity}</span>
                      <span className="font-mono font-semibold text-slate-700">{fmtINR(l.pricedRupees)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  {next && (
                    <button onClick={() => transition(o.id, next.to)} className={`rounded-md ${next.tone} px-3 py-1.5 text-xs font-bold text-white`}>{next.label}</button>
                  )}
                  {o.status === "placed" && (
                    <button onClick={() => reject(o.id)} className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600">Reject</button>
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
