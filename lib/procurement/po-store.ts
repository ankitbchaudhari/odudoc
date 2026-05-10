// Purchase orders + lifecycle.
//
// State machine:
//
//   draft       — created by the auto-scanner OR manually by ops
//   submitted   — sent to vendor (out-of-band today; webhooked later)
//   acknowledged — vendor has accepted; procurement waits on shipment
//   received    — goods arrived at the hospital, quantities confirmed
//   closed      — fully reconciled; no follow-up
//   cancelled   — withdrawn before acknowledgement
//   rejected    — vendor declined (out-of-stock / discontinued)
//
// On `received` the SKU stock is incremented atomically with the PO
// status flip, so there's never a window where stock is "in-hand"
// without a corresponding PO record.

import { bindPersistentArray } from "../persistent-array";
import { adjustStock, type StockUnit } from "./sku-store";

export type PoStatus =
  | "draft"
  | "submitted"
  | "acknowledged"
  | "received"
  | "closed"
  | "cancelled"
  | "rejected";

export interface PoLine {
  skuId: string;
  genericName: string;
  brand?: string;
  unit: StockUnit;
  /** Ordered quantity at draft time. */
  orderedQty: number;
  /** Quantity confirmed received — populated on receipt. */
  receivedQty?: number;
  /** Snapshot of unit cost at order time. */
  unitCostRupees?: number;
  /** Reason this line is on the PO — usually "auto-reorder: stock 12
   *  ≤ reorderLevel 20". Surfaced for ops audit. */
  reason?: string;
}

export interface PurchaseOrder {
  id: string;
  organizationId: string;
  vendorId?: string;
  vendorName: string;
  /** "auto" when the scanner drafted this; "manual" when ops did. */
  source: "auto" | "manual";
  status: PoStatus;
  lines: PoLine[];
  /** Sum of orderedQty × unitCost. */
  subtotalRupees: number;
  /** Free-text instructions for the vendor. */
  notes?: string;
  /** ISO event log per state transition. */
  events: Array<{ at: string; status: PoStatus; actorEmail?: string; note?: string }>;
  /** Expected delivery date from order date + leadTime. */
  expectedAt?: string;
  receivedAt?: string;
  acknowledgedAt?: string;
  cancelledAt?: string;
  /** Vendor reference (BIL/INV no.) given on acknowledgement. */
  vendorReference?: string;
  /** Goods Receipt Note id (free-form for now). */
  grnReference?: string;
  createdAt: string;
  updatedAt: string;
}

const orders: PurchaseOrder[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<PurchaseOrder>(
  "procurement_pos",
  orders,
  () => []
);
await hydrate();

export function listPosForOrg(orgId: string): PurchaseOrder[] {
  return orders
    .filter((o) => o.organizationId === orgId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getPo(id: string): PurchaseOrder | null {
  return orders.find((o) => o.id === id) || null;
}

export interface CreatePoInput {
  organizationId: string;
  vendorId?: string;
  vendorName: string;
  source: "auto" | "manual";
  lines: PoLine[];
  notes?: string;
  expectedAt?: string;
}

export function createPo(input: CreatePoInput): PurchaseOrder {
  const subtotal = input.lines.reduce(
    (a, l) => a + (l.unitCostRupees || 0) * l.orderedQty, 0,
  );
  const now = new Date().toISOString();
  const o: PurchaseOrder = {
    id: `po-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    vendorId: input.vendorId,
    vendorName: input.vendorName,
    source: input.source,
    status: "draft",
    lines: input.lines,
    subtotalRupees: Math.round(subtotal),
    notes: input.notes?.trim() || undefined,
    events: [{ at: now, status: "draft" }],
    expectedAt: input.expectedAt,
    createdAt: now,
    updatedAt: now,
  };
  orders.unshift(o);
  flush();
  return o;
}

const NEXT: Record<PoStatus, PoStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["acknowledged", "rejected", "cancelled"],
  acknowledged: ["received", "cancelled"],
  received: ["closed"],
  closed: [],
  cancelled: [],
  rejected: [],
};

export interface TransitionInput {
  id: string;
  to: PoStatus;
  actorEmail?: string;
  note?: string;
  vendorReference?: string;
  grnReference?: string;
  /** When transitioning to "received", per-line receivedQty maps. */
  receivedQty?: Record<string, number>;
}

export function transitionPo(input: TransitionInput): PurchaseOrder | null {
  const o = orders.find((x) => x.id === input.id);
  if (!o) return null;
  if (!NEXT[o.status].includes(input.to)) return null;
  const at = new Date().toISOString();
  o.status = input.to;
  o.events.push({ at, status: input.to, actorEmail: input.actorEmail, note: input.note });
  if (input.to === "acknowledged") {
    o.acknowledgedAt = at;
    if (input.vendorReference) o.vendorReference = input.vendorReference.trim();
  }
  if (input.to === "received") {
    o.receivedAt = at;
    if (input.grnReference) o.grnReference = input.grnReference.trim();
    // Apply received quantities to SKU stock.
    for (const line of o.lines) {
      const recv = input.receivedQty?.[line.skuId];
      const finalQty = typeof recv === "number" ? Math.max(0, Math.min(recv, line.orderedQty * 2)) : line.orderedQty;
      line.receivedQty = finalQty;
      if (finalQty > 0) {
        adjustStock(line.skuId, finalQty, `PO ${o.id} receipt`);
      }
    }
  }
  if (input.to === "cancelled") o.cancelledAt = at;
  o.updatedAt = at;
  flush();
  return o;
}

export function deletePosForOrg(orgId: string): number {
  let n = 0;
  for (let i = orders.length - 1; i >= 0; i--) {
    if (orders[i].organizationId === orgId) {
      tombstone(orders[i].id);
      orders.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flush();
  return n;
}
