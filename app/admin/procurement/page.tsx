"use client";

// Procurement console — three tabs.
//
//   1. Stock — SKU registry + edit reorder rules
//   2. Scanner — preview which SKUs are below reorder; fire scanner
//   3. POs — purchase order queue with state transitions

import { useCallback, useEffect, useState } from "react";
import { PageHero } from "@/components/admin/PageShell";

type SkuCategory = "drug" | "consumable" | "device" | "reagent" | "linen" | "office";
type StockUnit = "strip" | "bottle" | "vial" | "pack" | "box" | "piece" | "kg" | "litre";

interface Sku {
  id: string; genericName: string; brand?: string; category: SkuCategory; unit: StockUnit;
  packSize?: number; strength?: string; form?: string;
  stock: number; reorderLevel: number; reorderQty: number;
  leadTimeDays: number; preferredVendorName?: string;
  paused?: boolean; avgDailyBurn?: number; unitCostRupees?: number;
  lastReorderAt?: string;
}
interface ScanCandidate {
  sku: Sku;
  reason: "below_reorder" | "low_cover" | "skipped_cooldown" | "skipped_paused" | "skipped_no_vendor";
  daysOfCover?: number;
}
interface PoLine {
  skuId: string; genericName: string; brand?: string; unit: string;
  orderedQty: number; receivedQty?: number; unitCostRupees?: number; reason?: string;
}
interface Po {
  id: string; vendorName: string; source: "auto" | "manual"; status: string;
  lines: PoLine[]; subtotalRupees: number; notes?: string;
  events: Array<{ at: string; status: string; actorEmail?: string; note?: string }>;
  expectedAt?: string; receivedAt?: string;
  vendorReference?: string; grnReference?: string;
  createdAt: string;
}

const CATEGORIES: SkuCategory[] = ["drug", "consumable", "device", "reagent", "linen", "office"];
const UNITS: StockUnit[] = ["strip", "bottle", "vial", "pack", "box", "piece", "kg", "litre"];
const STATUS_PILL: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800",
  submitted: "bg-sky-100 text-sky-800",
  acknowledged: "bg-indigo-100 text-indigo-800",
  received: "bg-emerald-100 text-emerald-800",
  closed: "bg-emerald-200 text-emerald-900",
  cancelled: "bg-slate-200 text-slate-600",
  rejected: "bg-rose-100 text-rose-800",
};
const NEXT_BUTTON: Record<string, { label: string; to: string; tone: string } | null> = {
  draft: { label: "Submit to vendor", to: "submitted", tone: "bg-sky-600" },
  submitted: { label: "Vendor acknowledged", to: "acknowledged", tone: "bg-indigo-600" },
  acknowledged: { label: "Mark received", to: "received", tone: "bg-emerald-600" },
  received: { label: "Close PO", to: "closed", tone: "bg-emerald-700" },
  closed: null, cancelled: null, rejected: null,
};
const REASON_TONE: Record<string, string> = {
  below_reorder: "bg-rose-50 border-rose-200 text-rose-900",
  low_cover: "bg-amber-50 border-amber-200 text-amber-900",
  skipped_cooldown: "bg-slate-50 border-slate-200 text-slate-600",
  skipped_paused: "bg-slate-50 border-slate-200 text-slate-500",
  skipped_no_vendor: "bg-amber-50 border-amber-200 text-amber-700",
};
const REASON_LABEL: Record<string, string> = {
  below_reorder: "Below reorder level",
  low_cover: "Lead-time risk",
  skipped_cooldown: "Skipped — cooldown",
  skipped_paused: "Skipped — paused",
  skipped_no_vendor: "Missing vendor",
};

function fmtINR(n?: number): string { return n ? `₹${Math.round(n).toLocaleString("en-IN")}` : "—"; }

export default function ProcurementPage() {
  const [tab, setTab] = useState<"stock" | "scanner" | "pos">("scanner");
  const [skus, setSkus] = useState<Sku[]>([]);
  const [pos, setPos] = useState<Po[]>([]);
  const [scanReport, setScanReport] = useState<{ candidates: ScanCandidate[]; draftedPos: Po[]; scannedAt: string } | null>(null);
  const [showSku, setShowSku] = useState(false);
  const [skuForm, setSkuForm] = useState<{ genericName: string; brand: string; category: SkuCategory; unit: StockUnit; stock: string; reorderLevel: string; reorderQty: string; leadTimeDays: string; preferredVendorName: string; avgDailyBurn: string; unitCostRupees: string }>({
    genericName: "", brand: "", category: "drug", unit: "strip", stock: "0", reorderLevel: "20", reorderQty: "100", leadTimeDays: "3", preferredVendorName: "", avgDailyBurn: "", unitCostRupees: "",
  });
  const [activePo, setActivePo] = useState<Po | null>(null);
  const [recvForm, setRecvForm] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const [r1, r2] = await Promise.all([
      fetch("/api/procurement/skus", { cache: "no-store" }),
      fetch("/api/procurement/pos", { cache: "no-store" }),
    ]);
    if (r1.ok) setSkus((await r1.json()).skus || []);
    if (r2.ok) setPos((await r2.json()).pos || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const seed = async () => {
    const r = await fetch("/api/procurement/skus", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "seed" }) });
    if (r.ok) { const d = await r.json(); setToast({ kind: "ok", text: `Seeded ${d.inserted} demo SKUs.` }); await load(); }
  };

  const addSku = async () => {
    if (!skuForm.genericName.trim()) return;
    const r = await fetch("/api/procurement/skus", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...skuForm,
        stock: Number(skuForm.stock),
        reorderLevel: Number(skuForm.reorderLevel),
        reorderQty: Number(skuForm.reorderQty),
        leadTimeDays: Number(skuForm.leadTimeDays),
        avgDailyBurn: skuForm.avgDailyBurn ? Number(skuForm.avgDailyBurn) : undefined,
        unitCostRupees: skuForm.unitCostRupees ? Number(skuForm.unitCostRupees) : undefined,
      }),
    });
    if (r.ok) { setShowSku(false); setSkuForm({ ...skuForm, genericName: "", brand: "" }); await load(); setToast({ kind: "ok", text: "SKU added." }); }
  };

  const togglePause = async (sku: Sku) => {
    const r = await fetch("/api/procurement/skus", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: sku.id, genericName: sku.genericName, category: sku.category, unit: sku.unit,
        reorderLevel: sku.reorderLevel, reorderQty: sku.reorderQty, leadTimeDays: sku.leadTimeDays,
        paused: !sku.paused,
      }),
    });
    if (r.ok) { setToast({ kind: "ok", text: sku.paused ? "SKU resumed." : "SKU paused." }); await load(); }
  };

  const runScan = async (dryRun: boolean) => {
    const r = await fetch("/api/procurement/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dryRun }) });
    if (r.ok) {
      const d = await r.json();
      setScanReport(d);
      setToast({ kind: "ok", text: dryRun ? `Preview: ${d.candidates.length} candidate${d.candidates.length === 1 ? "" : "s"}` : `Scanner ran. ${d.draftedPos.length} PO${d.draftedPos.length === 1 ? "" : "s"} drafted.` });
      await load();
    }
  };

  const transitionPo = async (id: string, to: string, extra: Record<string, unknown> = {}) => {
    const r = await fetch(`/api/procurement/pos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to, ...extra }) });
    if (r.ok) { setToast({ kind: "ok", text: `Moved to ${to.replace("_", " ")}.` }); await load(); setActivePo(null); }
    else { setToast({ kind: "err", text: "Transition failed." }); }
  };

  const acknowledge = async (po: Po) => {
    const ref = window.prompt("Vendor reference / invoice number?");
    if (!ref) return;
    await transitionPo(po.id, "acknowledged", { vendorReference: ref });
  };
  const receive = async (po: Po) => {
    const grn = window.prompt("GRN reference number?", "");
    const recv: Record<string, number> = {};
    for (const l of po.lines) {
      const v = recvForm[`${po.id}:${l.skuId}`];
      recv[l.skuId] = v ? Number(v) : l.orderedQty;
    }
    await transitionPo(po.id, "received", { grnReference: grn || undefined, receivedQty: recv });
  };
  const submit = async (po: Po) => transitionPo(po.id, "submitted");
  const close = async (po: Po) => transitionPo(po.id, "closed");
  const cancel = async (po: Po) => {
    const note = window.prompt("Cancel reason?", "");
    await transitionPo(po.id, "cancelled", { note });
  };

  const lowStock = skus.filter((s) => s.stock <= s.reorderLevel && !s.paused);
  const totalStockValue = skus.reduce((a, s) => a + (s.unitCostRupees || 0) * s.stock, 0);
  const openPoValue = pos.filter((p) => ["draft", "submitted", "acknowledged"].includes(p.status)).reduce((a, p) => a + p.subtotalRupees, 0);
  const draftCount = pos.filter((p) => p.status === "draft").length;
  const incomingCount = pos.filter((p) => ["submitted", "acknowledged"].includes(p.status)).length;

  return (
    <div>
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-6">
        <PageHero
          icon="📦"
          eyebrow="Supply Chain"
          title="Procurement"
          subtitle="SKU registry + auto-reorder scanner + purchase-order queue. Stock crosses reorder level → PO drafts → vendor acknowledges → goods received → stock auto-incremented."
          tone="amber"
        />
      </div>

      {/* KPIs */}
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Kpi label="SKUs tracked" v={skus.length} />
        <Kpi label="Below reorder" v={lowStock.length} accent="rose" />
        <Kpi label="Open POs" v={incomingCount + draftCount} accent="indigo" />
        <Kpi label="Inventory value" vText={fmtINR(totalStockValue)} />
      </div>

      <div className="mb-5 flex gap-1 rounded-lg bg-slate-100 p-1">
        {(["scanner", "stock", "pos"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 text-sm font-semibold capitalize ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>{t}{t === "pos" ? ` (${pos.length})` : ""}</button>
        ))}
      </div>

      {/* ── SCANNER ──────────────────────────────────────── */}
      {tab === "scanner" && (
        <section className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-900">Auto-reorder scanner</p>
                <p className="text-xs text-slate-500">Walks the SKU catalogue, drafts a PO per vendor for everything at-or-below reorder. Cooldown: 24h per SKU.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => runScan(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700">Preview (dry-run)</button>
                <button onClick={() => runScan(false)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-bold text-white">Run scanner</button>
              </div>
            </div>
            {scanReport && (
              <p className="mt-2 text-[11px] text-slate-500">Last run {new Date(scanReport.scannedAt).toLocaleString()} · {scanReport.candidates.length} candidate(s) · {scanReport.draftedPos.length} PO(s) drafted</p>
            )}
          </div>

          {scanReport && scanReport.candidates.length > 0 && (
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="mb-3 text-sm font-bold text-slate-900">Candidates ({scanReport.candidates.length})</p>
              <ul className="space-y-2">
                {scanReport.candidates.map((c, i) => (
                  <li key={i} className={`rounded-lg border-l-4 p-2 text-xs ${REASON_TONE[c.reason]}`}>
                    <div className="flex items-center justify-between">
                      <span><strong>{c.sku.genericName}</strong>{c.sku.brand ? ` (${c.sku.brand})` : ""} · stock {c.sku.stock}/{c.sku.reorderLevel}</span>
                      <span className="rounded-full bg-white px-2 py-0.5 font-semibold ring-1 ring-current/20">{REASON_LABEL[c.reason]}</span>
                    </div>
                    {c.daysOfCover !== undefined && isFinite(c.daysOfCover) && (
                      <p className="mt-0.5">{c.daysOfCover.toFixed(1)} days of cover at current burn</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {scanReport && scanReport.draftedPos.length > 0 && (
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="mb-3 text-sm font-bold text-slate-900">POs drafted</p>
              <ul className="space-y-2">
                {scanReport.draftedPos.map((p) => (
                  <li key={p.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <p className="font-semibold text-slate-900">{p.vendorName} · {p.lines.length} line{p.lines.length === 1 ? "" : "s"} · {fmtINR(p.subtotalRupees)}</p>
                    <p className="text-[10px] text-slate-500">Auto-drafted {new Date(p.createdAt).toLocaleTimeString()} · expected {p.expectedAt ? new Date(p.expectedAt).toLocaleDateString() : "—"}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ── STOCK ──────────────────────────────────────── */}
      {tab === "stock" && (
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">SKU registry ({skus.length})</p>
            <div className="flex gap-2">
              {skus.length === 0 && <button onClick={seed} className="rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600">Seed demo</button>}
              <button onClick={() => setShowSku(true)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">+ Add SKU</button>
            </div>
          </div>
          {skus.length === 0 ? (
            <p className="text-sm text-slate-400">No SKUs yet. Use &ldquo;Seed demo&rdquo; for ten realistic hospital items.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="p-2 text-left">Item</th>
                  <th className="p-2 text-right">Stock</th>
                  <th className="p-2 text-right">Reorder</th>
                  <th className="p-2 text-right">Lead</th>
                  <th className="p-2 text-left">Vendor</th>
                  <th className="p-2 text-right">Cost</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {skus.map((s) => {
                  const low = s.stock <= s.reorderLevel;
                  return (
                    <tr key={s.id} className={`border-b border-slate-100 ${low ? "bg-rose-50/30" : ""} ${s.paused ? "opacity-50" : ""}`}>
                      <td className="p-2">
                        <p className="font-semibold text-slate-900">{s.genericName}{s.strength ? ` ${s.strength}` : ""}</p>
                        <p className="text-[10px] text-slate-500">{s.brand || s.category} · {s.unit}{s.packSize ? `/${s.packSize}` : ""}</p>
                      </td>
                      <td className={`p-2 text-right font-mono ${low ? "font-bold text-rose-700" : "text-slate-700"}`}>{s.stock}</td>
                      <td className="p-2 text-right font-mono text-slate-500">{s.reorderLevel}</td>
                      <td className="p-2 text-right text-slate-500">{s.leadTimeDays}d</td>
                      <td className="p-2 text-slate-600">{s.preferredVendorName || "—"}</td>
                      <td className="p-2 text-right font-mono text-slate-500">{fmtINR(s.unitCostRupees)}</td>
                      <td className="p-2 text-right">
                        <button onClick={() => togglePause(s)} className="text-[10px] font-semibold text-indigo-600 hover:underline">{s.paused ? "Resume" : "Pause"}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* ── POS ──────────────────────────────────────── */}
      {tab === "pos" && (
        <section className="space-y-3">
          {pos.length === 0 ? (
            <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm">No purchase orders yet. Run the scanner to draft some.</p>
          ) : pos.map((p) => {
            const next = NEXT_BUTTON[p.status];
            return (
              <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{p.vendorName} <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">{p.source}</span></p>
                    <p className="mt-0.5 text-xs text-slate-500">Created {new Date(p.createdAt).toLocaleString()} · {p.lines.length} line{p.lines.length === 1 ? "" : "s"}{p.expectedAt ? ` · expected ${new Date(p.expectedAt).toLocaleDateString()}` : ""}</p>
                    {p.vendorReference && <p className="text-[11px] text-slate-500">Vendor ref: <span className="font-mono">{p.vendorReference}</span></p>}
                    {p.grnReference && <p className="text-[11px] text-slate-500">GRN: <span className="font-mono">{p.grnReference}</span></p>}
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${STATUS_PILL[p.status]}`}>{p.status.replace("_", " ")}</span>
                    <p className="mt-1 text-lg font-bold text-slate-900">{fmtINR(p.subtotalRupees)}</p>
                  </div>
                </div>
                <table className="mt-3 w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="p-1 text-left">Item</th>
                      <th className="p-1 text-right">Ordered</th>
                      <th className="p-1 text-right">{p.status === "received" || p.status === "closed" ? "Received" : "Cost"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.lines.map((l, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="p-1">{l.genericName}{l.brand ? ` · ${l.brand}` : ""}</td>
                        <td className="p-1 text-right font-mono">{l.orderedQty} {l.unit}</td>
                        <td className="p-1 text-right">
                          {p.status === "acknowledged" ? (
                            <input type="number" placeholder={String(l.orderedQty)} value={recvForm[`${p.id}:${l.skuId}`] || ""} onChange={(e) => setRecvForm({ ...recvForm, [`${p.id}:${l.skuId}`]: e.target.value })} className="w-16 rounded border border-slate-300 px-1 text-right" />
                          ) : p.status === "received" || p.status === "closed" ? (
                            <span className="font-mono">{l.receivedQty} {l.unit}</span>
                          ) : (
                            <span className="font-mono text-slate-500">{fmtINR(l.unitCostRupees)}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {p.status === "draft" && <>
                    <button onClick={() => submit(p)} className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-bold text-white">Submit to vendor</button>
                    <button onClick={() => cancel(p)} className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600">Cancel</button>
                  </>}
                  {p.status === "submitted" && <>
                    <button onClick={() => acknowledge(p)} className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">Vendor acknowledged</button>
                    <button onClick={() => transitionPo(p.id, "rejected", { note: window.prompt("Reject reason?") || undefined })} className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600">Vendor rejected</button>
                    <button onClick={() => cancel(p)} className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600">Cancel</button>
                  </>}
                  {p.status === "acknowledged" && <>
                    <button onClick={() => receive(p)} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Mark received</button>
                  </>}
                  {p.status === "received" && (
                    <button onClick={() => close(p)} className={`rounded-md ${next?.tone || "bg-emerald-700"} px-3 py-1.5 text-xs font-bold text-white`}>Close PO</button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {showSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowSku(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Add SKU</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input className="form-input sm:col-span-2" placeholder="Generic name" value={skuForm.genericName} onChange={(e) => setSkuForm({ ...skuForm, genericName: e.target.value })} />
              <input className="form-input" placeholder="Brand" value={skuForm.brand} onChange={(e) => setSkuForm({ ...skuForm, brand: e.target.value })} />
              <select className="form-input" value={skuForm.category} onChange={(e) => setSkuForm({ ...skuForm, category: e.target.value as SkuCategory })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="form-input" value={skuForm.unit} onChange={(e) => setSkuForm({ ...skuForm, unit: e.target.value as StockUnit })}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <input className="form-input" placeholder="Stock now" value={skuForm.stock} onChange={(e) => setSkuForm({ ...skuForm, stock: e.target.value })} />
              <input className="form-input" placeholder="Reorder level" value={skuForm.reorderLevel} onChange={(e) => setSkuForm({ ...skuForm, reorderLevel: e.target.value })} />
              <input className="form-input" placeholder="Reorder qty" value={skuForm.reorderQty} onChange={(e) => setSkuForm({ ...skuForm, reorderQty: e.target.value })} />
              <input className="form-input" placeholder="Lead time (days)" value={skuForm.leadTimeDays} onChange={(e) => setSkuForm({ ...skuForm, leadTimeDays: e.target.value })} />
              <input className="form-input sm:col-span-2" placeholder="Preferred vendor name" value={skuForm.preferredVendorName} onChange={(e) => setSkuForm({ ...skuForm, preferredVendorName: e.target.value })} />
              <input className="form-input" placeholder="Avg daily burn" value={skuForm.avgDailyBurn} onChange={(e) => setSkuForm({ ...skuForm, avgDailyBurn: e.target.value })} />
              <input className="form-input" placeholder="Unit cost ₹" value={skuForm.unitCostRupees} onChange={(e) => setSkuForm({ ...skuForm, unitCostRupees: e.target.value })} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowSku(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button onClick={addSku} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Add SKU</button>
            </div>
          </div>
        </div>
      )}

      {activePo && <span style={{ display: "none" }}>{activePo.id}</span>}

      <style jsx>{`
        :global(.form-input) {
          width: 100%; border-radius: 0.5rem; border: 1px solid #cbd5e1;
          background: #fff; padding: 0.45rem 0.7rem;
          font-size: 0.8125rem; color: #0f172a;
        }
        :global(.form-input:focus) {
          outline: none; border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99,102,241,0.2);
        }
      `}</style>
    </div>
  );
}

function Kpi({ label, v, vText, accent }: { label: string; v?: number; vText?: string; accent?: "rose" | "indigo" }) {
  const cls = accent === "rose" ? "text-rose-700" : accent === "indigo" ? "text-indigo-700" : "text-slate-900";
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${cls}`}>{vText ?? v ?? 0}</p>
    </div>
  );
}
