"use client";

// Vendor queue for prescription (Rx) orders.
//
// Rx orders have a narrower lifecycle than shop orders, and their PIN
// + pickup flow doesn't fit neatly into the existing /dashboard/vendor/orders
// page, so we give them their own screen. The design intentionally mirrors
// a pharmacy counter workflow: tabs for Placed / Accepted / Ready /
// Dispatched / Completed, each order card shows the medicines, the PIN
// challenge (for pickup), and the next-state action inline.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Status =
  | "placed"
  | "accepted"
  | "ready"
  | "dispatched"
  | "completed"
  | "cancelled";

interface OrderLine {
  rxLabel: string;
  medicineId: string | null;
  catalogName?: string;
  brandLabel?: string;
  strength?: string;
  unit?: string;
  priceInr: number;
  quantity: number;
}

interface Order {
  id: string;
  orderNumber: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  storeId: string;
  fulfillment: "pickup" | "delivery";
  deliveryAddress?: string;
  pickupPin: string;
  lines: OrderLine[];
  totalInr: number;
  status: Status;
  createdAt: string;
  updatedAt: string;
  doctorName?: string;
}

interface Store {
  id: string;
  name: string;
}

const TABS: Array<{ id: Status | "all"; label: string }> = [
  { id: "placed", label: "New" },
  { id: "accepted", label: "Preparing" },
  { id: "ready", label: "Ready" },
  { id: "dispatched", label: "Out for delivery" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "All" },
];

export default function VendorRxOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [tab, setTab] = useState<Status | "all">("placed");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [or, sr] = await Promise.all([
        fetch(`/api/vendors/me/pharmacy-orders?status=${tab}`),
        fetch("/api/vendors/me/stores"),
      ]);
      if (or.ok) {
        const d = (await or.json()) as { orders: Order[] };
        setOrders(d.orders);
      }
      if (sr.ok) {
        const d = (await sr.json()) as { stores: Store[] };
        setStores(d.stores);
      }
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const storeNameById = (id: string) =>
    stores.find((s) => s.id === id)?.name || "—";

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-5">
          <Link href="/dashboard/vendor" className="text-xs text-gray-500 hover:underline">
            ← Back to dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Prescription orders</h1>
          <p className="text-sm text-gray-500">
            Rx fulfillment queue. Confirm the pickup PIN before handing over medicines.
          </p>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                tab === t.id
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={load}
            className="ml-auto rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100"
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            No orders in this tab.
          </p>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                storeName={storeNameById(o.storeId)}
                onChanged={load}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  storeName,
  onChanged,
}: {
  order: Order;
  storeName: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [pinEntry, setPinEntry] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const go = async (to: Status, extra: { pin?: string } = {}) => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/pharmacy/orders/${order.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to, ...extra }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d?.error || "Couldn't update.");
        return;
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const actions: React.ReactNode[] = [];
  if (order.status === "placed") {
    actions.push(
      <Btn key="accept" onClick={() => go("accepted")} tone="primary">
        Accept order
      </Btn>,
      <Btn key="cancel" onClick={() => go("cancelled")} tone="danger">
        Reject
      </Btn>,
    );
  } else if (order.status === "accepted") {
    if (order.fulfillment === "pickup") {
      actions.push(
        <Btn key="ready" onClick={() => go("ready")} tone="primary">
          Mark ready for pickup
        </Btn>,
      );
    } else {
      actions.push(
        <Btn key="disp" onClick={() => go("dispatched")} tone="primary">
          Mark dispatched
        </Btn>,
      );
    }
    actions.push(
      <Btn key="cancel" onClick={() => go("cancelled")} tone="danger">
        Cancel
      </Btn>,
    );
  } else if (order.status === "ready") {
    // Pickup: require PIN entry to complete.
    actions.push(
      <div key="pin" className="flex flex-wrap items-center gap-2">
        <input
          value={pinEntry}
          onChange={(e) => setPinEntry(e.target.value.replace(/\D/g, "").slice(0, 4))}
          maxLength={4}
          placeholder="PIN"
          className="w-20 rounded-md border border-gray-300 px-2 py-1 font-mono text-sm tracking-widest"
        />
        <Btn
          onClick={() => go("completed", { pin: pinEntry })}
          tone="primary"
          disabled={pinEntry.length !== 4}
        >
          Confirm pickup
        </Btn>
      </div>,
    );
  } else if (order.status === "dispatched") {
    actions.push(
      <Btn key="done" onClick={() => go("completed")} tone="primary">
        Mark delivered
      </Btn>,
    );
  }

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-sm font-bold text-gray-900">{order.orderNumber}</p>
            <StatusPill status={order.status} />
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
              {order.fulfillment === "pickup" ? "🏪 Pickup" : "🛵 Delivery"}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {order.patientName}
            {order.patientPhone && (
              <span className="ml-2 font-normal text-gray-500">{order.patientPhone}</span>
            )}
          </p>
          <p className="text-xs text-gray-500">
            {storeName} · placed {new Date(order.createdAt).toLocaleString()}
            {order.doctorName ? ` · by ${order.doctorName}` : ""}
          </p>
          {order.fulfillment === "delivery" && order.deliveryAddress && (
            <p className="mt-1 text-xs text-gray-600">
              📍 {order.deliveryAddress}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900">
            ₹{order.totalInr.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-gray-500">
            {order.lines.length} item{order.lines.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <div className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50 text-sm">
        {order.lines.map((l, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="font-medium text-gray-800">
                {l.brandLabel || l.catalogName || l.rxLabel}
                {l.strength ? ` · ${l.strength}` : ""}
              </p>
              <p className="text-[11px] text-gray-500">
                {l.unit || "—"} · qty {l.quantity} · rx: {l.rxLabel}
              </p>
            </div>
            <p className="text-sm font-semibold text-gray-900">₹{l.priceInr}</p>
          </div>
        ))}
      </div>

      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}

      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {actions.map((a, i) => (
            <span key={i}>{a}</span>
          ))}
          {busy && <span className="text-xs text-gray-500">Saving…</span>}
        </div>
      )}
    </article>
  );
}

function Btn({
  onClick,
  children,
  tone,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  tone: "primary" | "danger";
  disabled?: boolean;
}) {
  const cls =
    tone === "primary"
      ? "bg-primary-600 hover:bg-primary-700 text-white"
      : "bg-white text-red-600 border border-red-200 hover:bg-red-50";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { bg: string; text: string; label: string }> = {
    placed: { bg: "bg-amber-100", text: "text-amber-800", label: "New" },
    accepted: { bg: "bg-sky-100", text: "text-sky-800", label: "Preparing" },
    ready: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Ready" },
    dispatched: { bg: "bg-indigo-100", text: "text-indigo-800", label: "Out for delivery" },
    completed: { bg: "bg-gray-100", text: "text-gray-700", label: "Completed" },
    cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
  };
  const m = map[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}
