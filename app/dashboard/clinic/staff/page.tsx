"use client";

import { useState } from "react";
import { useClinicStaff, type ClinicStaff } from "@/lib/clinic-store";

const blank: Omit<ClinicStaff, "id"> = {
  name: "",
  role: "",
  salary: 0,
  phone: "",
  email: "",
  joinedAt: new Date().toISOString().slice(0, 10),
};

export default function ClinicStaffPage() {
  const { items, add, update, remove } = useClinicStaff();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);

  const totalPayroll = items.reduce((s, i) => s + i.salary, 0);
  const avgSalary = items.length ? totalPayroll / items.length : 0;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingId) update(editingId, form);
    else add(form);
    setForm(blank);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (s: ClinicStaff) => {
    setForm({ name: s.name, role: s.role, salary: s.salary, phone: s.phone, email: s.email, joinedAt: s.joinedAt });
    setEditingId(s.id);
    setShowForm(true);
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Staff &amp; Payroll</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Manage staff, roles, and monthly payroll.</p>
        </div>
        <button
          onClick={() => { setForm(blank); setEditingId(null); setShowForm((s) => !s); }}
          className="btn-primary !py-2 !text-sm"
        >
          {showForm ? "Close" : "+ Add staff"}
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card label="Team size" value={items.length} color="text-gray-900 dark:text-slate-100" />
        <Card label="Monthly payroll" value={`$${totalPayroll.toLocaleString()}`} color="text-primary-700" />
        <Card label="Avg salary" value={`$${Math.round(avgSalary).toLocaleString()}`} color="text-emerald-700" />
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="mb-4 grid grid-cols-1 gap-3 rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm sm:grid-cols-2">
          <Input label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Input label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} />
          <Input type="number" label="Monthly salary" value={String(form.salary)} onChange={(v) => setForm({ ...form, salary: parseFloat(v) || 0 })} />
          <Input type="date" label="Joined" value={form.joinedAt} onChange={(v) => setForm({ ...form, joinedAt: v })} />
          <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-outline !py-2 !text-sm">Cancel</button>
            <button type="submit" className="btn-primary !py-2 !text-sm">{editingId ? "Save changes" : "Add staff"}</button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-sm">
        {items.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-400 dark:text-slate-500 dark:text-slate-400">No staff yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900 text-left text-xs uppercase text-gray-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Salary</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:bg-slate-900">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{s.role}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{s.joinedAt}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">${s.salary.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400">
                    <div>{s.phone || "—"}</div>
                    <div>{s.email || "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(s)} className="rounded bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100">Edit</button>
                      <button onClick={() => remove(s.id)} className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
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
