// Referral commissions.
//
// When a doctor refers a patient to a pharmacy, lab, diagnostic
// center, or insurance product — and the patient transacts there —
// a commission is owed back to the doctor. Each commission rule is
// configured per (referrer, payer, scope) and computes against a
// transaction's gross. We deliberately keep the rule model simple
// (flat % or flat ₹) — operators that need tiers/caps can layer
// those on top once we see real usage.
//
// COMPLIANCE: India's MCI / NMC code prohibits some forms of
// referral kickback to physicians. Operators are expected to
// confirm their jurisdiction permits the structures they create
// here — the system records and pays, it does not validate ethics.

import { bindPersistentArray } from "../persistent-array";

export type ReferralPayer = "pharmacy" | "lab" | "diagnostic" | "insurer" | "hospital";
export type ReferralScope = "consultation" | "rx_fulfilment" | "lab_order" | "policy_sale" | "admission";

export interface ReferralRule {
  id: string;
  /** Who receives the commission — typically a doctorEmail or
   *  organizationId. */
  referrerKey: string;
  referrerKind: "doctor" | "hospital" | "clinic";
  /** Who pays the commission. */
  payerKey: string;
  payerKind: ReferralPayer;
  scope: ReferralScope;
  /** Either a percentage of the transaction or a flat amount. */
  pctOfGross?: number;     // 0-100
  flatRupees?: number;
  /** Optional caps — protect against runaway costs on edge cases. */
  capRupees?: number;
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionLedgerEntry {
  id: string;
  ruleId: string;
  referrerKey: string;
  payerKey: string;
  scope: ReferralScope;
  /** What the commission was computed against. */
  transactionRef: string;
  grossRupees: number;
  amountRupees: number;
  status: "accrued" | "settled" | "reversed";
  settledAt?: string;
  reversedAt?: string;
  notes?: string;
  createdAt: string;
}

const rules: ReferralRule[] = [];
const ledger: CommissionLedgerEntry[] = [];
const { hydrate: hydrateRules, flush: flushRules, tombstone: tombstoneRule } =
  bindPersistentArray<ReferralRule>("referral_rules", rules, () => []);
const { hydrate: hydrateLedger, flush: flushLedger, tombstone: tombstoneLedger } =
  bindPersistentArray<CommissionLedgerEntry>("referral_ledger", ledger, () => []);
await hydrateRules();
await hydrateLedger();

export interface CreateRuleInput {
  referrerKey: string;
  referrerKind: ReferralRule["referrerKind"];
  payerKey: string;
  payerKind: ReferralPayer;
  scope: ReferralScope;
  pctOfGross?: number;
  flatRupees?: number;
  capRupees?: number;
  notes?: string;
}

export function createRule(input: CreateRuleInput): ReferralRule {
  const at = new Date().toISOString();
  const r: ReferralRule = {
    id: `rr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    referrerKey: input.referrerKey,
    referrerKind: input.referrerKind,
    payerKey: input.payerKey,
    payerKind: input.payerKind,
    scope: input.scope,
    pctOfGross: input.pctOfGross,
    flatRupees: input.flatRupees,
    capRupees: input.capRupees,
    active: true,
    notes: input.notes?.trim() || undefined,
    createdAt: at, updatedAt: at,
  };
  rules.unshift(r);
  flushRules();
  return r;
}

export function listRules(opts: { referrerKey?: string; payerKey?: string; activeOnly?: boolean } = {}): ReferralRule[] {
  let list = [...rules];
  if (opts.referrerKey) list = list.filter((r) => r.referrerKey === opts.referrerKey);
  if (opts.payerKey) list = list.filter((r) => r.payerKey === opts.payerKey);
  if (opts.activeOnly) list = list.filter((r) => r.active);
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function updateRule(id: string, patch: Partial<ReferralRule>): ReferralRule | null {
  const r = rules.find((x) => x.id === id);
  if (!r) return null;
  Object.assign(r, patch);
  r.updatedAt = new Date().toISOString();
  flushRules();
  return r;
}

export function deleteRule(id: string): boolean {
  const i = rules.findIndex((r) => r.id === id);
  if (i < 0) return false;
  tombstoneRule(rules[i].id);
  rules.splice(i, 1);
  flushRules();
  return true;
}

/** Compute the commission for a transaction against a rule. Pure
 *  function — no side effects. */
export function computeCommission(rule: ReferralRule, grossRupees: number): number {
  let amount = 0;
  if (rule.pctOfGross && rule.pctOfGross > 0) amount += (grossRupees * rule.pctOfGross) / 100;
  if (rule.flatRupees && rule.flatRupees > 0) amount += rule.flatRupees;
  if (rule.capRupees && rule.capRupees > 0) amount = Math.min(amount, rule.capRupees);
  return Math.max(0, Math.round(amount));
}

export interface AccrueInput {
  referrerKey: string;
  payerKey: string;
  scope: ReferralScope;
  transactionRef: string;
  grossRupees: number;
}

/** Find matching active rule + accrue. Idempotent on transactionRef
 *  per (referrerKey, payerKey, scope) — replaying the same payment
 *  webhook doesn't double-credit. */
export function accrueCommission(input: AccrueInput): CommissionLedgerEntry | null {
  const rule = rules.find((r) =>
    r.active && r.referrerKey === input.referrerKey &&
    r.payerKey === input.payerKey && r.scope === input.scope
  );
  if (!rule) return null;
  // Idempotency check.
  const dup = ledger.find((e) =>
    e.ruleId === rule.id && e.transactionRef === input.transactionRef
  );
  if (dup) return dup;
  const amount = computeCommission(rule, input.grossRupees);
  if (amount <= 0) return null;
  const at = new Date().toISOString();
  const entry: CommissionLedgerEntry = {
    id: `cl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    ruleId: rule.id,
    referrerKey: rule.referrerKey,
    payerKey: rule.payerKey,
    scope: rule.scope,
    transactionRef: input.transactionRef,
    grossRupees: input.grossRupees,
    amountRupees: amount,
    status: "accrued",
    createdAt: at,
  };
  ledger.unshift(entry);
  flushLedger();
  return entry;
}

export function listLedger(opts: { referrerKey?: string; payerKey?: string; status?: CommissionLedgerEntry["status"]; limit?: number } = {}): CommissionLedgerEntry[] {
  let list = [...ledger];
  if (opts.referrerKey) list = list.filter((e) => e.referrerKey === opts.referrerKey);
  if (opts.payerKey) list = list.filter((e) => e.payerKey === opts.payerKey);
  if (opts.status) list = list.filter((e) => e.status === opts.status);
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (opts.limit) list = list.slice(0, opts.limit);
  return list;
}

export function settleEntry(id: string, notes?: string): CommissionLedgerEntry | null {
  const e = ledger.find((x) => x.id === id);
  if (!e) return null;
  if (e.status !== "accrued") return e;
  e.status = "settled";
  e.settledAt = new Date().toISOString();
  e.notes = notes?.trim() || e.notes;
  flushLedger();
  return e;
}

export function reverseEntry(id: string, notes?: string): CommissionLedgerEntry | null {
  const e = ledger.find((x) => x.id === id);
  if (!e) return null;
  if (e.status === "reversed") return e;
  e.status = "reversed";
  e.reversedAt = new Date().toISOString();
  e.notes = notes?.trim() || e.notes;
  flushLedger();
  return e;
}

export function deleteCommissionsForReferrer(referrerKey: string): number {
  let n = 0;
  for (let i = ledger.length - 1; i >= 0; i--) {
    if (ledger[i].referrerKey === referrerKey) {
      tombstoneLedger(ledger[i].id);
      ledger.splice(i, 1);
      n++;
    }
  }
  for (let i = rules.length - 1; i >= 0; i--) {
    if (rules[i].referrerKey === referrerKey) {
      tombstoneRule(rules[i].id);
      rules.splice(i, 1);
      n++;
    }
  }
  if (n) { flushLedger(); flushRules(); }
  return n;
}

/** Aggregate stats for a doctor / clinic dashboard. */
export function summarizeFor(referrerKey: string): {
  accruedRupees: number; settledRupees: number; reversedRupees: number;
  countAccrued: number; countSettled: number; countReversed: number;
} {
  let a = 0, s = 0, r = 0, ca = 0, cs = 0, cr = 0;
  for (const e of ledger) {
    if (e.referrerKey !== referrerKey) continue;
    if (e.status === "accrued") { a += e.amountRupees; ca++; }
    else if (e.status === "settled") { s += e.amountRupees; cs++; }
    else if (e.status === "reversed") { r += e.amountRupees; cr++; }
  }
  return { accruedRupees: a, settledRupees: s, reversedRupees: r, countAccrued: ca, countSettled: cs, countReversed: cr };
}
