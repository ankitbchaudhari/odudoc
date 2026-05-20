// Universal entity wallet — V8 §7 + V10 §1 of the Master Spec.
//
// Every entity in OduDoc gets a wallet:
//   - patient        (consultation credits, refunds, gratitude credits)
//   - doctor         (consultation fees, gratitude received)
//   - hospital       (settlement payouts)
//   - pharmacy       (drug-dispense settlements)
//   - lab            (test-fee settlements)
//   - diagnostic     (radiology-fee settlements)
//   - insurance      (claim payouts, premium collections)
//   - pharma         (B2B order settlements, MR gift balance)
//   - manufacturer   (equipment-sale settlements)
//   - distributor    (commission balance)
//
// Money flows through the wallet rather than through ad-hoc Stripe /
// Razorpay calls so that:
//   1. Every entity has a single source of truth for "what do I owe /
//      what am I owed", visible in their Financial Account screen.
//   2. Refunds, settlements, gratitude credits, and platform commission
//      are all just wallet-to-wallet transfers — one engine handles
//      every case (V10 §1.2 lists 18 transaction types).
//   3. The accountability layer (V13) can audit every value movement
//      cheaply because every movement is one wallet_tx row.
//
// This is the FOUNDATION. A bunch of V8/V10/V11 surfaces depend on
// wallets being real — without them every revenue-touching feature is
// a stub. Ship this first; the rest snap together later.

import { bindPersistentArray, awaitAllFlushes } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export type EntityKind =
  | "patient" | "doctor" | "hospital" | "pharmacy" | "lab"
  | "diagnostic" | "insurance" | "pharma" | "manufacturer"
  | "distributor" | "education" | "platform";

// V10 §1.2 transaction taxonomy. Every wallet_tx has one of these.
export type WalletTxKind =
  | "consultation_fee"     // patient → doctor
  | "consultation_refund"  // doctor → patient (cancellation)
  | "settlement"           // platform → hospital/pharmacy/lab/etc.
  | "platform_fee"         // entity → platform (commission)
  | "gov_tax"              // platform → tax-authority (GST/VAT)
  | "gratitude_credit"     // pharma/lab → doctor (V8 §3-§5)
  | "gratitude_debit"      // doctor uses gratitude credit
  | "insurance_payout"     // insurance → hospital (claim settled)
  | "insurance_premium"    // patient → insurance (policy bought)
  | "ppme_fee"             // insurance → platform → hospital (V9 §3)
  | "equipment_purchase"   // hospital → manufacturer (V10 §2)
  | "equipment_refund"     // reverse direction
  | "warranty_repair"      // manufacturer → hospital (free repair credit)
  | "topup"                // external card/UPI → wallet
  | "withdraw"             // wallet → external bank
  | "adjustment"           // ops-team manual correction (audit-logged)
  | "course_purchase"      // patient/student → education org (V8 §1)
  | "import_export_fee";   // entity → platform (V10 §4)

export interface Wallet {
  id: string;             // wallet id (uuid-ish)
  entityKind: EntityKind;
  entityId: string;       // the entity's primary id (user id, hospital id, etc.)
  /** Available balance — debit/credit-rolled-up. Cached for fast reads;
   *  the txn log is authoritative if these ever diverge. */
  balanceCents: number;
  currency: string;       // "INR", "USD", etc. — country pod default
  /** Held funds: amounts pledged for in-flight orders that haven't
   *  cleared yet. Reservation accounting prevents double-spend. */
  holdCents: number;
  status: "active" | "frozen" | "closed";
  createdAt: string;
  updatedAt: string;
}

export interface WalletTx {
  id: string;
  kind: WalletTxKind;
  /** Source wallet — null for external top-ups (card/UPI in). */
  fromWalletId: string | null;
  /** Destination wallet — null for withdrawals (out to bank). */
  toWalletId: string | null;
  /** Always positive integer cents. Direction is captured by from/to. */
  amountCents: number;
  currency: string;
  /** Free-form ref — consultation id, order id, claim id, etc. */
  refKind?: string;
  refId?: string;
  /** Human-readable note shown in the Financial Account UI. */
  note?: string;
  /** Per-V13: every wallet movement is an accountable event.
   *  Captured here so we don't need a separate audit row. */
  actorEmail?: string;
  actorRole?: string;
  createdAt: string;
}

// In-memory + Postgres-backed stores (the bindPersistentArray pattern
// the rest of the codebase already uses).
const wallets: Wallet[] = [];
const txns: WalletTx[] = [];

const walletsHandle = bindPersistentArray<Wallet>("wallets", wallets);
const txnsHandle = bindPersistentArray<WalletTx>("wallet_txns", txns);

let hydrated = false;
async function ensureHydrated() {
  if (hydrated) return;
  await Promise.all([walletsHandle.hydrate(), txnsHandle.hydrate()]);
  hydrated = true;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ── Read helpers ──────────────────────────────────────────────────

export async function getWallet(entityKind: EntityKind, entityId: string): Promise<Wallet | null> {
  await ensureHydrated();
  return wallets.find((w) => w.entityKind === entityKind && w.entityId === entityId) || null;
}

export async function getWalletById(id: string): Promise<Wallet | null> {
  await ensureHydrated();
  return wallets.find((w) => w.id === id) || null;
}

/** Get-or-create — the public entry point. Use this from any code
 *  that needs an entity's wallet (registration, first transaction). */
export async function ensureWallet(
  entityKind: EntityKind,
  entityId: string,
  currency = "INR",
): Promise<Wallet> {
  await ensureHydrated();
  const existing = wallets.find((w) => w.entityKind === entityKind && w.entityId === entityId);
  if (existing) return existing;
  const w: Wallet = {
    id: uid("wal"),
    entityKind,
    entityId,
    balanceCents: 0,
    currency,
    holdCents: 0,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  wallets.push(w);
  walletsHandle.flush();
  return w;
}

export async function listTxns(walletId: string, limit = 200): Promise<WalletTx[]> {
  await ensureHydrated();
  return txns
    .filter((t) => t.fromWalletId === walletId || t.toWalletId === walletId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function listAllWallets(): Promise<Wallet[]> {
  await ensureHydrated();
  return [...wallets];
}

// ── Write — the only path that changes balances ──────────────────

export interface TransferInput {
  kind: WalletTxKind;
  fromWalletId: string | null;
  toWalletId: string | null;
  amountCents: number;
  currency?: string;
  refKind?: string;
  refId?: string;
  note?: string;
  actorEmail?: string;
  actorRole?: string;
}

/**
 * Atomic wallet-to-wallet transfer.
 *
 * Rules:
 *   - amountCents must be a positive integer
 *   - exactly one of fromWalletId / toWalletId may be null (external
 *     top-up has from=null; withdrawal has to=null)
 *   - source wallet must have available balance (balance − hold ≥ amt)
 *   - both wallets must be active (frozen/closed wallets reject)
 *
 * Returns the recorded txn. Throws on invariant violation — callers
 * should catch and respond with a 4xx, not a 500.
 */
export async function transfer(input: TransferInput): Promise<WalletTx> {
  await ensureHydrated();

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("amountCents must be a positive integer");
  }
  if (!input.fromWalletId && !input.toWalletId) {
    throw new Error("at least one of fromWalletId / toWalletId is required");
  }

  let fromW: Wallet | null = null;
  let toW: Wallet | null = null;
  let currency = input.currency || "INR";

  if (input.fromWalletId) {
    fromW = wallets.find((w) => w.id === input.fromWalletId) || null;
    if (!fromW) throw new Error("from wallet not found");
    if (fromW.status !== "active") throw new Error(`from wallet ${fromW.status}`);
    if (fromW.balanceCents - fromW.holdCents < input.amountCents) {
      throw new Error("insufficient_balance");
    }
    currency = fromW.currency;
  }
  if (input.toWalletId) {
    toW = wallets.find((w) => w.id === input.toWalletId) || null;
    if (!toW) throw new Error("to wallet not found");
    if (toW.status !== "active") throw new Error(`to wallet ${toW.status}`);
    if (fromW && toW.currency !== fromW.currency) {
      // Cross-currency transfers need a forex conversion before this
      // point. Reject explicitly rather than silently drop the rate.
      throw new Error("currency_mismatch");
    }
    currency = toW.currency;
  }

  const now = new Date().toISOString();
  const tx: WalletTx = {
    id: uid("tx"),
    kind: input.kind,
    fromWalletId: input.fromWalletId,
    toWalletId: input.toWalletId,
    amountCents: input.amountCents,
    currency,
    refKind: input.refKind,
    refId: input.refId,
    note: input.note,
    actorEmail: input.actorEmail,
    actorRole: input.actorRole,
    createdAt: now,
  };

  // Mutate balances in-place after all validation passed.
  if (fromW) {
    fromW.balanceCents -= input.amountCents;
    fromW.updatedAt = now;
  }
  if (toW) {
    toW.balanceCents += input.amountCents;
    toW.updatedAt = now;
  }
  txns.push(tx);

  // Best-effort flush — the bindPersistentArray helper queues writes
  // and absorbs Postgres hiccups so we don't block on the network.
  walletsHandle.flush();
  txnsHandle.flush();
  await awaitAllFlushes().catch((e) => log.warn("wallet flush warn", e));

  return tx;
}

/** Freeze a wallet — ops control for fraud / KYC failure. Existing
 *  funds remain but no new transfers go in or out. */
export async function setWalletStatus(walletId: string, status: Wallet["status"]): Promise<Wallet | null> {
  await ensureHydrated();
  const w = wallets.find((x) => x.id === walletId);
  if (!w) return null;
  w.status = status;
  w.updatedAt = new Date().toISOString();
  walletsHandle.flush();
  return w;
}

/** Sum of balanceCents across all entity wallets — useful for the
 *  platform-revenue dashboard (V8 §8.3). */
export async function platformWalletStats(): Promise<{
  walletCount: number;
  byKind: Record<string, { count: number; totalCents: number }>;
  totalCents: number;
}> {
  await ensureHydrated();
  const byKind: Record<string, { count: number; totalCents: number }> = {};
  let totalCents = 0;
  for (const w of wallets) {
    if (!byKind[w.entityKind]) byKind[w.entityKind] = { count: 0, totalCents: 0 };
    byKind[w.entityKind].count++;
    byKind[w.entityKind].totalCents += w.balanceCents;
    totalCents += w.balanceCents;
  }
  return { walletCount: wallets.length, byKind, totalCents };
}
