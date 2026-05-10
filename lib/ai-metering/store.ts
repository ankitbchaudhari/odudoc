// AI usage meter + per-account credit pool.
//
// Every premium AI call (DDx, scribe, OCR, triage, voice transcript,
// image analysis) calls debitAiCredit() before producing a result.
// If the caller doesn't have enough credit, the call short-circuits
// and the API returns 402. The meter records every call with cost,
// feature, and outcome so admins can audit spend.
//
// Two account kinds:
//   - "user"  — individual doctor on freelance plan (their own wallet)
//   - "org"   — hospital / clinic / lab pays from a shared pool
//
// Auto-topup rule fires when balance drops below a threshold and a
// rule is configured. We don't actually charge a payment gateway
// here — the rule just emits a notification + a queued debit; an
// operator job (or the existing wallet store) settles via Cashfree.

import { bindPersistentArray } from "../persistent-array";
import { pushNotification } from "../notifications/store";

export type AiFeature =
  | "ddx"             // differential diagnosis
  | "scribe"          // ambient scribe / voice → notes
  | "ocr"             // OCR (lab reports, prescriptions)
  | "triage"          // chatbot triage
  | "translation"     // local language ↔ scientific
  | "image_analysis"  // skin / radiology AI
  | "voice_transcript" // raw speech-to-text
  | "rx_safety"       // drug-interaction check
  | "summarize";      // EMR summary

export interface AiUsageEntry {
  id: string;
  ownerKind: "user" | "org";
  ownerId: string;
  feature: AiFeature;
  /** Tokens / seconds / pages — feature-specific. */
  unitCount: number;
  /** Cost in INR rupees. Snapshot at the time of the call. */
  costRupees: number;
  /** Outcome — useful for refunding failed calls. */
  status: "ok" | "error" | "refunded";
  /** Caller-supplied reference for idempotency / audit. */
  reference?: string;
  /** Free-text — patient id this call ran on, etc. */
  context?: string;
  createdAt: string;
}

export interface AiAccount {
  /** id == ownerKind:ownerId. */
  id: string;
  ownerKind: "user" | "org";
  ownerId: string;
  /** Spendable credit in INR rupees. */
  balanceRupees: number;
  lifetimeSpentRupees: number;
  lifetimeToppedUpRupees: number;
  /** Auto-topup rule (optional). */
  autoTopup?: {
    enabled: boolean;
    /** When balance drops below this, fire a topup. */
    thresholdRupees: number;
    /** Amount to add. */
    topupAmountRupees: number;
    /** Last fired — keeps us idempotent on rapid burn. */
    lastFiredAt?: string;
  };
  updatedAt: string;
  createdAt: string;
}

const usage: AiUsageEntry[] = [];
const accounts: AiAccount[] = [];
const { hydrate: hydrateUsage, flush: flushUsage, tombstone: tombstoneUsage } =
  bindPersistentArray<AiUsageEntry>("ai_usage", usage, () => []);
const { hydrate: hydrateAccounts, flush: flushAccounts, tombstone: tombstoneAccount } =
  bindPersistentArray<AiAccount>("ai_accounts", accounts, () => []);
await hydrateUsage();
await hydrateAccounts();

/** Per-feature unit cost — operators can tune from /admin/ai-pricing
 *  in a future round; the table is canonical. */
export const AI_PRICING: Record<AiFeature, { perUnitRupees: number; unitLabel: string }> = {
  ddx:              { perUnitRupees: 8,  unitLabel: "call" },
  scribe:           { perUnitRupees: 5,  unitLabel: "minute of audio" },
  ocr:              { perUnitRupees: 4,  unitLabel: "page" },
  triage:           { perUnitRupees: 2,  unitLabel: "session" },
  translation:      { perUnitRupees: 1,  unitLabel: "1k chars" },
  image_analysis:   { perUnitRupees: 12, unitLabel: "image" },
  voice_transcript: { perUnitRupees: 3,  unitLabel: "minute of audio" },
  rx_safety:        { perUnitRupees: 1,  unitLabel: "check" },
  summarize:        { perUnitRupees: 4,  unitLabel: "1k tokens" },
};

/** Resolve effective per-unit cost for an owner. Per-org/-user
 *  overrides win over the default table. Lazy import avoids a
 *  circular dependency with /lib/ai-metering/pricing-overrides. */
export function effectivePerUnit(feature: AiFeature, ownerKind?: "user" | "org", ownerId?: string): number {
  const def = AI_PRICING[feature].perUnitRupees;
  if (!ownerKind || !ownerId) return def;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./pricing-overrides") as typeof import("./pricing-overrides");
    const o = mod.getOverride(ownerKind, ownerId, feature);
    if (o) return o.perUnitRupees;
  } catch { /* overrides module not loaded yet — fall through */ }
  return def;
}

export function quoteCost(feature: AiFeature, unitCount: number, ownerKind?: "user" | "org", ownerId?: string): number {
  const per = effectivePerUnit(feature, ownerKind, ownerId);
  return Math.max(1, Math.ceil(per * unitCount));
}

function accountKey(ownerKind: "user" | "org", ownerId: string): string {
  return `${ownerKind}:${ownerId}`;
}

export function getAccount(ownerKind: "user" | "org", ownerId: string): AiAccount {
  let a = accounts.find((x) => x.id === accountKey(ownerKind, ownerId));
  if (a) return a;
  const at = new Date().toISOString();
  a = {
    id: accountKey(ownerKind, ownerId),
    ownerKind, ownerId,
    balanceRupees: 0,
    lifetimeSpentRupees: 0,
    lifetimeToppedUpRupees: 0,
    updatedAt: at, createdAt: at,
  };
  accounts.push(a);
  flushAccounts();
  return a;
}

export interface DebitInput {
  ownerKind: "user" | "org";
  ownerId: string;
  feature: AiFeature;
  unitCount: number;
  reference?: string;
  context?: string;
}

export type DebitResult =
  | { ok: true; entry: AiUsageEntry; account: AiAccount }
  | { ok: false; error: "insufficient_credit"; balanceRupees: number; quotedRupees: number };

/** Idempotent on (ownerKind, ownerId, feature, reference). Replaying
 *  the same reference returns the existing entry instead of charging
 *  twice. */
export function debitAiCredit(input: DebitInput): DebitResult {
  if (input.reference) {
    const dup = usage.find((u) =>
      u.ownerKind === input.ownerKind && u.ownerId === input.ownerId &&
      u.feature === input.feature && u.reference === input.reference
    );
    if (dup) return { ok: true, entry: dup, account: getAccount(input.ownerKind, input.ownerId) };
  }
  const a = getAccount(input.ownerKind, input.ownerId);
  const cost = quoteCost(input.feature, input.unitCount, input.ownerKind, input.ownerId);
  if (a.balanceRupees < cost) {
    return { ok: false, error: "insufficient_credit", balanceRupees: a.balanceRupees, quotedRupees: cost };
  }
  a.balanceRupees -= cost;
  a.lifetimeSpentRupees += cost;
  a.updatedAt = new Date().toISOString();
  flushAccounts();
  const entry: AiUsageEntry = {
    id: `aiu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    ownerKind: input.ownerKind, ownerId: input.ownerId,
    feature: input.feature,
    unitCount: input.unitCount,
    costRupees: cost,
    status: "ok",
    reference: input.reference,
    context: input.context,
    createdAt: new Date().toISOString(),
  };
  usage.unshift(entry);
  flushUsage();
  // Auto-topup nudge.
  if (a.autoTopup?.enabled && a.balanceRupees < a.autoTopup.thresholdRupees) {
    fireAutoTopup(a);
  }
  return { ok: true, entry, account: a };
}

/** Refund a failed call. Idempotent on reference. */
export function refundEntry(entryId: string, reason?: string): boolean {
  const e = usage.find((x) => x.id === entryId);
  if (!e || e.status !== "ok") return false;
  const a = accounts.find((x) => x.id === accountKey(e.ownerKind, e.ownerId));
  if (!a) return false;
  a.balanceRupees += e.costRupees;
  a.lifetimeSpentRupees = Math.max(0, a.lifetimeSpentRupees - e.costRupees);
  a.updatedAt = new Date().toISOString();
  e.status = "refunded";
  e.context = reason ? `${e.context || ""} · refund: ${reason}` : e.context;
  flushUsage();
  flushAccounts();
  return true;
}

export interface TopupInput {
  ownerKind: "user" | "org";
  ownerId: string;
  amountRupees: number;
  reference?: string;
  source?: "wallet" | "auto" | "ops";
}

export function topupAccount(input: TopupInput): AiAccount {
  const a = getAccount(input.ownerKind, input.ownerId);
  a.balanceRupees += input.amountRupees;
  a.lifetimeToppedUpRupees += input.amountRupees;
  a.updatedAt = new Date().toISOString();
  flushAccounts();
  return a;
}

export interface SetAutoTopupInput {
  ownerKind: "user" | "org";
  ownerId: string;
  enabled: boolean;
  thresholdRupees?: number;
  topupAmountRupees?: number;
}

export function setAutoTopup(input: SetAutoTopupInput): AiAccount {
  const a = getAccount(input.ownerKind, input.ownerId);
  a.autoTopup = {
    enabled: input.enabled,
    thresholdRupees: input.thresholdRupees ?? a.autoTopup?.thresholdRupees ?? 100,
    topupAmountRupees: input.topupAmountRupees ?? a.autoTopup?.topupAmountRupees ?? 500,
    lastFiredAt: a.autoTopup?.lastFiredAt,
  };
  a.updatedAt = new Date().toISOString();
  flushAccounts();
  return a;
}

function fireAutoTopup(a: AiAccount): void {
  if (!a.autoTopup?.enabled) return;
  const last = a.autoTopup.lastFiredAt ? new Date(a.autoTopup.lastFiredAt).getTime() : 0;
  // Cooldown: 5 minutes — protects against rapid-fire firing during
  // a burst.
  if (Date.now() - last < 5 * 60 * 1000) return;
  a.autoTopup.lastFiredAt = new Date().toISOString();
  flushAccounts();
  // Operator queue / wallet-charge happens out-of-band; we just
  // notify the owner. The actual money movement uses /lib/wallet
  // for users (they sign off in advance) and ops review for orgs.
  if (a.ownerKind === "user") {
    pushNotification({
      userId: a.ownerId,
      kind: "wallet_topup",
      severity: "warn",
      title: "AI credit running low",
      body: `Balance ₹${a.balanceRupees.toLocaleString("en-IN")}. Auto-topup of ₹${a.autoTopup.topupAmountRupees} queued.`,
      link: "/dashboard/wallet",
      reference: `ai_auto_topup:${a.id}:${a.autoTopup.lastFiredAt}`,
    });
  }
}

export function listUsage(opts: { ownerKind?: "user" | "org"; ownerId?: string; feature?: AiFeature; limit?: number } = {}): AiUsageEntry[] {
  let list = [...usage];
  if (opts.ownerKind) list = list.filter((u) => u.ownerKind === opts.ownerKind);
  if (opts.ownerId) list = list.filter((u) => u.ownerId === opts.ownerId);
  if (opts.feature) list = list.filter((u) => u.feature === opts.feature);
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (opts.limit) list = list.slice(0, opts.limit);
  return list;
}

export function summarizeUsage(ownerKind: "user" | "org", ownerId: string, sinceDays = 30): {
  totalRupees: number; calls: number;
  byFeature: Partial<Record<AiFeature, { rupees: number; calls: number }>>;
} {
  const since = new Date(); since.setDate(since.getDate() - sinceDays);
  const sinceIso = since.toISOString();
  const byFeature: Partial<Record<AiFeature, { rupees: number; calls: number }>> = {};
  let total = 0, calls = 0;
  for (const u of usage) {
    if (u.ownerKind !== ownerKind || u.ownerId !== ownerId) continue;
    if (u.createdAt < sinceIso) continue;
    if (u.status !== "ok") continue;
    total += u.costRupees;
    calls++;
    const cur = byFeature[u.feature] || { rupees: 0, calls: 0 };
    cur.rupees += u.costRupees;
    cur.calls++;
    byFeature[u.feature] = cur;
  }
  return { totalRupees: total, calls, byFeature };
}

export function deleteAiDataForUser(ownerId: string): number {
  let n = 0;
  for (let i = accounts.length - 1; i >= 0; i--) {
    if (accounts[i].ownerKind === "user" && accounts[i].ownerId === ownerId) {
      tombstoneAccount(accounts[i].id);
      accounts.splice(i, 1);
      n++;
    }
  }
  for (let i = usage.length - 1; i >= 0; i--) {
    if (usage[i].ownerKind === "user" && usage[i].ownerId === ownerId) {
      tombstoneUsage(usage[i].id);
      usage.splice(i, 1);
      n++;
    }
  }
  if (n) { flushAccounts(); flushUsage(); }
  return n;
}
