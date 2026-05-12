"use client";

import { useEffect, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";
import type {
  DrugItem, StockLot, StockMovement, ItemForm, StorageTemp, MovementType,
} from "@/lib/hospital/pharmacy-inventory-store";
// Inlined from pharmacy-inventory-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const FORM_LABEL: Record<ItemForm, string> = {
  tablet: "Tablet", capsule: "Capsule", syrup: "Syrup", injection: "Injection",
  infusion: "Infusion", cream: "Cream", ointment: "Ointment", drops: "Drops",
  inhaler: "Inhaler", patch: "Patch", suppository: "Suppository", powder: "Powder",
  device: "Device", other: "Other",
};
const MOVEMENT_LABEL: Record<MovementType, string> = {
  receive: "Received", dispense: "Dispensed", return: "Returned", adjust: "Adjusted",
  transfer_out: "Transferred out", transfer_in: "Transferred in", expire: "Expired", waste: "Wasted",
};

type EnrichedItem = DrugItem & { status: { onHand: number; expiringSoon: number; expired: number; lowStock: boolean } };

const FORMS: ItemForm[] = ["tablet","capsule","syrup","injection","infusion","cream","ointment","drops","inhaler","patch","suppository","powder","device","other"];
const STORAGES: StorageTemp[] = ["room","cool","refrigerated","frozen"];
const MOVE_TYPES: MovementType[] = ["receive","dispense","return","adjust","transfer_out","transfer_in","expire","waste"];

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

export default function PharmacyInventoryPage() {
  const [items, setItems] = useState<EnrichedItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lotsBy, setLotsBy] = useState<Record<string, StockLot[]>>({});
  const [movesBy, setMovesBy] = useState<Record<string, StockMovement[]>>({});
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItem, setEditItem] = useState<EnrichedItem | null>(null);
  const [addLotFor, setAddLotFor] = useState<EnrichedItem | null>(null);
  const [moveFor, setMoveFor] = useState<EnrichedItem | null>(null);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    const r = await fetch(`/api/hospital/pharmacy-inventory?${p.toString()}`, { cache: "no-store" });
    if (r.ok) { const d = await r.json(); setItems(d.items || []); setStats(d.stats); }
    setLoading(false);
  }

  async function loadDetail(itemId: string) {
    const [l, m] = await Promise.all([
      fetch(`/api/hospital/pharmacy-inventory/lots?itemId=${itemId}`, { cache: "no-store" }),
      fetch(`/api/hospital/pharmacy-inventory/movements?itemId=${itemId}&limit=50`, { cache: "no-store" }),
    ]);
    if (l.ok) { const d = await l.json(); setLotsBy((s) => ({ ...s, [itemId]: d.lots || [] })); }
    if (m.ok) { const d = await m.json(); setMovesBy((s) => ({ ...s, [itemId]: d.movements || [] })); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search]);

  async function saveItem(body: Partial<DrugItem>) {
    const method = body.id ? "PATCH" : "POST";
    const r = await fetch("/api/hospital/pharmacy-inventory", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); alert(d.error || "Failed"); return; }
    setShowItemForm(false); setEditItem(null); load();
  }

  async function saveLot(body: Partial<StockLot>) {
    const r = await fetch("/api/hospital/pharmacy-inventory/lots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); alert(d.error || "Failed"); return; }
    const itemId = body.itemId!;
    setAddLotFor(null); load(); loadDetail(itemId);
  }

  async function saveMovement(body: { itemId: string; lotId?: string; type: MovementType; quantity: number; reason?: string; performedBy?: string }) {
    const r = await fetch("/api/hospital/pharmacy-inventory/movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); alert(d.error || "Failed"); return; }
    setMoveFor(null); load(); loadDetail(body.itemId);
  }

  async function removeItem(id: string) {
    if (!confirm("Delete this SKU? Existing lots & movements are retained as history.")) return;
    await fetch("/api/hospital/pharmacy-inventory", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon="💊"
        eyebrow="Pharmacy"
        title="Pharmacy Inventory"
        subtitle="SKU master, batch lots, stock movements, low-stock & expiry tracking"
        tone="emerald"
        primaryAction={{ label: "+ Add SKU", onClick: () => { setEditItem(null); setShowItemForm(true); } }}
      />

      {stats && (
        <StatGrid cols={4}>
          <StatCard label="Active SKUs" value={stats.skus} tone="indigo" icon="📦" />
          <StatCard label="Controlled" value={stats.controlled} tone="violet" icon="🔒" />
          <StatCard label="Low stock" value={stats.lowStockCount} tone={stats.lowStockCount > 0 ? "amber" : "slate"} icon="📉" />
          <StatCard label="Out of stock" value={stats.outOfStock} tone={stats.outOfStock > 0 ? "rose" : "slate"} icon="❌" />
          <StatCard label="Expiring (30d)" value={stats.expiringSoonUnits} tone={stats.expiringSoonUnits > 0 ? "amber" : "slate"} icon="⏰" />
          <StatCard label="Expired units" value={stats.expiredUnits} tone={stats.expiredUnits > 0 ? "rose" : "slate"} icon="⚠️" />
          <StatCard label="Inventory value" value={stats.inventoryValue} tone="emerald" icon="💰" />
          <StatCard label="Movements today" value={stats.movementsToday} tone="sky" icon="🔄" />
        </StatGrid>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <input placeholder="Search generic, brand, SKU…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No items yet.</div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <ItemRow
              key={it.id}
              item={it}
              expanded={expanded === it.id}
              onToggle={() => {
                const nxt = expanded === it.id ? null : it.id;
                setExpanded(nxt);
                if (nxt) loadDetail(it.id);
              }}
              lots={lotsBy[it.id] || []}
              moves={movesBy[it.id] || []}
              onEdit={() => { setEditItem(it); setShowItemForm(true); }}
              onDelete={() => removeItem(it.id)}
              onAddLot={() => setAddLotFor(it)}
              onMove={() => setMoveFor(it)}
            />
          ))}
        </div>
      )}

      {showItemForm && <ItemFormModal item={editItem} onClose={() => { setShowItemForm(false); setEditItem(null); }} onSave={saveItem} />}
      {addLotFor && <LotFormModal item={addLotFor} onClose={() => setAddLotFor(null)} onSave={saveLot} />}
      {moveFor && <MovementModal item={moveFor} lots={lotsBy[moveFor.id] || []} onClose={() => setMoveFor(null)} onSave={saveMovement} />}
    </div>
  );
}

function Stat({ label, value, tone = "slate" }: { label: string; value: number | string; tone?: "slate" | "amber" | "rose" | "emerald" }) {
  const c = { slate: "text-slate-900", amber: "text-amber-700", rose: "text-rose-700", emerald: "text-emerald-700" }[tone];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-0.5 text-xl font-semibold ${c}`}>{value}</div>
    </div>
  );
}

function ItemRow({ item: it, expanded, onToggle, lots, moves, onEdit, onDelete, onAddLot, onMove }: {
  item: EnrichedItem; expanded: boolean; onToggle: () => void; lots: StockLot[]; moves: StockMovement[];
  onEdit: () => void; onDelete: () => void; onAddLot: () => void; onMove: () => void;
}) {
  const s = it.status;
  return (
    <div className={`rounded-lg border bg-white ${s.onHand === 0 ? "border-rose-200" : s.lowStock ? "border-amber-200" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-start gap-3 p-3">
        <div className="flex-1 min-w-[240px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">{FORM_LABEL[it.form]}</span>
            {it.isControlled && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Controlled {it.schedule || ""}</span>}
            {!it.isActive && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Inactive</span>}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.onHand === 0 ? "bg-rose-100 text-rose-700" : s.lowStock ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
              On hand {s.onHand}
            </span>
            {s.expired > 0 && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">Expired {s.expired}</span>}
            {s.expiringSoon > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Exp soon {s.expiringSoon}</span>}
          </div>
          <div className="mt-1 font-semibold text-slate-900">{it.genericName}{it.strength ? ` · ${it.strength}` : ""}</div>
          <div className="text-xs text-slate-500">{it.sku}{it.brandName ? ` · ${it.brandName}` : ""}{it.route ? ` · ${it.route}` : ""}{it.vendor ? ` · ${it.vendor}` : ""}</div>
          <div className="text-xs text-slate-500">Reorder at ≤ {it.reorderLevel} · PO qty {it.reorderQuantity}{it.unitCost != null ? ` · cost ${it.unitCost}` : ""}{it.unitPrice != null ? ` · price ${it.unitPrice}` : ""}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onAddLot} className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50">+ Receive lot</button>
          <button onClick={onMove} className="rounded-md border border-sky-300 bg-white px-2 py-1 text-xs text-sky-700 hover:bg-sky-50">Movement</button>
          <button onClick={onEdit} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Edit</button>
          <button onClick={onDelete} className="rounded-md border border-rose-300 bg-white px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">Delete</button>
          <button onClick={onToggle} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">{expanded ? "Hide" : "Lots & history"}</button>
        </div>
      </div>
      {expanded && (
        <div className="grid gap-3 border-t border-slate-100 bg-slate-50/50 dark:bg-slate-800/30 p-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lots ({lots.length})</div>
            <div className="mt-1 space-y-1">
              {lots.length === 0 && <div className="text-xs text-slate-500">No lots</div>}
              {lots.map((l) => {
                const now = new Date();
                const ex = new Date(l.expiryDate);
                const isExpired = ex < now;
                const soon = ex < new Date(now.getTime() + 30 * 86_400_000);
                return (
                  <div key={l.id} className={`rounded-md border bg-white px-2 py-1 text-xs ${isExpired ? "border-rose-200" : soon ? "border-amber-200" : "border-slate-200"}`}>
                    <span className="font-medium">#{l.lotNumber}</span> · qty {l.quantity} · exp {fmtDate(l.expiryDate)} {l.location ? `· ${l.location}` : ""}
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Movements ({moves.length})</div>
            <div className="mt-1 space-y-1 max-h-60 overflow-y-auto">
              {moves.length === 0 && <div className="text-xs text-slate-500">No movements</div>}
              {moves.map((m) => (
                <div key={m.id} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">
                  <span className="font-medium">{MOVEMENT_LABEL[m.type]}</span> · {m.quantity} · {fmtDate(m.at)}{m.performedBy ? ` · ${m.performedBy}` : ""}{m.reason ? ` · ${m.reason}` : ""}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemFormModal({ item, onClose, onSave }: { item: EnrichedItem | null; onClose: () => void; onSave: (b: Partial<DrugItem>) => void }) {
  const [form, setForm] = useState({
    sku: item?.sku || "", genericName: item?.genericName || "", brandName: item?.brandName || "",
    form: (item?.form || "tablet") as ItemForm, strength: item?.strength || "", route: item?.route || "",
    storage: (item?.storage || "room") as StorageTemp,
    reorderLevel: item?.reorderLevel?.toString() || "0", reorderQuantity: item?.reorderQuantity?.toString() || "0",
    unitCost: item?.unitCost?.toString() || "", unitPrice: item?.unitPrice?.toString() || "",
    vendor: item?.vendor || "", isControlled: item?.isControlled ?? false, schedule: item?.schedule || "",
    isActive: item?.isActive ?? true, notes: item?.notes || "",
  });
  function submit() {
    if (!form.sku || !form.genericName) { alert("SKU and generic name required"); return; }
    onSave({
      id: item?.id, sku: form.sku, genericName: form.genericName, brandName: form.brandName || undefined,
      form: form.form, strength: form.strength || undefined, route: form.route || undefined, storage: form.storage,
      reorderLevel: Number(form.reorderLevel) || 0, reorderQuantity: Number(form.reorderQuantity) || 0,
      unitCost: form.unitCost !== "" ? Number(form.unitCost) : undefined,
      unitPrice: form.unitPrice !== "" ? Number(form.unitPrice) : undefined,
      vendor: form.vendor || undefined, isControlled: form.isControlled, schedule: form.schedule || undefined,
      isActive: form.isActive, notes: form.notes || undefined,
    });
  }
  return (
    <Modal title={item ? `Edit ${item.id}` : "Add SKU"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="SKU"><input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Generic name"><input value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Brand"><input value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Form">
          <select value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value as ItemForm })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            {FORMS.map((f) => <option key={f} value={f}>{FORM_LABEL[f]}</option>)}
          </select>
        </Field>
        <Field label="Strength"><input value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Route"><input value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Storage">
          <select value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value as StorageTemp })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            {STORAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Vendor"><input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Reorder level"><input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Reorder qty"><input type="number" value={form.reorderQuantity} onChange={(e) => setForm({ ...form, reorderQuantity: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Unit cost"><input type="number" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Unit price"><input type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <label className="col-span-1 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isControlled} onChange={(e) => setForm({ ...form, isControlled: e.target.checked })} />Controlled substance</label>
        <Field label="Schedule (if controlled)"><input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="II, III, IV…" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <label className="col-span-1 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Active</label>
        <Field label="Notes" full><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
      </div>
      <ModalActions onClose={onClose} onSave={submit} />
    </Modal>
  );
}

function LotFormModal({ item, onClose, onSave }: { item: EnrichedItem; onClose: () => void; onSave: (b: Partial<StockLot>) => void }) {
  const [form, setForm] = useState({
    lotNumber: "", quantity: "", expiryDate: "", location: "", unitCost: "", performedBy: "",
  });
  function submit() {
    if (!form.lotNumber || !form.quantity || !form.expiryDate) { alert("Lot number, qty, expiry required"); return; }
    onSave({
      itemId: item.id, lotNumber: form.lotNumber, quantity: Number(form.quantity) || 0,
      expiryDate: form.expiryDate, location: form.location || undefined,
      unitCost: form.unitCost !== "" ? Number(form.unitCost) : undefined,
      ...(form.performedBy ? { performedBy: form.performedBy } : {}),
    } as any);
  }
  return (
    <Modal title={`Receive lot — ${item.genericName}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Lot number"><input value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Quantity"><input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Expiry date"><input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Location"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Unit cost"><input type="number" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Received by"><input value={form.performedBy} onChange={(e) => setForm({ ...form, performedBy: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saveLabel="Receive" />
    </Modal>
  );
}

function MovementModal({ item, lots, onClose, onSave }: { item: EnrichedItem; lots: StockLot[]; onClose: () => void; onSave: (b: { itemId: string; lotId?: string; type: MovementType; quantity: number; reason?: string; performedBy?: string }) => void }) {
  const [form, setForm] = useState({ type: "dispense" as MovementType, lotId: "", quantity: "", reason: "", performedBy: "" });
  function submit() {
    if (!form.quantity || Number(form.quantity) <= 0) { alert("Quantity required"); return; }
    onSave({
      itemId: item.id, lotId: form.lotId || undefined, type: form.type,
      quantity: Number(form.quantity), reason: form.reason || undefined, performedBy: form.performedBy || undefined,
    });
  }
  return (
    <Modal title={`Record movement — ${item.genericName}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as MovementType })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            {MOVE_TYPES.map((t) => <option key={t} value={t}>{MOVEMENT_LABEL[t]}</option>)}
          </select>
        </Field>
        <Field label="Quantity"><input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Lot" full>
          <select value={form.lotId} onChange={(e) => setForm({ ...form, lotId: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">—</option>
            {lots.map((l) => <option key={l.id} value={l.id}>#{l.lotNumber} · qty {l.quantity} · exp {fmtDate(l.expiryDate)}</option>)}
          </select>
        </Field>
        <Field label="Performed by"><input value={form.performedBy} onChange={(e) => setForm({ ...form, performedBy: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Reason / ref"><input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saveLabel="Record" />
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3"><h2 className="text-lg font-semibold text-slate-900">{title}</h2><button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button></div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
function ModalActions({ onClose, onSave, saveLabel = "Save" }: { onClose: () => void; onSave: () => void; saveLabel?: string }) {
  return <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4"><button onClick={onClose} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button><button onClick={onSave} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">{saveLabel}</button></div>;
}
function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <label className={`block text-sm ${full ? "col-span-2" : ""}`}><span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>{children}</label>;
}
