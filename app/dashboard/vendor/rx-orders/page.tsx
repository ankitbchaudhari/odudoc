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
import SharedBadge from "@/components/StatusBadge";

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

  const tabCount = orders.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/40 to-sky-50/40 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <Link href="/dashboard/vendor" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors hover:text-emerald-600">
          ← Back to dashboard
        </Link>

        {/* Hero */}
        <div className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-8 text-white shadow-xl">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                Pharmacy · Rx queue
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Prescription orders</h1>
              <p className="mt-2 max-w-md text-sm text-white/90">
                Rx fulfillment queue. Confirm the pickup PIN before handing over medicines.
              </p>
            </div>
            <button
              onClick={load}
              className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Tabs as pill row */}
        <div className="mt-6 mb-5 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                tab === t.id
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30"
                  : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700"
              }`}
            >
              {t.label}
              {tab === t.id && tabCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-white/25 px-1.5 text-[10px]">
                  {tabCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-3xl border border-white/60 bg-white dark:bg-slate-900 py-16 shadow-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-500" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-16 text-center shadow-sm">
            <span className="text-5xl">💊</span>
            <p className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">No orders in this tab</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              When new Rx orders come in they&apos;ll show up here automatically.
            </p>
          </div>
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
          className="w-20 rounded-md border border-gray-300 dark:border-slate-700 px-2 py-1 font-mono text-sm tracking-widest"
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
    <article className="overflow-hidden rounded-3xl border border-white/60 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-sm font-bold text-gray-900 dark:text-slate-100">{order.orderNumber}</p>
            <StatusPill status={order.status} />
            <span className="rounded-full bg-gray-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:text-slate-300">
              {order.fulfillment === "pickup" ? "🏪 Pickup" : "🛵 Delivery"}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-slate-100">
            {order.patientName}
            {order.patientPhone && (
              <span className="ml-2 font-normal text-gray-500 dark:text-slate-400">{order.patientPhone}</span>
            )}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {storeName} · placed {new Date(order.createdAt).toLocaleString()}
            {order.doctorName ? ` · by ${order.doctorName}` : ""}
          </p>
          {order.fulfillment === "delivery" && order.deliveryAddress && (
            <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">
              📍 {order.deliveryAddress}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
            ₹{order.totalInr.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-slate-400">
            {order.lines.length} item{order.lines.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <div className="mt-3 divide-y divide-gray-100 dark:divide-slate-800 rounded-lg border border-gray-100 bg-gray-50 dark:bg-slate-900 text-sm">
        {order.lines.map((l, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="font-medium text-gray-800 dark:text-slate-200">
                {l.brandLabel || l.catalogName || l.rxLabel}
                {l.strength ? ` · ${l.strength}` : ""}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                {l.unit || "—"} · qty {l.quantity} · rx: {l.rxLabel}
              </p>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">₹{l.priceInr}</p>
          </div>
        ))}
      </div>

      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}

      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {actions.map((a, i) => (
            <span key={i}>{a}</span>
          ))}
          {busy && <span className="text-xs text-gray-500 dark:text-slate-400">Saving…</span>}
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
      ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:-translate-y-0.5 hover:shadow-md text-white shadow-sm"
      : "bg-white dark:bg-slate-900 text-rose-600 border border-rose-200 hover:bg-rose-50";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-2 text-xs font-semibold transition disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}

// Maps the local Rx-fulfilment statuses to the canonical clinical-tones
// keys so this queue inherits the same visual grammar as every other
// dashboard. Local labels are preserved for the Rx-specific phrasing
// ("New" instead of "Pending", "Out for delivery" instead of "Delivered").
function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { tone: import("@/lib/clinical-tones").ToneKey; label: string }> = {
    placed:     { tone: "pending",     label: "New" },
    accepted:   { tone: "in_progress", label: "Preparing" },
    ready:      { tone: "ready",       label: "Ready" },
    dispatched: { tone: "delivered",   label: "Out for delivery" },
    completed:  { tone: "completed",   label: "Completed" },
    cancelled:  { tone: "cancelled",   label: "Cancelled" },
  };
  const m = map[status];
  return <SharedBadge status={m.tone} label={m.label} />;
}
