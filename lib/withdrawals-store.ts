// Withdrawal request store — Postgres-backed via bindPersistentArray.
//
// Doctors request a payout from their accumulated consultation earnings;
// an admin then approves, rejects, or marks it as paid.

import { bindPersistentArray } from "./persistent-array";

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
  return store[idx];
}
