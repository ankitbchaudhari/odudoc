"use client";

// Shown after the patient picks a store in PharmacyPicker.
//
// Collects final details (delivery address if needed, optional contact
// phone), posts the order to /api/pharmacy/orders, and then flips into
// a "receipt" view showing the order number, pickup PIN, and live
// status. The PIN is front-and-centre so the patient can show it at
// the counter — the pharmacy staff require it to mark pickup complete.

import { useCallback, useEffect, useState } from "react";

interface StoreQuoteLine {
  rxLabel: string;
  medicineId: string | null;
  catalogName?: string;
  brandLabel?: string;
  strength?: string;
  unit?: string;
  priceInr?: number;
  inStock: boolean;
}

interface QuoteStore {
  id: string;
  name: string;
  addressLine: string;
  city: string;
  pincode: string;
  distanceKm: number;
  phone?: string;
  hours?: string;
}

export interface PharmacyOrderDraft {
  store: QuoteStore;
  fulfillment: "pickup" | "delivery";
  lines: StoreQuoteLine[];
  totalInr: number;
  roomId?: string;
  doctorName?: string;
}

interface PlacedOrder {
  id: string;
  orderNumber: string;
  status: string;
  pickupPin: string;
  fulfillment: "pickup" | "delivery";
  totalInr: number;
  storeId: string;
  deliveryAddress?: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  draft: PharmacyOrderDraft;
  onCancel: () => void;
}

export default function PharmacyOrderConfirm({ draft, onCancel }: Props) {
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<PlacedOrder | null>(null);

  // Poll status every 10s once placed so the "Accepted → Ready" flow
  // updates live without a manual refresh.
  const refresh = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/pharmacy/orders/${id}`);
      if (!r.ok) return;
      const d = (await r.json()) as { order: PlacedOrder };
      setOrder(d.order);
    } catch {
      /* transient */
    }
  }, []);

  useEffect(() => {
    if (!order) return;
    if (order.status === "completed" || order.status === "cancelled") return;
    const i = setInterval(() => refresh(order.id), 10_000);
    return () => clearInterval(i);
  }, [order, refresh]);

  const place = async () => {
    setPlacing(true);
    setError(null);
    try {
      const lines = draft.lines
        .filter((l) => l.inStock && l.priceInr !== undefined)
        .map((l) => ({
          rxLabel: l.rxLabel,
          medicineId: l.medicineId,
          catalogName: l.catalogName,
          brandLabel: l.brandLabel,
          strength: l.strength,
          unit: l.unit,
          priceInr: l.priceInr,
          quantity: 1,
        }));
      const res = await fetch("/api/pharmacy/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storeId: draft.store.id,
          fulfillment: draft.fulfillment,
          deliveryAddress: draft.fulfillment === "delivery" ? address : undefined,
          patientPhone: phone || undefined,
          roomId: draft.roomId,
          doctorName: draft.doctorName,
          lines,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        order?: PlacedOrder;
        error?: string;
      };
      if (!res.ok || !data.order) {
        setError(data.error || "Couldn't place the order.");
        return;
      }
      setOrder(data.order);
    } finally {
      setPlacing(false);
    }
  };

  const cancelOrder = async () => {
    if (!order) return;
    if (!confirm("Cancel this order?")) return;
    const res = await fetch(`/api/pharmacy/orders/${order.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: "cancelled" }),
    });
    if (res.ok) {
      const d = (await res.json()) as { order: PlacedOrder };
      setOrder(d.order);
    }
  };

  // ---- receipt view ----
  if (order) {
    return (
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6 print:hidden">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Order placed
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-emerald-900">
              {order.orderNumber}
            </p>
            <p className="mt-1 text-xs text-emerald-800">
              {draft.store.name} · {draft.fulfillment === "pickup" ? "Pickup" : "Home delivery"}
            </p>
          </div>
          <StatusPill status={order.status} />
        </div>

        {order.fulfillment === "pickup" && (
          <div className="mt-5 rounded-lg bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Show this PIN at the counter
            </p>
            <p className="mt-1 font-mono text-4xl font-bold tracking-widest text-gray-900">
              {order.pickupPin}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Staff will ask for it before handing over the medicines.
            </p>
          </div>
        )}

        {order.fulfillment === "delivery" && order.deliveryAddress && (
          <p className="mt-4 text-sm text-emerald-900">
            Delivering to:{" "}
            <span className="font-semibold">{order.deliveryAddress}</span>
          </p>
        )}

        <p className="mt-4 text-xs text-emerald-800">
          Total: ₹{order.totalInr.toLocaleString("en-IN")} · updated {new Date(order.updatedAt).toLocaleTimeString()}
        </p>

        {order.status !== "completed" && order.status !== "cancelled" && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => refresh(order.id)}
              className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Refresh status
            </button>
            {order.status === "placed" && (
              <button
                onClick={cancelOrder}
                className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Cancel order
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ---- confirm view ----
  return (
    <div className="mt-6 rounded-xl border border-primary-200 bg-primary-50/40 p-6 print:hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-700">
            Confirm your order
          </p>
          <p className="mt-1 font-semibold text-gray-900">{draft.store.name}</p>
          <p className="text-xs text-gray-600">
            {draft.store.addressLine} · {draft.store.city}
            {draft.store.distanceKm > 0 && ` · ${draft.store.distanceKm.toFixed(1)} km`}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-xs font-semibold text-gray-500 hover:underline"
        >
          Choose a different store
        </button>
      </div>

      <ul className="mt-4 space-y-1 text-sm">
        {draft.lines
          .filter((l) => l.inStock)
          .map((l, i) => (
            <li key={i} className="flex justify-between">
              <span className="text-gray-700">
                {l.brandLabel || l.catalogName || l.rxLabel}
                {l.strength ? ` · ${l.strength}` : ""}
              </span>
              <span className="font-semibold text-gray-900">
                ₹{l.priceInr}
              </span>
            </li>
          ))}
      </ul>

      <div className="mt-3 flex justify-between border-t border-gray-200 pt-2 text-sm font-semibold text-gray-900">
        <span>Total · {draft.fulfillment === "pickup" ? "pay at counter" : "pay on delivery"}</span>
        <span>₹{draft.totalInr.toLocaleString("en-IN")}</span>
      </div>

      <div className="mt-5 space-y-3">
        {draft.fulfillment === "delivery" && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Delivery address
            </label>
            <textarea
              required
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Flat, street, landmark, city, pincode"
            />
          </div>
        )}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Contact phone (optional)
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Phone (with country code, e.g. +1 …)"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        <button
          onClick={place}
          disabled={
            placing || (draft.fulfillment === "delivery" && address.trim().length < 10)
          }
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
        >
          {placing ? "Placing order…" : "Place order"}
        </button>
        <p className="mt-2 text-[11px] text-gray-500">
          Payment is collected at the pharmacy — either at pickup or on delivery.
        </p>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    placed: { bg: "bg-amber-100", text: "text-amber-800", label: "Waiting for pharmacy" },
    accepted: { bg: "bg-sky-100", text: "text-sky-800", label: "Pharmacy accepted · preparing" },
    ready: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Ready for pickup" },
    dispatched: { bg: "bg-indigo-100", text: "text-indigo-800", label: "Out for delivery" },
    completed: { bg: "bg-gray-100", text: "text-gray-700", label: "Completed" },
    cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
  };
  const m = map[status] || map.placed;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}
