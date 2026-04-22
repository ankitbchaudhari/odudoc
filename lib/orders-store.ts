// Orders store — Postgres-backed via bindPersistentArray.
//
// Holds customer orders through the full lifecycle:
//   Pending → Processing → Shipped → Delivered
//           → Cancelled (at any stage before Delivered)

import { bindPersistentArray } from "./persistent-array";

export type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export type PaymentStatus = "Paid" | "Pending" | "Refunded";

export interface OrderItem {
  productId?: string;
  name: string;
  quantity: number;
  price: number;
  vendorId?: string;
  vendorName?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  phone: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  shippingAddress: string;
  notes?: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
}

const orders: Order[] = [];
const { hydrate, flush } = bindPersistentArray<Order>(
  "orders",
  orders,
  () => []
);
await hydrate();

// One-time cleanup: drop the demo orders (o1/o2/o3) that shipped with the
// initial seed.
(function removeLegacySeedOrders() {
  const legacyIds = new Set(["o1", "o2", "o3"]);
  let dirty = false;
  for (let i = orders.length - 1; i >= 0; i--) {
    if (legacyIds.has(orders[i].id)) {
      orders.splice(i, 1);
      dirty = true;
    }
  }
  if (dirty) flush();
})();

function nextOrderNumber(): string {
  const year = new Date().getFullYear();
  const n = String(orders.length + 1).padStart(3, "0");
  return `ORD-${year}-${n}`;
}

export function listOrders(opts: {
  email?: string;
  status?: OrderStatus | "All";
} = {}): Order[] {
  let list = [...orders];
  if (opts.email) {
    const e = opts.email.toLowerCase();
    list = list.filter((o) => o.email.toLowerCase() === e);
  }
  if (opts.status && opts.status !== "All") {
    list = list.filter((o) => o.orderStatus === opts.status);
  }
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getOrderById(id: string): Order | null {
  return orders.find((o) => o.id === id) || null;
}

export interface VendorOrderView extends Omit<Order, "items" | "subtotal" | "total"> {
  items: OrderItem[];
  vendorSubtotal: number;
  orderTotal: number;
}

export function listOrdersByVendor(
  vendorId: string,
  opts: { status?: OrderStatus | "All" } = {}
): VendorOrderView[] {
  const views: VendorOrderView[] = [];
  for (const o of orders) {
    const mine = o.items.filter((it) => it.vendorId === vendorId);
    if (mine.length === 0) continue;
    if (opts.status && opts.status !== "All" && o.orderStatus !== opts.status) continue;
    const vendorSubtotal = mine.reduce((s, it) => s + it.price * it.quantity, 0);
    const { items: _items, subtotal: _subtotal, total: _total, ...rest } = o;
    void _items; void _subtotal; void _total;
    views.push({ ...rest, items: mine, vendorSubtotal, orderTotal: o.total });
  }
  return views.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export interface OrderInput {
  customer: string;
  email: string;
  phone: string;
  items: OrderItem[];
  shipping?: number;
  shippingAddress: string;
  notes?: string;
  paymentStatus?: PaymentStatus;
}

export function createOrder(input: OrderInput): Order {
  const subtotal = input.items.reduce(
    (sum, it) => sum + it.price * it.quantity,
    0
  );
  const shipping = Number(input.shipping || 0);
  const now = new Date().toISOString();
  const order: Order = {
    id: `o-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    orderNumber: nextOrderNumber(),
    customer: input.customer,
    email: input.email.toLowerCase(),
    phone: input.phone,
    items: input.items,
    subtotal,
    shipping,
    total: subtotal + shipping,
    paymentStatus: input.paymentStatus || "Pending",
    orderStatus: "Pending",
    shippingAddress: input.shippingAddress,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  orders.unshift(order);
  flush();
  return order;
}

export interface OrderUpdateInput {
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  trackingNumber?: string;
  notes?: string;
}

export function updateOrder(
  id: string,
  patch: OrderUpdateInput
): { prev: Order; next: Order } | null {
  const o = orders.find((x) => x.id === id);
  if (!o) return null;
  const prev: Order = { ...o };
  if (patch.orderStatus) o.orderStatus = patch.orderStatus;
  if (patch.paymentStatus) o.paymentStatus = patch.paymentStatus;
  if (patch.trackingNumber !== undefined) o.trackingNumber = patch.trackingNumber;
  if (patch.notes !== undefined) o.notes = patch.notes;
  o.updatedAt = new Date().toISOString();
  flush();
  return { prev, next: o };
}
