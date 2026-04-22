"use client";

// Admin panel for running site-wide special discount offers.
// Create, toggle active, and delete offers. Auto-apply offers surface as a
// banner on the site and auto-discount the cart total.

import { useEffect, useState } from "react";
import type { Offer, OfferKind } from "@/lib/offers-store";

type NewOffer = {
  title: string;
  bannerText: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrder: number;
  kind: OfferKind;
  startsAt: string;
  endsAt: string;
  active: boolean;
  autoApply: boolean;
};

const EMPTY: NewOffer = {
  title: "",
  bannerText: "",
  discountType: "percentage",
  discountValue: 10,
  minOrder: 0,
  kind: "site",
  startsAt: "",
  endsAt: "",
  active: true,
  autoApply: true,
};

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewOffer>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/offers", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setOffers(d.offers || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    if (!form.title.trim() || form.discountValue <= 0) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        setShowForm(false);
        setForm(EMPTY);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggle(o: Offer, field: "active" | "autoApply") {
    await fetch("/api/admin/offers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: o.id, [field]: !o[field] }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this offer?")) return;
    await fetch(`/api/admin/offers?id=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-fuchsia-50/30 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-600 via-rose-600 to-amber-500 p-8 text-white shadow-xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider ring-1 ring-white/30">
            🎁 Promotions
          </span>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">Special Offers</h1>
          <p className="mt-2 text-white/85">
            Run site-wide discounts. Auto-apply offers show as a banner to every
            visitor and deduct automatically at checkout.
          </p>
        </div>

        {/* Toolbar */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {loading ? "Loading…" : `${offers.length} offer${offers.length === 1 ? "" : "s"}`}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105"
          >
            + New offer
          </button>
        </div>

        {/* List */}
        <div className="mt-4 space-y-3">
          {!loading && offers.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-gray-500">
              No offers yet. Click <strong>+ New offer</strong> to run your
              first one.
            </div>
          )}
          {offers.map((o) => {
            const liveNow = isLive(o);
            return (
              <div
                key={o.id}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {o.title}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          liveNow
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {liveNow ? "● Live now" : "Paused / Scheduled"}
                      </span>
                      {o.autoApply && (
                        <span className="rounded-full bg-fuchsia-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fuchsia-700">
                          Auto-apply
                        </span>
                      )}
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        {o.kind}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 italic">
                      “{o.bannerText}”
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>
                        <strong className="text-gray-700">
                          {o.discountType === "percentage"
                            ? `${o.discountValue}%`
                            : `$${o.discountValue}`}
                        </strong>{" "}
                        off
                      </span>
                      {o.minOrder > 0 && <span>Min order ${o.minOrder}</span>}
                      {o.startsAt && (
                        <span>Starts {formatDate(o.startsAt)}</span>
                      )}
                      {o.endsAt && <span>Ends {formatDate(o.endsAt)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggle(o, "active")}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                        o.active
                          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      }`}
                    >
                      {o.active ? "Pause" : "Resume"}
                    </button>
                    <button
                      onClick={() => toggle(o, "autoApply")}
                      className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      {o.autoApply ? "Disable auto-apply" : "Enable auto-apply"}
                    </button>
                    <button
                      onClick={() => remove(o.id)}
                      className="rounded-xl border-2 border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New offer modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Create offer</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Internal title" span={2}>
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="Summer health sale"
                  className="w-full rounded-xl border-2 border-gray-200 p-2.5 text-sm focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10"
                />
              </Field>
              <Field label="Banner text (shown to visitors)" span={2}>
                <input
                  value={form.bannerText}
                  onChange={(e) =>
                    setForm({ ...form, bannerText: e.target.value })
                  }
                  placeholder="20% OFF all consultations — today only!"
                  className="w-full rounded-xl border-2 border-gray-200 p-2.5 text-sm focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Leave blank to auto-generate.
                </p>
              </Field>
              <Field label="Discount type">
                <select
                  value={form.discountType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      discountType: e.target.value as "percentage" | "fixed",
                    })
                  }
                  className="w-full rounded-xl border-2 border-gray-200 p-2.5 text-sm"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed ($)</option>
                </select>
              </Field>
              <Field label="Discount value">
                <input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      discountValue: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border-2 border-gray-200 p-2.5 text-sm"
                />
              </Field>
              <Field label="Min order">
                <input
                  type="number"
                  value={form.minOrder}
                  onChange={(e) =>
                    setForm({ ...form, minOrder: Number(e.target.value) })
                  }
                  className="w-full rounded-xl border-2 border-gray-200 p-2.5 text-sm"
                />
              </Field>
              <Field label="Applies to">
                <select
                  value={form.kind}
                  onChange={(e) =>
                    setForm({ ...form, kind: e.target.value as OfferKind })
                  }
                  className="w-full rounded-xl border-2 border-gray-200 p-2.5 text-sm"
                >
                  <option value="site">Whole site</option>
                  <option value="consult">Consultations only</option>
                  <option value="shop">Shop only</option>
                </select>
              </Field>
              <Field label="Starts (optional)">
                <input
                  type="date"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm({ ...form, startsAt: e.target.value })
                  }
                  className="w-full rounded-xl border-2 border-gray-200 p-2.5 text-sm"
                />
              </Field>
              <Field label="Ends (optional)">
                <input
                  type="date"
                  value={form.endsAt}
                  onChange={(e) =>
                    setForm({ ...form, endsAt: e.target.value })
                  }
                  className="w-full rounded-xl border-2 border-gray-200 p-2.5 text-sm"
                />
              </Field>
              <Field span={2}>
                <div className="flex gap-4 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) =>
                        setForm({ ...form, active: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    Active
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.autoApply}
                      onChange={(e) =>
                        setForm({ ...form, autoApply: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    Auto-apply (show banner + auto-discount)
                  </label>
                </div>
              </Field>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY);
                }}
                className="rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={create}
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:scale-105 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Create offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  span = 1,
  children,
}: {
  label?: string;
  span?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      {label && (
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isLive(o: Offer): boolean {
  if (!o.active) return false;
  const now = new Date();
  if (o.startsAt && new Date(o.startsAt) > now) return false;
  if (o.endsAt && new Date(o.endsAt) < now) return false;
  return true;
}
