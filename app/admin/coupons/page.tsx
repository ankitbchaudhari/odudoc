"use client";

import { useCallback, useEffect, useState } from "react";

interface Coupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrder: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  active: boolean;
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/coupons", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    if (res.ok) setCoupons((cs) => cs.filter((c) => c.id !== id));
  };

  const toggle = async (c: Coupon) => {
    const next = !c.active;
    setCoupons((cs) => cs.map((x) => (x.id === c.id ? { ...x, active: next } : x)));
    await fetch(`/api/admin/coupons/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: next }),
    });
  };

  const save = async (form: Coupon) => {
    if (editing) {
      const res = await fetch(`/api/admin/coupons/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setCoupons((cs) => cs.map((c) => (c.id === editing.id ? { ...c, ...form } : c)));
        setShowForm(false);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Update failed");
      }
    } else {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setCoupons((cs) => [data.coupon, ...cs]);
        setShowForm(false);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Create failed");
      }
    }
  };

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 via-pink-600 to-fuchsia-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-yellow-300/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
              </span>
              {coupons.length} coupons · {coupons.filter((c) => c.active).length} active
            </div>
            <h1 className="text-2xl font-bold">Coupons</h1>
            <p className="mt-1 text-sm text-pink-50/90">Create and manage discount codes for your shop.</p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            + New Coupon
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-gradient-to-r from-rose-50 to-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500" />
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gradient-to-r from-rose-50/60 via-pink-50/40 to-fuchsia-50/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Discount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Min Order</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Usage</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Expires</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              coupons.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-rose-50/30">
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-gradient-to-r from-rose-50 to-pink-50 px-2.5 py-1 font-mono text-sm font-bold text-rose-700 ring-1 ring-rose-200">{c.code}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                    {c.discountType === "percentage" ? `${c.discountValue}%` : `$${c.discountValue}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">${c.minOrder}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.usedCount} / {c.maxUses || "∞"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(c.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggle(c)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition hover:-translate-y-0.5 ${
                        c.active
                          ? "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200"
                          : "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-600 ring-slate-200"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${c.active ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {c.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => {
                        setEditing(c);
                        setShowForm(true);
                      }}
                      className="mr-2 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 ring-1 ring-indigo-100 transition hover:-translate-y-0.5 hover:bg-indigo-100 hover:shadow"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 ring-1 ring-rose-100 transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            {!loading && coupons.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  No coupons yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <CouponForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSave={save}
        />
      )}
    </div>
  );
}

function CouponForm({
  initial,
  onClose,
  onSave,
}: {
  initial: Coupon | null;
  onClose: () => void;
  onSave: (c: Coupon) => void | Promise<void>;
}) {
  const [form, setForm] = useState<Coupon>(
    initial || {
      id: "",
      code: "",
      discountType: "percentage",
      discountValue: 10,
      minOrder: 0,
      maxUses: 100,
      usedCount: 0,
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      active: true,
    }
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-xl font-bold text-gray-900">
          {initial ? "Edit Coupon" : "New Coupon"}
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Code *</label>
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="SUMMER20"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm uppercase outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Discount *</label>
              <input
                required
                type="number"
                min={0}
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Type</label>
              <select
                value={form.discountType}
                onChange={(e) =>
                  setForm({ ...form, discountType: e.target.value as "percentage" | "fixed" })
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed ($)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Min Order ($)</label>
              <input
                type="number"
                min={0}
                value={form.minOrder}
                onChange={(e) => setForm({ ...form, minOrder: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Usage Limit (0 = ∞)</label>
              <input
                type="number"
                min={0}
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Expires At *</label>
            <input
              required
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Active
          </label>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button type="submit" className="flex-1 rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
