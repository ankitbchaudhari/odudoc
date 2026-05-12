"use client";

// Unified inventory CRUD across pharmacy / lab / biomedical / ward.

import { useCallback, useEffect, useState } from "react";
import DepartmentShell, { StatTile } from "@/components/DepartmentShell";
import StatusBadge from "@/components/StatusBadge";
import { tone } from "@/lib/clinical-tones";

type StockScope = "pharmacy" | "laboratory" | "biomedical" | "ward" | "general";

interface Item {
  id: string;
  scope: StockScope;
  sku: string;
  name: string;
  category?: string;
  unit?: string;
  qty: number;
  reorderAt?: number;
  expiry?: string;
  unitCost?: number;
  unitCurrency?: string;
  supplierName?: string;
}

interface Summary {
  total: number;
  lowStock: number;
  outOfStock: number;
  expiringSoon: number;
  expired: number;
  byScope: Record<StockScope, number>;
}

const SCOPES: StockScope[] = ["pharmacy", "laboratory", "biomedical", "ward", "general"];
const SCOPE_EMOJI: Record<StockScope, string> = {
  pharmacy: "💊", laboratory: "🧪", biomedical: "🧰", ward: "🛏️", general: "📦",
};

function statusOf(item: Item): "in_stock" | "low_stock" | "out_of_stock" | "expired" | "expiring_soon" {
  if (item.qty === 0) return "out_of_stock";
  if (item.expiry) {
    const t = Date.parse(item.expiry);
    if (Number.isFinite(t)) {
      const day = 24 * 60 * 60 * 1000;
      if (t < Date.now()) return "expired";
      if (t - Date.now() < 30 * day) return "expiring_soon";
    }
  }
  if (item.reorderAt && item.qty <= item.reorderAt) return "low_stock";
  return "in_stock";
}

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [scope, setScope] = useState<StockScope | "All">("All");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    scope: "pharmacy" as StockScope,
    sku: "",
    name: "",
    category: "",
    unit: "tablet",
    qty: "0",
    reorderAt: "10",
    expiry: "",
    unitCost: "",
    supplierName: "",
  });

  const load = useCallback(async () => {
    const sp = new URLSearchParams();
    if (scope !== "All") sp.set("scope", scope);
    if (search.trim()) sp.set("search", search.trim());
    const r = await fetch(`/api/emr/inventory?${sp}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setItems(d.items || []);
      setSummary(d.summary || null);
    }
  }, [scope, search]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/emr/inventory", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        qty: Number(form.qty),
        reorderAt: form.reorderAt ? Number(form.reorderAt) : undefined,
        unitCost: form.unitCost ? Number(form.unitCost) : undefined,
      }),
    });
    setForm({ ...form, sku: "", name: "", category: "", expiry: "" });
    setShowNew(false);
    await load();
    setBusy(false);
  };

  const adjust = async (id: string, delta: number) => {
    setBusy(true);
    await fetch(`/api/emr/inventory/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ adjustQty: delta }),
    });
    await load();
    setBusy(false);
  };

  return (
    <DepartmentShell
      eyebrow="Hospital · Inventory"
      glyph="📦"
      title="Inventory console"
      subtitle="Single SKU registry across pharmacy, lab, biomedical, and ward stocks."
      gradient="from-sky-600 via-indigo-600 to-violet-600"
      actions={
        <>
          <button onClick={() => setShowNew((v) => !v)} className="rounded-full bg-white dark:bg-slate-900 px-4 py-2 text-xs font-bold text-indigo-700 shadow-md transition hover:-translate-y-0.5">
            + New SKU
          </button>
          <button onClick={load} className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/25">
            ↻ Refresh
          </button>
        </>
      }
    >
      {summary && (
        <>
          <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-5">
            <StatTile label="Total SKUs" value={summary.total} emoji="📦" tone="indigo" />
            <StatTile label="Low stock" value={summary.lowStock} emoji="⚠️" tone="amber" />
            <StatTile label="Out of stock" value={summary.outOfStock} emoji="✕" tone="rose" />
            <StatTile label="Expiring soon" value={summary.expiringSoon} emoji="⏱️" tone="amber" hint="< 30 days" />
            <StatTile label="Expired" value={summary.expired} emoji="❌" tone="rose" />
          </div>

          {/* Distribution bar across scopes — quick visual of where
              your inventory mass lives. */}
          {summary.total > 0 && (
            <div className="mb-6 rounded-2xl border border-white/60 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                SKU distribution by scope
              </p>
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                {SCOPES.map((s) => {
                  const pct = (summary.byScope[s] / summary.total) * 100;
                  if (pct === 0) return null;
                  const colors: Record<StockScope, string> = {
                    pharmacy: "bg-rose-400",
                    laboratory: "bg-emerald-400",
                    biomedical: "bg-amber-400",
                    ward: "bg-sky-400",
                    general: "bg-slate-400",
                  };
                  return (
                    <div
                      key={s}
                      className={`${colors[s]} transition-all`}
                      style={{ width: `${pct}%` }}
                      title={`${s}: ${summary.byScope[s]} (${pct.toFixed(0)}%)`}
                    />
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
                {SCOPES.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                    <span className={`inline-block h-2 w-2 rounded-full ${{
                      pharmacy: "bg-rose-400", laboratory: "bg-emerald-400",
                      biomedical: "bg-amber-400", ward: "bg-sky-400", general: "bg-slate-400",
                    }[s]}`} />
                    {SCOPE_EMOJI[s]} {s} <b className="text-slate-900 dark:text-slate-100">{summary.byScope[s]}</b>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Scope filter chips */}
      <div className="mb-3 flex flex-wrap gap-2">
        <button onClick={() => setScope("All")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${scope === "All" ? "bg-slate-900 text-white" : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"}`}>All</button>
        {SCOPES.map((s) => (
          <button key={s} onClick={() => setScope(s)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${scope === s ? "bg-slate-900 text-white" : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300"}`}>
            {SCOPE_EMOJI[s]} {s}{summary ? ` · ${summary.byScope[s]}` : ""}
          </button>
        ))}
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by SKU / name…" className="ml-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs" />
      </div>

      {showNew && (
        <form onSubmit={submit} className="mb-6 rounded-3xl border border-white/60 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Add new SKU</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Sel label="Scope" value={form.scope} onChange={(v) => setForm({ ...form, scope: v as StockScope })}>
              {SCOPES.map((s) => <option key={s} value={s}>{SCOPE_EMOJI[s]} {s}</option>)}
            </Sel>
            <Inp label="SKU" required value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} placeholder="MED-PARA-500" />
            <Inp label="Name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Paracetamol 500mg" />
            <Inp label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="Antibiotic / Reagent / Disposable" />
            <Inp label="Unit" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} placeholder="tablet / kit / pcs" />
            <Inp label="Qty" type="number" value={form.qty} onChange={(v) => setForm({ ...form, qty: v })} />
            <Inp label="Reorder at" type="number" value={form.reorderAt} onChange={(v) => setForm({ ...form, reorderAt: v })} />
            <Inp label="Expiry" type="date" value={form.expiry} onChange={(v) => setForm({ ...form, expiry: v })} />
            <Inp label="Unit cost" type="number" value={form.unitCost} onChange={(v) => setForm({ ...form, unitCost: v })} />
            <Inp label="Supplier" value={form.supplierName} onChange={(v) => setForm({ ...form, supplierName: v })} />
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={busy} className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 disabled:opacity-50">
              {busy ? "Saving…" : "Add SKU"}
            </button>
            <button type="button" onClick={() => setShowNew(false)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300">Cancel</button>
          </div>
        </form>
      )}

      <section className="rounded-3xl border border-white/60 bg-white dark:bg-slate-900 p-2 shadow-sm">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center">
            <span className="text-4xl">📦</span>
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">No items in this filter</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Add your first SKU above to start tracking stock.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr className="border-b border-slate-100">
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Scope</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Expiry</th>
                <th className="px-3 py-2 text-right">Adjust</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const status = statusOf(it);
                const T = tone(status);
                return (
                  <tr key={it.id} className={`border-b border-slate-50 ${T.row}`}>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{it.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{it.sku}{it.category ? ` · ${it.category}` : ""}</p>
                    </td>
                    <td className="px-3 py-2 text-xs">{SCOPE_EMOJI[it.scope]} {it.scope}</td>
                    <td className="px-3 py-2 text-right font-semibold">{it.qty}<span className="ml-1 text-[10px] text-slate-500 dark:text-slate-400">{it.unit || ""}</span></td>
                    <td className="px-3 py-2"><StatusBadge status={status} /></td>
                    <td className="px-3 py-2 text-xs">{it.expiry || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <Btn onClick={() => adjust(it.id, -1)} tone="ghost">−1</Btn>
                        <Btn onClick={() => adjust(it.id, +1)}>+1</Btn>
                        <Btn onClick={() => adjust(it.id, +10)}>+10</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </DepartmentShell>
  );
}

function Inp({ label, value, onChange, required, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{label}{required && <span className="ml-0.5 text-rose-500">*</span>}</span>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm" />
    </label>
  );
}
function Sel({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm">{children}</select>
    </label>
  );
}
function Btn({ onClick, children, tone = "primary" }: { onClick: () => void; children: React.ReactNode; tone?: "primary" | "ghost" }) {
  const cls = tone === "primary"
    ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-sm hover:-translate-y-0.5"
    : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800";
  return <button onClick={onClick} className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${cls}`}>{children}</button>;
}
