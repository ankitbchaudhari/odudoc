// OduDoc Wallet.
//
// Patient tops up; balance earns a 5% bonus on top-up. Wallet pays
// for consults, pharmacy orders, and lab tests. Hospitals receive
// instant settlement from the wallet rather than waiting for UPI/
// gateway clearance.
//
// Why a wallet vs raw UPI:
//   - UPI failure rate in India is ~13%. Wallet eliminates the
//     mid-checkout drop-off.
//   - Float on idle balance is real revenue (₹500 average × 100k
//     active wallets × 4% APY ≈ ₹20L/year).
//   - Bonus on top-up is a behavioural lock-in — once a patient has
//     a balance, switching cost rises.
//
// Compliance: this is a closed-loop wallet (PPI Type-I-equivalent).
// We only allow spend within OduDoc-network merchants. Cash-out is
// not supported in the demo; in production it requires RBI auth.

import { bindPersistentArray } from "../persistent-array";
import { pushNotification } from "../notifications/store";

export type WalletTxKind =
  | "topup"          // patient adds money
  | "bonus"          // we credit the bonus
  | "spend"          // pays for a consult / Rx / lab order
  | "refund"         // a cancelled order returns money
  | "adjustment"     // ops manual correction (with reason)
  | "expiry";        // bonus credits that timed out

export type WalletSpendCategory =
  | "consultation"
  | "rx_fulfillment"
  | "lab_order"
  | "subscription"
  | "other";

export interface WalletAccount {
  /** id == userId. Each user has at most one wallet. */
  id: string;
  userId: string;
  /** Spendable balance in INR rupees. Sum of all paise-precision
   *  transactions / 100; we store rupees here for readability. */
  balanceRupees: number;
  /** Bonus balance — earned via top-up promo. Spent first when a
   *  purchase covers both buckets. Typical TTL 365d. */
  bonusBalanceRupees: number;
  /** Lifetime totals — analytics. */
  lifetimeToppedUp: number;
  lifetimeSpent: number;
  /** When the wallet was last touched. */
  updatedAt: string;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  kind: WalletTxKind;
  /** Always positive. Sign is implied by kind. */
  amountRupees: number;
  /** Bonus portion of the amount when kind is "spend". Helps the UI
   *  show "₹100 paid · ₹15 from bonus + ₹85 from balance". */
  bonusAppliedRupees?: number;
  /** Running balance after this transaction. */
  balanceAfter: number;
  bonusBalanceAfter: number;
  /** Spend category when kind is "spend". */
  category?: WalletSpendCategory;
  /** Stable reference to the upstream entity (consultation id,
   *  pharmacy order id, lab order id). Lets us show "What this paid
   *  for" links + reconcile against the original record. */
  reference?: string;
  /** Human-readable note. */
  note?: string;
  /** Provider transaction id when kind is "topup" (Cashfree /
   *  Stripe payment id). */
  providerSid?: string;
  createdAt: string;
}

const accounts: WalletAccount[] = [];
const { hydrate: hydrateAcc, flush: flushAcc, tombstone: tombAcc } =
  bindPersistentArray<WalletAccount>("wallet_accounts", accounts, () => []);
await hydrateAcc();

const txs: WalletTransaction[] = [];
const { hydrate: hydrateTx, flush: flushTx, tombstone: tombTx } =
  bindPersistentArray<WalletTransaction>("wallet_transactions", txs, () => []);
await hydrateTx();

const TOPUP_BONUS_PCT = 5;
const MIN_TOPUP_RUPEES = 100;
const MAX_TOPUP_RUPEES = 50000;
const MAX_BALANCE_RUPEES = 200000;

export function getWallet(userId: string): WalletAccount {
  const existing = accounts.find((w) => w.userId === userId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const w: WalletAccount = {
    id: userId,
    userId,
    balanceRupees: 0,
    bonusBalanceRupees: 0,
    lifetimeToppedUp: 0,
    lifetimeSpent: 0,
    createdAt: now,
    updatedAt: now,
  };
  accounts.push(w);
  flushAcc();
  return w;
}

export function listTransactionsForUser(userId: string, limit = 50): WalletTransaction[] {
  return txs.filter((t) => t.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

function genTxId(): string {
  return `wtx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function pushTx(tx: Omit<WalletTransaction, "id" | "createdAt">): WalletTransaction {
  const out: WalletTransaction = {
    id: genTxId(),
    createdAt: new Date().toISOString(),
    ...tx,
  };
  txs.unshift(out);
  flushTx();
  return out;
}

export interface TopUpInput {
  userId: string;
  amountRupees: number;
  providerSid?: string;
  note?: string;
}

export interface TopUpResult {
  ok: boolean;
  error?: string;
  topup?: WalletTransaction;
  bonus?: WalletTransaction;
  wallet?: WalletAccount;
}

export function applyTopUp(input: TopUpInput): TopUpResult {
  if (input.amountRupees < MIN_TOPUP_RUPEES) return { ok: false, error: "min_topup_100" };
  if (input.amountRupees > MAX_TOPUP_RUPEES) return { ok: false, error: "max_topup_50000" };
  const w = getWallet(input.userId);
  if (w.balanceRupees + input.amountRupees > MAX_BALANCE_RUPEES) {
    return { ok: false, error: "max_balance_200000" };
  }
  w.balanceRupees += input.amountRupees;
  w.lifetimeToppedUp += input.amountRupees;
  const topup = pushTx({
    userId: input.userId,
    kind: "topup",
    amountRupees: input.amountRupees,
    balanceAfter: w.balanceRupees,
    bonusBalanceAfter: w.bonusBalanceRupees,
    providerSid: input.providerSid,
    note: input.note?.trim(),
  });
  // Bonus credit (5%).
  const bonusAmt = Math.round((input.amountRupees * TOPUP_BONUS_PCT) / 100);
  let bonus: WalletTransaction | undefined;
  if (bonusAmt > 0) {
    w.bonusBalanceRupees += bonusAmt;
    bonus = pushTx({
      userId: input.userId,
      kind: "bonus",
      amountRupees: bonusAmt,
      balanceAfter: w.balanceRupees,
      bonusBalanceAfter: w.bonusBalanceRupees,
      note: `${TOPUP_BONUS_PCT}% bonus on ₹${input.amountRupees.toLocaleString("en-IN")} top-up`,
    });
  }
  w.updatedAt = new Date().toISOString();
  flushAcc();
  // Notify on every successful top-up. Idempotent on the topup tx id
  // so the Cashfree webhook handler firing this codepath doesn't
  // double-push (its own pushNotification uses the order id reference).
  pushNotification({
    userId: input.userId,
    kind: "wallet_topup",
    severity: "success",
    title: `₹${input.amountRupees.toLocaleString("en-IN")} added to wallet`,
    body: bonus
      ? `Plus ₹${bonus.amountRupees.toLocaleString("en-IN")} bonus credited. New balance ₹${w.balanceRupees.toLocaleString("en-IN")}.`
      : `New balance ₹${w.balanceRupees.toLocaleString("en-IN")}.`,
    link: "/dashboard/wallet",
    reference: `topup:${topup.id}`,
  });
  return { ok: true, topup, bonus, wallet: w };
}

export interface SpendInput {
  userId: string;
  amountRupees: number;
  category: WalletSpendCategory;
  reference?: string;
  note?: string;
}

export interface SpendResult {
  ok: boolean;
  error?: string;
  shortfallRupees?: number;
  tx?: WalletTransaction;
  wallet?: WalletAccount;
}

/** Spend from the wallet. Bonus balance is consumed first, then
 *  primary balance. If insufficient → returns the shortfall so the
 *  caller can route the remainder through the gateway. */
export function applySpend(input: SpendInput): SpendResult {
  if (input.amountRupees <= 0) return { ok: false, error: "invalid_amount" };
  const w = getWallet(input.userId);
  const total = w.balanceRupees + w.bonusBalanceRupees;
  if (total < input.amountRupees) {
    return { ok: false, error: "insufficient_funds", shortfallRupees: input.amountRupees - total };
  }
  // Spend bonus first.
  let remaining = input.amountRupees;
  let bonusUsed = 0;
  if (w.bonusBalanceRupees > 0) {
    bonusUsed = Math.min(w.bonusBalanceRupees, remaining);
    w.bonusBalanceRupees -= bonusUsed;
    remaining -= bonusUsed;
  }
  if (remaining > 0) {
    w.balanceRupees -= remaining;
  }
  w.lifetimeSpent += input.amountRupees;
  w.updatedAt = new Date().toISOString();
  const tx = pushTx({
    userId: input.userId,
    kind: "spend",
    amountRupees: input.amountRupees,
    bonusAppliedRupees: bonusUsed > 0 ? bonusUsed : undefined,
    balanceAfter: w.balanceRupees,
    bonusBalanceAfter: w.bonusBalanceRupees,
    category: input.category,
    reference: input.reference,
    note: input.note?.trim(),
  });
  flushAcc();
  return { ok: true, tx, wallet: w };
}

/** Refund — credits primary balance only (not bonus). Reverses a
 *  previous spend. Caller passes the same reference for audit. */
export function applyRefund(input: { userId: string; amountRupees: number; reference?: string; note?: string }): WalletTransaction {
  const w = getWallet(input.userId);
  w.balanceRupees += input.amountRupees;
  w.lifetimeSpent = Math.max(0, w.lifetimeSpent - input.amountRupees);
  w.updatedAt = new Date().toISOString();
  flushAcc();
  const tx = pushTx({
    userId: input.userId,
    kind: "refund",
    amountRupees: input.amountRupees,
    balanceAfter: w.balanceRupees,
    bonusBalanceAfter: w.bonusBalanceRupees,
    reference: input.reference,
    note: input.note?.trim(),
  });
  // Refunds always notify — patients are anxious about whether the
  // money actually came back, so confirmation is the highest-value
  // single bell event the wallet fires.
  pushNotification({
    userId: input.userId,
    kind: "wallet_refund",
    severity: "success",
    title: `₹${input.amountRupees.toLocaleString("en-IN")} refunded`,
    body: input.note || `Refund credited to your wallet. New balance ₹${w.balanceRupees.toLocaleString("en-IN")}.`,
    link: "/dashboard/wallet",
    reference: input.reference || tx.id,
  });
  return tx;
}

/** Ops adjustment with reason — used for manual corrections. */
export function applyAdjustment(input: { userId: string; amountRupees: number; reason: string }): WalletTransaction | null {
  const w = getWallet(input.userId);
  if (input.amountRupees > 0) {
    w.balanceRupees += input.amountRupees;
  } else {
    if (w.balanceRupees + input.amountRupees < 0) return null;
    w.balanceRupees += input.amountRupees;
  }
  w.updatedAt = new Date().toISOString();
  flushAcc();
  return pushTx({
    userId: input.userId,
    kind: "adjustment",
    amountRupees: Math.abs(input.amountRupees),
    balanceAfter: w.balanceRupees,
    bonusBalanceAfter: w.bonusBalanceRupees,
    note: `[${input.amountRupees > 0 ? "+" : "−"}] ${input.reason}`,
  });
}

export function deleteWalletForUser(userId: string): number {
  let n = 0;
  for (let i = accounts.length - 1; i >= 0; i--) {
    if (accounts[i].userId === userId) { tombAcc(accounts[i].id); accounts.splice(i, 1); n++; }
  }
  for (let i = txs.length - 1; i >= 0; i--) {
    if (txs[i].userId === userId) { tombTx(txs[i].id); txs.splice(i, 1); n++; }
  }
  if (n > 0) { flushAcc(); flushTx(); }
  return n;
}

/** Aggregate float on idle balance — used by the super-admin
 *  revenue dashboard. */
export function aggregateWalletFloat(): { totalBalance: number; totalBonus: number; activeWallets: number; lifetimeToppedUp: number; lifetimeSpent: number } {
  let totalBalance = 0;
  let totalBonus = 0;
  let activeWallets = 0;
  let lifetimeToppedUp = 0;
  let lifetimeSpent = 0;
  for (const w of accounts) {
    totalBalance += w.balanceRupees;
    totalBonus += w.bonusBalanceRupees;
    lifetimeToppedUp += w.lifetimeToppedUp;
    lifetimeSpent += w.lifetimeSpent;
    if (w.balanceRupees + w.bonusBalanceRupees > 0) activeWallets++;
  }
  return { totalBalance, totalBonus, activeWallets, lifetimeToppedUp, lifetimeSpent };
}
