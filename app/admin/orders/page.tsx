"use client";

import { useCallback, useEffect, useState } from "react";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  productId?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  phone: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  paymentStatus: "Paid" | "Pending" | "Refunded";
  orderStatus: "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
  createdAt: string;
  updatedAt: string;
  shippingAddress: string;
  trackingNumber?: string;
  notes?: string;
}

const orderStatusColors: Record<string, { pill: string; dot: string }> = {
  Pending: { pill: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  Processing: { pill: "bg-gradient-to-r from-sky-50 to-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500" },
  Shipped: { pill: "bg-gradient-to-r from-violet-50 to-purple-50 text-purple-700 ring-purple-200", dot: "bg-purple-500" },
  Delivered: { pill: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  Cancelled: { pill: "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
};

const paymentStatusColors: Record<string, { pill: string; dot: string }> = {
  Paid: { pill: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  Pending: { pill: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  Refunded: { pill: "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 ring-slate-200", dot: "bg-slate-500" },
};

const tabThemes: Record<string, string> = {
  All: "from-slate-500 to-gray-600",
  Pending: "from-amber-500 to-orange-600",
  Processing: "from-sky-500 to-blue-600",
  Shipped: "from-violet-500 to-purple-600",
  Delivered: "from-emerald-500 to-green-600",
  Cancelled: "from-rose-500 to-red-600",
};

const statusTabs = ["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load orders");
      setOrders(data.orders || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filtered = orders.filter(
    (o) => activeTab === "All" || o.orderStatus === activeTab
  );

  const patchOrder = async (
    id: string,
    patch: Partial<Pick<Order, "orderStatus" | "paymentStatus" | "trackingNumber" | "notes">>
  ) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Update failed");
      setOrders((prev) => prev.map((o) => (o.id === id ? data.order : o)));
      if (selectedOrder?.id === id) setSelectedOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdateStatus = (orderId: string, newStatus: Order["orderStatus"]) => {
    patchOrder(orderId, { orderStatus: newStatus });
  };

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
            </span>
            {loading ? "Loading…" : `${orders.length} total orders`}
          </div>
          <h1 className="text-2xl font-bold">Order Management</h1>
          <p className="mt-1 text-sm text-blue-50/90">Track, update and fulfil customer orders.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-gradient-to-r from-rose-50 to-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      {/* Status Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto rounded-xl bg-white p-2 shadow-sm ring-1 ring-gray-100">
        {statusTabs.map((tab) => {
          const count =
            tab === "All"
              ? orders.length
              : orders.filter((o) => o.orderStatus === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 ${
                activeTab === tab
                  ? `bg-gradient-to-r ${tabThemes[tab]} text-white shadow-md`
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab}
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${activeTab === tab ? "bg-white/20" : "bg-gray-100"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500" />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gradient-to-r from-indigo-50/60 via-blue-50/40 to-cyan-50/60 text-xs uppercase text-gray-600">
                <th className="px-4 py-3 font-medium">Order #</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-indigo-50/30"
                  onClick={() => setSelectedOrder(order)}
                >
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-gradient-to-r from-indigo-50 to-blue-50 px-2 py-1 font-mono text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">{order.orderNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{order.customer}</p>
                    <p className="text-xs text-gray-400">{order.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    ${order.total.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${paymentStatusColors[order.paymentStatus].pill}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${paymentStatusColors[order.paymentStatus].dot}`} />
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${orderStatusColors[order.orderStatus].pill}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${orderStatusColors[order.orderStatus].dot}`} />
                      {order.orderStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={order.orderStatus}
                        disabled={busyId === order.id}
                        onChange={(e) =>
                          handleUpdateStatus(order.id, e.target.value as Order["orderStatus"])
                        }
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">📦 No orders found.</div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedOrder.orderNumber}</h3>
                <p className="text-sm text-gray-500">{formatDate(selectedOrder.createdAt)}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Customer Info */}
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <h4 className="mb-2 text-sm font-semibold text-gray-700">Customer Information</h4>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-gray-500">Name:</span>{" "}
                  <span className="font-medium text-gray-900">{selectedOrder.customer}</span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>{" "}
                  <span className="font-medium text-gray-900">{selectedOrder.email}</span>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>{" "}
                  <span className="font-medium text-gray-900">{selectedOrder.phone}</span>
                </div>
                <div>
                  <span className="text-gray-500">Address:</span>{" "}
                  <span className="font-medium text-gray-900">{selectedOrder.shippingAddress}</span>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="mb-6">
              <h4 className="mb-2 text-sm font-semibold text-gray-700">Order Items</h4>
              <div className="space-y-2">
                {selectedOrder.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-gray-900">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Status controls */}
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">Update Order</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Order Status</label>
                  <select
                    value={selectedOrder.orderStatus}
                    disabled={busyId === selectedOrder.id}
                    onChange={(e) =>
                      patchOrder(selectedOrder.id, {
                        orderStatus: e.target.value as Order["orderStatus"],
                      })
                    }
                    className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-primary-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Payment Status</label>
                  <select
                    value={selectedOrder.paymentStatus}
                    disabled={busyId === selectedOrder.id}
                    onChange={(e) =>
                      patchOrder(selectedOrder.id, {
                        paymentStatus: e.target.value as Order["paymentStatus"],
                      })
                    }
                    className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-primary-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">Tracking Number</label>
                  <input
                    type="text"
                    defaultValue={selectedOrder.trackingNumber || ""}
                    onBlur={(e) => {
                      if (e.target.value !== (selectedOrder.trackingNumber || "")) {
                        patchOrder(selectedOrder.id, { trackingNumber: e.target.value });
                      }
                    }}
                    placeholder="Courier tracking number"
                    className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-primary-500"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-base font-bold">
                <span>Total</span>
                <span>${selectedOrder.total.toFixed(2)}</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Status changes automatically notify the customer by email.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
