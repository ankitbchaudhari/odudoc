// Cashfree pending-payments buffer.
//
// Race we're closing: the consultation booking flow mints a client-side
// ephemeral orderId BEFORE the consultation row is persisted. The
// Cashfree popup completes, the webhook fires, we look up the
// consultation by orderId — and find nothing because the OTP-verify
// step (which actually creates the consultation) hasn't run yet.
//
// Without this buffer we silently drop a paid order. With it, the
// webhook parks the payment here keyed by orderId, and the booking
// route claims it on persist. Cleanup cron scans for rows older than
// 48h that never got claimed — those are the cases that need manual
// reconciliation.

import { bindPersistentArray } from "./persistent-array";

export interface PendingPayment {
  orderId: string;
  amountRupees: number;
  paymentId: string;
  payerEmail?: string;
  paidAt: string;
  processed: boolean;
  processedAt?: string;
  tags: Record<string, string>;
}

const rows: PendingPayment[] = [];
const { hydrate, flush } = bindPersistentArray<PendingPayment>(
  "cashfree-pending-buffer",
  rows,
  () => [],
);
await hydrate();

export interface RecordPendingInput {
  orderId: string;
  amountRupees: number;
  paymentId: string;
  payerEmail?: string;
  tags?: Record<string, string>;
}

export function recordPendingPayment(input: RecordPendingInput): PendingPayment {
  // Idempotent on (orderId): a Cashfree retry of the same webhook
  // event must not double-insert.
  const existing = rows.find((r) => r.orderId === input.orderId);
  if (existing) return existing;
  const row: PendingPayment = {
    orderId: input.orderId,
    amountRupees: input.amountRupees,
    paymentId: input.paymentId,
    payerEmail: input.payerEmail,
    paidAt: new Date().toISOString(),
    processed: false,
    tags: input.tags || {},
  };
  rows.unshift(row);
  flush();
  return row;
}

/** Look up by orderId, mark processed, return the row. Returns null
 *  when no row exists or the row was already claimed. */
export function claimPendingPayment(orderId: string): PendingPayment | null {
  if (!orderId) return null;
  const row = rows.find((r) => r.orderId === orderId);
  if (!row) return null;
  if (row.processed) return null;
  row.processed = true;
  row.processedAt = new Date().toISOString();
  flush();
  return row;
}

/** Surface rows older than `maxAgeHours` that still have processed=false.
 *  Used by the integrity-check cron to flag lost payments. */
export function expiredPendingPayments(maxAgeHours: number): PendingPayment[] {
  const cutoff = Date.now() - maxAgeHours * 3600 * 1000;
  return rows.filter((r) => {
    if (r.processed) return false;
    const t = new Date(r.paidAt).getTime();
    if (Number.isNaN(t)) return false;
    return t < cutoff;
  });
}

export function listPendingPayments(): PendingPayment[] {
  return rows.slice();
}
