// Pharmacy dispensing — bridges hospital prescriptions to inventory.
//
// A DispenseRecord captures what pharmacy actually gave to the patient
// (often a subset or re-mapping of the Rx), pulled from inventory batches
// via FEFO. Each dispense-item snapshots itemId/name/price and the batch
// breakdown so the record stays meaningful even if item/batch data later
// changes. Creating the record calls issueStock() to deduct inventory.

import { bindPersistentArray } from "../persistent-array";
import {
  issueStock,
  getItemById,
  type StockMovement,
} from "./inventory-store";

export type DispenseStatus = "completed" | "cancelled";

export interface DispenseBatchUsage {
  batchId: string;
  batchNumber: string;
  quantity: number;
}

export interface DispenseItem {
  itemId: string;
  itemName: string; // snapshot at dispense time
  itemSku: string;
  unit: string;
  quantity: number;
  unitPrice: number; // snapshot
  totalPrice: number;
  batches: DispenseBatchUsage[];
  rxItemIndex?: number; // correlate with prescription.items[index]
  instructions?: string;
}

export interface DispenseRecord {
  id: string;
  organizationId: string;
  prescriptionId?: string;
  patientId: string;
  encounterId?: string;
  items: DispenseItem[];
  totalAmount: number;
  status: DispenseStatus;
  dispensedBy?: string;
  dispensedAt: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const dispenses: DispenseRecord[] = [];
const { hydrate, flush } = bindPersistentArray<DispenseRecord>(
  "hospital-dispenses",
  dispenses,
  () => []
);
await hydrate();

export function listDispenses(opts: {
  organizationId: string;
  patientId?: string;
  prescriptionId?: string;
  status?: DispenseStatus;
}): DispenseRecord[] {
  let list = dispenses.filter((d) => d.organizationId === opts.organizationId);
  if (opts.patientId) list = list.filter((d) => d.patientId === opts.patientId);
  if (opts.prescriptionId)
    list = list.filter((d) => d.prescriptionId === opts.prescriptionId);
  if (opts.status) list = list.filter((d) => d.status === opts.status);
  return list.sort(
    (a, b) => new Date(b.dispensedAt).getTime() - new Date(a.dispensedAt).getTime()
  );
}

export function getDispenseById(
  id: string,
  organizationId: string
): DispenseRecord | null {
  const d = dispenses.find((x) => x.id === id);
  if (!d || d.organizationId !== organizationId) return null;
  return d;
}

export interface DispenseItemInput {
  itemId: string;
  quantity: number;
  unitPrice?: number; // override; else snapshot from first eligible batch
  rxItemIndex?: number;
  instructions?: string;
}

export interface DispenseInput {
  prescriptionId?: string;
  patientId: string;
  encounterId?: string;
  items: DispenseItemInput[];
  dispensedBy?: string;
  notes?: string;
}

export type CreateDispenseResult =
  | { ok: true; dispense: DispenseRecord }
  | { ok: false; error: string; itemId?: string };

// Create and commit a dispense. Calls issueStock per line; if any line fails
// (insufficient stock), the whole dispense is rejected (no partial commits).
// Note: we validate availability first to minimize partial-deduction risk —
// the store itself is in-memory so a failure mid-loop is extremely unlikely,
// but we pre-check anyway to keep behavior predictable.
export function createDispense(
  organizationId: string,
  input: DispenseInput
): CreateDispenseResult {
  if (!input.items || input.items.length === 0) {
    return { ok: false, error: "no_items" };
  }

  // Pre-validate: every item exists in org and has enough total on-hand.
  for (const line of input.items) {
    const it = getItemById(line.itemId, organizationId);
    if (!it) return { ok: false, error: "item_not_found", itemId: line.itemId };
    const total = it.batches.reduce((s, b) => s + b.quantity, 0);
    if (total < (Number(line.quantity) || 0)) {
      return { ok: false, error: "insufficient_stock", itemId: line.itemId };
    }
  }

  const dispenseId = `disp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();
  const committed: DispenseItem[] = [];
  let totalAmount = 0;

  for (const line of input.items) {
    const qty = Number(line.quantity) || 0;
    const res = issueStock(organizationId, {
      itemId: line.itemId,
      type: "dispense",
      quantity: qty,
      reference: input.prescriptionId
        ? `rx:${input.prescriptionId}`
        : `disp:${dispenseId}`,
      note: `dispense:${dispenseId}`,
      createdBy: input.dispensedBy,
    });
    if (!res) {
      // Extremely unlikely given pre-check; bail loud.
      return { ok: false, error: "issue_failed", itemId: line.itemId };
    }
    const it = res.item;
    // Derive unit price: explicit override → most-recent sellingPrice → 0.
    const fallbackPrice =
      [...it.batches]
        .filter((b) => b.sellingPrice !== undefined)
        .sort(
          (a, b) =>
            new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
        )[0]?.sellingPrice ?? 0;
    const unitPrice =
      line.unitPrice !== undefined && !Number.isNaN(Number(line.unitPrice))
        ? Number(line.unitPrice)
        : fallbackPrice;
    const lineTotal = Math.round(unitPrice * qty * 100) / 100;
    totalAmount += lineTotal;

    const usage: DispenseBatchUsage[] = res.movements.map(
      (m: StockMovement) => {
        const b = it.batches.find((x) => x.id === m.batchId);
        return {
          batchId: m.batchId!,
          batchNumber: b?.batchNumber || m.batchId || "—",
          quantity: m.quantity,
        };
      }
    );

    committed.push({
      itemId: it.id,
      itemName: it.name,
      itemSku: it.sku,
      unit: it.unit,
      quantity: qty,
      unitPrice,
      totalPrice: lineTotal,
      batches: usage,
      rxItemIndex: line.rxItemIndex,
      instructions: line.instructions,
    });
  }

  const record: DispenseRecord = {
    id: dispenseId,
    organizationId,
    prescriptionId: input.prescriptionId,
    patientId: input.patientId,
    encounterId: input.encounterId,
    items: committed,
    totalAmount: Math.round(totalAmount * 100) / 100,
    status: "completed",
    dispensedBy: input.dispensedBy,
    dispensedAt: now,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  dispenses.unshift(record);
  flush();
  return { ok: true, dispense: record };
}

export function updateDispenseNotes(
  id: string,
  organizationId: string,
  patch: { notes?: string }
): DispenseRecord | null {
  const d = dispenses.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!d) return null;
  if (patch.notes !== undefined) d.notes = patch.notes;
  d.updatedAt = new Date().toISOString();
  flush();
  return d;
}

// Cancel a dispense. Note: we do NOT auto-return stock — that requires a
// physical return verification. A pharmacist must record a "return" movement
// separately if the inventory comes back. This just marks the record void.
export function cancelDispense(
  id: string,
  organizationId: string
): DispenseRecord | null {
  const d = dispenses.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!d) return null;
  d.status = "cancelled";
  d.updatedAt = new Date().toISOString();
  flush();
  return d;
}

export function deleteDispensesForPatient(
  patientId: string,
  organizationId: string
): number {
  let removed = 0;
  for (let i = dispenses.length - 1; i >= 0; i--) {
    const d = dispenses[i];
    if (d.patientId === patientId && d.organizationId === organizationId) {
      dispenses.splice(i, 1);
      removed++;
    }
  }
  if (removed) flush();
  return removed;
}
