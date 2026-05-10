// Rx-fulfillment orders.
//
// Lifecycle:
//   placed → accepted → packed → out_for_delivery → delivered
//   placed → cancelled                      (patient changed mind)
//   placed → rejected                       (pharmacy can't fulfil)
//
// Each order references a single pharmacy + an Rx ID + a snapshot
// of the matched lines + their prices at order time. Snapshotting
// price + brand at order time means a stock update mid-fulfilment
// doesn't retroactively rewrite the patient's invoice.

import { bindPersistentArray } from "../persistent-array";

export type FulfillmentStatus =
  | "placed"
  | "accepted"
  | "packed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "rejected";

export interface OrderLine {
  drugName: string;
  brand?: string;
  strength?: string;
  form?: string;
  packSize?: number;
  quantity: number;
  mrpRupees: number;
  pricedRupees: number;
  stockId?: string;
}

export interface FulfillmentOrder {
  id: string;
  patientUserId: string;
  patientName: string;
  patientPhone?: string;
  /** Free-text delivery address (we don't have an addresses store yet). */
  deliveryAddress: string;
  pharmacyId: string;
  pharmacyName: string;
  /** Source Rx id when the order originated from a digital prescription;
   *  optional because the demo also accepts manually-entered drug lists. */
  rxId?: string;
  lines: OrderLine[];
  /** Sum of pricedRupees across lines. */
  subtotalRupees: number;
  deliveryFeeRupees: number;
  totalRupees: number;
  /** OduDoc marketplace cut % retained from the pharmacy's gross. */
  marketplaceFeePct: number;
  /** Pharmacy net = totalRupees * (1 - marketplaceFeePct / 100). */
  pharmacyNetRupees: number;
  status: FulfillmentStatus;
  /** Notes captured on each transition. */
  events: Array<{ at: string; status: FulfillmentStatus; note?: string }>;
  /** ETA stamped at order time; live ETA can drift after acceptance. */
  estimatedDeliveryHours: number;
  paymentStatus: "pending" | "paid" | "refunded";
  /** When delivered, the courier's photo / OTP confirmation lives here. */
  deliveryProof?: string;
  createdAt: string;
  updatedAt: string;
}

const orders: FulfillmentOrder[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<FulfillmentOrder>(
  "rx_fulfillment_orders",
  orders,
  () => []
);
await hydrate();

const DEFAULT_MARKETPLACE_FEE_PCT = 8;

export function listOrdersForPatient(userId: string): FulfillmentOrder[] {
  return orders
    .filter((o) => o.patientUserId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listOrdersForPharmacy(pharmacyId: string): FulfillmentOrder[] {
  return orders
    .filter((o) => o.pharmacyId === pharmacyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getOrder(id: string): FulfillmentOrder | null {
  return orders.find((o) => o.id === id) || null;
}

export interface CreateOrderInput {
  patientUserId: string;
  patientName: string;
  patientPhone?: string;
  deliveryAddress: string;
  pharmacyId: string;
  pharmacyName: string;
  rxId?: string;
  lines: OrderLine[];
  estimatedDeliveryHours: number;
  deliveryFeeRupees?: number;
  marketplaceFeePct?: number;
}

export function createOrder(input: CreateOrderInput): FulfillmentOrder {
  const subtotal = input.lines.reduce((a, l) => a + l.pricedRupees, 0);
  const deliveryFee = input.deliveryFeeRupees ?? 0;
  const total = subtotal + deliveryFee;
  const fee = input.marketplaceFeePct ?? DEFAULT_MARKETPLACE_FEE_PCT;
  const pharmacyNet = Math.round(total * (1 - fee / 100));
  const now = new Date().toISOString();
  const o: FulfillmentOrder = {
    id: `rxo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    patientUserId: input.patientUserId,
    patientName: input.patientName,
    patientPhone: input.patientPhone,
    deliveryAddress: input.deliveryAddress.trim(),
    pharmacyId: input.pharmacyId,
    pharmacyName: input.pharmacyName,
    rxId: input.rxId,
    lines: input.lines,
    subtotalRupees: Math.round(subtotal),
    deliveryFeeRupees: Math.round(deliveryFee),
    totalRupees: Math.round(total),
    marketplaceFeePct: fee,
    pharmacyNetRupees: pharmacyNet,
    status: "placed",
    events: [{ at: now, status: "placed" }],
    estimatedDeliveryHours: input.estimatedDeliveryHours,
    paymentStatus: "pending",
    createdAt: now,
    updatedAt: now,
  };
  orders.unshift(o);
  flush();
  return o;
}

const NEXT_STATUS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  placed: ["accepted", "rejected", "cancelled"],
  accepted: ["packed", "cancelled"],
  packed: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
  rejected: [],
};

export function transitionOrder(
  id: string,
  to: FulfillmentStatus,
  note?: string,
  deliveryProof?: string,
): FulfillmentOrder | null {
  const o = orders.find((x) => x.id === id);
  if (!o) return null;
  const allowed = NEXT_STATUS[o.status];
  if (!allowed.includes(to)) return null;
  o.status = to;
  if (to === "delivered" && deliveryProof) o.deliveryProof = deliveryProof;
  if (to === "delivered") o.paymentStatus = "paid";
  if (to === "cancelled" || to === "rejected") {
    if (o.paymentStatus === "paid") o.paymentStatus = "refunded";
  }
  const at = new Date().toISOString();
  o.events.push({ at, status: to, note: note?.trim() || undefined });
  o.updatedAt = at;
  flush();
  return o;
}

export function deleteOrdersForPatient(userId: string): number {
  let n = 0;
  for (let i = orders.length - 1; i >= 0; i--) {
    if (orders[i].patientUserId === userId) {
      tombstone(orders[i].id);
      orders.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flush();
  return n;
}
