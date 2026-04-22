"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CATEGORIES = ["Medicines", "Supplements", "Medical Devices", "Baby Care", "Personal Care", "Wellness"];

export default function NewVendorProduct() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "Medicines",
    price: "",
    originalPrice: "",
    stock: "",
    prescriptionRequired: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/vendors/me/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          originalPrice: form.originalPrice ? Number(form.originalPrice) : Number(form.price),
          stock: Number(form.stock),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to add product"); return; }
      router.push("/dashboard/vendor");
    } finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/dashboard/vendor" className="mb-4 inline-block text-sm text-primary-600 hover:underline">← Back to dashboard</Link>
      <h1 className="text-2xl font-bold text-gray-900">Add product</h1>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <Field label="Product name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Category *</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price ($) *" type="number" step="0.01" value={form.price} onChange={(v) => setForm({ ...form, price: v })} required />
          <Field label="MRP / original price ($)" type="number" step="0.01" value={form.originalPrice} onChange={(v) => setForm({ ...form, originalPrice: v })} />
          <Field label="Stock count *" type="number" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} required />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.prescriptionRequired} onChange={(e) => setForm({ ...form, prescriptionRequired: e.target.checked })} />
          Prescription required for this product
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-60">
          {saving ? "Adding…" : "Add product"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label, value, onChange, required, type = "text", step,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; step?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <input type={type} step={step} required={required} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
    </div>
  );
}
