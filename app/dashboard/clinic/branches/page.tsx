"use client";

import { useState } from "react";
import { useClinicBranches, type ClinicBranch } from "@/lib/clinic-store";

const blank: Omit<ClinicBranch, "id"> = {
  name: "",
  address: "",
  phone: "",
  manager: "",
  active: true,
};

export default function ClinicBranchesPage() {
  const { items, add, update, remove } = useClinicBranches();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    add(form);
    setForm(blank);
    setShowForm(false);
  };

  const toggleActive = (b: ClinicBranch) => update(b.id, { active: !b.active });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Branches</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Manage locations across cities.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary !py-2 !text-sm">
          {showForm ? "Close" : "+ Add branch"}
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card label="Total branches" value={items.length} color="text-gray-900 dark:text-slate-100" />
        <Card label="Active" value={items.filter((b) => b.active).length} color="text-emerald-700" />
        <Card label="Inactive" value={items.filter((b) => !b.active).length} color="text-gray-500 dark:text-slate-400" />
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 grid grid-cols-1 gap-3 rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm sm:grid-cols-2">
          <Input label="Branch name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Input label="Manager" value={form.manager} onChange={(v) => setForm({ ...form, manager: v })} />
          <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <div className="sm:col-span-2">
            <Input label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className="btn-primary !py-2 !text-sm">Add branch</button>
          </div>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {items.length === 0 ? (
          <p className="col-span-full rounded-xl bg-white dark:bg-slate-900 p-10 text-center text-sm text-gray-400 dark:text-slate-500 dark:text-slate-400">No branches yet.</p>
        ) : (
          items.map((b) => (
            <div key={b.id} className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-slate-100">{b.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      b.active ? "bg-green-50 text-green-700" : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                    }`}>
                      {b.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{b.address || "—"}</p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                    Manager: <span className="text-gray-700 dark:text-slate-300">{b.manager || "—"}</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    📞 <span className="text-gray-700 dark:text-slate-300">{b.phone || "—"}</span>
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => toggleActive(b)}
                    className="rounded bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100"
                  >
                    {b.active ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => remove(b.id)} className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
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

function Input({ label, value, onChange, required = false }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-600 dark:text-slate-300">{label}</span>
      <input
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />
    </label>
  );
}
