"use client";

import { useState } from "react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  productCount: number;
  parent?: string;
}

export default function AdminCategories() {
  const [cats, setCats] = useState<Category[]>([
    { id: "1", name: "Medicines", slug: "medicines", description: "OTC and prescription drugs", productCount: 124 },
    { id: "2", name: "Vitamins & Supplements", slug: "vitamins", description: "Daily vitamins and nutritional supplements", productCount: 86 },
    { id: "3", name: "Medical Devices", slug: "devices", description: "BP monitors, thermometers, glucose meters", productCount: 42 },
    { id: "4", name: "Personal Care", slug: "personal-care", description: "Skincare, haircare, hygiene", productCount: 78 },
    { id: "5", name: "Baby Care", slug: "baby-care", description: "Diapers, formula, baby essentials", productCount: 54 },
    { id: "6", name: "First Aid", slug: "first-aid", description: "Bandages, antiseptics, wound care", productCount: 33 },
  ]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);

  const del = (id: string) => {
    if (!confirm("Delete this category?")) return;
    setCats(cats.filter((c) => c.id !== id));
  };

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-emerald-600 to-green-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-lime-300/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-400" />
              </span>
              {cats.length} categories · {cats.reduce((s, c) => s + c.productCount, 0)} products
            </div>
            <h1 className="text-2xl font-bold">Product Categories</h1>
            <p className="mt-1 text-sm text-emerald-50/90">Organize products into browsable categories.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            + New Category
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500" />
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gradient-to-r from-teal-50/60 via-emerald-50/40 to-green-50/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Slug</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Products</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cats.map((c, i) => {
              const palettes = [
                { grad: "from-emerald-400 to-teal-500", pill: "from-emerald-50 to-teal-50 text-emerald-700 ring-emerald-200" },
                { grad: "from-sky-400 to-blue-500", pill: "from-sky-50 to-blue-50 text-sky-700 ring-sky-200" },
                { grad: "from-violet-400 to-purple-500", pill: "from-violet-50 to-purple-50 text-violet-700 ring-violet-200" },
                { grad: "from-pink-400 to-rose-500", pill: "from-pink-50 to-rose-50 text-pink-700 ring-pink-200" },
                { grad: "from-amber-400 to-orange-500", pill: "from-amber-50 to-orange-50 text-amber-700 ring-amber-200" },
                { grad: "from-cyan-400 to-sky-500", pill: "from-cyan-50 to-sky-50 text-cyan-700 ring-cyan-200" },
              ];
              const p = palettes[i % palettes.length];
              return (
                <tr key={c.id} className="transition-colors hover:bg-emerald-50/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${p.grad} text-white shadow ring-2 ring-white`}>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700 ring-1 ring-slate-200">/{c.slug}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.description}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full bg-gradient-to-r ${p.pill} px-2.5 py-1 text-xs font-semibold ring-1`}>
                      {c.productCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button onClick={() => { setEditing(c); setShowForm(true); }} className="mr-2 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 ring-1 ring-indigo-100 transition hover:-translate-y-0.5 hover:bg-indigo-100 hover:shadow">Edit</button>
                    <button onClick={() => del(c.id)} className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 ring-1 ring-rose-100 transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow">Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <CategoryForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSave={(data) => {
            if (editing) {
              setCats(cats.map((c) => (c.id === editing.id ? { ...c, ...data } : c)));
            } else {
              setCats([{ ...data, id: `${Date.now()}`, productCount: 0 }, ...cats]);
            }
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function CategoryForm({
  initial,
  onClose,
  onSave,
}: {
  initial: Category | null;
  onClose: () => void;
  onSave: (c: Category) => void;
}) {
  const [form, setForm] = useState<Category>(
    initial || { id: "", name: "", slug: "", description: "", productCount: 0 }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-xl font-bold text-gray-900">{initial ? "Edit Category" : "New Category"}</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Name *</label>
            <input required value={form.name} onChange={(e) => {
              const name = e.target.value;
              setForm({ ...form, name, slug: form.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") });
            }} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Slug</label>
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
