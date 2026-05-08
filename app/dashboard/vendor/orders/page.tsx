"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

const STATUS_FILTERS = ["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"] as const;

interface VendorOrderItem {
  productId?: string;
  name: string;
  quantity: number;
  price: number;
}
interface VendorOrder {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  phone: string;
  shippingAddress: string;
  orderStatus: "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
  paymentStatus: "Paid" | "Pending" | "Refunded";
  items: VendorOrderItem[];
  vendorSubtotal: number;
  orderTotal: number;
  createdAt: string;
}

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vendors/me/orders?status=${filter}`);
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Failed to load orders"); return; }
      setErr("");
      setOrders(data.orders || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  const grossRevenue = orders.reduce((s, o) => s + o.vendorSubtotal, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/dashboard/vendor" className="text-sm text-primary-600 hover:underline">← Back to dashboard</Link>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-500">Orders containing your products. Only your line items are shown.</p>
          </div>
          <div className="rounded-xl bg-white px-5 py-3 shadow-sm">
            <p className="text-xs text-gray-500">Gross revenue ({filter})</p>
            <p className="text-lg font-bold text-gray-900">${grossRevenue.toFixed(2)}</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                filter === s ? "bg-primary-600 text-white" : "bg-white text-gray-700 border border-gray-200"
              }`}>
              {s}
            </button>
          ))}
        </div>

        {err && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</p>}

        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center text-sm text-gray-400 shadow-sm">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center text-sm text-gray-400 shadow-sm">
            No orders in this view yet.
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="rounded-xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-bold text-gray-900">{o.orderNumber}</p>
                    <p className="text-xs text-gray-500">{o.customer} · {o.email} · {o.phone}</p>
                    <p className="text-xs text-gray-500">{o.shippingAddress}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge
                      status={
                        o.orderStatus === "Delivered" ? "delivered"
                        : o.orderStatus === "Shipped" ? "in_progress"
                        : o.orderStatus === "Processing" ? "in_progress"
                        : o.orderStatus === "Cancelled" ? "cancelled"
                        : "pending"
                      }
                      label={o.orderStatus}
                    />
                    <p className="mt-1 text-xs text-gray-400">Placed {new Date(o.createdAt).toLocaleDateString()}</p>
                    <p className="mt-0.5 text-xs text-gray-400">Payment: {o.paymentStatus}</p>
                  </div>
                </div>

                <div className="mt-3 border-t border-gray-100 pt-3">
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500">
                        <th className="py-1">Product</th>
                        <th className="py-1 text-center">Qty</th>
                        <th className="py-1 text-right">Price</th>
                        <th className="py-1 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.items.map((it, idx) => (
                        <tr key={idx} className="border-t border-gray-50">
                          <td className="py-2 font-medium text-gray-900">{it.name}</td>
                          <td className="py-2 text-center text-gray-700">{it.quantity}</td>
                          <td className="py-2 text-right text-gray-700">${it.price.toFixed(2)}</td>
                          <td className="py-2 text-right font-medium text-gray-900">${(it.price * it.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>Your revenue: <span className="font-semibold text-gray-900">${o.vendorSubtotal.toFixed(2)}</span></span>
                    <span>· Full order total: ${o.orderTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
