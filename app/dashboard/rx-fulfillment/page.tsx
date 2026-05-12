"use client";

// Patient pharmacy-fulfillment hub.
//
// Top: input rows for the Rx (drug + qty), or paste preset.
// Middle: ranked pharmacy offers with coverage / total / ETA / discount.
// Bottom: my recent fulfillment orders with live status + tracker.

import { useCallback, useEffect, useState } from "react";

interface MatchedLine {
  drugName: string; quantity: number; strength?: string; form?: string;
  inStock: boolean; pricedRupees?: number; mrpRupees?: number;
  brand?: string; packSize?: number; stockId?: string; prescriptionRequired?: boolean;
}
interface PharmacyOffer {
  pharmacyId: string; pharmacyName: string; city?: string; pincode?: string;
  lines: MatchedLine[]; coveragePct: number;
  totalRupees: number; totalMrpRupees: number; savingsRupees: number;
  deliveryEtaHours: number; prescriptionRequired: boolean;
  effectiveDiscountPct: number; score: number; samePincode: boolean;
}
interface OrderEvent { at: string; status: string; note?: string }
interface FulfillmentOrder {
  id: string; pharmacyId: string; pharmacyName: string;
  deliveryAddress: string;
  lines: Array<{ drugName: string; brand?: string; strength?: string; quantity: number; pricedRupees: number; mrpRupees: number }>;
  subtotalRupees: number; deliveryFeeRupees: number; totalRupees: number;
  status: string; events: OrderEvent[];
  estimatedDeliveryHours: number; paymentStatus: string;
  createdAt: string; updatedAt: string;
}

const STATUS_PILL: Record<string, string> = {
  placed: "bg-amber-100 text-amber-800",
  accepted: "bg-sky-100 text-sky-800",
  packed: "bg-indigo-100 text-indigo-800",
  out_for_delivery: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-600 dark:text-slate-300",
  rejected: "bg-rose-100 text-rose-800",
};
const STATUS_LABEL: Record<string, string> = {
  placed: "Placed", accepted: "Accepted", packed: "Packed",
  out_for_delivery: "Out for delivery", delivered: "Delivered",
  cancelled: "Cancelled", rejected: "Rejected",
};
const STAGES = ["placed", "accepted", "packed", "out_for_delivery", "delivered"];

function fmtINR(n: number) { return `₹${Math.round(n).toLocaleString("en-IN")}`; }

export default function RxFulfillmentPage() {
  const [drugRows, setDrugRows] = useState<Array<{ drugName: string; strength: string; quantity: string }>>([
    { drugName: "Atorvastatin", strength: "20mg", quantity: "1" },
    { drugName: "Metformin", strength: "500mg", quantity: "2" },
    { drugName: "Pantoprazole", strength: "40mg", quantity: "1" },
  ]);
  const [pincode, setPincode] = useState("500033");
  const [includePartial, setIncludePartial] = useState(false);
  const [offers, setOffers] = useState<PharmacyOffer[]>([]);
  const [searching, setSearching] = useState(false);
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [orderingFrom, setOrderingFrom] = useState<PharmacyOffer | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState("Flat 401, Block C, Jubilee Heights, Hyderabad 500033");
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const loadOrders = useCallback(async () => {
    const r = await fetch("/api/rx-fulfillment/orders", { cache: "no-store" });
    if (r.ok) setOrders((await r.json()).orders || []);
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const search = async () => {
    setSearching(true);
    setOffers([]);
    try {
      const rx = drugRows
        .filter((d) => d.drugName.trim() && d.quantity.trim())
        .map((d) => ({
          drugName: d.drugName.trim(),
          strength: d.strength.trim() || undefined,
          quantity: Number(d.quantity) || 1,
        }));
      if (rx.length === 0) { setToast({ kind: "err", text: "Add at least one drug." }); return; }
      const r = await fetch("/api/rx-fulfillment/match", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rx, patientPincode: pincode || undefined, includePartial }),
      });
      if (r.ok) setOffers((await r.json()).offers || []);
      else setToast({ kind: "err", text: "Search failed." });
    } finally { setSearching(false); }
  };

  const seed = async () => {
    const r = await fetch("/api/rx-fulfillment/stock", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed_demo" }),
    });
    if (r.ok) {
      const d = await r.json();
      setToast({ kind: "ok", text: `Seeded ${d.inserted} stock items across ${d.pharmacies.length} pharmac${d.pharmacies.length === 1 ? "y" : "ies"}.` });
    }
  };

  const placeOrder = async () => {
    if (!orderingFrom) return;
    const r = await fetch("/api/rx-fulfillment/orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pharmacyId: orderingFrom.pharmacyId,
        pharmacyName: orderingFrom.pharmacyName,
        deliveryAddress,
        estimatedDeliveryHours: orderingFrom.deliveryEtaHours,
        deliveryFeeRupees: orderingFrom.totalRupees > 500 ? 0 : 39,
        lines: orderingFrom.lines.filter((l) => l.inStock).map((l) => ({
          drugName: l.drugName,
          brand: l.brand,
          strength: l.strength,
          form: l.form,
          packSize: l.packSize,
          quantity: l.quantity,
          mrpRupees: l.mrpRupees || 0,
          pricedRupees: l.pricedRupees || 0,
          stockId: l.stockId,
        })),
      }),
    });
    if (r.ok) {
      setToast({ kind: "ok", text: `Order placed with ${orderingFrom.pharmacyName}.` });
      setOrderingFrom(null);
      setOffers([]);
      await loadOrders();
    } else {
      setToast({ kind: "err", text: "Order failed." });
    }
  };

  const cancelOrder = async (id: string) => {
    if (!confirm("Cancel this order?")) return;
    const r = await fetch(`/api/rx-fulfillment/orders/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "cancelled", note: "patient_cancelled" }),
    });
    if (r.ok) { setToast({ kind: "ok", text: "Cancelled." }); await loadOrders(); }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Pharmacy Fulfillment</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Get your prescription delivered. Type your drugs, see which pharmacies have everything in stock, compare prices and delivery time, place an order in one click.
          </p>
        </div>
        <button onClick={seed} className="rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Seed demo data</button>
      </div>

      {/* ── Search ───────────────────────────────────────────── */}
      <section className="mb-6 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm">
        <p className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">Your prescription</p>
        <ul className="space-y-2">
          {drugRows.map((d, i) => (
            <li key={i} className="grid gap-2 sm:grid-cols-[2fr_1fr_80px_auto]">
              <input className="form-input" placeholder="Drug (generic or brand)" value={d.drugName} onChange={(e) => setDrugRows(drugRows.map((x, j) => j === i ? { ...x, drugName: e.target.value } : x))} />
              <input className="form-input" placeholder="Strength e.g. 500mg" value={d.strength} onChange={(e) => setDrugRows(drugRows.map((x, j) => j === i ? { ...x, strength: e.target.value } : x))} />
              <input className="form-input" placeholder="Qty" value={d.quantity} onChange={(e) => setDrugRows(drugRows.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} />
              <button onClick={() => setDrugRows(drugRows.filter((_, j) => j !== i))} className="rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600">Remove</button>
            </li>
          ))}
        </ul>
        <button onClick={() => setDrugRows([...drugRows, { drugName: "", strength: "", quantity: "1" }])} className="mt-2 text-xs font-semibold text-indigo-600">+ Add drug</button>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input className="form-input" placeholder="Delivery pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} />
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={includePartial} onChange={(e) => setIncludePartial(e.target.checked)} />
            Include partial-coverage pharmacies
          </label>
          <button onClick={search} disabled={searching} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {searching ? "Searching…" : "Find pharmacies"}
          </button>
        </div>
      </section>

      {/* ── Offers ───────────────────────────────────────────── */}
      {offers.length > 0 && (
        <section className="mb-6">
          <p className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">{offers.length} pharmac{offers.length === 1 ? "y" : "ies"} matched</p>
          <ul className="space-y-3">
            {offers.map((o, i) => (
              <li key={o.pharmacyId} className={`rounded-2xl border-2 p-4 shadow-sm ${i === 0 ? "border-emerald-300 bg-emerald-50/30" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-[240px]">
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      {o.pharmacyName}
                      {i === 0 && <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Best match</span>}
                      {o.samePincode && <span className="ml-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-700">Same pincode</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{o.city || "—"}{o.pincode ? ` · ${o.pincode}` : ""}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5">Coverage {o.coveragePct}%</span>
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-emerald-800">{o.effectiveDiscountPct}% off</span>
                      <span className="rounded-md bg-sky-100 px-2 py-0.5 text-sky-800">{o.deliveryEtaHours}h delivery</span>
                      {o.prescriptionRequired && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-800">Rx required</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{fmtINR(o.totalRupees)}</p>
                    {o.savingsRupees > 0 && <p className="text-xs text-emerald-700">Save {fmtINR(o.savingsRupees)} vs MRP</p>}
                    <button onClick={() => setOrderingFrom(o)} className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Order →</button>
                  </div>
                </div>
                <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {o.lines.map((l, j) => (
                    <div key={j} className={`rounded-md px-2 py-1 text-xs ${l.inStock ? "bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800" : "bg-rose-50 ring-1 ring-rose-200"}`}>
                      <div className="flex items-center justify-between">
                        <span className={l.inStock ? "text-slate-800 dark:text-slate-200" : "text-rose-700"}>
                          {l.inStock ? "✓" : "✗"} <strong>{l.drugName}</strong>{l.strength ? ` ${l.strength}` : ""} × {l.quantity}
                          {l.brand && <span className="ml-1 text-slate-500 dark:text-slate-400">({l.brand})</span>}
                        </span>
                        {l.inStock && l.pricedRupees !== undefined && (
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{fmtINR(l.pricedRupees)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── My orders ─────────────────────────────────────────── */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm">
        <p className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">My pharmacy orders</p>
        {orders.length === 0 ? (
          <p className="rounded-lg bg-slate-50 dark:bg-slate-900 p-4 text-sm text-slate-500 dark:text-slate-400">No orders yet. Search for your prescription above and place your first order.</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{o.pharmacyName}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Placed {new Date(o.createdAt).toLocaleString()} · ETA {o.estimatedDeliveryHours}h</p>
                    <div className="mt-2 flex items-center gap-1">
                      {STAGES.map((s, i) => {
                        const reached = STAGES.indexOf(o.status) >= i || ["delivered"].includes(o.status);
                        const done = STAGES.indexOf(o.status) > i || o.status === "delivered";
                        const cancelled = o.status === "cancelled" || o.status === "rejected";
                        return (
                          <div key={s} className="flex flex-1 items-center gap-1">
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${cancelled ? "bg-slate-200 text-slate-500 dark:text-slate-400" : done ? "bg-emerald-500 text-white" : reached ? "bg-indigo-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                              {done || (reached && o.status === s) ? "✓" : i + 1}
                            </span>
                            {i < STAGES.length - 1 && <div className={`h-0.5 flex-1 ${cancelled ? "bg-slate-200" : done ? "bg-emerald-300" : "bg-slate-200"}`} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${STATUS_PILL[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{fmtINR(o.totalRupees)}</p>
                    {(o.status === "placed" || o.status === "accepted") && (
                      <button onClick={() => cancelOrder(o.id)} className="mt-1 text-[11px] font-semibold text-rose-600">Cancel</button>
                    )}
                  </div>
                </div>
                <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
                  {o.lines.map((l, j) => (
                    <li key={j} className="flex justify-between rounded-md bg-slate-50 dark:bg-slate-900 px-2 py-1">
                      <span className="text-slate-700 dark:text-slate-300">{l.drugName}{l.strength ? ` ${l.strength}` : ""}{l.brand ? ` (${l.brand})` : ""} × {l.quantity}</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{fmtINR(l.pricedRupees)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Order confirm dialog */}
      {orderingFrom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOrderingFrom(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Confirm order</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{orderingFrom.pharmacyName} · ETA {orderingFrom.deliveryEtaHours}h</p>
            <ul className="mt-3 space-y-1 text-sm">
              {orderingFrom.lines.filter((l) => l.inStock).map((l, i) => (
                <li key={i} className="flex justify-between border-b border-slate-100 py-1">
                  <span>{l.drugName}{l.strength ? ` ${l.strength}` : ""}{l.brand ? ` (${l.brand})` : ""} × {l.quantity}</span>
                  <span className="font-mono font-semibold">{fmtINR(l.pricedRupees || 0)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">Subtotal</span><span className="font-mono">{fmtINR(orderingFrom.totalRupees)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">Delivery fee</span><span className="font-mono">{orderingFrom.totalRupees > 500 ? "FREE" : fmtINR(39)}</span></div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1 text-base font-bold"><span>Total</span><span className="font-mono">{fmtINR(orderingFrom.totalRupees + (orderingFrom.totalRupees > 500 ? 0 : 39))}</span></div>
            </div>
            <p className="mt-3 mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Delivery address</p>
            <textarea rows={2} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOrderingFrom(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Cancel</button>
              <button onClick={placeOrder} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Place order</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(.form-input) {
          width: 100%; border-radius: 0.5rem; border: 1px solid #cbd5e1;
          background: #fff; padding: 0.5rem 0.75rem;
          font-size: 0.875rem; color: #0f172a;
        }
        :global(.form-input:focus) {
          outline: none; border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99,102,241,0.2);
        }
      `}</style>
    </div>
  );
}
