"use client";

import { useState } from "react";
import { useClinicInventory, type ClinicInventoryItem } from "@/lib/clinic-store";

const blank: Omit<ClinicInventoryItem, "id" | "updatedAt"> = {
  name: "",
  category: "Medicine",
  stock: 0,
  reorderLevel: 10,
  unitPrice: 0,
  supplier: "",
};

export default function ClinicInventoryPage() {
  const { items, add, update, remove } = useClinicInventory();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);

  const lowStock = items.filter((i) => i.stock <= i.reorderLevel);
  const totalValue = items.reduce((s, i) => s + i.stock * i.unitPrice, 0);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    add({ ...form, updatedAt: new Date().toISOString() });
    setForm(blank);
    setShowForm(false);
  };

  const adjustStock = (id: string, delta: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    update(id, { stock: Math.max(0, item.stock + delta), updatedAt: new Date().toISOString() });
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Inventory</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Stock tracking with auto-reorder alerts.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary !py-2 !text-sm">
          {showForm ? "Close" : "+ Add item"}
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card label="Items tracked" value={items.length} color="text-gray-900 dark:text-slate-100" />
        <Card label="Low stock" value={lowStock.length} color={lowStock.length ? "text-red-700" : "text-gray-900 dark:text-slate-100"} />
        <Card label="Inventory value" value={`$${totalValue.toLocaleString()}`} color="text-emerald-700" />
      </div>

      {lowStock.length > 0 && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">⚠️ Reorder alert</p>
          <p className="mt-1 text-xs text-red-700">
            {lowStock.length} item{lowStock.length === 1 ? "" : "s"} at or below reorder level:{" "}
            {lowStock.map((i) => i.name).join(", ")}
          </p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 grid grid-cols-1 gap-3 rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm sm:grid-cols-2">
          <Input label="Item name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <label className="block">
            <span className="text-xs font-medium text-gray-600 dark:text-slate-300">Category</span>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option>Medicine</option>
              <option>Supplies</option>
              <option>Equipment</option>
              <option>Other</option>
            </select>
          </label>
          <Input type="number" label="Stock" value={String(form.stock)} onChange={(v) => setForm({ ...form, stock: parseInt(v) || 0 })} />
          <Input type="number" label="Reorder level" value={String(form.reorderLevel)} onChange={(v) => setForm({ ...form, reorderLevel: parseInt(v) || 0 })} />
          <Input type="number" label="Unit price" value={String(form.unitPrice)} onChange={(v) => setForm({ ...form, unitPrice: parseFloat(v) || 0 })} />
          <Input label="Supplier" value={form.supplier} onChange={(v) => setForm({ ...form, supplier: v })} />
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className="btn-primary !py-2 !text-sm">Add item</button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-sm">
        {items.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-400 dark:text-slate-500 dark:text-slate-400">No inventory yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900 text-left text-xs uppercase text-gray-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Reorder at</th>
                <th className="px-4 py-3">Unit price</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {items.map((i) => {
                const low = i.stock <= i.reorderLevel;
                return (
                  <tr key={i.id} className={low ? "bg-red-50/40 hover:bg-red-50" : "hover:bg-gray-50 dark:hover:bg-slate-800"}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{i.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{i.category}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => adjustStock(i.id, -1)} className="rounded bg-gray-100 dark:bg-slate-800 px-1.5 text-xs hover:bg-gray-200">−</button>
                        <span className={`font-semibold ${low ? "text-red-700" : "text-gray-900 dark:text-slate-100"}`}>{i.stock}</span>
                        <button onClick={() => adjustStock(i.id, 1)} className="rounded bg-gray-100 dark:bg-slate-800 px-1.5 text-xs hover:bg-gray-200">+</button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{i.reorderLevel}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">${i.unitPrice}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{i.supplier}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(i.id)} className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm">
      <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-600 dark:text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />
    </label>
  );
}
