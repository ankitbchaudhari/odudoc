// Clinic in-house pharmacy stock.
//
// A clinic that keeps medicines on premises can register each SKU
// here, then dispense at reception during checkout. The patient walks
// out with the medicine instead of being sent to find a pharmacy.
// Each dispense decrements quantity and produces an invoice line.

import { bindPersistentArray } from "./persistent-array";

export interface ClinicStockItem {
  id: string;                  // CST-PH-XXXX
  clinicId: string;
  name: string;                // brand or generic, free text
  generic?: string;            // canonical generic name for safety check
  strength?: string;           // "500 mg"
  form?: string;               // "Tablet" | "Syrup" | "Capsule" | "Injection"
  unit: string;                // "tablet" | "ml" | "vial"
  quantityOnHand: number;      // current stock
  reorderLevel?: number;       // alert threshold
  unitPriceRupees: number;     // what the patient pays per unit
  expiryDate?: string;         // YYYY-MM-DD
  batchNumber?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DispenseEntry {
  id: string;                  // CST-DISP-XXXX
  stockItemId: string;
  clinicId: string;
  bookingId?: string;
  invoiceId?: string;
  patientName: string;
  patientPhone?: string;
  quantity: number;
  unitPriceRupees: number;
  totalRupees: number;
  dispensedByStaffId: string;
  notes?: string;
  createdAt: string;
}

const items: ClinicStockItem[] = [];
const itemsPa = bindPersistentArray<ClinicStockItem>(
  "clinic_pharmacy_stock", items, () => [],
);
await itemsPa.hydrate();

const dispenses: DispenseEntry[] = [];
const dispensesPa = bindPersistentArray<DispenseEntry>(
  "clinic_pharmacy_dispenses", dispenses, () => [],
);
await dispensesPa.hydrate();

export async function reloadClinicPharmacy(): Promise<void> {
  await Promise.all([itemsPa.reload(), dispensesPa.reload()]);
}

let nextItemSeq = items.reduce((max, i) => {
  const m = /^CST-PH-(\d+)$/.exec(i.id);
  const n = m ? parseInt(m[1], 10) : 0;
  return n > max ? n : max;
}, 1000) + 1;
let nextDispSeq = dispenses.reduce((max, d) => {
  const m = /^CST-DISP-(\d+)$/.exec(d.id);
  const n = m ? parseInt(m[1], 10) : 0;
  return n > max ? n : max;
}, 1000) + 1;

export function createStockItem(input: Omit<ClinicStockItem, "id" | "active" | "createdAt" | "updatedAt">): ClinicStockItem {
  const maxExisting = items.reduce((max, i) => {
    const m = /^CST-PH-(\d+)$/.exec(i.id);
    const n = m ? parseInt(m[1], 10) : 0;
    return n > max ? n : max;
  }, 1000);
  const candidate = Math.max(nextItemSeq, maxExisting + 1);
  nextItemSeq = candidate + 1;
  const now = new Date().toISOString();
  const record: ClinicStockItem = {
    ...input,
    id: `CST-PH-${candidate}`,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  items.push(record);
  itemsPa.flush();
  return record;
}

export function listStockByClinic(clinicId: string, opts: { activeOnly?: boolean } = {}): ClinicStockItem[] {
  const all = items.filter((i) => i.clinicId === clinicId);
  return (opts.activeOnly ? all.filter((i) => i.active) : all)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getStockItem(id: string): ClinicStockItem | undefined {
  return items.find((i) => i.id === id);
}

export function updateStockItem(
  id: string,
  clinicId: string,
  patch: Partial<Omit<ClinicStockItem, "id" | "clinicId" | "createdAt">>,
): ClinicStockItem | null {
  const it = items.find((x) => x.id === id && x.clinicId === clinicId);
  if (!it) return null;
  Object.assign(it, patch, { updatedAt: new Date().toISOString() });
  itemsPa.flush();
  return it;
}

export interface DispenseInput {
  stockItemId: string;
  clinicId: string;
  bookingId?: string;
  invoiceId?: string;
  patientName: string;
  patientPhone?: string;
  quantity: number;
  dispensedByStaffId: string;
  notes?: string;
}

export type DispenseResult =
  | { ok: true; entry: DispenseEntry; item: ClinicStockItem }
  | { ok: false; error: string };

export function dispenseStock(input: DispenseInput): DispenseResult {
  const it = items.find((x) => x.id === input.stockItemId && x.clinicId === input.clinicId);
  if (!it) return { ok: false, error: "Stock item not found at this clinic." };
  if (!it.active) return { ok: false, error: "This item is inactive." };
  if (input.quantity <= 0) return { ok: false, error: "Quantity must be positive." };
  if (it.quantityOnHand < input.quantity) {
    return { ok: false, error: `Only ${it.quantityOnHand} ${it.unit}(s) on hand.` };
  }
  // Mutate stock + emit dispense row atomically (well, as close as
  // we can get with two flushes — both are eventually consistent on
  // the same Postgres row anyway).
  it.quantityOnHand -= input.quantity;
  it.updatedAt = new Date().toISOString();
  itemsPa.flush();
  const maxExisting = dispenses.reduce((max, d) => {
    const m = /^CST-DISP-(\d+)$/.exec(d.id);
    const n = m ? parseInt(m[1], 10) : 0;
    return n > max ? n : max;
  }, 1000);
  const candidate = Math.max(nextDispSeq, maxExisting + 1);
  nextDispSeq = candidate + 1;
  const entry: DispenseEntry = {
    id: `CST-DISP-${candidate}`,
    stockItemId: input.stockItemId,
    clinicId: input.clinicId,
    bookingId: input.bookingId,
    invoiceId: input.invoiceId,
    patientName: input.patientName,
    patientPhone: input.patientPhone,
    quantity: input.quantity,
    unitPriceRupees: it.unitPriceRupees,
    totalRupees: Math.round(input.quantity * it.unitPriceRupees * 100) / 100,
    dispensedByStaffId: input.dispensedByStaffId,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  dispenses.unshift(entry);
  dispensesPa.flush();
  return { ok: true, entry, item: it };
}

export function listDispensesByClinic(clinicId: string, limit = 50): DispenseEntry[] {
  return dispenses.filter((d) => d.clinicId === clinicId).slice(0, limit);
}

export function listLowStock(clinicId: string): ClinicStockItem[] {
  return items.filter(
    (i) => i.clinicId === clinicId && i.active &&
           i.reorderLevel !== undefined && i.quantityOnHand <= i.reorderLevel,
  );
}
