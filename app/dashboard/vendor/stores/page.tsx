"use client";

// Vendor-facing "Stores & stock" page.
//
// Combines store-location management (list, add, toggle pickup/delivery)
// with per-store inventory editing. Kept as a single page so small
// pharmacies can land here, add one store, and drop in 20 SKUs without
// page-hopping.
//
// Geolocation trick: a "Use my current location" button on the new-store
// form populates lat/lng from the browser so vendors don't have to
// paste coordinates from Google Maps. They can still override manually.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface Store {
  id: string;
  vendorId: string;
  name: string;
  addressLine: string;
  city: string;
  pincode: string;
  lat: number;
  lng: number;
  pickup: boolean;
  delivery: boolean;
  deliveryRadiusKm?: number;
  phone?: string;
  hours?: string;
  active: boolean;
}

interface InventoryRow {
  id: string;
  storeId: string;
  medicineId: string;
  brandLabel?: string;
  strength?: string;
  priceInr: number;
  unit: string;
  stock: number;
  expiresAt?: string;
}

interface CatalogItem {
  id: string;
  generic: string;
  brands: string[];
  form: string;
  strengths: string[];
  otc: boolean;
}

const emptyForm = {
  name: "",
  addressLine: "",
  city: "",
  pincode: "",
  lat: "",
  lng: "",
  phone: "",
  hours: "",
  pickup: true,
  delivery: false,
  deliveryRadiusKm: "",
};

export default function VendorStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [openStoreId, setOpenStoreId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, cr] = await Promise.all([
        fetch("/api/vendors/me/stores"),
        fetch("/api/medicines/catalog"),
      ]);
      if (!sr.ok) {
        const d = await sr.json().catch(() => ({}));
        setError(d?.error || "Couldn't load stores.");
        return;
      }
      const sd = (await sr.json()) as { stores: Store[] };
      const cd = (await cr.json()) as { items: CatalogItem[] };
      setStores(sd.stores);
      setCatalog(cd.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fillCurrentLocation = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
      },
      () => setError("Couldn't read your location. Paste coords from Google Maps instead."),
    );
  };

  const submitStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/vendors/me/stores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          addressLine: form.addressLine,
          city: form.city,
          pincode: form.pincode,
          lat: Number(form.lat),
          lng: Number(form.lng),
          pickup: form.pickup,
          delivery: form.delivery,
          deliveryRadiusKm: form.deliveryRadiusKm
            ? Number(form.deliveryRadiusKm)
            : undefined,
          phone: form.phone,
          hours: form.hours,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Couldn't save.");
        return;
      }
      setForm(emptyForm);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteStore = async (id: string) => {
    if (!confirm("Remove this store and all its inventory?")) return;
    const res = await fetch(`/api/vendors/me/stores/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  };

  const toggleFlag = async (id: string, patch: Partial<Store>) => {
    const res = await fetch(`/api/vendors/me/stores/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) await load();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-emerald-50/40 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <Link href="/dashboard/vendor" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-sky-600">
          ← Back to dashboard
        </Link>

        {/* Hero */}
        <div className="relative mt-4 mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-600 p-8 text-white shadow-xl">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              Pharmacy · Locations
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Stores &amp; stock</h1>
            <p className="mt-2 max-w-md text-sm text-white/90">
              Manage your physical pharmacy locations and the medicines each one stocks.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Existing stores */}
        <section className="space-y-4">
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : stores.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              No stores yet. Add your first pharmacy location below.
            </p>
          ) : (
            stores.map((s) => (
              <StoreCard
                key={s.id}
                store={s}
                catalog={catalog}
                open={openStoreId === s.id}
                onToggleOpen={() =>
                  setOpenStoreId((cur) => (cur === s.id ? null : s.id))
                }
                onToggle={(patch) => toggleFlag(s.id, patch)}
                onDelete={() => deleteStore(s.id)}
              />
            ))
          )}
        </section>

        {/* New-store form */}
        <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Add a store</h2>
          <p className="mt-1 text-xs text-gray-500">
            Once added, you can load its inventory from the list above.
          </p>
          <form onSubmit={submitStore} className="mt-5 grid gap-4 sm:grid-cols-2">
            <FormField label="Store name">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="OduDoc Pharmacy — Indiranagar"
              />
            </FormField>
            <FormField label="Phone (optional)">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input"
                placeholder="+1 555 123 4567"
              />
            </FormField>
            <FormField label="Address line" className="sm:col-span-2">
              <input
                required
                value={form.addressLine}
                onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
                className="input"
                placeholder="100 Feet Road, Indiranagar"
              />
            </FormField>
            <FormField label="City">
              <input
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="input"
                placeholder="Bangalore"
              />
            </FormField>
            <FormField label="Pincode">
              <input
                required
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                className="input"
                placeholder="560038"
              />
            </FormField>
            <FormField label="Latitude">
              <input
                required
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
                className="input"
                placeholder="12.9719"
              />
            </FormField>
            <FormField label="Longitude">
              <input
                required
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
                className="input"
                placeholder="77.6412"
              />
            </FormField>
            <FormField label="Hours (free text, optional)" className="sm:col-span-2">
              <input
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                className="input"
                placeholder="9:00 AM – 10:30 PM"
              />
            </FormField>
            <FormField label="Delivery radius (km, optional)">
              <input
                type="number"
                min={0}
                step={0.5}
                value={form.deliveryRadiusKm}
                onChange={(e) =>
                  setForm({ ...form, deliveryRadiusKm: e.target.value })
                }
                className="input"
                placeholder="6"
              />
            </FormField>
            <div className="flex items-end gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.pickup}
                  onChange={(e) => setForm({ ...form, pickup: e.target.checked })}
                />
                Pickup
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.delivery}
                  onChange={(e) => setForm({ ...form, delivery: e.target.checked })}
                />
                Delivery
              </label>
            </div>
            <div className="sm:col-span-2 flex items-center justify-between border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={fillCurrentLocation}
                className="text-xs font-semibold text-primary-600 hover:underline"
              >
                📍 Use my current location for lat/lng
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Add store"}
              </button>
            </div>
          </form>
        </section>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #d1d5db;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
      `}</style>
    </div>
  );
}

function FormField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}

// ---- Store card (with inline inventory editor) -------------------

function StoreCard({
  store,
  catalog,
  open,
  onToggleOpen,
  onToggle,
  onDelete,
}: {
  store: Store;
  catalog: CatalogItem[];
  open: boolean;
  onToggleOpen: () => void;
  onToggle: (patch: Partial<Store>) => void;
  onDelete: () => void;
}) {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState({
    medicineId: "",
    brandLabel: "",
    strength: "",
    priceInr: "",
    unit: "per strip of 10",
    stock: "",
  });
  const [busyRow, setBusyRow] = useState<string | null>(null);

  const loadInv = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vendors/me/stores/${store.id}/inventory`);
      if (res.ok) {
        const d = (await res.json()) as { rows: InventoryRow[] };
        setRows(d.rows);
      }
    } finally {
      setLoading(false);
    }
  }, [store.id]);

  useEffect(() => {
    if (open) loadInv();
  }, [open, loadInv]);

  const catalogById = useMemo(() => {
    const map = new Map<string, CatalogItem>();
    for (const c of catalog) map.set(c.id, c);
    return map;
  }, [catalog]);

  const addRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adding.medicineId) return;
    const res = await fetch(`/api/vendors/me/stores/${store.id}/inventory`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        medicineId: adding.medicineId,
        brandLabel: adding.brandLabel || undefined,
        strength: adding.strength || undefined,
        priceInr: Number(adding.priceInr),
        unit: adding.unit,
        stock: Number(adding.stock),
      }),
    });
    if (res.ok) {
      setAdding({
        medicineId: "",
        brandLabel: "",
        strength: "",
        priceInr: "",
        unit: "per strip of 10",
        stock: "",
      });
      await loadInv();
    }
  };

  const delRow = async (id: string) => {
    setBusyRow(id);
    try {
      const res = await fetch(
        `/api/vendors/me/stores/${store.id}/inventory/${id}`,
        { method: "DELETE" },
      );
      if (res.ok) await loadInv();
    } finally {
      setBusyRow(null);
    }
  };

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900">{store.name}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {store.addressLine} · {store.city} · {store.pincode}
          </p>
          <p className="mt-1 text-[11px] text-gray-400">
            {store.lat.toFixed(4)}, {store.lng.toFixed(4)}
            {store.hours ? ` · ${store.hours}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Pill on={store.pickup} label="Pickup" onClick={() => onToggle({ pickup: !store.pickup })} />
          <Pill on={store.delivery} label="Delivery" onClick={() => onToggle({ delivery: !store.delivery })} />
          <Pill on={store.active} label={store.active ? "Active" : "Paused"} onClick={() => onToggle({ active: !store.active })} />
          <button
            onClick={onDelete}
            className="rounded-md border border-red-200 px-2.5 py-1 font-semibold text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </header>

      <div className="mt-4 border-t border-gray-100 pt-3">
        <button
          onClick={onToggleOpen}
          className="text-xs font-semibold text-primary-600 hover:underline"
        >
          {open ? "Hide inventory ▲" : `Manage inventory ▼`}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          {/* Add row */}
          <form onSubmit={addRow} className="grid gap-2 rounded-lg bg-gray-50 p-3 text-sm md:grid-cols-6">
            <select
              required
              value={adding.medicineId}
              onChange={(e) => setAdding({ ...adding, medicineId: e.target.value })}
              className="md:col-span-2 rounded-md border border-gray-300 px-2 py-1.5"
            >
              <option value="">— Medicine —</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.generic} {c.brands[0] ? `(${c.brands[0]})` : ""}
                </option>
              ))}
            </select>
            <input
              value={adding.brandLabel}
              onChange={(e) => setAdding({ ...adding, brandLabel: e.target.value })}
              placeholder="Brand (optional)"
              className="rounded-md border border-gray-300 px-2 py-1.5"
            />
            <input
              value={adding.strength}
              onChange={(e) => setAdding({ ...adding, strength: e.target.value })}
              placeholder="Strength"
              className="rounded-md border border-gray-300 px-2 py-1.5"
            />
            <input
              required
              type="number"
              min={0}
              value={adding.priceInr}
              onChange={(e) => setAdding({ ...adding, priceInr: e.target.value })}
              placeholder="Price ₹"
              className="rounded-md border border-gray-300 px-2 py-1.5"
            />
            <input
              required
              type="number"
              min={0}
              value={adding.stock}
              onChange={(e) => setAdding({ ...adding, stock: e.target.value })}
              placeholder="Stock"
              className="rounded-md border border-gray-300 px-2 py-1.5"
            />
            <input
              value={adding.unit}
              onChange={(e) => setAdding({ ...adding, unit: e.target.value })}
              placeholder="Unit label"
              className="md:col-span-5 rounded-md border border-gray-300 px-2 py-1.5"
            />
            <button
              type="submit"
              className="rounded-md bg-primary-600 px-3 py-1.5 font-semibold text-white hover:bg-primary-700"
            >
              Add
            </button>
          </form>

          {/* Rows */}
          {loading ? (
            <p className="text-xs text-gray-500">Loading inventory…</p>
          ) : rows.length === 0 ? (
            <p className="text-xs text-gray-500">
              No inventory yet — add your first line above.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Medicine</th>
                    <th className="px-3 py-2">Brand · strength</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-right">Stock</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => {
                    const cat = catalogById.get(r.medicineId);
                    return (
                      <tr key={r.id}>
                        <td className="px-3 py-2 font-medium text-gray-800">
                          {cat?.generic || r.medicineId}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {r.brandLabel || cat?.brands[0] || "—"}
                          {r.strength ? ` · ${r.strength}` : ""}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{r.unit}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900">
                          ₹{r.priceInr}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600">{r.stock}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => delRow(r.id)}
                            disabled={busyRow === r.id}
                            className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function Pill({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
        on ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {on ? "✓ " : "○ "}
      {label}
    </button>
  );
}
