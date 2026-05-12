"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const CATEGORIES = ["Medicines", "Supplements", "Medical Devices", "Baby Care", "Personal Care", "Wellness"];

export default function EditVendorProduct() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "Medicines",
    price: "",
    originalPrice: "",
    stock: "",
    prescriptionRequired: false,
    status: "Active" as "Active" | "Draft" | "Out of Stock",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/vendors/me/products/${id}`);
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 404) setNotFound(true);
          setError(data.error || "");
          return;
        }
        const p = data.product;
        setForm({
          name: p.name || "",
          description: p.description || "",
          category: p.category || "Medicines",
          price: String(p.price ?? ""),
          originalPrice: p.originalPrice ? String(p.originalPrice) : "",
          stock: String(p.stock ?? ""),
          prescriptionRequired: Boolean(p.prescriptionRequired),
          status: p.status || "Active",
        });
      } finally { setLoading(false); }
    })();
  }, [id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/vendors/me/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          originalPrice: form.originalPrice ? Number(form.originalPrice) : Number(form.price),
          stock: Number(form.stock),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); return; }
      router.push("/dashboard/vendor");
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/vendors/me/products/${id}`, { method: "DELETE" });
      router.push("/dashboard/vendor");
    } finally { setDeleting(false); }
  };

  if (loading) return <div className="p-12 text-center text-gray-500 dark:text-slate-400">Loading…</div>;
  if (notFound) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Product not found</h1>
        <p className="mt-2 text-gray-500 dark:text-slate-400">This product may have been deleted.</p>
        <Link href="/dashboard/vendor" className="btn-primary mt-6 inline-block">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/dashboard/vendor" className="mb-4 inline-block text-sm text-primary-600 hover:underline">← Back to dashboard</Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Edit product</h1>
        <button onClick={remove} disabled={deleting}
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
          {deleting ? "Deleting…" : "Delete product"}
        </button>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm">
        <Field label="Product name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-300">Description</label>
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm outline-none focus:border-primary-500" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-300">Category *</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm outline-none focus:border-primary-500">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-300">Listing status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm outline-none focus:border-primary-500">
              <option value="Active">Active (visible)</option>
              <option value="Draft">Draft (hidden)</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price ($) *" type="number" step="0.01" value={form.price} onChange={(v) => setForm({ ...form, price: v })} required />
          <Field label="MRP / original price ($)" type="number" step="0.01" value={form.originalPrice} onChange={(v) => setForm({ ...form, originalPrice: v })} />
          <Field label="Stock count *" type="number" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} required />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
          <input type="checkbox" checked={form.prescriptionRequired} onChange={(e) => setForm({ ...form, prescriptionRequired: e.target.checked })} />
          Prescription required for this product
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-60">
          {saving ? "Saving…" : "Save changes"}
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
      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-300">{label}</label>
      <input type={type} step={step} required={required} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm outline-none focus:border-primary-500" />
    </div>
  );
}
