// Per-org SKU catalogue for procurement.
//
// Each SKU declares the rules the auto-reorder scanner needs:
//   - current stock (pieces / strips / bottles, depending on form)
//   - reorderLevel — when stock drops to or below this, a PO drafts
//   - reorderQty — how many units to order on reorder
//   - leadTimeDays — vendor's typical fulfilment time, used to gate
//     "do we still have enough days of cover?" decisions
//   - preferredVendorId — first-pick vendor
//   - alternateVendors — fallback list if preferred is out of stock
//   - lastReorderAt — debounce so we don't fire 100 POs for the same
//     SKU when scanner runs every minute
//
// Distinct from the existing pharmacy-stock-store which models the
// outward-facing pharmacy-marketplace inventory (consumer matching).
// This one is the inward-facing procurement view: a hospital running
// its own pharmacy or stockroom needing to refill from upstream
// distributors.

import { bindPersistentArray } from "../persistent-array";

export type SkuCategory =
  | "drug"
  | "consumable"        // syringes, gloves, gauze
  | "device"            // monitors, IV pumps
  | "reagent"           // lab reagents
  | "linen"             // sheets, gowns
  | "office";           // forms, printer toner

export type StockUnit = "strip" | "bottle" | "vial" | "pack" | "box" | "piece" | "kg" | "litre";

export interface ProcurementSku {
  id: string;
  organizationId: string;
  /** Generic / canonical name. */
  genericName: string;
  /** Brand stocked. */
  brand?: string;
  category: SkuCategory;
  unit: StockUnit;
  packSize?: number;
  strength?: string;
  form?: string;
  /** Current count of `unit` in stock. */
  stock: number;
  /** Trigger threshold — at or below, a PO drafts. */
  reorderLevel: number;
  /** Quantity to add on each reorder. */
  reorderQty: number;
  /** Vendor lead time. */
  leadTimeDays: number;
  /** First-pick vendor id (free-form for now; could reference
   *  vendors-store later). */
  preferredVendorId?: string;
  preferredVendorName?: string;
  /** Fallback vendor ids. */
  alternateVendors?: Array<{ id: string; name: string }>;
  /** Last-reorder timestamp — debounces scanner from firing twice. */
  lastReorderAt?: string;
  /** Pause auto-reorder for this SKU (procurement freeze, EOL,
   *  alternative being introduced). */
  paused?: boolean;
  /** Daily-burn estimate maintained from observed dispense rate;
   *  scanner uses this for "days of cover" warnings. */
  avgDailyBurn?: number;
  unitCostRupees?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const skus: ProcurementSku[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<ProcurementSku>(
  "procurement_skus",
  skus,
  () => []
);
await hydrate();

export function listSkus(orgId: string): ProcurementSku[] {
  return skus
    .filter((s) => s.organizationId === orgId)
    .sort((a, b) => a.genericName.localeCompare(b.genericName));
}

export function getSku(id: string): ProcurementSku | null {
  return skus.find((s) => s.id === id) || null;
}

export function findSkuForOrg(id: string, orgId: string): ProcurementSku | null {
  const s = getSku(id);
  return s && s.organizationId === orgId ? s : null;
}

export interface UpsertSkuInput {
  id?: string;
  organizationId: string;
  genericName: string;
  brand?: string;
  category: SkuCategory;
  unit: StockUnit;
  packSize?: number;
  strength?: string;
  form?: string;
  stock?: number;
  reorderLevel: number;
  reorderQty: number;
  leadTimeDays: number;
  preferredVendorId?: string;
  preferredVendorName?: string;
  alternateVendors?: Array<{ id: string; name: string }>;
  paused?: boolean;
  avgDailyBurn?: number;
  unitCostRupees?: number;
  notes?: string;
}

export function upsertSku(input: UpsertSkuInput): ProcurementSku {
  const now = new Date().toISOString();
  if (input.id) {
    const existing = skus.find((s) => s.id === input.id);
    if (existing && existing.organizationId === input.organizationId) {
      Object.assign(existing, input);
      existing.updatedAt = now;
      flush();
      return existing;
    }
  }
  const sku: ProcurementSku = {
    id: input.id || `sku-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    genericName: input.genericName.trim(),
    brand: input.brand?.trim() || undefined,
    category: input.category,
    unit: input.unit,
    packSize: input.packSize,
    strength: input.strength,
    form: input.form,
    stock: input.stock ?? 0,
    reorderLevel: input.reorderLevel,
    reorderQty: input.reorderQty,
    leadTimeDays: input.leadTimeDays,
    preferredVendorId: input.preferredVendorId,
    preferredVendorName: input.preferredVendorName,
    alternateVendors: input.alternateVendors,
    paused: input.paused,
    avgDailyBurn: input.avgDailyBurn,
    unitCostRupees: input.unitCostRupees,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  skus.push(sku);
  flush();
  return sku;
}

export function adjustStock(
  skuId: string,
  delta: number,
  reason: string,
): ProcurementSku | null {
  const s = skus.find((x) => x.id === skuId);
  if (!s) return null;
  s.stock = Math.max(0, s.stock + delta);
  s.updatedAt = new Date().toISOString();
  void reason;
  flush();
  return s;
}

export function markReorderFired(skuId: string): ProcurementSku | null {
  const s = skus.find((x) => x.id === skuId);
  if (!s) return null;
  s.lastReorderAt = new Date().toISOString();
  s.updatedAt = s.lastReorderAt;
  flush();
  return s;
}

export function deleteSkuForOrg(id: string, orgId: string): boolean {
  const i = skus.findIndex((s) => s.id === id && s.organizationId === orgId);
  if (i < 0) return false;
  tombstone(skus[i].id);
  skus.splice(i, 1);
  flush();
  return true;
}

export function deleteSkusForOrg(orgId: string): number {
  let n = 0;
  for (let i = skus.length - 1; i >= 0; i--) {
    if (skus[i].organizationId === orgId) {
      tombstone(skus[i].id);
      skus.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flush();
  return n;
}

/** Demo seed — top-of-mind hospital SKUs with realistic reorder rules. */
export function seedDemoSkus(orgId: string): { inserted: number } {
  const existing = new Set(skus.filter((s) => s.organizationId === orgId).map((s) => s.genericName));
  let inserted = 0;
  for (const d of DEMO_SEED) {
    if (existing.has(d.genericName)) continue;
    upsertSku({ organizationId: orgId, ...d });
    inserted++;
  }
  return { inserted };
}

const DEMO_SEED: Omit<UpsertSkuInput, "organizationId">[] = [
  // Drugs at-or-near reorder so the scanner has work
  { genericName: "Paracetamol", brand: "Calpol", category: "drug", unit: "strip", strength: "500mg", form: "tablet", stock: 18, reorderLevel: 20, reorderQty: 200, leadTimeDays: 2, preferredVendorName: "MedSupply Hub", avgDailyBurn: 8, unitCostRupees: 22 },
  { genericName: "Amoxicillin", brand: "Mox", category: "drug", unit: "strip", strength: "500mg", form: "capsule", stock: 12, reorderLevel: 25, reorderQty: 150, leadTimeDays: 3, preferredVendorName: "PharmaCo Distributors", avgDailyBurn: 5, unitCostRupees: 78 },
  { genericName: "Atorvastatin", brand: "Lipitor", category: "drug", unit: "strip", strength: "20mg", form: "tablet", stock: 60, reorderLevel: 30, reorderQty: 200, leadTimeDays: 2, preferredVendorName: "MedSupply Hub", avgDailyBurn: 6, unitCostRupees: 125 },
  { genericName: "Pantoprazole", brand: "Pan", category: "drug", unit: "strip", strength: "40mg", form: "tablet", stock: 22, reorderLevel: 25, reorderQty: 150, leadTimeDays: 2, preferredVendorName: "MedSupply Hub", avgDailyBurn: 4, unitCostRupees: 95 },
  { genericName: "Metformin", brand: "Glycomet", category: "drug", unit: "strip", strength: "500mg", form: "tablet", stock: 110, reorderLevel: 40, reorderQty: 200, leadTimeDays: 2, preferredVendorName: "PharmaCo Distributors", avgDailyBurn: 7, unitCostRupees: 35 },
  { genericName: "Insulin Glargine", brand: "Lantus", category: "drug", unit: "vial", strength: "100 IU/ml", form: "injection", stock: 5, reorderLevel: 8, reorderQty: 30, leadTimeDays: 4, preferredVendorName: "ColdChain India", avgDailyBurn: 1, unitCostRupees: 1850 },
  // Consumables
  { genericName: "Surgical gloves (Medium)", category: "consumable", unit: "box", packSize: 100, stock: 8, reorderLevel: 10, reorderQty: 50, leadTimeDays: 3, preferredVendorName: "MediKart", avgDailyBurn: 2, unitCostRupees: 480 },
  { genericName: "5ml Syringes", category: "consumable", unit: "box", packSize: 100, stock: 18, reorderLevel: 15, reorderQty: 60, leadTimeDays: 3, preferredVendorName: "MediKart", avgDailyBurn: 3, unitCostRupees: 320 },
  { genericName: "Cotton gauze 7.5cm", category: "consumable", unit: "pack", packSize: 12, stock: 6, reorderLevel: 10, reorderQty: 40, leadTimeDays: 2, preferredVendorName: "MediKart", avgDailyBurn: 1.5, unitCostRupees: 95 },
  // Reagents
  { genericName: "CBC reagent panel", category: "reagent", unit: "pack", stock: 3, reorderLevel: 4, reorderQty: 12, leadTimeDays: 5, preferredVendorName: "DiaTech Labs", avgDailyBurn: 0.5, unitCostRupees: 2400 },
];
