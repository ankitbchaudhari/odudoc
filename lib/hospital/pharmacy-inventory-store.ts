// Pharmacy inventory & stock. Tenant-scoped.
//
// DrugItem = master record per SKU. StockLot = batch/lot with expiry + quantity.
// Movements mutate StockLot.quantity and write a StockMovement audit row.
//
// On patient delete: N/A (pharmacy is org-scoped, not patient-scoped).

import { bindPersistentArray } from "../persistent-array";

export type ItemForm =
  | "tablet" | "capsule" | "syrup" | "injection" | "infusion"
  | "cream" | "ointment" | "drops" | "inhaler" | "patch"
  | "suppository" | "powder" | "device" | "other";

export type StorageTemp = "room" | "cool" | "refrigerated" | "frozen";

export type MovementType =
  | "receive" | "dispense" | "return" | "adjust" | "transfer_out" | "transfer_in" | "expire" | "waste";

export interface DrugItem {
  id: string;                        // DRG-{suffix}-{seq}
  organizationId: string;
  sku: string;
  genericName: string;
  brandName?: string;
  form: ItemForm;
  strength?: string;                  // "500 mg"
  route?: string;                     // "PO", "IV"
  storage: StorageTemp;
  reorderLevel: number;               // total-on-hand threshold
  reorderQuantity: number;
  unitCost?: number;
  unitPrice?: number;
  vendor?: string;
  isControlled?: boolean;             // narcotic / scheduled
  schedule?: string;                  // "II", "IV"
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockLot {
  id: string;                        // LOT-{suffix}-{seq}
  organizationId: string;
  itemId: string;
  lotNumber: string;
  quantity: number;
  expiryDate: string;                 // YYYY-MM-DD
  location?: string;
  receivedAt: string;
  unitCost?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  organizationId: string;
  itemId: string;
  lotId?: string;
  type: MovementType;
  quantity: number;                   // positive always; type defines direction
  performedBy?: string;
  reason?: string;
  refId?: string;                     // e.g. prescription id
  at: string;
}

const items: DrugItem[] = [];
const lots: StockLot[] = [];
const movements: StockMovement[] = [];

const hydrateI = bindPersistentArray<DrugItem>("pharmacy-items", items, () => []);
const hydrateL = bindPersistentArray<StockLot>("pharmacy-lots", lots, () => []);
const hydrateM = bindPersistentArray<StockMovement>("pharmacy-moves", movements, () => []);
await hydrateI; await hydrateL; await hydrateM;

export const FORM_LABEL: Record<ItemForm, string> = {
  tablet: "Tablet", capsule: "Capsule", syrup: "Syrup", injection: "Injection",
  infusion: "Infusion", cream: "Cream", ointment: "Ointment", drops: "Drops",
  inhaler: "Inhaler", patch: "Patch", suppository: "Suppository", powder: "Powder",
  device: "Device", other: "Other",
};

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  receive: "Received", dispense: "Dispensed", return: "Returned", adjust: "Adjusted",
  transfer_out: "Transferred out", transfer_in: "Transferred in", expire: "Expired", waste: "Wasted",
};

function suffix(orgId: string) { return orgId.slice(0, 4).toUpperCase(); }
function nextItemId(orgId: string) {
  const prefix = `DRG-${suffix(orgId)}-`;
  const m = items.filter((x) => x.id.startsWith(prefix))
    .reduce((mx, x) => Math.max(mx, Number(x.id.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(m + 1).padStart(4, "0")}`;
}
function nextLotId(orgId: string) {
  const prefix = `LOT-${suffix(orgId)}-`;
  const m = lots.filter((x) => x.id.startsWith(prefix))
    .reduce((mx, x) => Math.max(mx, Number(x.id.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(m + 1).padStart(4, "0")}`;
}
function nextMoveId(orgId: string) {
  const prefix = `MOV-${suffix(orgId)}-`;
  const m = movements.filter((x) => x.id.startsWith(prefix))
    .reduce((mx, x) => Math.max(mx, Number(x.id.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(m + 1).padStart(4, "0")}`;
}

// ---------- Items ----------

export function listItems(opts: { organizationId: string; search?: string; isActive?: boolean }): DrugItem[] {
  const s = opts.search?.toLowerCase();
  return items.filter((i) => i.organizationId === opts.organizationId)
    .filter((i) => (opts.isActive == null ? true : i.isActive === opts.isActive))
    .filter((i) => (s ? (i.genericName + " " + (i.brandName || "") + " " + i.sku).toLowerCase().includes(s) : true))
    .sort((a, b) => a.genericName.localeCompare(b.genericName));
}

export function createItem(orgId: string, input: Partial<DrugItem>): { ok: true; item: DrugItem } | { ok: false; error: string } {
  if (!input.genericName || !input.sku || !input.form) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const it: DrugItem = {
    id: nextItemId(orgId),
    organizationId: orgId,
    sku: input.sku,
    genericName: input.genericName,
    brandName: input.brandName,
    form: input.form as ItemForm,
    strength: input.strength,
    route: input.route,
    storage: (input.storage || "room") as StorageTemp,
    reorderLevel: Number(input.reorderLevel) || 0,
    reorderQuantity: Number(input.reorderQuantity) || 0,
    unitCost: input.unitCost,
    unitPrice: input.unitPrice,
    vendor: input.vendor,
    isControlled: !!input.isControlled,
    schedule: input.schedule,
    isActive: input.isActive ?? true,
    notes: input.notes,
    createdAt: now, updatedAt: now,
  };
  items.push(it);
  return { ok: true, item: it };
}

export function updateItem(id: string, orgId: string, patch: Partial<DrugItem>): DrugItem | null {
  const i = items.findIndex((x) => x.id === id && x.organizationId === orgId);
  if (i < 0) return null;
  items.splice(i, 1, { ...items[i], ...patch, id: items[i].id, organizationId: items[i].organizationId, updatedAt: new Date().toISOString() });
  return items[i];
}

export function deleteItem(id: string, orgId: string): boolean {
  const i = items.findIndex((x) => x.id === id && x.organizationId === orgId);
  if (i < 0) return false;
  items.splice(i, 1);
  // cascade: keep lots/moves as historical audit, but orphaned
  return true;
}

// ---------- Lots ----------

export function listLots(opts: { organizationId: string; itemId?: string }): StockLot[] {
  return lots.filter((l) => l.organizationId === opts.organizationId)
    .filter((l) => (opts.itemId ? l.itemId === opts.itemId : true))
    .sort((a, b) => (a.expiryDate || "").localeCompare(b.expiryDate || ""));
}

export function createLot(
  orgId: string,
  input: Partial<StockLot> & { performedBy?: string }
): { ok: true; lot: StockLot } | { ok: false; error: string } {
  if (!input.itemId || !input.lotNumber || !input.expiryDate) return { ok: false, error: "missing_required" };
  if (!items.find((i) => i.id === input.itemId && i.organizationId === orgId)) return { ok: false, error: "item_not_found" };
  const now = new Date().toISOString();
  const lot: StockLot = {
    id: nextLotId(orgId),
    organizationId: orgId,
    itemId: input.itemId,
    lotNumber: input.lotNumber,
    quantity: Number(input.quantity) || 0,
    expiryDate: input.expiryDate,
    location: input.location,
    receivedAt: input.receivedAt || now,
    unitCost: input.unitCost,
    createdAt: now, updatedAt: now,
  };
  lots.push(lot);
  if (lot.quantity > 0) {
    movements.push({
      id: nextMoveId(orgId), organizationId: orgId, itemId: lot.itemId, lotId: lot.id,
      type: "receive", quantity: lot.quantity, performedBy: input.performedBy, at: now,
    });
  }
  return { ok: true, lot };
}

export function updateLot(id: string, orgId: string, patch: Partial<StockLot>): StockLot | null {
  const i = lots.findIndex((l) => l.id === id && l.organizationId === orgId);
  if (i < 0) return null;
  lots.splice(i, 1, { ...lots[i], ...patch, id: lots[i].id, organizationId: lots[i].organizationId, updatedAt: new Date().toISOString() });
  return lots[i];
}

export function deleteLot(id: string, orgId: string): boolean {
  const i = lots.findIndex((l) => l.id === id && l.organizationId === orgId);
  if (i < 0) return false;
  lots.splice(i, 1);
  return true;
}

// ---------- Movements ----------

export function listMovements(opts: { organizationId: string; itemId?: string; limit?: number }): StockMovement[] {
  return movements.filter((m) => m.organizationId === opts.organizationId)
    .filter((m) => (opts.itemId ? m.itemId === opts.itemId : true))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, opts.limit ?? 200);
}

export function recordMovement(
  orgId: string,
  input: { itemId: string; lotId?: string; type: MovementType; quantity: number; performedBy?: string; reason?: string; refId?: string }
): { ok: true; movement: StockMovement } | { ok: false; error: string } {
  if (!input.itemId || !input.type || !input.quantity || input.quantity <= 0) return { ok: false, error: "invalid_input" };
  const now = new Date().toISOString();
  // mutate lot qty
  if (input.lotId) {
    const lot = lots.find((l) => l.id === input.lotId && l.organizationId === orgId);
    if (!lot) return { ok: false, error: "lot_not_found" };
    const delta =
      input.type === "receive" || input.type === "return" || input.type === "transfer_in" ? +input.quantity :
      input.type === "adjust" ? +input.quantity :  // caller passes signed via reason, kept simple here
      -input.quantity;
    const next = lot.quantity + delta;
    if (next < 0) return { ok: false, error: "insufficient_stock" };
    lot.quantity = next;
    lot.updatedAt = now;
  }
  const mv: StockMovement = {
    id: nextMoveId(orgId), organizationId: orgId,
    itemId: input.itemId, lotId: input.lotId, type: input.type,
    quantity: input.quantity, performedBy: input.performedBy, reason: input.reason, refId: input.refId,
    at: now,
  };
  movements.push(mv);
  return { ok: true, movement: mv };
}

// ---------- Derived ----------

export function onHand(itemId: string, orgId: string): number {
  return lots.filter((l) => l.organizationId === orgId && l.itemId === itemId)
    .reduce((s, l) => s + l.quantity, 0);
}

export function itemStatus(item: DrugItem): { onHand: number; expiringSoon: number; expired: number; lowStock: boolean } {
  const my = lots.filter((l) => l.organizationId === item.organizationId && l.itemId === item.id);
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 86_400_000);
  let oh = 0, expSoon = 0, expired = 0;
  for (const l of my) {
    oh += l.quantity;
    const ex = new Date(l.expiryDate);
    if (ex < now) expired += l.quantity;
    else if (ex < soon) expSoon += l.quantity;
  }
  return { onHand: oh, expiringSoon: expSoon, expired, lowStock: oh <= item.reorderLevel };
}

export function computeStats(orgId: string) {
  const myItems = items.filter((i) => i.organizationId === orgId && i.isActive);
  const myLots = lots.filter((l) => l.organizationId === orgId);
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86_400_000);
  const skus = myItems.length;
  const controlled = myItems.filter((i) => i.isControlled).length;
  let low = 0, outOf = 0, expired = 0, expiringSoon = 0, totalValue = 0;
  for (const it of myItems) {
    const s = itemStatus(it);
    if (s.onHand === 0) outOf++;
    else if (s.lowStock) low++;
    expired += s.expired;
    expiringSoon += s.expiringSoon;
    totalValue += s.onHand * (it.unitCost || 0);
  }
  const movementsToday = movements.filter((m) =>
    m.organizationId === orgId && new Date(m.at).toDateString() === now.toDateString()
  ).length;
  return {
    skus, controlled, lowStockCount: low, outOfStock: outOf,
    expiringSoonUnits: expiringSoon, expiredUnits: expired,
    inventoryValue: Math.round(totalValue),
    movementsToday,
    _in30: in30.toISOString(),
    lotsCount: myLots.length,
  };
}
