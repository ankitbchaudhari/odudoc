"use client";

import { useState } from "react";
import { useClinicPatients, type ClinicPatient } from "@/lib/clinic-store";

const blank: Omit<ClinicPatient, "id" | "createdAt"> = {
  name: "",
  age: "",
  gender: "male",
  phone: "",
  email: "",
  conditions: "",
  allergies: "",
  lastVisit: new Date().toISOString().slice(0, 10),
  notes: "",
};

export default function ClinicPatientsPage() {
  const { items, add, update, remove } = useClinicPatients();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = items.filter((p) =>
    (p.name + p.conditions + p.phone + p.email).toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingId) {
      update(editingId, form);
    } else {
      add({ ...form, createdAt: new Date().toISOString() });
    }
    setForm(blank);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (p: ClinicPatient) => {
    setForm({
      name: p.name,
      age: p.age,
      gender: p.gender,
      phone: p.phone,
      email: p.email,
      conditions: p.conditions,
      allergies: p.allergies,
      lastVisit: p.lastVisit,
      notes: p.notes,
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Patients (EHR)</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Unlimited electronic health records — HIPAA &amp; GDPR compliant.</p>
        </div>
        <button
          onClick={() => {
            setForm(blank);
            setEditingId(null);
            setShowForm((s) => !s);
          }}
          className="btn-primary !py-2 !text-sm"
        >
          {showForm ? "Close" : "+ Add patient"}
        </button>
      </div>

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, condition, phone, email…"
          className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="mb-4 grid grid-cols-1 gap-3 rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm sm:grid-cols-2">
          <Input label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Input label="Age" value={form.age} onChange={(v) => setForm({ ...form, age: v })} />
          <label className="block">
            <span className="text-xs font-medium text-gray-600 dark:text-slate-300">Gender</span>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as ClinicPatient["gender"] })}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
          <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Input type="date" label="Last visit" value={form.lastVisit} onChange={(v) => setForm({ ...form, lastVisit: v })} />
          <div className="sm:col-span-2">
            <Input label="Conditions (comma separated)" value={form.conditions} onChange={(v) => setForm({ ...form, conditions: v })} />
          </div>
          <div className="sm:col-span-2">
            <Input label="Allergies" value={form.allergies} onChange={(v) => setForm({ ...form, allergies: v })} />
          </div>
          <div className="sm:col-span-2">
            <label className="block">
              <span className="text-xs font-medium text-gray-600 dark:text-slate-300">Clinical notes</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </label>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-outline !py-2 !text-sm">
              Cancel
            </button>
            <button type="submit" className="btn-primary !py-2 !text-sm">
              {editingId ? "Save changes" : "Add patient"}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.length === 0 ? (
          <p className="col-span-full rounded-xl bg-white dark:bg-slate-900 p-10 text-center text-sm text-gray-400 dark:text-slate-500 dark:text-slate-400">
            {search ? "No matches." : "No patients yet."}
          </p>
        ) : (
          filtered.map((p) => (
            <div key={p.id} className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-slate-100">{p.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {p.age || "—"} · {p.gender} · Last visit {p.lastVisit || "—"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(p)} className="rounded p-1.5 text-gray-400 dark:text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-primary-600" aria-label="Edit">
                    ✎
                  </button>
                  <button onClick={() => remove(p.id)} className="rounded p-1.5 text-gray-400 dark:text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
                    🗑
                  </button>
                </div>
              </div>
              {p.conditions && (
                <p className="mt-2 text-xs">
                  <span className="font-medium text-gray-500 dark:text-slate-400">Conditions: </span>
                  <span className="text-gray-700 dark:text-slate-300">{p.conditions}</span>
                </p>
              )}
              {p.allergies && (
                <p className="mt-1 text-xs">
                  <span className="font-medium text-gray-500 dark:text-slate-400">Allergies: </span>
                  <span className="text-red-700">{p.allergies}</span>
                </p>
              )}
              {p.notes && (
                <p className="mt-2 rounded bg-gray-50 dark:bg-slate-900 p-2 text-xs text-gray-700 dark:text-slate-300">{p.notes}</p>
              )}
              <p className="mt-2 text-xs text-gray-400 dark:text-slate-500 dark:text-slate-400">📞 {p.phone || "—"} · {p.email || "—"}</p>
            </div>
          ))
        )}
      </div>
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
