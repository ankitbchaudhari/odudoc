// Unified inventory: one SKU registry across pharmacy, lab, biomedical
// and ward stocks. Stock is tracked per (sku, location) so the same
// medicine can have different counts at different facility points.

import { bindPersistentArray } from "./persistent-array";

export type StockScope = "pharmacy" | "laboratory" | "biomedical" | "ward" | "general";

export interface InventoryItem {
  id: string;
  doctorEmail: string;       // clinic owner — scoping pivot
  scope: StockScope;
  sku: string;               // doctor-visible code, e.g. "MED-PARA-500"
  name: string;
  category?: string;         // free-form ("Antibiotic", "Reagent", "Disposable")
  /** Link to a row in medicines-catalog if applicable. */
  medicineId?: string;
  unit?: string;             // "tablet" / "bottle" / "kit" / "pcs"
  unitCost?: number;
  unitCurrency?: string;     // "INR" | "USD" | …
  /** Current on-hand count. Snapshot updated by adjustStock(). */
  qty: number;
  reorderAt?: number;
  /** Lot-level expiry. For multi-lot tracking, create separate rows
   *  per lot using the same sku + an "lot=…" suffix on id. */
  expiry?: string;           // ISO date
  supplierName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const inventory: InventoryItem[] = [];
const {
  hydrate: hydrateInv,
  reload: reloadInvInternal,
  flush: flushInv,
} = bindPersistentArray<InventoryItem>("emr-inventory", inventory, () => []);

await hydrateInv();
export async function reloadInventory() { await reloadInvInternal(); }

const nowIso = () => new Date().toISOString();
const id = () => `inv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export interface CreateInventoryInput {
  doctorEmail: string;
  scope: StockScope;
  sku: string;
  name: string;
  category?: string;
  medicineId?: string;
  unit?: string;
  unitCost?: number;
  unitCurrency?: string;
  qty?: number;
  reorderAt?: number;
  expiry?: string;
  supplierName?: string;
  notes?: string;
}

export async function createInventoryItem(input: CreateInventoryInput): Promise<InventoryItem> {
  const row: InventoryItem = {
    id: id(),
    doctorEmail: input.doctorEmail.toLowerCase(),
    scope: input.scope,
    sku: input.sku.trim(),
    name: input.name.trim(),
    category: input.category,
    medicineId: input.medicineId,
    unit: input.unit,
    unitCost: input.unitCost,
    unitCurrency: input.unitCurrency,
    qty: Math.max(0, input.qty ?? 0),
    reorderAt: input.reorderAt,
    expiry: input.expiry,
    supplierName: input.supplierName,
    notes: input.notes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  inventory.push(row);
  flushInv();
  return row;
}

export async function listInventory(opts: {
  doctorEmail: string;
  scope?: StockScope | "All";
  search?: string;
}): Promise<InventoryItem[]> {
  await hydrateInv();
  const e = opts.doctorEmail.toLowerCase();
  let list = inventory.filter((r) => r.doctorEmail === e);
  if (opts.scope && opts.scope !== "All") list = list.filter((r) => r.scope === opts.scope);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (r) =>
        r.sku.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.category || "").toLowerCase().includes(q),
    );
  }
  list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

export async function updateInventoryItem(
  rowId: string,
  doctorEmail: string,
  patch: Partial<Omit<InventoryItem, "id" | "doctorEmail" | "createdAt">>,
): Promise<InventoryItem | null> {
  await hydrateInv();
  const r = inventory.find((x) => x.id === rowId && x.doctorEmail === doctorEmail.toLowerCase());
  if (!r) return null;
  Object.assign(r, patch, { updatedAt: nowIso() });
  flushInv();
  return r;
}

/** Atomic stock adjustment — positive numbers receive, negative dispense. */
export async function adjustStock(
  rowId: string,
  doctorEmail: string,
  delta: number,
): Promise<InventoryItem | null> {
  await hydrateInv();
  const r = inventory.find((x) => x.id === rowId && x.doctorEmail === doctorEmail.toLowerCase());
  if (!r) return null;
  r.qty = Math.max(0, r.qty + delta);
  r.updatedAt = nowIso();
  flushInv();
  return r;
}

export async function deleteInventoryItem(rowId: string, doctorEmail: string): Promise<boolean> {
  await hydrateInv();
  const idx = inventory.findIndex((x) => x.id === rowId && x.doctorEmail === doctorEmail.toLowerCase());
  if (idx < 0) return false;
  inventory.splice(idx, 1);
  flushInv();
  return true;
}

export interface InventorySummary {
  total: number;
  lowStock: number;
  outOfStock: number;
  expiringSoon: number;  // within 30 days
  expired: number;
  byScope: Record<StockScope, number>;
}

export async function summariseInventory(doctorEmail: string): Promise<InventorySummary> {
  const list = await listInventory({ doctorEmail });
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const byScope: InventorySummary["byScope"] = {
    pharmacy: 0, laboratory: 0, biomedical: 0, ward: 0, general: 0,
  };
  let lowStock = 0;
  let outOfStock = 0;
  let expiringSoon = 0;
  let expired = 0;
  for (const r of list) {
    byScope[r.scope] += 1;
    if (r.qty === 0) outOfStock += 1;
    else if (r.reorderAt && r.qty <= r.reorderAt) lowStock += 1;
    if (r.expiry) {
      const exp = Date.parse(r.expiry);
      if (Number.isFinite(exp)) {
        if (exp < now) expired += 1;
        else if (exp - now < 30 * day) expiringSoon += 1;
      }
    }
  }
  return { total: list.length, lowStock, outOfStock, expiringSoon, expired, byScope };
}
