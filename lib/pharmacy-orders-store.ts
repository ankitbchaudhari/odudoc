// Pharmacy-fulfillment order store.
//
// Distinct from the general shop `orders-store` because Rx fulfillment
// has a narrower lifecycle and carries clinical context (linked Rx,
// pickup PIN, store-specific line items). Keeping them separate means
// the shop-order dashboard doesn't get polluted with Rx-pickup rows
// that have no shipping address, and the vendor's Rx queue doesn't
// show unrelated e-commerce orders.
//
// Lifecycle:
//   placed     → patient confirmed at PharmacyPicker
//   accepted   → pharmacy acknowledged, prep started
//   ready      → (pickup) available at counter
//   dispatched → (delivery) rider on the way
//   completed  → picked up / delivered
//   cancelled  → by either party
//
// Pickup PIN: 4-digit code generated on creation. Pharmacy staff ask
// the patient for it before handing over the medicines — closes the
// "stranger walks in with someone else's name" loophole.

import { bindPersistentArray } from "./persistent-array";

export type PharmacyOrderStatus =
  | "placed"
  | "accepted"
  | "ready"
  | "dispatched"
  | "completed"
  | "cancelled";

export type Fulfillment = "pickup" | "delivery";

export interface PharmacyOrderLine {
  rxLabel: string;
  medicineId: string | null;
  catalogName?: string;
  brandLabel?: string;
  strength?: string;
  unit?: string;
  priceInr: number;
  quantity: number; // currently always 1; future: per-line qty
}

export interface PharmacyOrder {
  id: string;
  orderNumber: string; // e.g. "RX-4F8K2"
  patientEmail: string;
  patientName: string;
  patientPhone?: string;
  storeId: string;
  vendorId: string;
  roomId?: string; // link back to the consultation, when available
  doctorName?: string;
  fulfillment: Fulfillment;
  deliveryAddress?: string;
  pickupPin: string; // 4-digit string
  lines: PharmacyOrderLine[];
  totalInr: number;
  status: PharmacyOrderStatus;
  statusNote?: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  readyAt?: string;
  dispatchedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  // Audit trail: who on the pharmacy side moved the order, in order.
  // Each entry is captured on transition with the actor's email + role.
  history?: Array<{ at: string; to: PharmacyOrderStatus; byEmail: string; byRole?: string; note?: string }>;
}

const pharmacyOrders: PharmacyOrder[] = [];
const { hydrate, flush } = bindPersistentArray<PharmacyOrder>(
  "pharmacy-orders",
  pharmacyOrders,
  () => [],
);
await hydrate();

const nowIso = () => new Date().toISOString();

function genId() {
  return `pxo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

function genOrderNumber() {
  return `RX-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function genPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export interface CreatePharmacyOrderInput {
  patientEmail: string;
  patientName: string;
  patientPhone?: string;
  storeId: string;
  vendorId: string;
  roomId?: string;
  doctorName?: string;
  fulfillment: Fulfillment;
  deliveryAddress?: string;
  lines: Array<Omit<PharmacyOrderLine, "quantity"> & { quantity?: number }>;
}

export function createPharmacyOrder(input: CreatePharmacyOrderInput): PharmacyOrder {
  const lines = input.lines
    .filter((l) => Number.isFinite(l.priceInr) && l.priceInr >= 0)
    .map((l) => ({ ...l, quantity: l.quantity ?? 1 } as PharmacyOrderLine));
  const total = lines.reduce((s, l) => s + l.priceInr * l.quantity, 0);
  const n = nowIso();
  const o: PharmacyOrder = {
    id: genId(),
    orderNumber: genOrderNumber(),
    patientEmail: input.patientEmail.trim().toLowerCase(),
    patientName: input.patientName.trim(),
    patientPhone: input.patientPhone?.trim(),
    storeId: input.storeId,
    vendorId: input.vendorId,
    roomId: input.roomId,
    doctorName: input.doctorName,
    fulfillment: input.fulfillment,
    deliveryAddress: input.fulfillment === "delivery" ? input.deliveryAddress : undefined,
    pickupPin: genPin(),
    lines,
    totalInr: total,
    status: "placed",
    createdAt: n,
    updatedAt: n,
  };
  pharmacyOrders.unshift(o);
  flush();
  return o;
}

export function getPharmacyOrder(id: string): PharmacyOrder | null {
  return pharmacyOrders.find((o) => o.id === id) || null;
}

export function listPharmacyOrdersByPatient(email: string): PharmacyOrder[] {
  const e = email.trim().toLowerCase();
  return pharmacyOrders.filter((o) => o.patientEmail === e);
}

export function listPharmacyOrdersByVendor(
  vendorId: string,
  opts: { status?: PharmacyOrderStatus | "all" } = {},
): PharmacyOrder[] {
  let list = pharmacyOrders.filter((o) => o.vendorId === vendorId);
  if (opts.status && opts.status !== "all") {
    list = list.filter((o) => o.status === opts.status);
  }
  return list;
}

export function listPharmacyOrdersByStore(storeId: string): PharmacyOrder[] {
  return pharmacyOrders.filter((o) => o.storeId === storeId);
}

// State transitions. We only allow forward motion except for "cancelled",
// which can happen from any pre-completion state.
const ALLOWED: Record<PharmacyOrderStatus, PharmacyOrderStatus[]> = {
  placed: ["accepted", "cancelled"],
  accepted: ["ready", "dispatched", "cancelled"],
  ready: ["completed", "cancelled"],
  dispatched: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export interface TransitionInput {
  id: string;
  to: PharmacyOrderStatus;
  note?: string;
  pin?: string; // required for completed via pickup
  actorEmail?: string;
  actorRole?: string;
}

export function transitionPharmacyOrder(
  input: TransitionInput,
): { ok: true; order: PharmacyOrder } | { ok: false; error: string } {
  const o = pharmacyOrders.find((x) => x.id === input.id);
  if (!o) return { ok: false, error: "Order not found" };
  if (!ALLOWED[o.status].includes(input.to)) {
    return {
      ok: false,
      error: `Can't move from ${o.status} to ${input.to}`,
    };
  }
  // Don't allow `ready` for delivery orders or `dispatched` for pickup
  // orders — they're different legs of the lifecycle.
  if (input.to === "ready" && o.fulfillment !== "pickup") {
    return { ok: false, error: "ready is only for pickup orders" };
  }
  if (input.to === "dispatched" && o.fulfillment !== "delivery") {
    return { ok: false, error: "dispatched is only for delivery orders" };
  }
  // Pickup completion requires the PIN so random walk-ins can't claim.
  if (input.to === "completed" && o.fulfillment === "pickup") {
    if ((input.pin || "").trim() !== o.pickupPin) {
      return { ok: false, error: "Pickup PIN doesn't match" };
    }
  }
  const n = nowIso();
  o.status = input.to;
  o.statusNote = input.note?.trim() || o.statusNote;
  o.updatedAt = n;
  if (input.to === "accepted") o.acceptedAt = n;
  if (input.to === "ready") o.readyAt = n;
  if (input.to === "dispatched") o.dispatchedAt = n;
  if (input.to === "completed") o.completedAt = n;
  if (input.to === "cancelled") o.cancelledAt = n;
  if (input.actorEmail) {
    if (!o.history) o.history = [];
    o.history.push({
      at: n,
      to: input.to,
      byEmail: input.actorEmail.toLowerCase(),
      byRole: input.actorRole,
      note: input.note?.trim() || undefined,
    });
  }
  flush();
  return { ok: true, order: o };
}
