// Payout ledger — per-vendor earnings for each paid order.
//
// On order payment capture, we generate one PayoutEntry per vendor in that
// order with:
//   grossAmount        = sum of that vendor's line items
//   commissionPercent  = vendor.commissionPercent at record time (snapshot)
//   commissionAmount   = gross * commissionPercent / 100
//   netAmount          = gross - commission       (what the vendor is owed)
//   status             = "pending" until admin marks it "paid"
//
// Postgres-backed via app_kv (was fs-backed — lost data on every cold start).

import type { Order } from "./orders-store";
import { getVendorById } from "./vendors-store";
import { bindPersistentArray } from "./persistent-array";

export type PayoutStatus = "pending" | "paid";

export interface PayoutEntry {
  id: string;
  vendorId: string;
  vendorName: string;
  orderId: string;
  orderNumber: string;
  grossAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  netAmount: number;
  status: PayoutStatus;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  // Stripe Connect settlement metadata — populated once we issue a
  // `stripe.transfers.create` for this entry. The webhook then flips status
  // to paid when `transfer.paid` fires.
  stripeTransferId?: string;
  transferInitiatedAt?: string;
  transferError?: string;
}

const entries: PayoutEntry[] = [];
const { hydrate, flush, reload } = bindPersistentArray<PayoutEntry>("payouts", entries, () => []);
await hydrate();

export async function reloadPayouts(): Promise<void> {
  await reload();
}

const now = () => new Date().toISOString();
const round2 = (n: number) => Math.round(n * 100) / 100;

export function getPayoutEntry(id: string): PayoutEntry | null {
  return entries.find((e) => e.id === id) || null;
}

export function setTransferInitiated(id: string, transferId: string): PayoutEntry | null {
  const e = entries.find((x) => x.id === id);
  if (!e) return null;
  e.stripeTransferId = transferId;
  e.transferInitiatedAt = now();
  e.transferError = undefined;
  e.updatedAt = now();
  flush();
  return e;
}

export function setTransferError(id: string, errorMessage: string): PayoutEntry | null {
  const e = entries.find((x) => x.id === id);
  if (!e) return null;
  e.transferError = errorMessage;
  e.updatedAt = now();
  flush();
  return e;
}

// Idempotent — if an entry for (orderId, vendorId) already exists, we skip.
// Generates one PayoutEntry per distinct vendor in the order.
export function recordOrderPayouts(order: Order): PayoutEntry[] {
  const byVendor = new Map<string, { gross: number; vendorName?: string }>();
  for (const it of order.items) {
    if (!it.vendorId) continue;
    const key = it.vendorId;
    const current = byVendor.get(key) || { gross: 0, vendorName: it.vendorName };
    current.gross += it.price * it.quantity;
    if (!current.vendorName && it.vendorName) current.vendorName = it.vendorName;
    byVendor.set(key, current);
  }

  const created: PayoutEntry[] = [];
  byVendor.forEach(({ gross, vendorName }, vendorId) => {
    const exists = entries.find(
      (e) => e.orderId === order.id && e.vendorId === vendorId
    );
    if (exists) return;
    const vendor = getVendorById(vendorId);
    const commissionPercent = vendor?.commissionPercent ?? 10;
    const commissionAmount = round2((gross * commissionPercent) / 100);
    const netAmount = round2(gross - commissionAmount);
    const entry: PayoutEntry = {
      id: `pay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      vendorId,
      vendorName: vendorName || vendor?.name || "Vendor",
      orderId: order.id,
      orderNumber: order.orderNumber,
      grossAmount: round2(gross),
      commissionPercent,
      commissionAmount,
      netAmount,
      status: "pending",
      createdAt: now(),
      updatedAt: now(),
    };
    entries.unshift(entry);
    created.push(entry);
  });
  if (created.length) flush();
  return created;
}

export function listPayouts(opts: {
  vendorId?: string;
  status?: PayoutStatus | "all";
} = {}): PayoutEntry[] {
  let list = [...entries];
  if (opts.vendorId) list = list.filter((e) => e.vendorId === opts.vendorId);
  if (opts.status && opts.status !== "all") {
    list = list.filter((e) => e.status === opts.status);
  }
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function markPaid(id: string): PayoutEntry | null {
  const e = entries.find((x) => x.id === id);
  if (!e) return null;
  e.status = "paid";
  e.paidAt = now();
  e.updatedAt = now();
  flush();
  return e;
}

export function markManyPaid(ids: string[]): number {
  let changed = 0;
  const ts = now();
  for (const id of ids) {
    const e = entries.find((x) => x.id === id);
    if (!e || e.status === "paid") continue;
    e.status = "paid";
    e.paidAt = ts;
    e.updatedAt = ts;
    changed++;
  }
  if (changed) flush();
  return changed;
}

// Aggregate per-vendor totals — useful for the admin payouts overview.
export interface VendorPayoutSummary {
  vendorId: string;
  vendorName: string;
  pendingNet: number;
  paidNet: number;
  totalCommission: number;
  entryCount: number;
}

export function summarizeByVendor(): VendorPayoutSummary[] {
  const map = new Map<string, VendorPayoutSummary>();
  for (const e of entries) {
    const s = map.get(e.vendorId) || {
      vendorId: e.vendorId,
      vendorName: e.vendorName,
      pendingNet: 0,
      paidNet: 0,
      totalCommission: 0,
      entryCount: 0,
    };
    if (e.status === "pending") s.pendingNet = round2(s.pendingNet + e.netAmount);
    else s.paidNet = round2(s.paidNet + e.netAmount);
    s.totalCommission = round2(s.totalCommission + e.commissionAmount);
    s.entryCount++;
    map.set(e.vendorId, s);
  }
  return Array.from(map.values()).sort((a, b) => b.pendingNet - a.pendingNet);
}
