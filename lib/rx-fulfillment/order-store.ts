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
import { pushNotification } from "../notifications/store";
import { notify } from "../notifications/notify";
import { sendRxDeliveredViaSentDm } from "../sent-dm";
import { log } from "../log";

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
const { hydrate, flush, tombstone, reload } = bindPersistentArray<FulfillmentOrder>(
  "rx_fulfillment_orders",
  orders,
  () => []
);
await hydrate();

export async function reloadFulfillmentOrders(): Promise<void> {
  await reload();
}

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

  // Patient-facing pharmacy notifications. Idempotent on
  // (userId, kind, "rx_order:<id>:<status>") so retries silent-update
  // rather than stack.
  if (o.patientUserId) {
    const ref = `rx_order:${o.id}:${to}`;
    if (to === "accepted") {
      pushNotification({
        userId: o.patientUserId, kind: "rx_ready", severity: "info",
        title: "Pharmacy accepted your order",
        body: `${o.pharmacyName} is preparing your medicines.`,
        link: "/dashboard/rx-fulfillment", reference: ref,
      });
    } else if (to === "packed") {
      pushNotification({
        userId: o.patientUserId, kind: "rx_ready", severity: "info",
        title: "Order packed",
        body: `${o.pharmacyName} has packed your order. Out for delivery soon.`,
        link: "/dashboard/rx-fulfillment", reference: ref,
      });
    } else if (to === "out_for_delivery") {
      pushNotification({
        userId: o.patientUserId, kind: "rx_ready", severity: "success",
        title: "Out for delivery",
        body: `${o.pharmacyName}'s rider is on the way. ETA usually 30-60 minutes.`,
        link: "/dashboard/rx-fulfillment", reference: ref,
      });
      // SMS for high-impact transitions — patients without the app open
      // need to know a rider is on the way so they're available to receive.
      if (o.patientPhone) {
        const sms = `OduDoc: ${o.pharmacyName}'s rider is on the way with your medicines. ETA 30-60 min.`;
        notify({ channel: "sms", to: o.patientPhone, body: sms, category: "result" })
          .catch((err) => log.error("rx.ofd_sms_failed", err, { orderId: o.id }));
      }
    } else if (to === "delivered") {
      pushNotification({
        userId: o.patientUserId, kind: "rx_ready", severity: "success",
        title: "Medicines delivered",
        body: `${o.pharmacyName} delivered your order. Tap to view receipt.`,
        link: "/dashboard/rx-fulfillment", reference: ref,
      });
      if (o.patientPhone) {
        const sms = `OduDoc: your medicines from ${o.pharmacyName} have been delivered. Receipt in app.`;
        notify({ channel: "sms", to: o.patientPhone, body: sms, category: "result" })
          .catch((err) => log.error("rx.delivered_sms_failed", err, { orderId: o.id }));
        // Best-effort WhatsApp template alongside SMS.
        (async () => {
          try {
            const r = await sendRxDeliveredViaSentDm(o.patientPhone!, {
              patientName: o.patientName || "there",
              orderId: o.id,
            });
            if (!r.ok) log.warn("rx.delivered_wa_template_failed", { error: r.error || "unknown" });
          } catch (err) {
            log.warn("rx.delivered_wa_template_threw", { error: err instanceof Error ? err.message : "send threw" });
          }
        })();
      }
    } else if (to === "cancelled" || to === "rejected") {
      pushNotification({
        userId: o.patientUserId, kind: "rx_ready", severity: "warn",
        title: to === "rejected" ? "Pharmacy could not fulfil order" : "Order cancelled",
        body: note || `${o.pharmacyName}: ${to === "rejected" ? "out of stock or unable to source" : "order cancelled"}.`,
        link: "/dashboard/rx-fulfillment", reference: ref,
      });
    }
  }
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
