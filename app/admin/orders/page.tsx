"use client";

import { useState } from "react";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  phone: string;
  items: OrderItem[];
  total: number;
  paymentStatus: "Paid" | "Pending" | "Refunded";
  orderStatus: "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
  date: string;
  shippingAddress: string;
}

const initialOrders: Order[] = [
  { id: "o1", orderNumber: "ORD-2026-001", customer: "John Smith", email: "john@example.com", phone: "+1-555-0101", items: [{ name: "Paracetamol 500mg", quantity: 2, price: 5.99 }, { name: "Vitamin D3", quantity: 1, price: 12.99 }], total: 24.97, paymentStatus: "Paid", orderStatus: "Delivered", date: "Apr 12, 2026", shippingAddress: "123 Main St, New York, NY 10001" },
  { id: "o2", orderNumber: "ORD-2026-002", customer: "Emily Davis", email: "emily@example.com", phone: "+1-555-0102", items: [{ name: "Blood Pressure Monitor", quantity: 1, price: 45.99 }], total: 45.99, paymentStatus: "Paid", orderStatus: "Shipped", date: "Apr 12, 2026", shippingAddress: "456 Oak Ave, Chicago, IL 60601" },
  { id: "o3", orderNumber: "ORD-2026-003", customer: "Robert Wilson", email: "robert@example.com", phone: "+1-555-0103", items: [{ name: "Omega-3 Fish Oil", quantity: 3, price: 19.99 }, { name: "Probiotic Capsules", quantity: 1, price: 22.99 }], total: 82.96, paymentStatus: "Pending", orderStatus: "Pending", date: "Apr 13, 2026", shippingAddress: "789 Pine Rd, Houston, TX 77001" },
  { id: "o4", orderNumber: "ORD-2026-004", customer: "Maria Garcia", email: "maria@example.com", phone: "+1-555-0104", items: [{ name: "Baby Moisturizer", quantity: 2, price: 8.99 }], total: 17.98, paymentStatus: "Paid", orderStatus: "Processing", date: "Apr 13, 2026", shippingAddress: "321 Elm St, Phoenix, AZ 85001" },
  { id: "o5", orderNumber: "ORD-2026-005", customer: "David Lee", email: "david@example.com", phone: "+1-555-0105", items: [{ name: "Digital Thermometer", quantity: 1, price: 15.99 }], total: 15.99, paymentStatus: "Refunded", orderStatus: "Cancelled", date: "Apr 11, 2026", shippingAddress: "654 Maple Dr, Philadelphia, PA 19101" },
  { id: "o6", orderNumber: "ORD-2026-006", customer: "Sarah Thompson", email: "sarah.t@example.com", phone: "+1-555-0106", items: [{ name: "Vitamin D3", quantity: 2, price: 12.99 }, { name: "Omega-3 Fish Oil", quantity: 1, price: 19.99 }], total: 45.97, paymentStatus: "Paid", orderStatus: "Processing", date: "Apr 13, 2026", shippingAddress: "987 Cedar Ln, San Antonio, TX 78201" },
];

const orderStatusColors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Processing: "bg-blue-100 text-blue-700",
  Shipped: "bg-purple-100 text-purple-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

const paymentStatusColors: Record<string, string> = {
  Paid: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Refunded: "bg-gray-100 text-gray-700",
};

const statusTabs = ["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

export default function AdminOrders() {
  const [orders, setOrders] = useState(initialOrders);
  const [activeTab, setActiveTab] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filtered = orders.filter((o) => activeTab === "All" || o.orderStatus === activeTab);

  const handleUpdateStatus = (orderId: string, newStatus: Order["orderStatus"]) => {
    setOrders(orders.map((o) => o.id === orderId ? { ...o, orderStatus: newStatus } : o));
    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, orderStatus: newStatus });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
        <p className="mt-1 text-sm text-gray-500">{orders.length} total orders</p>
      </div>

      {/* Status Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1.5 shadow-sm">
        {statusTabs.map((tab) => {
          const count = tab === "All" ? orders.length : orders.filter((o) => o.orderStatus === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab ? "bg-primary-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab}
              <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === tab ? "bg-white/20" : "bg-gray-100"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
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
                <tr key={order.id} className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50" onClick={() => setSelectedOrder(order)}>
                  <td className="px-4 py-3 font-medium text-primary-600">{order.orderNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{order.customer}</p>
                    <p className="text-xs text-gray-400">{order.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">${order.total.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentStatusColors[order.paymentStatus]}`}>{order.paymentStatus}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${orderStatusColors[order.orderStatus]}`}>{order.orderStatus}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{order.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={order.orderStatus}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value as Order["orderStatus"])}
                        className="rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-primary-500"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      <button className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Print Invoice">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No orders found.</div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedOrder.orderNumber}</h3>
                <p className="text-sm text-gray-500">{selectedOrder.date}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="rounded-lg p-2 hover:bg-gray-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Customer Info */}
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <h4 className="mb-2 text-sm font-semibold text-gray-700">Customer Information</h4>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900">{selectedOrder.customer}</span></div>
                <div><span className="text-gray-500">Email:</span> <span className="font-medium text-gray-900">{selectedOrder.email}</span></div>
                <div><span className="text-gray-500">Phone:</span> <span className="font-medium text-gray-900">{selectedOrder.phone}</span></div>
                <div><span className="text-gray-500">Address:</span> <span className="font-medium text-gray-900">{selectedOrder.shippingAddress}</span></div>
              </div>
            </div>

            {/* Items */}
            <div className="mb-6">
              <h4 className="mb-2 text-sm font-semibold text-gray-700">Order Items</h4>
              <div className="space-y-2">
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Info */}
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <h4 className="mb-2 text-sm font-semibold text-gray-700">Payment & Status</h4>
              <div className="flex items-center gap-4">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentStatusColors[selectedOrder.paymentStatus]}`}>{selectedOrder.paymentStatus}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${orderStatusColors[selectedOrder.orderStatus]}`}>{selectedOrder.orderStatus}</span>
              </div>
              <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-base font-bold">
                <span>Total</span>
                <span>${selectedOrder.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Timeline */}
            <div className="mb-6">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">Order Timeline</h4>
              <div className="space-y-3">
                {["Order Placed", "Payment Confirmed", "Processing", "Shipped", "Delivered"].map((step, i) => {
                  const statusIndex = ["Pending", "Paid", "Processing", "Shipped", "Delivered"].indexOf(
                    i === 0 ? "Pending" : i === 1 ? "Paid" : selectedOrder.orderStatus
                  );
                  const isCompleted = i <= Math.max(0, ["Pending", "Processing", "Shipped", "Delivered"].indexOf(selectedOrder.orderStatus) + 1);
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${isCompleted ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"}`}>
                        {isCompleted ? (
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <span>{i + 1}</span>
                        )}
                      </div>
                      <span className={`text-sm ${isCompleted ? "font-medium text-gray-900" : "text-gray-400"}`}>{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSelectedOrder(null)} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button>
              <button className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">Print Invoice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
