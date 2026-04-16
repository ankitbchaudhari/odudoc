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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Categories</h1>
          <p className="mt-1 text-sm text-gray-500">Organize products into browsable categories.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary !text-sm">
          + New Category
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Slug</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Products</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cats.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">/{c.slug}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{c.description}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                    {c.productCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <button onClick={() => { setEditing(c); setShowForm(true); }} className="mr-3 font-medium text-primary-600 hover:underline">Edit</button>
                  <button onClick={() => del(c.id)} className="font-medium text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
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
