"use client";

import { useEffect, useState } from "react";

interface Coupon {
  id: string;
  code: string;
  discount: number;
  type: "percentage" | "fixed";
  minOrder: number;
  expiresAt: string;
  active: boolean;
  usageCount: number;
  usageLimit: number;
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);

  useEffect(() => {
    // Seed mock data
    setCoupons([
      {
        id: "c1",
        code: "WELCOME10",
        discount: 10,
        type: "percentage",
        minOrder: 50,
        expiresAt: "2026-12-31",
        active: true,
        usageCount: 47,
        usageLimit: 1000,
      },
      {
        id: "c2",
        code: "SAVE25",
        discount: 25,
        type: "fixed",
        minOrder: 100,
        expiresAt: "2026-06-30",
        active: true,
        usageCount: 12,
        usageLimit: 100,
      },
      {
        id: "c3",
        code: "FREESHIP",
        discount: 15,
        type: "percentage",
        minOrder: 0,
        expiresAt: "2026-05-01",
        active: false,
        usageCount: 203,
        usageLimit: 500,
      },
    ]);
  }, []);

  const deleteCoupon = (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    setCoupons(coupons.filter((c) => c.id !== id));
  };

  const toggleActive = (id: string) => {
    setCoupons(
      coupons.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage discount codes for your shop.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="btn-primary !text-sm"
        >
          + New Coupon
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Discount
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Min Order
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Usage
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Expires
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 text-sm font-mono font-bold text-gray-900">
                  {c.code}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {c.type === "percentage" ? `${c.discount}%` : `$${c.discount}`}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  ${c.minOrder}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {c.usageCount} / {c.usageLimit}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(c.expiresAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(c.id)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      c.active
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {c.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <button
                    onClick={() => {
                      setEditing(c);
                      setShowForm(true);
                    }}
                    className="mr-3 font-medium text-primary-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteCoupon(c.id)}
                    className="font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-gray-400"
                >
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
          onSave={(coupon) => {
            if (editing) {
              setCoupons(
                coupons.map((c) => (c.id === editing.id ? { ...c, ...coupon } : c))
              );
            } else {
              setCoupons([
                { ...coupon, id: `c-${Date.now()}`, usageCount: 0 },
                ...coupons,
              ]);
            }
            setShowForm(false);
          }}
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
  onSave: (c: Coupon) => void;
}) {
  const [form, setForm] = useState<Coupon>(
    initial || {
      id: "",
      code: "",
      discount: 10,
      type: "percentage",
      minOrder: 0,
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      active: true,
      usageCount: 0,
      usageLimit: 100,
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
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Code *
            </label>
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
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Discount *
              </label>
              <input
                required
                type="number"
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as "percentage" | "fixed" })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed ($)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Min Order ($)
              </label>
              <input
                type="number"
                value={form.minOrder}
                onChange={(e) => setForm({ ...form, minOrder: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Usage Limit
              </label>
              <input
                type="number"
                value={form.usageLimit}
                onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Expires At *
            </label>
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
            <button type="submit" className="btn-primary flex-1">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
