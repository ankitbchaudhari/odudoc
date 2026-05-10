// Patient-tagged hospital consumables.
//
// Every glove, mask, surgical drape, syringe, ECG-pad strip used
// during admission is logged here against the patient's admission.
// Billing automatically rolls these up onto the discharge invoice
// so the patient is charged exactly for what was used (vs. the
// older flat-rate "consumables surcharge").
//
// Pricing source: per-org override > catalogue default. Org admins
// edit the catalogue from /admin/consumables (added next round).

import { bindPersistentArray } from "../persistent-array";

export type ConsumableCategory =
  | "ppe"           // mask, gloves, gowns, face shields
  | "syringe"
  | "iv_supplies"   // cannula, IV set, fluid bags
  | "wound_care"    // gauze, bandage, suture
  | "diagnostics"   // ECG pads, glucose strips, BP cuff covers
  | "surgical"      // drape, surgical mask, scrub
  | "linen"         // bedsheet, pillow case
  | "other";

export interface ConsumableSku {
  /** Catalogue id — stable across orgs. */
  id: string;
  name: string;
  category: ConsumableCategory;
  /** Default price in INR rupees. Per-org override may differ. */
  defaultPriceRupees: number;
  /** Free-text unit ("each", "pair", "box of 50"). */
  unit: string;
}

/** Seed catalogue — operators add more from the admin UI. */
export const SEED_SKUS: ConsumableSku[] = [
  { id: "sku-mask-3ply", name: "3-ply surgical mask", category: "ppe", defaultPriceRupees: 5, unit: "each" },
  { id: "sku-n95",       name: "N95 respirator",      category: "ppe", defaultPriceRupees: 80, unit: "each" },
  { id: "sku-gloves-l",  name: "Latex gloves (L)",    category: "ppe", defaultPriceRupees: 8, unit: "pair" },
  { id: "sku-gloves-m",  name: "Latex gloves (M)",    category: "ppe", defaultPriceRupees: 8, unit: "pair" },
  { id: "sku-gown",      name: "Disposable gown",     category: "ppe", defaultPriceRupees: 60, unit: "each" },
  { id: "sku-syr-5ml",   name: "Syringe 5 mL",        category: "syringe", defaultPriceRupees: 4, unit: "each" },
  { id: "sku-syr-10ml",  name: "Syringe 10 mL",       category: "syringe", defaultPriceRupees: 6, unit: "each" },
  { id: "sku-iv-set",    name: "IV infusion set",     category: "iv_supplies", defaultPriceRupees: 35, unit: "each" },
  { id: "sku-cannula-22g", name: "IV cannula 22G",    category: "iv_supplies", defaultPriceRupees: 45, unit: "each" },
  { id: "sku-ns-500",    name: "Normal saline 500 mL", category: "iv_supplies", defaultPriceRupees: 60, unit: "each" },
  { id: "sku-gauze",     name: "Sterile gauze pad",   category: "wound_care", defaultPriceRupees: 12, unit: "each" },
  { id: "sku-bandage",   name: "Bandage roll",        category: "wound_care", defaultPriceRupees: 25, unit: "each" },
  { id: "sku-suture",    name: "Suture thread",       category: "wound_care", defaultPriceRupees: 90, unit: "each" },
  { id: "sku-ecg-pad",   name: "ECG electrode pad",   category: "diagnostics", defaultPriceRupees: 6, unit: "each" },
  { id: "sku-glu-strip", name: "Glucose strip",       category: "diagnostics", defaultPriceRupees: 18, unit: "each" },
  { id: "sku-drape",     name: "Surgical drape",      category: "surgical", defaultPriceRupees: 120, unit: "each" },
  { id: "sku-bedsheet",  name: "Disposable bedsheet", category: "linen", defaultPriceRupees: 80, unit: "each" },
];

export interface ConsumableUsage {
  id: string;
  organizationId: string;
  /** Admission this usage is billed under. Patientid copied for
   *  faster lookup at billing time. */
  admissionId: string;
  patientId: string;
  skuId: string;
  skuName: string;
  category: ConsumableCategory;
  quantity: number;
  /** Unit price snapshot at the time of use — protects against
   *  retroactive price changes. */
  unitPriceRupees: number;
  totalRupees: number;
  /** Free-text — "wound dressing change", "phlebotomy". */
  context?: string;
  /** Email of the staff/nurse who logged it. */
  loggedByEmail?: string;
  loggedAt: string;
  /** True once rolled into the discharge invoice. */
  billed: boolean;
  invoiceId?: string;
}

const usage: ConsumableUsage[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<ConsumableUsage>(
  "hospital_consumables_usage",
  usage,
  () => []
);
await hydrate();

export interface LogUsageInput {
  organizationId: string;
  admissionId: string;
  patientId: string;
  skuId: string;
  quantity: number;
  unitPriceOverrideRupees?: number;
  context?: string;
  loggedByEmail?: string;
}

export function logUsage(input: LogUsageInput): { ok: true; entry: ConsumableUsage } | { ok: false; error: string } {
  if (!input.quantity || input.quantity <= 0) return { ok: false, error: "invalid_quantity" };
  const sku = SEED_SKUS.find((s) => s.id === input.skuId);
  if (!sku) return { ok: false, error: "sku_not_found" };
  const unit = input.unitPriceOverrideRupees ?? sku.defaultPriceRupees;
  const at = new Date().toISOString();
  const e: ConsumableUsage = {
    id: `cu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    admissionId: input.admissionId,
    patientId: input.patientId,
    skuId: sku.id,
    skuName: sku.name,
    category: sku.category,
    quantity: input.quantity,
    unitPriceRupees: unit,
    totalRupees: Math.round(unit * input.quantity),
    context: input.context?.trim() || undefined,
    loggedByEmail: input.loggedByEmail,
    loggedAt: at,
    billed: false,
  };
  usage.unshift(e);
  flush();
  return { ok: true, entry: e };
}

export function listUsageForAdmission(admissionId: string, organizationId: string): ConsumableUsage[] {
  return usage
    .filter((u) => u.admissionId === admissionId && u.organizationId === organizationId)
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
}

export function listUnbilledForAdmission(admissionId: string, organizationId: string): ConsumableUsage[] {
  return listUsageForAdmission(admissionId, organizationId).filter((u) => !u.billed);
}

/** Mark a batch of usage rows as billed under an invoice. Used at
 *  discharge time when the billing module rolls them up. */
export function markBilled(usageIds: string[], invoiceId: string): number {
  let n = 0;
  for (const id of usageIds) {
    const u = usage.find((x) => x.id === id);
    if (u && !u.billed) { u.billed = true; u.invoiceId = invoiceId; n++; }
  }
  if (n) flush();
  return n;
}

export function deleteUsage(id: string, organizationId: string): boolean {
  const i = usage.findIndex((u) => u.id === id && u.organizationId === organizationId);
  if (i < 0) return false;
  if (usage[i].billed) return false; // can't delete billed rows
  tombstone(usage[i].id);
  usage.splice(i, 1);
  flush();
  return true;
}

export function deleteUsageForOrg(organizationId: string): number {
  let n = 0;
  for (let i = usage.length - 1; i >= 0; i--) {
    if (usage[i].organizationId === organizationId) {
      tombstone(usage[i].id);
      usage.splice(i, 1);
      n++;
    }
  }
  if (n) flush();
  return n;
}

export function summarizeForAdmission(admissionId: string, organizationId: string): {
  totalRupees: number;
  itemCount: number;
  byCategory: Record<string, number>;
} {
  const list = listUsageForAdmission(admissionId, organizationId);
  const byCategory: Record<string, number> = {};
  let total = 0;
  for (const u of list) {
    total += u.totalRupees;
    byCategory[u.category] = (byCategory[u.category] || 0) + u.totalRupees;
  }
  return { totalRupees: total, itemCount: list.length, byCategory };
}
