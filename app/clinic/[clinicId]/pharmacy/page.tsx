"use client";

// /clinic/[clinicId]/pharmacy
// Stock list (managers can add/edit), quick-dispense form for
// receptionists, low-stock callout.

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface StockItem {
  id: string;
  name: string;
  generic?: string;
  strength?: string;
  form?: string;
  unit: string;
  quantityOnHand: number;
  reorderLevel?: number;
  unitPriceRupees: number;
  expiryDate?: string;
  batchNumber?: string;
  active: boolean;
}

interface DashboardStaff {
  role: "receptionist" | "assistant" | "manager";
}

export default function ClinicPharmacyPage() {
  const params = useParams<{ clinicId: string }>();
  const router = useRouter();
  const clinicId = params.clinicId;
  const [items, setItems] = useState<StockItem[]>([]);
  const [lowStock, setLowStock] = useState<StockItem[]>([]);
  const [staff, setStaff] = useState<DashboardStaff | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [dispenseFor, setDispenseFor] = useState<StockItem | null>(null);

  const load = useCallback(async () => {
    const [pRes, dRes] = await Promise.all([
      fetch("/api/clinic/pharmacy", { cache: "no-store" }),
      fetch("/api/clinic/dashboard", { cache: "no-store" }),
    ]);
    if (pRes.status === 401) {
      router.replace(`/clinic/${clinicId}/login`);
      return;
    }
    const p = await pRes.json();
    const d = await dRes.json().catch(() => ({}));
    setItems(p.items || []);
    setLowStock(p.lowStock || []);
    setStaff(d.staff || null);
    setLoading(false);
  }, [clinicId, router]);
  useEffect(() => { load(); }, [load]);

  const isManager = staff?.role === "manager";

  return (
    <main className="relative mx-auto max-w-5xl px-4 py-8">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-emerald-400/25 via-teal-400/25 to-sky-300/25 blur-3xl dark:from-emerald-600/25 dark:via-teal-600/25 dark:to-sky-500/15" />
      </div>

      <Link href={`/clinic/${clinicId}/dashboard`} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 hover:text-indigo-600 transition">
        ← Dashboard
      </Link>

      <header className="mb-6 overflow-hidden rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg shadow-emerald-500/5">
        <div className="relative bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-600 px-6 py-6 text-white">
          <div className="relative flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">In-house pharmacy</p>
              <h1 className="mt-1 text-2xl font-bold">Stock + dispense</h1>
              <p className="mt-1 max-w-xl text-sm text-white/80">
                Keep medicines on premises. Dispense at checkout — patient walks out with the prescription filled.
              </p>
            </div>
            {isManager && (
              <button
                onClick={() => { setEditing(null); setShowAdd(true); }}
                className="shrink-0 rounded-xl bg-white/15 backdrop-blur-sm px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/25 transition"
              >
                + Add stock item
              </button>
            )}
          </div>
        </div>
      </header>

      {lowStock.length > 0 && (
        <div className="mb-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            ⚠️ {lowStock.length} item{lowStock.length === 1 ? "" : "s"} at or below reorder level
          </p>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
            {lowStock.map((i) => i.name).join(" · ")}
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 bg-emerald-50/40 dark:bg-emerald-950/20 p-10 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-2xl text-white shadow-lg shadow-emerald-500/30">💊</span>
          <p className="mt-3 text-base font-semibold text-gray-900 dark:text-slate-100">No stock yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-gray-500 dark:text-slate-400">
            {isManager ? "Add the medicines you keep at reception so receptionists can dispense at checkout." : "Your manager hasn't added any stock items. Ask them to upgrade you or load the inventory."}
          </p>
          {isManager && (
            <button onClick={() => setShowAdd(true)} className="mt-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30">
              + Add first item
            </button>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((it) => {
            const low = it.reorderLevel !== undefined && it.quantityOnHand <= it.reorderLevel;
            return (
              <li key={it.id} className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{it.name}</p>
                      {it.strength && <span className="text-xs text-gray-500 dark:text-slate-400">{it.strength}</span>}
                      {low && (
                        <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">low</span>
                      )}
                    </div>
                    {it.generic && <p className="text-[11px] text-gray-500 dark:text-slate-400">{it.generic}</p>}
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      {it.form && <span>{it.form} · </span>}
                      <span className="font-medium text-gray-900 dark:text-slate-100">{it.quantityOnHand}</span> {it.unit} on hand · ₹{it.unitPriceRupees}/{it.unit}
                    </p>
                    {it.expiryDate && (
                      <p className="text-[11px] text-gray-400 dark:text-slate-500">Exp {it.expiryDate}{it.batchNumber ? ` · batch ${it.batchNumber}` : ""}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <button
                      disabled={it.quantityOnHand === 0}
                      onClick={() => setDispenseFor(it)}
                      className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Dispense
                    </button>
                    {isManager && (
                      <button onClick={() => { setEditing(it); setShowAdd(true); }} className="text-[11px] text-indigo-600 dark:text-indigo-300 hover:underline">
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showAdd && (
        <StockForm item={editing} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />
      )}
      {dispenseFor && (
        <DispenseForm item={dispenseFor} onClose={() => setDispenseFor(null)} onSaved={() => { setDispenseFor(null); load(); }} />
      )}
    </main>
  );
}

const inputBase =
  "w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition";

function StockForm({ item, onClose, onSaved }: { item: StockItem | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name || "");
  const [generic, setGeneric] = useState(item?.generic || "");
  const [strength, setStrength] = useState(item?.strength || "");
  const [form, setForm] = useState(item?.form || "Tablet");
  const [unit, setUnit] = useState(item?.unit || "tablet");
  const [qty, setQty] = useState(String(item?.quantityOnHand ?? 0));
  const [reorder, setReorder] = useState(String(item?.reorderLevel ?? ""));
  const [price, setPrice] = useState(String(item?.unitPriceRupees ?? ""));
  const [expiry, setExpiry] = useState(item?.expiryDate || "");
  const [batch, setBatch] = useState(item?.batchNumber || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const body = {
        name,
        generic: generic || undefined,
        strength: strength || undefined,
        form: form || undefined,
        unit,
        quantityOnHand: Number(qty) || 0,
        reorderLevel: reorder === "" ? undefined : Number(reorder),
        unitPriceRupees: Number(price) || 0,
        expiryDate: expiry || undefined,
        batchNumber: batch || undefined,
      };
      const r = item
        ? await fetch(`/api/clinic/pharmacy/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/clinic/pharmacy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Failed to save"); return; }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-t-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <header className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 px-6 py-4 text-white">
          <h2 className="text-lg font-bold">{item ? "Edit stock item" : "Add stock item"}</h2>
        </header>
        <form onSubmit={submit} className="grid gap-3 px-6 py-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Name *</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputBase} placeholder="Crocin" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Generic</span>
            <input value={generic} onChange={(e) => setGeneric(e.target.value)} className={inputBase} placeholder="Paracetamol" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Strength</span>
            <input value={strength} onChange={(e) => setStrength(e.target.value)} className={inputBase} placeholder="500 mg" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Form</span>
            <select value={form} onChange={(e) => setForm(e.target.value)} className={inputBase}>
              {["Tablet", "Capsule", "Syrup", "Injection", "Ointment", "Drops", "Inhaler", "Other"].map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Unit *</span>
            <input required value={unit} onChange={(e) => setUnit(e.target.value)} className={inputBase} placeholder="tablet" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Quantity on hand *</span>
            <input required type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} className={inputBase} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Reorder alert level</span>
            <input type="number" min={0} value={reorder} onChange={(e) => setReorder(e.target.value)} className={inputBase} placeholder="20" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Price per unit (₹) *</span>
            <input required type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={inputBase} placeholder="2.50" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Expiry date</span>
            <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={inputBase} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Batch number</span>
            <input value={batch} onChange={(e) => setBatch(e.target.value)} className={inputBase} placeholder="B23A015" />
          </label>
          {err && <p className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-300 sm:col-span-2">{err}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">Cancel</button>
            <button disabled={busy} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 disabled:opacity-50">
              {busy ? "Saving…" : item ? "Save changes" : "Add item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DispenseForm({ item, onClose, onSaved }: { item: StockItem; onClose: () => void; onSaved: () => void }) {
  const [patientName, setPN] = useState("");
  const [patientPhone, setPP] = useState("");
  const [qty, setQty] = useState("1");
  const [bookingId, setBI] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const total = (Number(qty) || 0) * item.unitPriceRupees;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/clinic/pharmacy/dispense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockItemId: item.id,
          patientName,
          patientPhone: patientPhone || undefined,
          quantity: Number(qty) || 1,
          bookingId: bookingId || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Failed"); return; }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <header className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 px-6 py-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">Dispense</p>
          <h2 className="text-lg font-bold">{item.name} {item.strength}</h2>
          <p className="text-xs text-white/80">{item.quantityOnHand} {item.unit}(s) on hand · ₹{item.unitPriceRupees}/{item.unit}</p>
        </header>
        <form onSubmit={submit} className="grid gap-3 px-6 py-5">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Patient name *</span>
            <input required value={patientName} onChange={(e) => setPN(e.target.value)} className={inputBase} placeholder="Riya Sharma" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Patient phone</span>
            <input type="tel" value={patientPhone} onChange={(e) => setPP(e.target.value)} className={inputBase} placeholder="+91 98XXXXXXXX" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Quantity *</span>
            <input required type="number" min={1} max={item.quantityOnHand} value={qty} onChange={(e) => setQty(e.target.value)} className={inputBase} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Booking ID (optional)</span>
            <input value={bookingId} onChange={(e) => setBI(e.target.value)} className={inputBase} placeholder="BK-1234" />
          </label>
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/40 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Total</p>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">₹{total.toFixed(2)}</p>
          </div>
          {err && <p className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">{err}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">Cancel</button>
            <button disabled={busy} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 disabled:opacity-50">
              {busy ? "Dispensing…" : "Dispense →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
