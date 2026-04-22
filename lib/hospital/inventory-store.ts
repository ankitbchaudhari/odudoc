// Inventory — hospital stock catalog. Tenant-scoped.
//
// An item (drug / consumable / equipment) has metadata plus a list of
// batches (lot no, expiry, purchase & sale prices, on-hand quantity).
// Stock movements adjust batch on-hand and are kept as an audit trail.
//
// Designed so pharmacy dispensing (future) and procedure-consumable
// tracking can both pull from the same stock model.

import { bindPersistentArray } from "../persistent-array";

export type ItemCategory =
  | "drug"
  | "consumable"
  | "equipment"
  | "surgical"
  | "reagent"
  | "other";

export type StockMovementType =
  | "receipt" // incoming from supplier
  | "dispense" // outgoing to patient (pharmacy)
  | "consumption" // outgoing to procedure / ward
  | "adjustment" // stocktake correction (signed)
  | "return" // patient return / supplier return
  | "expired" // write-off
  | "damaged"; // write-off

export interface InventoryBatch {
  id: string;
  batchNumber: string;
  expiryDate?: string; // YYYY-MM-DD
  purchasePrice?: number;
  sellingPrice?: number;
  quantity: number; // current on-hand
  receivedAt: string;
  supplier?: string;
}

export interface InventoryItem {
  id: string;
  organizationId: string;
  sku: string; // per-org unique code
  name: string;
  genericName?: string;
  category: ItemCategory;
  unit: string; // "tablet", "ml", "unit", "box"
  manufacturer?: string;
  hsnCode?: string; // tax classification
  taxPercent?: number;
  reorderLevel: number; // trigger low-stock alert when total on-hand < this
  active: boolean;
  batches: InventoryBatch[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  organizationId: string;
  itemId: string;
  batchId?: string;
  type: StockMovementType;
  quantity: number; // always positive in the record; type defines direction
  direction: "in" | "out";
  reference?: string; // "rx-xxx" / "enc-xxx" / "PO-123"
  note?: string;
  createdBy?: string;
  createdAt: string;
}

const items: InventoryItem[] = [];
const movements: StockMovement[] = [];

const { hydrate: hydrateItems, flush: flushItems } =
  bindPersistentArray<InventoryItem>("hospital-inventory-items", items, () => []);
const { hydrate: hydrateMoves, flush: flushMoves } =
  bindPersistentArray<StockMovement>("hospital-stock-movements", movements, () => []);

await hydrateItems();
await hydrateMoves();

function newBatchId() {
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
function newMovementId() {
  return `mv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function nextSku(organizationId: string): string {
  const orgSuffix = organizationId
    .replace(/^org-/, "")
    .slice(0, 4)
    .toUpperCase();
  const n =
    items.filter((i) => i.organizationId === organizationId).length + 1;
  return `SKU-${orgSuffix}-${String(n).padStart(5, "0")}`;
}

export function itemOnHand(item: InventoryItem): number {
  return item.batches.reduce((s, b) => s + (Number(b.quantity) || 0), 0);
}

export function isLowStock(item: InventoryItem): boolean {
  return itemOnHand(item) < item.reorderLevel;
}

export function expiringSoon(item: InventoryItem, days = 30): InventoryBatch[] {
  const threshold = Date.now() + days * 24 * 60 * 60 * 1000;
  return item.batches.filter((b) => {
    if (!b.expiryDate || b.quantity <= 0) return false;
    const t = new Date(b.expiryDate).getTime();
    return Number.isFinite(t) && t <= threshold;
  });
}

export function listItems(opts: {
  organizationId: string;
  search?: string;
  category?: ItemCategory;
  lowStockOnly?: boolean;
}): InventoryItem[] {
  let list = items.filter((i) => i.organizationId === opts.organizationId);
  if (opts.category) list = list.filter((i) => i.category === opts.category);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        (i.genericName && i.genericName.toLowerCase().includes(q)) ||
        (i.manufacturer && i.manufacturer.toLowerCase().includes(q))
    );
  }
  if (opts.lowStockOnly) list = list.filter(isLowStock);
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export function getItemById(
  id: string,
  organizationId: string
): InventoryItem | null {
  const it = items.find((x) => x.id === id);
  if (!it || it.organizationId !== organizationId) return null;
  return it;
}

export interface ItemInput {
  name: string;
  genericName?: string;
  category: ItemCategory;
  unit: string;
  manufacturer?: string;
  hsnCode?: string;
  taxPercent?: number;
  reorderLevel?: number;
  active?: boolean;
  notes?: string;
}

export function createItem(
  organizationId: string,
  input: ItemInput
): InventoryItem {
  const now = new Date().toISOString();
  const it: InventoryItem = {
    id: `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    sku: nextSku(organizationId),
    name: input.name.trim(),
    genericName: input.genericName?.trim() || undefined,
    category: input.category,
    unit: input.unit.trim() || "unit",
    manufacturer: input.manufacturer?.trim() || undefined,
    hsnCode: input.hsnCode?.trim() || undefined,
    taxPercent: input.taxPercent ?? 0,
    reorderLevel: Math.max(0, Number(input.reorderLevel) || 0),
    active: input.active ?? true,
    batches: [],
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  items.push(it);
  flushItems();
  return it;
}

export function updateItem(
  id: string,
  organizationId: string,
  patch: Partial<ItemInput>
): InventoryItem | null {
  const it = items.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!it) return null;
  if (patch.name !== undefined) it.name = patch.name.trim();
  if (patch.genericName !== undefined)
    it.genericName = patch.genericName?.trim() || undefined;
  if (patch.category !== undefined) it.category = patch.category;
  if (patch.unit !== undefined) it.unit = patch.unit.trim() || "unit";
  if (patch.manufacturer !== undefined)
    it.manufacturer = patch.manufacturer?.trim() || undefined;
  if (patch.hsnCode !== undefined)
    it.hsnCode = patch.hsnCode?.trim() || undefined;
  if (patch.taxPercent !== undefined) it.taxPercent = patch.taxPercent;
  if (patch.reorderLevel !== undefined)
    it.reorderLevel = Math.max(0, Number(patch.reorderLevel) || 0);
  if (patch.active !== undefined) it.active = patch.active;
  if (patch.notes !== undefined) it.notes = patch.notes?.trim() || undefined;
  it.updatedAt = new Date().toISOString();
  flushItems();
  return it;
}

export function deleteItem(id: string, organizationId: string): boolean {
  const i = items.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  items.splice(i, 1);
  flushItems();
  // Purge movements for this item too.
  let removed = 0;
  for (let j = movements.length - 1; j >= 0; j--) {
    if (
      movements[j].itemId === id &&
      movements[j].organizationId === organizationId
    ) {
      movements.splice(j, 1);
      removed++;
    }
  }
  if (removed) flushMoves();
  return true;
}

// Record a stock receipt: creates a new batch on the item and a movement entry.
export interface ReceiptInput {
  itemId: string;
  batchNumber: string;
  expiryDate?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  quantity: number;
  supplier?: string;
  reference?: string;
  note?: string;
  createdBy?: string;
}

export function receiveStock(
  organizationId: string,
  input: ReceiptInput
): { item: InventoryItem; batch: InventoryBatch; movement: StockMovement } | null {
  const it = items.find(
    (x) => x.id === input.itemId && x.organizationId === organizationId
  );
  if (!it) return null;
  const qty = Math.max(0, Number(input.quantity) || 0);
  if (qty <= 0) return null;
  const now = new Date().toISOString();
  const batch: InventoryBatch = {
    id: newBatchId(),
    batchNumber: input.batchNumber.trim() || `batch-${Date.now().toString(36)}`,
    expiryDate: input.expiryDate,
    purchasePrice: input.purchasePrice,
    sellingPrice: input.sellingPrice,
    quantity: qty,
    receivedAt: now,
    supplier: input.supplier?.trim() || undefined,
  };
  it.batches.push(batch);
  it.updatedAt = now;
  flushItems();

  const mv: StockMovement = {
    id: newMovementId(),
    organizationId,
    itemId: it.id,
    batchId: batch.id,
    type: "receipt",
    quantity: qty,
    direction: "in",
    reference: input.reference,
    note: input.note,
    createdBy: input.createdBy,
    createdAt: now,
  };
  movements.push(mv);
  flushMoves();

  return { item: it, batch, movement: mv };
}

// Issue stock out. Uses FEFO (first-expiring-first-out) across batches if
// batchId is not specified. Returns the movements recorded (one per batch
// touched). Returns null if insufficient stock.
export interface IssueInput {
  itemId: string;
  batchId?: string;
  type: StockMovementType; // "dispense" | "consumption" | "expired" | "damaged"
  quantity: number;
  reference?: string;
  note?: string;
  createdBy?: string;
}

export function issueStock(
  organizationId: string,
  input: IssueInput
): { item: InventoryItem; movements: StockMovement[] } | null {
  const it = items.find(
    (x) => x.id === input.itemId && x.organizationId === organizationId
  );
  if (!it) return null;
  let remaining = Math.max(0, Number(input.quantity) || 0);
  if (remaining <= 0) return null;

  // Select target batches.
  const eligible = (input.batchId
    ? it.batches.filter((b) => b.id === input.batchId)
    : [...it.batches]
  )
    .filter((b) => b.quantity > 0)
    .sort((a, b) => {
      // FEFO: earliest expiry first; undefined expiry last.
      const ax = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
      const bx = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
      return ax - bx;
    });

  const totalAvailable = eligible.reduce((s, b) => s + b.quantity, 0);
  if (totalAvailable < remaining) return null; // insufficient

  const now = new Date().toISOString();
  const recorded: StockMovement[] = [];
  for (const b of eligible) {
    if (remaining <= 0) break;
    const take = Math.min(b.quantity, remaining);
    b.quantity -= take;
    remaining -= take;
    const mv: StockMovement = {
      id: newMovementId(),
      organizationId,
      itemId: it.id,
      batchId: b.id,
      type: input.type,
      quantity: take,
      direction: "out",
      reference: input.reference,
      note: input.note,
      createdBy: input.createdBy,
      createdAt: now,
    };
    movements.push(mv);
    recorded.push(mv);
  }
  it.updatedAt = now;
  flushItems();
  flushMoves();
  return { item: it, movements: recorded };
}

export interface AdjustmentInput {
  itemId: string;
  batchId: string;
  deltaQuantity: number; // signed; +gain, -loss
  reason?: string;
  createdBy?: string;
}

export function adjustStock(
  organizationId: string,
  input: AdjustmentInput
): { item: InventoryItem; movement: StockMovement } | null {
  const it = items.find(
    (x) => x.id === input.itemId && x.organizationId === organizationId
  );
  if (!it) return null;
  const b = it.batches.find((x) => x.id === input.batchId);
  if (!b) return null;
  const delta = Number(input.deltaQuantity) || 0;
  if (delta === 0) return null;
  if (b.quantity + delta < 0) return null; // don't drop below zero
  b.quantity += delta;
  const now = new Date().toISOString();
  it.updatedAt = now;
  flushItems();
  const mv: StockMovement = {
    id: newMovementId(),
    organizationId,
    itemId: it.id,
    batchId: b.id,
    type: "adjustment",
    quantity: Math.abs(delta),
    direction: delta > 0 ? "in" : "out",
    note: input.reason,
    createdBy: input.createdBy,
    createdAt: now,
  };
  movements.push(mv);
  flushMoves();
  return { item: it, movement: mv };
}

export function listMovements(opts: {
  organizationId: string;
  itemId?: string;
  type?: StockMovementType;
  limit?: number;
}): StockMovement[] {
  let list = movements.filter((m) => m.organizationId === opts.organizationId);
  if (opts.itemId) list = list.filter((m) => m.itemId === opts.itemId);
  if (opts.type) list = list.filter((m) => m.type === opts.type);
  list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  if (opts.limit) list = list.slice(0, opts.limit);
  return list;
}
