// V15 §4 — Pharmacy barcode stock entry.
// V15 §5 — Pharma-to-pharmacy auto-fill inheritance.
//
// When a pharmacy receives stock:
//   - Scan a drug barcode → drug master + manufacturer + batch
//     metadata flow into the receipt form (no re-typing)
//   - If the receipt is linked to a B2B pharma order, the entire
//     line-item table inherits batch numbers + manufacturing site +
//     anti-counterfeit serials from the pharma's batch issue
//
// The store sits on top of:
//   - lib/pharma-store.ts drug master + batches
//   - lib/equipment-marketplace-store.ts purchase orders (re-used
//     for the pharma B2B path)

import { bindPersistentArray } from "@/lib/persistent-array";
import { recordEvent } from "@/lib/accountability-store";

/** A barcode → drug master link. Pharmacies scan barcodes that
 *  don't map yet; they link them to a master entry once, then the
 *  link persists. */
export interface BarcodeMapping {
  barcode: string;
  drugInn: string;
  brandName?: string;
  manufacturerPharmaId?: string;
  defaultPackSize?: number;
  /** Established by which pharmacy + when. Audit traceback. */
  linkedByPharmacyId?: string;
  linkedAt: string;
}

/** A pharmacy's on-hand stock row. One per (pharmacy, drugInn,
 *  batchNumber, expiresOn) tuple. */
export interface PharmacyStockRow {
  id: string;
  pharmacyId: string;
  drugInn: string;
  brandName?: string;
  manufacturerPharmaId?: string;
  /** Batch from the pharma — empty for non-anti-counterfeit drugs. */
  batchNumber?: string;
  /** When this batch will expire (yyyy-mm-dd). */
  expiresOn?: string;
  /** Strip size / pack quantity for dispensing. */
  packSize?: number;
  /** Total units on hand. Decremented at dispense. */
  unitsOnHand: number;
  /** Anti-counterfeit serial range these units came from. */
  serialFrom?: string;
  serialTo?: string;
  /** Linked pharma B2B order id (if the stock came from one). */
  inheritedFromOrderId?: string;
  receivedAt: string;
  receivedByEmail: string;
}

const mappings: BarcodeMapping[] = [];
const stock: PharmacyStockRow[] = [];

const mappingsHandle = bindPersistentArray<BarcodeMapping>("pharmacy_barcode_mappings", mappings, () => SEED_MAPPINGS);
const stockHandle    = bindPersistentArray<PharmacyStockRow>("pharmacy_stock", stock);

let hydrated = false;
async function ensureHydrated() {
  if (hydrated) return;
  await Promise.all([mappingsHandle.hydrate(), stockHandle.hydrate()]);
  hydrated = true;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ── Barcode lookup ───────────────────────────────────────────────

/** V15 §4 — scanner posts a barcode, gets the master entry + the
 *  most recent batch (if available). Used by the scanner UI to
 *  auto-fill the stock receive form. */
export async function lookupBarcode(barcode: string): Promise<(BarcodeMapping & {
  /** Most recent batch from the linked pharma — used to inherit
   *  manufacturing site, mfg/expiry dates, serial range. */
  recentBatch?: { batchNumber: string; manufacturedOn: string; expiresOn: string; manufacturingSite?: string };
}) | null> {
  await ensureHydrated();
  const m = mappings.find((x) => x.barcode === barcode);
  if (!m) return null;

  // Auto-fill inheritance — pull the most recent active batch from
  // the linked pharma for THIS drugInn so the stock-receive form
  // has manufacturedOn + expiresOn already populated.
  let recentBatch: { batchNumber: string; manufacturedOn: string; expiresOn: string; manufacturingSite?: string } | undefined;
  if (m.manufacturerPharmaId) {
    try {
      const { listBatches } = await import("@/lib/pharma-store");
      const batches = await listBatches(m.manufacturerPharmaId);
      const latest = batches.find((b) => b.drugInn.toLowerCase() === m.drugInn.toLowerCase() && b.status === "active");
      if (latest) {
        recentBatch = {
          batchNumber: latest.batchNumber,
          manufacturedOn: latest.manufacturedOn,
          expiresOn: latest.expiresOn,
          manufacturingSite: latest.manufacturingSite,
        };
      }
    } catch {/* pharma store may not have batches yet */}
  }

  return { ...m, recentBatch };
}

/** Link a new barcode to a drug master entry. Pharmacies do this
 *  once when they encounter a barcode that's not yet mapped. */
export async function linkBarcode(input: Omit<BarcodeMapping, "linkedAt">): Promise<BarcodeMapping> {
  await ensureHydrated();
  const existing = mappings.find((m) => m.barcode === input.barcode);
  if (existing) {
    Object.assign(existing, input);
    mappingsHandle.flush();
    return existing;
  }
  const m: BarcodeMapping = { ...input, linkedAt: new Date().toISOString() };
  mappings.push(m);
  mappingsHandle.flush();
  return m;
}

// ── Stock receipt ────────────────────────────────────────────────

export interface ReceiveInput {
  pharmacyId: string;
  barcode?: string;
  drugInn: string;
  brandName?: string;
  manufacturerPharmaId?: string;
  batchNumber?: string;
  expiresOn?: string;
  packSize?: number;
  unitsOnHand: number;
  serialFrom?: string;
  serialTo?: string;
  inheritedFromOrderId?: string;
  receivedByEmail: string;
}

export async function receiveStock(input: ReceiveInput): Promise<PharmacyStockRow> {
  await ensureHydrated();
  // Merge into an existing row if (pharmacy, drugInn, batchNumber)
  // matches — otherwise create a new row.
  const existing = stock.find(
    (s) =>
      s.pharmacyId === input.pharmacyId &&
      s.drugInn === input.drugInn &&
      (s.batchNumber || "") === (input.batchNumber || ""),
  );
  let row: PharmacyStockRow;
  if (existing) {
    existing.unitsOnHand += input.unitsOnHand;
    row = existing;
  } else {
    row = {
      id: uid("stk"),
      pharmacyId: input.pharmacyId,
      drugInn: input.drugInn,
      brandName: input.brandName,
      manufacturerPharmaId: input.manufacturerPharmaId,
      batchNumber: input.batchNumber,
      expiresOn: input.expiresOn,
      packSize: input.packSize,
      unitsOnHand: input.unitsOnHand,
      serialFrom: input.serialFrom,
      serialTo: input.serialTo,
      inheritedFromOrderId: input.inheritedFromOrderId,
      receivedAt: new Date().toISOString(),
      receivedByEmail: input.receivedByEmail,
    };
    stock.push(row);
  }
  stockHandle.flush();

  await recordEvent({
    category: "financial",
    action: "pharmacy.stock.received",
    actorEmail: input.receivedByEmail,
    actorRole: "pharmacist",
    subjectKind: "pharmacy_stock_row",
    subjectId: row.id,
    summary: `+${input.unitsOnHand} ${input.brandName || input.drugInn}${input.batchNumber ? ` batch ${input.batchNumber}` : ""}`,
    after: { drugInn: row.drugInn, batch: row.batchNumber, units: row.unitsOnHand },
  }).catch(() => {});

  return row;
}

/** V15 §5 — pharma-to-pharmacy auto-fill inheritance.
 *
 *  When a pharmacy receives a B2B order from a pharma, this single
 *  call:
 *    1. Looks up every line item via the barcode mappings
 *    2. For each, pulls the most recent active batch from the pharma
 *    3. Creates the stock rows with inherited batch + serial data
 *  Returns the rows created so the pharmacist can confirm + adjust
 *  quantities before final commit. */
export async function inheritFromPharmaOrder(input: {
  pharmacyId: string;
  pharmaCompanyId: string;
  orderId: string;
  lineItems: Array<{ drugInn: string; brandName?: string; barcode?: string; units: number; packSize?: number }>;
  receivedByEmail: string;
}): Promise<{ rows: PharmacyStockRow[]; warnings: string[] }> {
  await ensureHydrated();
  const warnings: string[] = [];
  const rows: PharmacyStockRow[] = [];

  // Single import to pre-load the active-batch list for this pharma —
  // saves N store roundtrips when the order has many lines.
  let batches: Awaited<ReturnType<typeof import("@/lib/pharma-store")["listBatches"]>> = [];
  try {
    const { listBatches } = await import("@/lib/pharma-store");
    batches = (await listBatches(input.pharmaCompanyId)).filter((b) => b.status === "active");
  } catch { /* ignore */ }

  for (const item of input.lineItems) {
    const batch = batches.find((b) => b.drugInn.toLowerCase() === item.drugInn.toLowerCase());
    if (!batch) {
      warnings.push(`No active batch for ${item.drugInn} from pharma ${input.pharmaCompanyId} — receiving without batch info.`);
    }
    const row = await receiveStock({
      pharmacyId: input.pharmacyId,
      barcode: item.barcode,
      drugInn: item.drugInn,
      brandName: item.brandName || batch?.brandName,
      manufacturerPharmaId: input.pharmaCompanyId,
      batchNumber: batch?.batchNumber,
      expiresOn: batch?.expiresOn,
      packSize: item.packSize,
      unitsOnHand: item.units,
      inheritedFromOrderId: input.orderId,
      receivedByEmail: input.receivedByEmail,
    });
    rows.push(row);
  }

  await recordEvent({
    category: "financial",
    action: "pharmacy.stock.inherited_from_pharma",
    actorEmail: input.receivedByEmail,
    actorRole: "pharmacist",
    subjectKind: "pharma_order",
    subjectId: input.orderId,
    summary: `Auto-filled ${rows.length} stock rows from pharma order ${input.orderId} (${warnings.length} warnings)`,
  }).catch(() => {});

  return { rows, warnings };
}

// ── Read ─────────────────────────────────────────────────────────

export async function listStock(pharmacyId: string): Promise<PharmacyStockRow[]> {
  await ensureHydrated();
  return stock
    .filter((s) => s.pharmacyId === pharmacyId)
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

// ── Seed ─────────────────────────────────────────────────────────

const SEED_MAPPINGS: BarcodeMapping[] = [
  {
    barcode: "8901030801234",
    drugInn: "Paracetamol",
    brandName: "Crocin 500",
    manufacturerPharmaId: "demo-pharma-cipla",
    defaultPackSize: 15,
    linkedByPharmacyId: "demo-pharmacy-001",
    linkedAt: "2026-05-21T00:00:00.000Z",
  },
  {
    barcode: "DRG-AMOX-625",
    drugInn: "Amoxicillin + Clavulanic Acid",
    brandName: "Augmentin 625 Duo",
    manufacturerPharmaId: "demo-pharma-cipla",
    defaultPackSize: 10,
    linkedByPharmacyId: "demo-pharmacy-001",
    linkedAt: "2026-05-21T00:00:00.000Z",
  },
];
