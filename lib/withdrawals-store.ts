// Withdrawal request store — dual-write transition.
//
// Phase A (this commit): every write goes to BOTH the legacy app_kv
// JSON blob AND the new relational `withdrawals` table. Reads still
// come from the JSON blob. Same pattern as the orders migration —
// see lib/orders-store.ts for the rationale.
//
// Doctors request a payout from their accumulated consultation earnings;
// an admin then approves, rejects, or marks it as paid.

import { bindPersistentArray } from "./persistent-array";
import { db } from "./drizzle";
import { withdrawals as withdrawalsTable } from "./drizzle/schema";
import { log } from "./log";

export type WithdrawalStatus = "pending" | "approved" | "rejected" | "paid";

export interface WithdrawalRequest {
  id: string;
  doctorEmail: string;
  doctorName: string;
  amount: number;
  method: "bank_transfer" | "paypal" | "stripe" | "other";
  accountDetails: string;
  notes?: string;
  status: WithdrawalStatus;
  adminNote?: string;
  requestedAt: string;
  updatedAt: string;
}

const store: WithdrawalRequest[] = [];
const { hydrate, flush } = bindPersistentArray<WithdrawalRequest>(
  "withdrawals",
  store,
  () => []
);
await hydrate();

function makeId() {
  return `wd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Mirror a write into the relational `withdrawals` table. Fire-and-
// forget — JSON blob remains the read source of truth during the
// dual-write window, so a transient DB error here can't break the
// payout request flow.
async function persistWithdrawalRow(w: WithdrawalRequest): Promise<void> {
  try {
    await db
      .insert(withdrawalsTable)
      .values({
        id: w.id,
        doctorEmail: w.doctorEmail,
        doctorName: w.doctorName,
        amount: w.amount,
        method: w.method,
        accountDetails: w.accountDetails,
        notes: w.notes ?? null,
        status: w.status,
        adminNote: w.adminNote ?? null,
        requestedAt: new Date(w.requestedAt),
        updatedAt: new Date(w.updatedAt),
      })
      .onConflictDoUpdate({
        target: withdrawalsTable.id,
        set: {
          status: w.status,
          adminNote: w.adminNote ?? null,
          updatedAt: new Date(w.updatedAt),
        },
      });
  } catch (err) {
    log.error("withdrawals_store.persist_row_failed", err, { id: w.id });
  }
}

export function createWithdrawal(
  input: Omit<WithdrawalRequest, "id" | "status" | "requestedAt" | "updatedAt">
): WithdrawalRequest {
  const now = new Date().toISOString();
  const record: WithdrawalRequest = {
    id: makeId(),
    status: "pending",
    requestedAt: now,
    updatedAt: now,
    ...input,
  };
  store.unshift(record);
  flush();
  void persistWithdrawalRow(record);
  return record;
}

export function listWithdrawals(filter?: {
  doctorEmail?: string;
}): WithdrawalRequest[] {
  if (filter?.doctorEmail) {
    const email = filter.doctorEmail.toLowerCase();
    return store.filter((w) => w.doctorEmail.toLowerCase() === email);
  }
  return [...store];
}

export function getWithdrawal(id: string): WithdrawalRequest | undefined {
  return store.find((w) => w.id === id);
}

export function updateWithdrawalStatus(
  id: string,
  status: WithdrawalStatus,
  adminNote?: string
): WithdrawalRequest | null {
  const idx = store.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  store[idx] = {
    ...store[idx],
    status,
    adminNote: adminNote ?? store[idx].adminNote,
    updatedAt: new Date().toISOString(),
  };
  flush();
  void persistWithdrawalRow(store[idx]);
  return store[idx];
}
