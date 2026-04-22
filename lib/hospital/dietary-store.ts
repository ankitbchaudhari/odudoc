// Dietary Orders. Tenant-scoped.
//
// Clinical nutrition prescriptions tied to a patient (and optionally an
// admission). Tracks diet type, therapeutic restrictions, calorie/fluid
// targets, and meal-time cadence. A delivery log captures each meal
// actually served (or refused / NPO-skipped) — useful for intake
// monitoring and pharmacy-nutrition reconciliation.
//
// Status machine:
//   active  ⇆ on_hold
//   active  → discontinued
//
// Delivery log records are append-only per meal instance.

import { bindPersistentArray } from "../persistent-array";

export type DietType =
  | "regular"
  | "diabetic"
  | "renal"
  | "cardiac"
  | "low_sodium"
  | "low_fat"
  | "high_protein"
  | "soft"
  | "clear_liquid"
  | "full_liquid"
  | "pureed"
  | "npo" // nil per os
  | "tube_feed"
  | "tpn" // total parenteral nutrition
  | "custom";

export type MealSlot = "breakfast" | "mid_morning" | "lunch" | "tea" | "dinner" | "night";

export type DietStatus = "active" | "on_hold" | "discontinued";

export type DeliveryStatus = "served" | "refused" | "npo_skipped" | "partial";

export interface DietOrder {
  id: string;
  organizationId: string;
  orderNumber: string; // DIET-{suffix}-{seq}
  patientId: string;
  admissionId?: string;
  dietType: DietType;

  // Therapeutic targets (optional — prescribed by dietician)
  caloriesKcal?: number;
  proteinGrams?: number;
  fluidMl?: number;
  sodiumMgLimit?: number;
  potassiumMgLimit?: number;

  // Meals this diet covers (subset of MealSlot)
  mealSlots: MealSlot[];
  textureNotes?: string; // e.g. "minced", "thickened fluids level 2"
  allergiesNote?: string;
  preferences?: string; // veg/jain/halal, etc.
  restrictions?: string; // free text: "no citrus, no dairy"

  // Tube feed / TPN specifics
  feedFormula?: string;
  feedRateMlPerHr?: number;

  prescribedBy: string; // doctor/dietician name
  startDate: string;
  endDate?: string;

  status: DietStatus;
  holdReason?: string;
  discontinuedAt?: string;
  discontinuedReason?: string;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MealDelivery {
  id: string;
  organizationId: string;
  orderId: string;
  patientId: string;
  slot: MealSlot;
  servedAt: string;
  status: DeliveryStatus;
  servedBy?: string;
  percentConsumed?: number; // 0-100
  notes?: string;
  createdAt: string;
}

const orders: DietOrder[] = [];
const deliveries: MealDelivery[] = [];

const { hydrate: hydrateO, flush: flushO } = bindPersistentArray<DietOrder>(
  "hospital-dietary-orders",
  orders,
  () => []
);
const { hydrate: hydrateD, flush: flushD } = bindPersistentArray<MealDelivery>(
  "hospital-dietary-deliveries",
  deliveries,
  () => []
);
await hydrateO();
await hydrateD();

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}
function nextOrderNumber(orgId: string): string {
  const n = orders.filter((o) => o.organizationId === orgId).length + 1;
  return `DIET-${orgSuffix(orgId)}-${String(n).padStart(5, "0")}`;
}

export const DIET_LABEL: Record<DietType, string> = {
  regular: "Regular",
  diabetic: "Diabetic",
  renal: "Renal",
  cardiac: "Cardiac",
  low_sodium: "Low Sodium",
  low_fat: "Low Fat",
  high_protein: "High Protein",
  soft: "Soft",
  clear_liquid: "Clear Liquid",
  full_liquid: "Full Liquid",
  pureed: "Pureed",
  npo: "NPO (Nil by mouth)",
  tube_feed: "Tube Feed",
  tpn: "TPN",
  custom: "Custom",
};

export const MEAL_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  mid_morning: "Mid-morning",
  lunch: "Lunch",
  tea: "Tea",
  dinner: "Dinner",
  night: "Bedtime",
};

function sanitizeSlots(raw: unknown): MealSlot[] {
  const allowed: MealSlot[] = ["breakfast", "mid_morning", "lunch", "tea", "dinner", "night"];
  if (!Array.isArray(raw)) return [];
  const out: MealSlot[] = [];
  for (const v of raw) {
    if (typeof v === "string" && (allowed as string[]).includes(v) && !out.includes(v as MealSlot)) {
      out.push(v as MealSlot);
    }
  }
  return out;
}

export function listOrders(opts: {
  organizationId: string;
  patientId?: string;
  admissionId?: string;
  status?: DietStatus;
  dietType?: DietType;
}): DietOrder[] {
  let list = orders.filter((o) => o.organizationId === opts.organizationId);
  if (opts.patientId) list = list.filter((o) => o.patientId === opts.patientId);
  if (opts.admissionId) list = list.filter((o) => o.admissionId === opts.admissionId);
  if (opts.status) list = list.filter((o) => o.status === opts.status);
  if (opts.dietType) list = list.filter((o) => o.dietType === opts.dietType);

  const statusOrder: Record<DietStatus, number> = {
    active: 0,
    on_hold: 1,
    discontinued: 2,
  };
  return list.sort((a, b) => {
    const s = statusOrder[a.status] - statusOrder[b.status];
    if (s !== 0) return s;
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });
}

export interface DietOrderInput {
  patientId: string;
  admissionId?: string;
  dietType?: DietType;
  caloriesKcal?: number;
  proteinGrams?: number;
  fluidMl?: number;
  sodiumMgLimit?: number;
  potassiumMgLimit?: number;
  mealSlots?: MealSlot[];
  textureNotes?: string;
  allergiesNote?: string;
  preferences?: string;
  restrictions?: string;
  feedFormula?: string;
  feedRateMlPerHr?: number;
  prescribedBy?: string;
  startDate?: string;
  endDate?: string;
  status?: DietStatus;
  holdReason?: string;
  discontinuedReason?: string;
  notes?: string;
}

export function createOrder(organizationId: string, input: DietOrderInput): DietOrder {
  const now = new Date().toISOString();
  const o: DietOrder = {
    id: `diet-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    orderNumber: nextOrderNumber(organizationId),
    patientId: input.patientId,
    admissionId: input.admissionId || undefined,
    dietType: input.dietType || "regular",
    caloriesKcal: input.caloriesKcal ?? undefined,
    proteinGrams: input.proteinGrams ?? undefined,
    fluidMl: input.fluidMl ?? undefined,
    sodiumMgLimit: input.sodiumMgLimit ?? undefined,
    potassiumMgLimit: input.potassiumMgLimit ?? undefined,
    mealSlots: sanitizeSlots(input.mealSlots).length
      ? sanitizeSlots(input.mealSlots)
      : ["breakfast", "lunch", "dinner"],
    textureNotes: input.textureNotes?.trim() || undefined,
    allergiesNote: input.allergiesNote?.trim() || undefined,
    preferences: input.preferences?.trim() || undefined,
    restrictions: input.restrictions?.trim() || undefined,
    feedFormula: input.feedFormula?.trim() || undefined,
    feedRateMlPerHr: input.feedRateMlPerHr ?? undefined,
    prescribedBy: input.prescribedBy?.trim() || "",
    startDate: input.startDate || now,
    endDate: input.endDate || undefined,
    status: input.status || "active",
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  orders.unshift(o);
  flushO();
  return o;
}

export function updateOrder(
  id: string,
  organizationId: string,
  patch: Partial<DietOrderInput>
): DietOrder | null {
  const o = orders.find((x) => x.id === id && x.organizationId === organizationId);
  if (!o) return null;
  const now = new Date().toISOString();

  if (patch.dietType !== undefined) o.dietType = patch.dietType;
  if (patch.admissionId !== undefined) o.admissionId = patch.admissionId || undefined;
  if (patch.caloriesKcal !== undefined) o.caloriesKcal = patch.caloriesKcal ?? undefined;
  if (patch.proteinGrams !== undefined) o.proteinGrams = patch.proteinGrams ?? undefined;
  if (patch.fluidMl !== undefined) o.fluidMl = patch.fluidMl ?? undefined;
  if (patch.sodiumMgLimit !== undefined) o.sodiumMgLimit = patch.sodiumMgLimit ?? undefined;
  if (patch.potassiumMgLimit !== undefined)
    o.potassiumMgLimit = patch.potassiumMgLimit ?? undefined;
  if (patch.mealSlots !== undefined) {
    const s = sanitizeSlots(patch.mealSlots);
    if (s.length) o.mealSlots = s;
  }
  if (patch.textureNotes !== undefined)
    o.textureNotes = patch.textureNotes?.trim() || undefined;
  if (patch.allergiesNote !== undefined)
    o.allergiesNote = patch.allergiesNote?.trim() || undefined;
  if (patch.preferences !== undefined)
    o.preferences = patch.preferences?.trim() || undefined;
  if (patch.restrictions !== undefined)
    o.restrictions = patch.restrictions?.trim() || undefined;
  if (patch.feedFormula !== undefined)
    o.feedFormula = patch.feedFormula?.trim() || undefined;
  if (patch.feedRateMlPerHr !== undefined)
    o.feedRateMlPerHr = patch.feedRateMlPerHr ?? undefined;
  if (patch.prescribedBy !== undefined) o.prescribedBy = patch.prescribedBy.trim();
  if (patch.startDate !== undefined) o.startDate = patch.startDate || o.startDate;
  if (patch.endDate !== undefined) o.endDate = patch.endDate || undefined;

  if (patch.status !== undefined && patch.status !== o.status) {
    const prev = o.status;
    o.status = patch.status;
    if (patch.status === "discontinued" && prev !== "discontinued") {
      o.discontinuedAt = now;
    }
    if (patch.status === "active" && prev !== "active") {
      o.holdReason = undefined;
      if (prev === "discontinued") {
        o.discontinuedAt = undefined;
        o.discontinuedReason = undefined;
      }
    }
  }
  if (patch.holdReason !== undefined)
    o.holdReason = patch.holdReason?.trim() || undefined;
  if (patch.discontinuedReason !== undefined)
    o.discontinuedReason = patch.discontinuedReason?.trim() || undefined;
  if (patch.notes !== undefined) o.notes = patch.notes?.trim() || undefined;

  o.updatedAt = now;
  flushO();
  return o;
}

export function deleteOrder(id: string, organizationId: string): boolean {
  const idx = orders.findIndex((x) => x.id === id && x.organizationId === organizationId);
  if (idx < 0) return false;
  orders.splice(idx, 1);
  // Clear this order's delivery log.
  for (let i = deliveries.length - 1; i >= 0; i--) {
    if (deliveries[i].orderId === id && deliveries[i].organizationId === organizationId) {
      deliveries.splice(i, 1);
    }
  }
  flushO();
  flushD();
  return true;
}

// Deliveries ---------------------------------------------------------

export function listDeliveries(opts: {
  organizationId: string;
  orderId?: string;
  patientId?: string;
}): MealDelivery[] {
  let list = deliveries.filter((d) => d.organizationId === opts.organizationId);
  if (opts.orderId) list = list.filter((d) => d.orderId === opts.orderId);
  if (opts.patientId) list = list.filter((d) => d.patientId === opts.patientId);
  return list.sort(
    (a, b) => new Date(b.servedAt).getTime() - new Date(a.servedAt).getTime()
  );
}

export interface DeliveryInput {
  orderId: string;
  slot?: MealSlot;
  servedAt?: string;
  status?: DeliveryStatus;
  servedBy?: string;
  percentConsumed?: number;
  notes?: string;
}

export function createDelivery(
  organizationId: string,
  input: DeliveryInput
): MealDelivery | null {
  const order = orders.find(
    (o) => o.id === input.orderId && o.organizationId === organizationId
  );
  if (!order) return null;
  const now = new Date().toISOString();
  const d: MealDelivery = {
    id: `meal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    orderId: order.id,
    patientId: order.patientId,
    slot: input.slot || "lunch",
    servedAt: input.servedAt || now,
    status: input.status || "served",
    servedBy: input.servedBy?.trim() || undefined,
    percentConsumed:
      input.percentConsumed != null
        ? Math.max(0, Math.min(100, Math.round(input.percentConsumed)))
        : undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
  };
  deliveries.unshift(d);
  flushD();
  return d;
}

export function deleteDelivery(id: string, organizationId: string): boolean {
  const idx = deliveries.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (idx < 0) return false;
  deliveries.splice(idx, 1);
  flushD();
  return true;
}

// Patient cascade: hard-delete the patient's diet orders and delivery records.
export function deleteDietaryForPatient(
  patientId: string,
  organizationId: string
): { orders: number; deliveries: number } {
  let orderCount = 0;
  let delCount = 0;
  for (let i = orders.length - 1; i >= 0; i--) {
    if (orders[i].patientId === patientId && orders[i].organizationId === organizationId) {
      orders.splice(i, 1);
      orderCount++;
    }
  }
  for (let i = deliveries.length - 1; i >= 0; i--) {
    if (
      deliveries[i].patientId === patientId &&
      deliveries[i].organizationId === organizationId
    ) {
      deliveries.splice(i, 1);
      delCount++;
    }
  }
  if (orderCount) flushO();
  if (delCount) flushD();
  return { orders: orderCount, deliveries: delCount };
}
