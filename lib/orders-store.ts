// Orders store — dual-write transition.
//
// Phase A (this commit): every write goes to BOTH the legacy app_kv
// JSON blob (via bindPersistentArray) AND the new relational tables
// (orders + order_items, see lib/drizzle/schema.ts). Reads still come
// from the JSON blob. This lets us:
//   1. Run the new schema in production traffic shadow-mode without
//      risking the read path
//   2. Backfill the legacy blob → relational table at our leisure via
//      the migrate-orders cron / script (see scripts/migrate-orders.ts)
//   3. Validate row counts + content match before flipping reads
//
// Phase B (next commit, behind ORDERS_USE_DB=true env flag): reads
// from the relational tables; writes still go to both for safety.
//
// Phase C (final): drop the JSON blob writer, remove the flag.
//
// Holds customer orders through the full lifecycle:
//   Pending → Processing → Shipped → Delivered
//           → Cancelled (at any stage before Delivered)

import { bindPersistentArray } from "./persistent-array";
import { db } from "./drizzle";
import { orders as ordersTable, orderItems as orderItemsTable } from "./drizzle/schema";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { log } from "./log";

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
  // Legacy fallback only — new orders should pull from the Postgres
  // sequence (see fetchSequenceOrderNumber). This stays for the rare
  // case where the DB is unreachable at write time.
  const year = new Date().getFullYear();
  const n = String(orders.length + 1).padStart(3, "0");
  return `ORD-${year}-${n}`;
}

// Pull the next order number from a real Postgres sequence so concurrent
// inserts don't collide and deletes don't recycle numbers. Falls back to
// the in-memory counter if the DB is unreachable.
async function fetchSequenceOrderNumber(): Promise<string> {
  try {
    const year = new Date().getFullYear();
    const rows = (await db.execute(
      drizzleSql`SELECT nextval('orders_number_seq') AS n`,
    )) as unknown as Array<{ n: number | string }>;
    const n = String(Number(rows[0]?.n ?? 0)).padStart(5, "0");
    return `ORD-${year}-${n}`;
  } catch (err) {
    log.warn("orders_store.sequence_unavailable", { err: String(err) });
    return nextOrderNumber();
  }
}

// Mirror a writer's mutation into the relational tables. Fire-and-forget;
// failures are logged but never propagate so the JSON-blob write path
// stays the source of truth during the dual-write window.
async function persistOrderRow(o: Order): Promise<void> {
  try {
    await db
      .insert(ordersTable)
      .values({
        id: o.id,
        orderNumber: o.orderNumber,
        customer: o.customer,
        email: o.email,
        phone: o.phone,
        subtotal: o.subtotal,
        shipping: o.shipping,
        total: o.total,
        paymentStatus: o.paymentStatus,
        orderStatus: o.orderStatus,
        shippingAddress: o.shippingAddress,
        notes: o.notes ?? null,
        trackingNumber: o.trackingNumber ?? null,
        createdAt: new Date(o.createdAt),
        updatedAt: new Date(o.updatedAt),
      })
      .onConflictDoUpdate({
        target: ordersTable.id,
        set: {
          customer: o.customer,
          email: o.email,
          phone: o.phone,
          subtotal: o.subtotal,
          shipping: o.shipping,
          total: o.total,
          paymentStatus: o.paymentStatus,
          orderStatus: o.orderStatus,
          shippingAddress: o.shippingAddress,
          notes: o.notes ?? null,
          trackingNumber: o.trackingNumber ?? null,
          updatedAt: new Date(o.updatedAt),
        },
      });
    // Replace items wholesale — order_items is a child table without
    // user-supplied IDs, so the easiest correctness path is wipe + re-
    // insert. Volume is tiny (each order has <50 items in practice).
    await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, o.id));
    if (o.items.length > 0) {
      await db.insert(orderItemsTable).values(
        o.items.map((it, i) => ({
          id: `oi-${o.id}-${i}`,
          orderId: o.id,
          productId: it.productId ?? null,
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          vendorId: it.vendorId ?? null,
          vendorName: it.vendorName ?? null,
          position: i,
        })),
      );
    }
  } catch (err) {
    log.error("orders_store.persist_row_failed", err, { id: o.id });
  }
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

export async function createOrder(input: OrderInput): Promise<Order> {
  const subtotal = input.items.reduce(
    (sum, it) => sum + it.price * it.quantity,
    0
  );
  const shipping = Number(input.shipping || 0);
  const now = new Date().toISOString();
  const orderNumber = await fetchSequenceOrderNumber();
  const order: Order = {
    id: `o-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    orderNumber,
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
  // Mirror to the relational tables — fire-and-forget so JSON-blob
  // writes remain the source of truth during the dual-write window.
  void persistOrderRow(order);
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
  void persistOrderRow(o);
  return { prev, next: o };
}
