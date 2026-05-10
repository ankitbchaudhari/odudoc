"use client";

import { useEffect, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";
import type {
  LinenItem,
  LaundryBatch,
  BatchLine,
  LinenType,
  BatchStatus,
  LaundryStats,
} from "@/lib/hospital/laundry-store";
// Inlined from laundry-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const LINEN_LABEL: Record<LinenType, string> = {
  bedsheet: "Bedsheet",
  pillowcase: "Pillowcase",
  blanket: "Blanket",
  gown: "Patient gown",
  towel: "Towel",
  curtain: "Curtain",
  scrubs: "Scrubs",
  drape: "Surgical drape",
  mop: "Mop head",
  other: "Other",
};

const LINEN_TYPES: LinenType[] = [
  "bedsheet",
  "pillowcase",
  "blanket",
  "gown",
  "towel",
  "curtain",
  "scrubs",
  "drape",
  "mop",
  "other",
];

const BATCH_STATUSES: BatchStatus[] = ["sent", "processing", "returned", "closed"];

const STATUS_COLOR: Record<BatchStatus, string> = {
  sent: "bg-blue-100 text-blue-700",
  processing: "bg-amber-100 text-amber-800",
  returned: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-100 text-slate-600",
};

export default function LaundryPage() {
  const [tab, setTab] = useState<"batches" | "items">("batches");
  const [batches, setBatches] = useState<LaundryBatch[]>([]);
  const [items, setItems] = useState<LinenItem[]>([]);
  const [stats, setStats] = useState<LaundryStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<BatchStatus | "">("");

  const [showBatchForm, setShowBatchForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItem, setEditItem] = useState<LinenItem | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [returning, setReturning] = useState<LaundryBatch | null>(null);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterStatus) p.set("status", filterStatus);
    const [bRes, iRes] = await Promise.all([
      fetch(`/api/hospital/laundry?${p.toString()}`, { cache: "no-store" }),
      fetch("/api/hospital/laundry/items", { cache: "no-store" }),
    ]);
    if (bRes.ok) {
      const d = await bRes.json();
      setBatches(d.batches || []);
      setStats(d.stats || null);
    }
    if (iRes.ok) {
      const d = await iRes.json();
      setItems(d.items || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [filterStatus]);

  async function updateBatchStatus(id: string, status: BatchStatus) {
    await fetch("/api/hospital/laundry", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  async function deleteBatch(id: string) {
    if (!confirm("Delete this batch? (reverses stock if not yet reconciled)")) return;
    await fetch("/api/hospital/laundry", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this linen item?")) return;
    const res = await fetch("/api/hospital/laundry/items", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(
        d.error === "in_open_batch_or_not_found"
          ? "Cannot delete: item is in an open laundry batch."
          : d.error || "Failed"
      );
      return;
    }
    load();
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon="🧺"
        eyebrow="Soft Services"
        title="Linen & Laundry"
        subtitle="Linen stock counts with auto-reconciled laundry batch cycles"
        tone="violet"
        primaryAction={
          tab === "batches"
            ? { label: "+ Send Batch", onClick: () => setShowBatchForm(true) }
            : { label: "+ New Linen Item", onClick: () => { setEditItem(null); setShowItemForm(true); } }
        }
      />

      {stats && (
        <StatGrid cols={6}>
          <StatCard label="Linen stock value" value={`₹${stats.totalLinenValue.toLocaleString()}`} tone="emerald" icon="💰" />
          <StatCard label="Low-stock items" value={stats.itemsLowStock} tone={stats.itemsLowStock > 0 ? "amber" : "emerald"} icon="📉" />
          <StatCard label="Batches in transit" value={stats.batchesInTransit} tone="sky" icon="🚚" />
          <StatCard label="Overdue batches" value={stats.overdueBatches} tone={stats.overdueBatches > 0 ? "rose" : "teal"} icon="⏰" />
          <StatCard label="Damaged (this month)" value={stats.damagedThisMonth} tone={stats.damagedThisMonth > 0 ? "amber" : "slate"} icon="⚠️" />
          <StatCard label="Lost (this month)" value={stats.lostThisMonth} tone={stats.lostThisMonth > 0 ? "rose" : "slate"} icon="❌" />
        </StatGrid>
      )}

      <div className="flex gap-1 border-b border-slate-200">
        <TabBtn active={tab === "batches"} onClick={() => setTab("batches")}>
          Batches ({batches.length})
        </TabBtn>
        <TabBtn active={tab === "items"} onClick={() => setTab("items")}>
          Linen Items ({items.length})
        </TabBtn>
      </div>

      {tab === "batches" && (
        <Section>
          <div className="mb-4 flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as BatchStatus | "")}
              className="inp"
            >
              <option value="">All statuses</option>
              {BATCH_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Loading…</div>
          ) : batches.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No batches yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Batch</th>
                    <th className="py-2 pr-3">Vendor</th>
                    <th className="py-2 pr-3">Sent</th>
                    <th className="py-2 pr-3">Expected</th>
                    <th className="py-2 pr-3">Items</th>
                    <th className="py-2 pr-3">Sent / Ret / Dmg / Lost</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.map((b) => (
                    <BatchRow
                      key={b.id}
                      batch={b}
                      expanded={expanded === b.id}
                      onToggle={() => setExpanded(expanded === b.id ? null : b.id)}
                      onProcess={() => updateBatchStatus(b.id, "processing")}
                      onReturn={() => setReturning(b)}
                      onClose={() => updateBatchStatus(b.id, "closed")}
                      onDelete={() => deleteBatch(b.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {tab === "items" && (
        <Section>
          {items.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No linen items yet. Create stock records before scheduling batches.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Ref</th>
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 pr-3 text-right">Total</th>
                    <th className="py-2 pr-3 text-right">In stock</th>
                    <th className="py-2 pr-3 text-right">In laundry</th>
                    <th className="py-2 pr-3 text-right">In use</th>
                    <th className="py-2 pr-3 text-right">Condemned</th>
                    <th className="py-2 pr-3 text-right">Reorder</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it) => {
                    const low = it.inStock <= it.reorderLevel;
                    return (
                      <tr key={it.id} className={low ? "bg-amber-50/40" : ""}>
                        <td className="py-2 pr-3 font-mono text-xs text-slate-700">{it.linenNumber}</td>
                        <td className="py-2 pr-3">
                          <div className="font-medium text-slate-800">
                            {LINEN_LABEL[it.linenType]}
                            {it.size && <span className="text-slate-500"> · {it.size}</span>}
                            {it.color && <span className="text-slate-500"> · {it.color}</span>}
                          </div>
                          {it.unitCost !== undefined && (
                            <div className="text-[11px] text-slate-500">
                              ₹{it.unitCost} each · ₹{(it.unitCost * it.totalQty).toLocaleString()} total
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right font-semibold">{it.totalQty}</td>
                        <td className={`py-2 pr-3 text-right ${low ? "font-bold text-amber-700" : ""}`}>{it.inStock}</td>
                        <td className="py-2 pr-3 text-right">{it.inLaundry}</td>
                        <td className="py-2 pr-3 text-right">{it.inUse}</td>
                        <td className="py-2 pr-3 text-right text-rose-700">{it.condemnedQty}</td>
                        <td className="py-2 pr-3 text-right text-slate-500">{it.reorderLevel}</td>
                        <td className="py-2 pr-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditItem(it);
                                setShowItemForm(true);
                              }}
                              className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteItem(it.id)}
                              className="rounded border border-rose-300 px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-50"
                            >
                              Del
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {showBatchForm && (
        <BatchFormModal
          items={items.filter((i) => i.active && i.inStock > 0)}
          onClose={() => setShowBatchForm(false)}
          onSaved={() => {
            setShowBatchForm(false);
            load();
          }}
        />
      )}

      {showItemForm && (
        <ItemFormModal
          item={editItem}
          onClose={() => {
            setShowItemForm(false);
            setEditItem(null);
          }}
          onSaved={() => {
            setShowItemForm(false);
            setEditItem(null);
            load();
          }}
        />
      )}

      {returning && (
        <ReturnModal
          batch={returning}
          onClose={() => setReturning(null)}
          onSaved={() => {
            setReturning(null);
            load();
          }}
        />
      )}

      <style jsx>{`
        .inp {
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: white;
          outline: none;
        }
        .inp:focus {
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 3px rgb(191 219 254 / 0.4);
        }
      `}</style>
    </div>
  );
}

function BatchRow({
  batch: b,
  expanded,
  onToggle,
  onProcess,
  onReturn,
  onClose,
  onDelete,
}: {
  batch: LaundryBatch;
  expanded: boolean;
  onToggle: () => void;
  onProcess: () => void;
  onReturn: () => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const overdue =
    (b.status === "sent" || b.status === "processing") &&
    b.expectedReturnAt &&
    new Date(b.expectedReturnAt).getTime() < Date.now();

  return (
    <>
      <tr
        className={`cursor-pointer hover:bg-slate-50 ${overdue ? "bg-rose-50/40" : ""}`}
        onClick={onToggle}
      >
        <td className="py-2 pr-3 font-mono text-xs text-slate-700">{b.batchNumber}</td>
        <td className="py-2 pr-3">
          <div className="font-medium text-slate-800">{b.vendorName}</div>
          <div className="text-[11px] text-slate-500">{b.vendorType}</div>
        </td>
        <td className="py-2 pr-3 text-xs text-slate-600">
          {new Date(b.sentAt).toLocaleDateString()}
        </td>
        <td className={`py-2 pr-3 text-xs ${overdue ? "font-semibold text-rose-700" : "text-slate-600"}`}>
          {b.expectedReturnAt ? new Date(b.expectedReturnAt).toLocaleDateString() : "—"}
          {overdue && <div className="text-[10px] font-semibold">OVERDUE</div>}
        </td>
        <td className="py-2 pr-3 text-slate-600">{b.lines.length}</td>
        <td className="py-2 pr-3 text-xs">
          <span className="font-semibold text-slate-700">{b.totalSent}</span>
          <span className="text-slate-400"> / </span>
          <span className="text-emerald-700">{b.totalReturned}</span>
          <span className="text-slate-400"> / </span>
          <span className="text-amber-700">{b.totalDamaged}</span>
          <span className="text-slate-400"> / </span>
          <span className="text-rose-700">{b.totalLost}</span>
        </td>
        <td className="py-2 pr-3">
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[b.status]}`}>
            {b.status}
          </span>
        </td>
        <td className="py-2 pr-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1">
            {b.status === "sent" && (
              <button onClick={onProcess} className="rounded bg-amber-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-700">
                Processing
              </button>
            )}
            {(b.status === "sent" || b.status === "processing") && (
              <button onClick={onReturn} className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">
                Receive
              </button>
            )}
            {b.status === "returned" && (
              <button onClick={onClose} className="rounded bg-slate-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-700">
                Close
              </button>
            )}
            <button onClick={onDelete} className="rounded border border-rose-300 px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-50">
              Del
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50">
          <td colSpan={8} className="px-3 py-3">
            <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <KV k="Returned" v={b.returnedAt ? new Date(b.returnedAt).toLocaleString() : "—"} />
              <KV k="Closed" v={b.closedAt ? new Date(b.closedAt).toLocaleString() : "—"} />
              <KV k="Cost" v={b.cost !== undefined ? `₹${b.cost.toLocaleString()}` : "—"} />
              <KV k="Reconciled" v={b.reconciled ? "Yes" : "No"} />
            </div>
            <div className="rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3 text-right">Sent</th>
                    <th className="py-2 px-3 text-right">Returned</th>
                    <th className="py-2 px-3 text-right">Damaged</th>
                    <th className="py-2 px-3 text-right">Lost</th>
                  </tr>
                </thead>
                <tbody>
                  {b.lines.map((l) => (
                    <tr key={l.linenId} className="border-t border-slate-100">
                      <td className="py-2 px-3 text-slate-800">{l.linenLabel}</td>
                      <td className="py-2 px-3 text-right">{l.sentQty}</td>
                      <td className="py-2 px-3 text-right text-emerald-700">{l.returnedQty}</td>
                      <td className="py-2 px-3 text-right text-amber-700">{l.damagedQty}</td>
                      <td className="py-2 px-3 text-right text-rose-700">{l.lostQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {b.notes && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Notes</div>
                <div className="mt-1 text-sm text-slate-700">{b.notes}</div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function BatchFormModal({
  items,
  onClose,
  onSaved,
}: {
  items: LinenItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    vendorName: "",
    vendorType: "external" as "internal" | "external",
    sentAt: new Date().toISOString().slice(0, 16),
    expectedReturnAt: "",
    cost: "",
    notes: "",
  });
  const [selectedLines, setSelectedLines] = useState<Record<string, number>>({});

  async function save() {
    if (!form.vendorName.trim()) return alert("Vendor name required");
    const lines = Object.entries(selectedLines)
      .filter(([, qty]) => qty > 0)
      .map(([linenId, sentQty]) => ({ linenId, sentQty }));
    if (lines.length === 0) return alert("Add at least one line");
    const res = await fetch("/api/hospital/laundry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        cost: form.cost ? Number(form.cost) : undefined,
        sentAt: new Date(form.sentAt).toISOString(),
        expectedReturnAt: form.expectedReturnAt
          ? new Date(form.expectedReturnAt).toISOString()
          : undefined,
        lines,
      }),
    });
    if (res.ok) onSaved();
    else {
      const d = await res.json().catch(() => ({}));
      alert(
        d.error === "insufficient_stock"
          ? "Insufficient stock for one or more items"
          : d.error || "Failed"
      );
    }
  }

  return (
    <Modal onClose={onClose} title="Send laundry batch" wide>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Vendor">
            <input type="text" value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} className="inp w-full" />
          </Field>
          <Field label="Type">
            <select value={form.vendorType} onChange={(e) => setForm({ ...form, vendorType: e.target.value as "internal" | "external" })} className="inp w-full">
              <option value="external">External</option>
              <option value="internal">Internal</option>
            </select>
          </Field>
          <Field label="Sent at">
            <input type="datetime-local" value={form.sentAt} onChange={(e) => setForm({ ...form, sentAt: e.target.value })} className="inp w-full" />
          </Field>
          <Field label="Expected return">
            <input type="datetime-local" value={form.expectedReturnAt} onChange={(e) => setForm({ ...form, expectedReturnAt: e.target.value })} className="inp w-full" />
          </Field>
          <Field label="Cost (₹)">
            <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="inp w-full" />
          </Field>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-slate-800">Items to send</div>
          {items.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              No linen in stock. Add items first or wait for a batch to return.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3 text-right">In stock</th>
                    <th className="py-2 px-3 text-right">Send qty</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const qty = selectedLines[it.id] || 0;
                    return (
                      <tr key={it.id} className="border-t border-slate-100">
                        <td className="py-2 px-3">
                          <div className="font-medium text-slate-800">
                            {LINEN_LABEL[it.linenType]}
                            {it.size && <span className="text-slate-500"> · {it.size}</span>}
                            {it.color && <span className="text-slate-500"> · {it.color}</span>}
                          </div>
                          <div className="text-[11px] text-slate-500">{it.linenNumber}</div>
                        </td>
                        <td className="py-2 px-3 text-right font-semibold">{it.inStock}</td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min={0}
                            max={it.inStock}
                            value={qty}
                            onChange={(e) =>
                              setSelectedLines({
                                ...selectedLines,
                                [it.id]: Math.max(0, Math.min(it.inStock, Number(e.target.value))),
                              })
                            }
                            className="inp w-20 text-right"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="inp min-h-[60px] w-full" />
        </Field>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={save} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
            Send batch
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ReturnModal({
  batch,
  onClose,
  onSaved,
}: {
  batch: LaundryBatch;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [lines, setLines] = useState<Record<string, { returnedQty: number; damagedQty: number; lostQty: number }>>(
    () => {
      const o: Record<string, { returnedQty: number; damagedQty: number; lostQty: number }> = {};
      for (const l of batch.lines) {
        o[l.linenId] = {
          returnedQty: l.returnedQty || l.sentQty, // default assume all back
          damagedQty: l.damagedQty,
          lostQty: l.lostQty,
        };
      }
      return o;
    }
  );

  function updateLine(id: string, key: "returnedQty" | "damagedQty" | "lostQty", v: number) {
    setLines({ ...lines, [id]: { ...lines[id], [key]: Math.max(0, v) } });
  }

  async function save() {
    const payload = {
      id: batch.id,
      status: "returned" as BatchStatus,
      lines: Object.entries(lines).map(([linenId, v]) => ({
        linenId,
        returnedQty: v.returnedQty,
        damagedQty: v.damagedQty,
        lostQty: v.lostQty,
      })),
    };
    const res = await fetch("/api/hospital/laundry", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) onSaved();
    else alert("Failed");
  }

  return (
    <Modal onClose={onClose} title={`Receive batch ${batch.batchNumber}`} wide>
      <div className="space-y-3">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800">
          Enter returned / damaged / lost quantities per line. Stock will be auto-reconciled: good
          returns re-enter stock, damaged items move to condemned, lost items reduce the total count.
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 px-3">Item</th>
                <th className="py-2 px-3 text-right">Sent</th>
                <th className="py-2 px-3 text-right">Returned</th>
                <th className="py-2 px-3 text-right">Damaged</th>
                <th className="py-2 px-3 text-right">Lost</th>
                <th className="py-2 px-3 text-right">Net good</th>
              </tr>
            </thead>
            <tbody>
              {batch.lines.map((l: BatchLine) => {
                const v = lines[l.linenId];
                const good = Math.max(0, v.returnedQty - v.damagedQty);
                const accountedFor = v.returnedQty + v.lostQty;
                const mismatch = accountedFor !== l.sentQty;
                return (
                  <tr key={l.linenId} className={`border-t border-slate-100 ${mismatch ? "bg-amber-50/30" : ""}`}>
                    <td className="py-2 px-3 text-slate-800">{l.linenLabel}</td>
                    <td className="py-2 px-3 text-right font-semibold">{l.sentQty}</td>
                    <td className="py-2 px-3 text-right">
                      <input type="number" min={0} value={v.returnedQty} onChange={(e) => updateLine(l.linenId, "returnedQty", Number(e.target.value))} className="inp w-20 text-right" />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input type="number" min={0} value={v.damagedQty} onChange={(e) => updateLine(l.linenId, "damagedQty", Number(e.target.value))} className="inp w-20 text-right" />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input type="number" min={0} value={v.lostQty} onChange={(e) => updateLine(l.linenId, "lostQty", Number(e.target.value))} className="inp w-20 text-right" />
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-700">{good}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={save} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Receive & reconcile</button>
        </div>
      </div>
    </Modal>
  );
}

function ItemFormModal({
  item,
  onClose,
  onSaved,
}: {
  item: LinenItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    linenType: (item?.linenType || "bedsheet") as LinenType,
    size: item?.size || "",
    color: item?.color || "",
    totalQty: item?.totalQty || 0,
    inStock: item?.inStock || 0,
    reorderLevel: item?.reorderLevel || 0,
    unitCost: item?.unitCost !== undefined ? String(item.unitCost) : "",
    notes: item?.notes || "",
    active: item?.active ?? true,
  });

  async function save() {
    const payload = {
      ...form,
      unitCost: form.unitCost ? Number(form.unitCost) : undefined,
    };
    const res = item
      ? await fetch("/api/hospital/laundry/items", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: item.id, ...payload }),
        })
      : await fetch("/api/hospital/laundry/items", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
    if (res.ok) onSaved();
    else alert("Failed");
  }

  return (
    <Modal onClose={onClose} title={item ? "Edit linen item" : "New linen item"}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select value={form.linenType} onChange={(e) => setForm({ ...form, linenType: e.target.value as LinenType })} className="inp w-full">
              {LINEN_TYPES.map((t) => (
                <option key={t} value={t}>{LINEN_LABEL[t]}</option>
              ))}
            </select>
          </Field>
          <Field label="Size">
            <input type="text" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} className="inp w-full" placeholder="single / L / king" />
          </Field>
          <Field label="Color">
            <input type="text" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="inp w-full" placeholder="white / blue" />
          </Field>
          <Field label="Unit cost (₹)">
            <input type="number" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} className="inp w-full" />
          </Field>
          {!item && (
            <Field label="Total qty (initial)">
              <input
                type="number"
                min={0}
                value={form.totalQty}
                onChange={(e) => {
                  const n = Math.max(0, Number(e.target.value));
                  setForm({ ...form, totalQty: n, inStock: n });
                }}
                className="inp w-full"
              />
            </Field>
          )}
          {item && (
            <Field label="Adjust in-stock">
              <input
                type="number"
                min={0}
                value={form.inStock}
                onChange={(e) => setForm({ ...form, inStock: Math.max(0, Number(e.target.value)) })}
                className="inp w-full"
              />
            </Field>
          )}
          <Field label="Reorder level">
            <input type="number" min={0} value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })} className="inp w-full" />
          </Field>
          <Field label="Active">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Active
            </label>
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="inp min-h-[50px] w-full" />
        </Field>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={save} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">Save</button>
        </div>
      </div>
    </Modal>
  );
}

function Stat({
  label,
  value,
  color = "slate",
}: {
  label: string;
  value: string | number;
  color?: "slate" | "emerald" | "amber" | "rose" | "blue";
}) {
  const colors: Record<string, string> = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
    blue: "text-blue-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${colors[color]}`}>{value}</div>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5">{children}</section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
      <div className="text-sm text-slate-800">{v}</div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
        active ? "border-primary-500 text-primary-700" : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12" onClick={onClose}>
      <div className={`w-full ${wide ? "max-w-4xl" : "max-w-2xl"} rounded-xl bg-white shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
