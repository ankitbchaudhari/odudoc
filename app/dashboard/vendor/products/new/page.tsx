"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CATEGORIES = [
  { value: "Medicines", emoji: "💊", color: "from-rose-500 to-pink-500" },
  { value: "Supplements", emoji: "🌿", color: "from-emerald-500 to-teal-500" },
  { value: "Medical Devices", emoji: "🩺", color: "from-sky-500 to-blue-500" },
  { value: "Baby Care", emoji: "🍼", color: "from-amber-400 to-orange-400" },
  { value: "Personal Care", emoji: "🧴", color: "from-violet-500 to-fuchsia-500" },
  { value: "Wellness", emoji: "💚", color: "from-lime-500 to-green-500" },
];

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
    setSaving(true);
    setError("");
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
      if (!res.ok) {
        setError(data.error || "Failed to add product");
        return;
      }
      router.push("/dashboard/vendor");
    } finally {
      setSaving(false);
    }
  };

  const activeCategory = CATEGORIES.find((c) => c.value === form.category) || CATEGORIES[0];
  const discount =
    form.originalPrice && form.price && Number(form.originalPrice) > Number(form.price)
      ? Math.round((1 - Number(form.price) / Number(form.originalPrice)) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-pink-50/40">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/dashboard/vendor"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors hover:text-indigo-600"
        >
          <span>←</span> Back to dashboard
        </Link>

        {/* Hero */}
        <div className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-fuchsia-600 to-pink-500 p-8 text-white shadow-xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-pink-300/30 blur-3xl"
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              New listing
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Add product</h1>
            <p className="mt-2 max-w-md text-sm text-white/90">
              Add a new SKU to your pharmacy. Goes live across every store you have it in stock.
            </p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="mt-6 space-y-6 overflow-hidden rounded-3xl border border-white/60 bg-white dark:bg-slate-900 p-6 shadow-sm sm:p-8"
        >
          {/* Product name */}
          <Field
            label="Product name"
            required
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            placeholder="e.g. Paracetamol 500mg, Vitamin D3 60000 IU"
          />

          {/* Description */}
          <div>
            <Label>Description</Label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Composition, dosage, manufacturer — anything patients should know."
              className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm placeholder:text-slate-400 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {/* Category — colorful tile picker */}
          <div>
            <Label>Category</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => {
                const active = form.category === c.value;
                return (
                  <button
                    type="button"
                    key={c.value}
                    onClick={() => setForm({ ...form, category: c.value })}
                    className={`group flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                      active
                        ? "border-transparent bg-gradient-to-br text-white shadow-md " + c.color
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                    }`}
                  >
                    <span className="text-lg">{c.emoji}</span>
                    {c.value}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pricing & stock */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-pink-50/50 p-5">
            <div className="flex items-center gap-2">
              <span className="text-lg">💰</span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Pricing & stock</h3>
              {discount > 0 && (
                <span className="ml-auto inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  −{discount}% off MRP
                </span>
              )}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <PrefixField
                prefix="$"
                label="Price"
                required
                type="number"
                step="0.01"
                value={form.price}
                onChange={(v) => setForm({ ...form, price: v })}
                placeholder="0.00"
              />
              <PrefixField
                prefix="$"
                label="MRP / original"
                type="number"
                step="0.01"
                value={form.originalPrice}
                onChange={(v) => setForm({ ...form, originalPrice: v })}
                placeholder="optional"
              />
              <Field
                label="Stock count"
                required
                type="number"
                value={form.stock}
                onChange={(v) => setForm({ ...form, stock: v })}
                placeholder="0"
              />
            </div>
          </div>

          {/* Prescription toggle — modern switch */}
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <input
              type="checkbox"
              checked={form.prescriptionRequired}
              onChange={(e) => setForm({ ...form, prescriptionRequired: e.target.checked })}
              className="peer sr-only"
            />
            <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-amber-500">
              <span className="absolute left-0.5 top-0.5 inline-block h-5 w-5 rounded-full bg-white dark:bg-slate-900 shadow transition peer-checked:translate-x-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                Prescription required
              </span>
              <span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-300">
                Patient must upload a valid Rx before checkout. Recommended for Schedule H drugs.
              </span>
            </span>
          </label>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          {/* Sticky-feeling submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className={`group flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r px-5 py-3.5 text-base font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 ${activeCategory.color}`}
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Adding product…
                </>
              ) : (
                <>
                  <span>{activeCategory.emoji}</span>
                  Add product
                  <span className="transition group-hover:translate-x-0.5">→</span>
                </>
              )}
            </button>
            <Link
              href="/dashboard/vendor"
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
      {children}
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  step,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </Label>
      <input
        type={type}
        step={step}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm placeholder:text-slate-400 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
    </div>
  );
}

function PrefixField({
  prefix,
  label,
  value,
  onChange,
  required,
  type = "text",
  step,
  placeholder,
}: {
  prefix: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </Label>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 dark:text-slate-400">
          {prefix}
        </span>
        <input
          type={type}
          step={step}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3 pl-8 pr-4 text-sm placeholder:text-slate-400 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>
    </div>
  );
}
