"use client";

// Patient-facing pharmacy compare + picker.
//
// Drops into the post-call prescription view. Flow:
//   1. Ask for geolocation (with a manual fallback so patients can skip
//      the browser prompt and still see "online" pharmacies that deliver
//      nationwide).
//   2. POST the Rx + coords to /api/pharmacy/search.
//   3. Render each store as a card with per-line pricing, total, pickup
//      vs delivery toggle, and a "Choose this store" action.
//   4. Selected choice is captured into local state and exposed via
//      onPick so the parent can continue the order flow.

import { useState } from "react";
import type { MedicineRow } from "./ConsultPrescriptionView";

interface StoreLine {
  rxLabel: string;
  medicineId: string | null;
  catalogName?: string;
  brandLabel?: string;
  strength?: string;
  unit?: string;
  priceInr?: number;
  stock?: number;
  inStock: boolean;
}

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
  distanceKm: number;
}

export type { StoreLine, Store };

export interface StoreQuote {
  store: Store;
  lines: StoreLine[];
  coveredCount: number;
  totalInr: number;
  pickup: boolean;
  delivery: boolean;
}

interface SearchResponse {
  radiusKm: number;
  unmatched: string[];
  stores: StoreQuote[];
}

interface PharmacyPickerProps {
  medicines: MedicineRow[];
  onPick?: (choice: {
    store: Store;
    fulfillment: "pickup" | "delivery";
    totalInr: number;
    lines: StoreLine[];
  }) => void;
}

export default function PharmacyPicker({ medicines, onPick }: PharmacyPickerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [selected, setSelected] = useState<{
    storeId: string;
    fulfillment: "pickup" | "delivery";
  } | null>(null);

  const run = async (lat: number, lng: number, delivery: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pharmacy/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat,
          lng,
          delivery,
          medicines: medicines.map((m) => m.name).filter(Boolean),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as SearchResponse & { error?: string };
      if (!res.ok) {
        setError(data?.error || "Couldn't find pharmacies right now.");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation isn't available — pick 'Online delivery' to continue.");
      useFallback();
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        run(c.lat, c.lng, deliveryOnly);
      },
      () => {
        setLoading(false);
        setError(
          "Couldn't read your location — we'll show nationwide delivery options instead.",
        );
        useFallback();
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 },
    );
  };

  // Fallback: pretend we're at the OduDoc HQ (Bangalore) so online
  // stores + seeded demo shops still surface.
  const useFallback = () => {
    const c = { lat: 12.95, lng: 77.62 };
    setCoords(c);
    run(c.lat, c.lng, true);
  };

  const refilter = (delivery: boolean) => {
    setDeliveryOnly(delivery);
    if (coords) run(coords.lat, coords.lng, delivery);
  };

  const pick = (q: StoreQuote, fulfillment: "pickup" | "delivery") => {
    setSelected({ storeId: q.store.id, fulfillment });
    onPick?.({ store: q.store, fulfillment, totalInr: q.totalInr, lines: q.lines });
  };

  return (
    <div className="mt-6 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm print:hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
            Find a pharmacy near you
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            We&apos;ll match your prescription against nearby stores and show
            prices side-by-side.
          </p>
        </div>
        {result && (
          <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
            Searched within {result.radiusKm} km
          </span>
        )}
      </div>

      {!result && !loading && (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={requestLocation}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Use my current location
          </button>
          <button
            onClick={useFallback}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-900"
          >
            Show online delivery pharmacies
          </button>
        </div>
      )}

      {loading && (
        <div className="mt-5 flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 dark:border-slate-700 border-t-primary-500" />
          Searching pharmacies…
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {result && (
        <>
          <div className="mt-5 flex items-center justify-between">
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-slate-800 p-1 text-xs font-medium">
              <button
                onClick={() => refilter(false)}
                className={`rounded-md px-3 py-1.5 ${
                  !deliveryOnly
                    ? "bg-primary-600 text-white"
                    : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-900"
                }`}
              >
                Pickup or delivery
              </button>
              <button
                onClick={() => refilter(true)}
                className={`rounded-md px-3 py-1.5 ${
                  deliveryOnly
                    ? "bg-primary-600 text-white"
                    : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-900"
                }`}
              >
                Delivery only
              </button>
            </div>
            <button
              onClick={requestLocation}
              className="text-xs font-medium text-primary-600 hover:underline"
            >
              Re-scan from my location
            </button>
          </div>

          {result.unmatched.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              These Rx items aren&apos;t in our catalog yet and won&apos;t appear in
              store pricing:{" "}
              <span className="font-semibold">{result.unmatched.join(", ")}</span>.
              You can still pick them up with the printed prescription.
            </div>
          )}

          <div className="mt-5 space-y-4">
            {result.stores.length === 0 && (
              <p className="rounded-lg border border-gray-100 bg-gray-50 dark:bg-slate-900 p-4 text-sm text-gray-500 dark:text-slate-400">
                No pharmacies found nearby. Try the &quot;Delivery only&quot;
                filter or use the offline pharmacy option.
              </p>
            )}
            {result.stores.map((q) => {
              const isSelected = selected?.storeId === q.store.id;
              return (
                <article
                  key={q.store.id}
                  className={`rounded-xl border p-4 transition ${
                    isSelected
                      ? "border-primary-500 bg-primary-50/40 shadow-sm"
                      : "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">{q.store.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                        {q.store.addressLine} · {q.store.city}
                        {q.store.pincode && q.store.pincode !== "000000"
                          ? ` · ${q.store.pincode}`
                          : ""}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-400 dark:text-slate-500">
                        {q.store.distanceKm > 0
                          ? `${q.store.distanceKm.toFixed(1)} km away`
                          : "Nationwide delivery"}
                        {q.store.hours ? ` · ${q.store.hours}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                        ₹{q.totalInr.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">
                        {q.coveredCount} of {q.lines.length} items
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 divide-y divide-gray-100 dark:divide-slate-800 rounded-lg border border-gray-100 bg-gray-50 dark:bg-slate-900 text-sm">
                    {q.lines.map((line, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-3 py-2"
                      >
                        <div>
                          <p className="font-medium text-gray-800 dark:text-slate-200">
                            {line.brandLabel || line.catalogName || line.rxLabel}
                            {line.strength ? ` · ${line.strength}` : ""}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-slate-400">
                            {line.unit || "—"} · prescribed as{" "}
                            <span className="italic">{line.rxLabel}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          {line.inStock && line.priceInr !== undefined ? (
                            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                              ₹{line.priceInr}
                            </p>
                          ) : (
                            <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
                              Not stocked
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {q.pickup && (
                      <button
                        onClick={() => pick(q, "pickup")}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold ${
                          isSelected && selected?.fulfillment === "pickup"
                            ? "border-primary-600 bg-primary-600 text-white"
                            : "border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-primary-400 hover:text-primary-700"
                        }`}
                      >
                        🏪 Pickup in-store
                      </button>
                    )}
                    {q.delivery && (
                      <button
                        onClick={() => pick(q, "delivery")}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold ${
                          isSelected && selected?.fulfillment === "delivery"
                            ? "border-primary-600 bg-primary-600 text-white"
                            : "border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-primary-400 hover:text-primary-700"
                        }`}
                      >
                        🛵 Home delivery
                      </button>
                    )}
                    {!q.pickup && !q.delivery && (
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        This store is not accepting orders right now.
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
