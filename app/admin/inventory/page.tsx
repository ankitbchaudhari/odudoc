"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";
import type {
  InventoryItem,
  ItemCategory,
} from "@/lib/hospital/inventory-store";

const CATEGORIES: ItemCategory[] = [
  "drug",
  "consumable",
  "equipment",
  "surgical",
  "reagent",
  "other",
];

interface ItemForm {
  name: string;
  genericName: string;
  category: ItemCategory;
  unit: string;
  manufacturer: string;
  hsnCode: string;
  taxPercent: string;
  reorderLevel: string;
  notes: string;
}

const EMPTY_FORM: ItemForm = {
  name: "",
  genericName: "",
  category: "drug",
  unit: "tablet",
  manufacturer: "",
  hsnCode: "",
  taxPercent: "0",
  reorderLevel: "0",
  notes: "",
};

function onHand(it: InventoryItem): number {
  return it.batches.reduce((s, b) => s + (b.quantity || 0), 0);
}

function isLow(it: InventoryItem): boolean {
  return onHand(it) < it.reorderLevel;
}

function expiringBatches(it: InventoryItem, days = 30) {
  const threshold = Date.now() + days * 86400000;
  return it.batches.filter(
    (b) =>
      b.expiryDate &&
      b.quantity > 0 &&
      new Date(b.expiryDate).getTime() <= threshold
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ItemCategory | "">("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [openRow, setOpenRow] = useState<string | null>(null);
  const [rowMode, setRowMode] = useState<"view" | "receive" | "adjust">("view");

  const [receive, setReceive] = useState({
    batchNumber: "",
    expiryDate: "",
    quantity: "",
    purchasePrice: "",
    sellingPrice: "",
    supplier: "",
    note: "",
  });
  const [adjust, setAdjust] = useState({
    batchId: "",
    deltaQuantity: "",
    reason: "",
  });

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (category) q.set("category", category);
      if (lowStockOnly) q.set("lowStockOnly", "1");
      const res = await fetch(`/api/hospital/inventory?${q.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "load_failed");
      setItems(data.items || []);
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reset() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      genericName: form.genericName.trim() || undefined,
      category: form.category,
      unit: form.unit.trim() || "unit",
      manufacturer: form.manufacturer.trim() || undefined,
      hsnCode: form.hsnCode.trim() || undefined,
      taxPercent: Number(form.taxPercent) || 0,
      reorderLevel: Number(form.reorderLevel) || 0,
      notes: form.notes.trim() || undefined,
    };
    try {
      const res = await fetch("/api/hospital/inventory", {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "save_failed");
      reset();
      load();
    } catch (e) {
      setErr(String((e as Error).message || e));
    }
  }

  function startEdit(it: InventoryItem) {
    setEditingId(it.id);
    setForm({
      name: it.name,
      genericName: it.genericName || "",
      category: it.category,
      unit: it.unit,
      manufacturer: it.manufacturer || "",
      hsnCode: it.hsnCode || "",
      taxPercent: String(it.taxPercent ?? 0),
      reorderLevel: String(it.reorderLevel),
      notes: it.notes || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: string) {
    if (!confirm("Delete this item and all its batches/movements?")) return;
    const res = await fetch("/api/hospital/inventory", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  }

  async function submitReceive(itemId: string) {
    const qty = Number(receive.quantity);
    if (!qty || qty <= 0) {
      alert("Quantity must be > 0");
      return;
    }
    const res = await fetch("/api/hospital/inventory", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: itemId,
        receive: {
          batchNumber: receive.batchNumber || `batch-${Date.now()}`,
          expiryDate: receive.expiryDate || undefined,
          quantity: qty,
          purchasePrice: receive.purchasePrice
            ? Number(receive.purchasePrice)
            : undefined,
          sellingPrice: receive.sellingPrice
            ? Number(receive.sellingPrice)
            : undefined,
          supplier: receive.supplier || undefined,
          note: receive.note || undefined,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "receive_failed");
      return;
    }
    setReceive({
      batchNumber: "",
      expiryDate: "",
      quantity: "",
      purchasePrice: "",
      sellingPrice: "",
      supplier: "",
      note: "",
    });
    setRowMode("view");
    load();
  }

  async function submitAdjust(itemId: string) {
    const delta = Number(adjust.deltaQuantity);
    if (!delta) {
      alert("Delta must be non-zero");
      return;
    }
    const res = await fetch("/api/hospital/inventory", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: itemId,
        adjust: {
          batchId: adjust.batchId,
          deltaQuantity: delta,
          reason: adjust.reason || undefined,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "adjust_failed");
      return;
    }
    setAdjust({ batchId: "", deltaQuantity: "", reason: "" });
    setRowMode("view");
    load();
  }

  const summary = useMemo(() => {
    let totalOnHand = 0;
    let lowCount = 0;
    let expiringCount = 0;
    for (const it of items) {
      totalOnHand += onHand(it);
      if (isLow(it)) lowCount++;
      if (expiringBatches(it).length > 0) expiringCount++;
    }
    return { totalItems: items.length, totalOnHand, lowCount, expiringCount };
  }, [items]);

  return (
    <div className="space-y-6">
      <PageHero
        icon="📦"
        eyebrow="Stores"
        title="Inventory"
        subtitle="Drugs, consumables, equipment — batches, expiry, reorder levels"
        tone="indigo"
        primaryAction={{ label: showForm ? "Close" : "+ New item", onClick: () => { if (showForm) reset(); else setShowForm(true); } }}
      />

      <StatGrid cols={4}>
        <StatCard label="Items" value={summary.totalItems} tone="indigo" icon="📋" />
        <StatCard label="Units on hand" value={summary.totalOnHand} tone="emerald" icon="📦" />
        <StatCard label="Low stock" value={summary.lowCount} tone={summary.lowCount > 0 ? "amber" : "slate"} icon="📉" />
        <StatCard label="Expiring <30d" value={summary.expiringCount} tone={summary.expiringCount > 0 ? "rose" : "teal"} icon="⏰" />
      </StatGrid>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form
          onSubmit={submit}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-5"
        >
          <h3 className="text-sm font-semibold text-slate-900">
            {editingId ? "Edit item" : "New item"}
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Name*">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Generic name">
              <input
                value={form.genericName}
                onChange={(e) =>
                  setForm({ ...form, genericName: e.target.value })
                }
                className="input"
              />
            </Field>
            <Field label="Category*">
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as ItemCategory })
                }
                className="input"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Unit*">
              <input
                required
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="input"
                placeholder="tablet / ml / box"
              />
            </Field>
            <Field label="Manufacturer">
              <input
                value={form.manufacturer}
                onChange={(e) =>
                  setForm({ ...form, manufacturer: e.target.value })
                }
                className="input"
              />
            </Field>
            <Field label="HSN / tax code">
              <input
                value={form.hsnCode}
                onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Tax %">
              <input
                type="number"
                value={form.taxPercent}
                onChange={(e) =>
                  setForm({ ...form, taxPercent: e.target.value })
                }
                className="input"
              />
            </Field>
            <Field label="Reorder level">
              <input
                type="number"
                value={form.reorderLevel}
                onChange={(e) =>
                  setForm({ ...form, reorderLevel: e.target.value })
                }
                className="input"
              />
            </Field>
            <Field label="Notes">
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              {editingId ? "Save" : "Create"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <Field label="Search">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-60"
            placeholder="name / SKU / generic"
          />
        </Field>
        <Field label="Category">
          <select
            value={category}
            onChange={(e) =>
              setCategory((e.target.value as ItemCategory) || "")
            }
            className="input"
          >
            <option value="">All</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          Low stock only
        </label>
        <button
          onClick={load}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
        >
          Apply
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">On hand</th>
              <th className="px-4 py-3">Batches</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No items.
                </td>
              </tr>
            ) : (
              items.map((it) => {
                const total = onHand(it);
                const low = isLow(it);
                const exp = expiringBatches(it);
                const isOpen = openRow === it.id;
                return (
                  <>
                    <tr key={it.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {it.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {it.genericName || it.manufacturer || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {it.sku}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {it.category}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold ${
                            low ? "text-amber-600" : "text-slate-900"
                          }`}
                        >
                          {total} {it.unit}
                        </span>
                        {low && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            LOW
                          </span>
                        )}
                        {exp.length > 0 && (
                          <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                            EXP {exp.length}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {it.batches.length}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => {
                              setOpenRow(isOpen ? null : it.id);
                              setRowMode("view");
                            }}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                          >
                            {isOpen ? "Close" : "Batches"}
                          </button>
                          <button
                            onClick={() => {
                              setOpenRow(it.id);
                              setRowMode("receive");
                            }}
                            className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
                          >
                            Receive
                          </button>
                          <button
                            onClick={() => startEdit(it)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => remove(it.id)}
                            className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={it.id + "-detail"} className="bg-slate-50/50">
                        <td colSpan={6} className="px-4 py-4">
                          {rowMode === "receive" ? (
                            <div className="space-y-3 rounded-lg border border-emerald-200 bg-white p-4">
                              <div className="text-sm font-semibold text-emerald-800">
                                Receive stock → {it.name}
                              </div>
                              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                <Field label="Batch #">
                                  <input
                                    value={receive.batchNumber}
                                    onChange={(e) =>
                                      setReceive({
                                        ...receive,
                                        batchNumber: e.target.value,
                                      })
                                    }
                                    className="input"
                                  />
                                </Field>
                                <Field label="Expiry">
                                  <input
                                    type="date"
                                    value={receive.expiryDate}
                                    onChange={(e) =>
                                      setReceive({
                                        ...receive,
                                        expiryDate: e.target.value,
                                      })
                                    }
                                    className="input"
                                  />
                                </Field>
                                <Field label="Quantity*">
                                  <input
                                    type="number"
                                    value={receive.quantity}
                                    onChange={(e) =>
                                      setReceive({
                                        ...receive,
                                        quantity: e.target.value,
                                      })
                                    }
                                    className="input"
                                  />
                                </Field>
                                <Field label="Supplier">
                                  <input
                                    value={receive.supplier}
                                    onChange={(e) =>
                                      setReceive({
                                        ...receive,
                                        supplier: e.target.value,
                                      })
                                    }
                                    className="input"
                                  />
                                </Field>
                                <Field label="Purchase price">
                                  <input
                                    type="number"
                                    value={receive.purchasePrice}
                                    onChange={(e) =>
                                      setReceive({
                                        ...receive,
                                        purchasePrice: e.target.value,
                                      })
                                    }
                                    className="input"
                                  />
                                </Field>
                                <Field label="Selling price">
                                  <input
                                    type="number"
                                    value={receive.sellingPrice}
                                    onChange={(e) =>
                                      setReceive({
                                        ...receive,
                                        sellingPrice: e.target.value,
                                      })
                                    }
                                    className="input"
                                  />
                                </Field>
                                <Field label="Note">
                                  <input
                                    value={receive.note}
                                    onChange={(e) =>
                                      setReceive({
                                        ...receive,
                                        note: e.target.value,
                                      })
                                    }
                                    className="input"
                                  />
                                </Field>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => submitReceive(it.id)}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                                >
                                  Receive
                                </button>
                                <button
                                  onClick={() => setRowMode("view")}
                                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : rowMode === "adjust" ? (
                            <div className="space-y-3 rounded-lg border border-amber-200 bg-white p-4">
                              <div className="text-sm font-semibold text-amber-800">
                                Adjust stock → {it.name}
                              </div>
                              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                <Field label="Batch">
                                  <select
                                    value={adjust.batchId}
                                    onChange={(e) =>
                                      setAdjust({
                                        ...adjust,
                                        batchId: e.target.value,
                                      })
                                    }
                                    className="input"
                                  >
                                    <option value="">—</option>
                                    {it.batches.map((b) => (
                                      <option key={b.id} value={b.id}>
                                        {b.batchNumber} ({b.quantity})
                                      </option>
                                    ))}
                                  </select>
                                </Field>
                                <Field label="Delta (+/−)">
                                  <input
                                    type="number"
                                    value={adjust.deltaQuantity}
                                    onChange={(e) =>
                                      setAdjust({
                                        ...adjust,
                                        deltaQuantity: e.target.value,
                                      })
                                    }
                                    className="input"
                                  />
                                </Field>
                                <Field label="Reason">
                                  <input
                                    value={adjust.reason}
                                    onChange={(e) =>
                                      setAdjust({
                                        ...adjust,
                                        reason: e.target.value,
                                      })
                                    }
                                    className="input"
                                  />
                                </Field>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => submitAdjust(it.id)}
                                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
                                >
                                  Apply
                                </button>
                                <button
                                  onClick={() => setRowMode("view")}
                                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold text-slate-800">
                                  Batches
                                </div>
                                <button
                                  onClick={() => setRowMode("adjust")}
                                  className="rounded-md border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50"
                                >
                                  + Adjust
                                </button>
                              </div>
                              {it.batches.length === 0 ? (
                                <div className="text-sm text-slate-500">
                                  No batches yet — click Receive to add stock.
                                </div>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead className="bg-slate-100 text-left text-[10px] uppercase tracking-wider text-slate-500">
                                    <tr>
                                      <th className="px-2 py-2">Batch #</th>
                                      <th className="px-2 py-2">Expiry</th>
                                      <th className="px-2 py-2">Qty</th>
                                      <th className="px-2 py-2">Purchase</th>
                                      <th className="px-2 py-2">Sell</th>
                                      <th className="px-2 py-2">Supplier</th>
                                      <th className="px-2 py-2">Received</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {it.batches.map((b) => {
                                      const expired =
                                        b.expiryDate &&
                                        new Date(b.expiryDate).getTime() <
                                          Date.now();
                                      return (
                                        <tr
                                          key={b.id}
                                          className="border-t border-slate-100"
                                        >
                                          <td className="px-2 py-1.5 font-mono">
                                            {b.batchNumber}
                                          </td>
                                          <td
                                            className={`px-2 py-1.5 ${
                                              expired ? "text-red-600" : ""
                                            }`}
                                          >
                                            {b.expiryDate || "—"}
                                          </td>
                                          <td className="px-2 py-1.5 font-semibold">
                                            {b.quantity}
                                          </td>
                                          <td className="px-2 py-1.5">
                                            {b.purchasePrice ?? "—"}
                                          </td>
                                          <td className="px-2 py-1.5">
                                            {b.sellingPrice ?? "—"}
                                          </td>
                                          <td className="px-2 py-1.5">
                                            {b.supplier || "—"}
                                          </td>
                                          <td className="px-2 py-1.5 text-slate-500">
                                            {new Date(
                                              b.receivedAt
                                            ).toLocaleDateString()}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          background: white;
          outline: none;
        }
        .input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}
