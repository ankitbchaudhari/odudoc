// Doctor earnings ledger — Postgres-backed via bindPersistentArray.
//
// Records one entry per paid consultation. The split mirrors what IndusPays
// ships in metadata (doctorPayout / commission), but we also recompute from
// the platform-standard rate (70/30) if the gateway didn't send them — this
// keeps the admin ledger honest even if a webhook payload is malformed.
//
// Status lifecycle: "pending" → "withdrawable" (approved by admin) → "paid".
// For now the simpler model is pending|paid; an admin marks an entry paid
// when they've settled it (either directly or via a WithdrawalRequest batch).

import { bindPersistentArray } from "./persistent-array";
import type { Consultation } from "./consultations-store";

export type EarningStatus = "pending" | "paid";

export interface DoctorEarning {
  id: string;
  consultationId: string;
  doctorId: string;
  doctorEmail: string;
  doctorName: string;
  patientName: string;
  currency: string;
  grossAmount: number;
  commissionPercent: number; // platform take
  commissionAmount: number;
  netAmount: number; // what the doctor earns
  status: EarningStatus;
  paidAt?: string;
  withdrawalId?: string; // linked to a WithdrawalRequest when paid via batch
  createdAt: string;
  updatedAt: string;
}

const entries: DoctorEarning[] = [];
const { hydrate, flush } = bindPersistentArray<DoctorEarning>(
  "doctor_earnings",
  entries,
  () => []
);
await hydrate();

const now = () => new Date().toISOString();
const round2 = (n: number) => Math.round(n * 100) / 100;

// Platform take when the gateway didn't send a pre-computed split. 30% is
// the current policy; flip this if the business rule changes.
const DEFAULT_COMMISSION_PERCENT = 30;

export interface RecordConsultationEarningInput {
  consultation: Consultation;
  doctorPayoutFromGateway?: number;
  commissionFromGateway?: number;
}

// Idempotent — if an entry already exists for this consultation we return
// the existing one. Webhooks can fire twice; we should never double-count.
export function recordConsultationEarning(
  input: RecordConsultationEarningInput
): DoctorEarning {
  const existing = entries.find(
    (e) => e.consultationId === input.consultation.id
  );
  if (existing) return existing;

  const c = input.consultation;
  const gross = round2(c.fee);

  let commission: number;
  let net: number;
  if (
    typeof input.doctorPayoutFromGateway === "number" &&
    typeof input.commissionFromGateway === "number"
  ) {
    commission = round2(input.commissionFromGateway);
    net = round2(input.doctorPayoutFromGateway);
  } else {
    commission = round2((gross * DEFAULT_COMMISSION_PERCENT) / 100);
    net = round2(gross - commission);
  }
  const commissionPercent = gross > 0 ? round2((commission / gross) * 100) : 0;

  const entry: DoctorEarning = {
    id: `earn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    consultationId: c.id,
    doctorId: c.doctorId,
    doctorEmail: (c.doctorEmail || "").toLowerCase(),
    doctorName: c.doctorName,
    patientName: c.patientName,
    currency: c.currency,
    grossAmount: gross,
    commissionPercent,
    commissionAmount: commission,
    netAmount: net,
    status: "pending",
    createdAt: now(),
    updatedAt: now(),
  };
  entries.unshift(entry);
  flush();
  return entry;
}

export function getEarning(id: string): DoctorEarning | null {
  return entries.find((e) => e.id === id) || null;
}

export function listEarnings(opts: {
  doctorEmail?: string;
  doctorId?: string;
  status?: EarningStatus | "all";
} = {}): DoctorEarning[] {
  let list = [...entries];
  if (opts.doctorEmail) {
    const needle = opts.doctorEmail.toLowerCase();
    list = list.filter((e) => e.doctorEmail === needle);
  }
  if (opts.doctorId) list = list.filter((e) => e.doctorId === opts.doctorId);
  if (opts.status && opts.status !== "all") {
    list = list.filter((e) => e.status === opts.status);
  }
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function markEarningPaid(
  id: string,
  withdrawalId?: string
): DoctorEarning | null {
  const e = entries.find((x) => x.id === id);
  if (!e || e.status === "paid") return e || null;
  e.status = "paid";
  e.paidAt = now();
  if (withdrawalId) e.withdrawalId = withdrawalId;
  e.updatedAt = now();
  flush();
  return e;
}

export function markManyEarningsPaid(
  ids: string[],
  withdrawalId?: string
): number {
  const ts = now();
  let changed = 0;
  for (const id of ids) {
    const e = entries.find((x) => x.id === id);
    if (!e || e.status === "paid") continue;
    e.status = "paid";
    e.paidAt = ts;
    if (withdrawalId) e.withdrawalId = withdrawalId;
    e.updatedAt = ts;
    changed++;
  }
  if (changed) flush();
  return changed;
}

export interface DoctorEarningsSummary {
  doctorId: string;
  doctorEmail: string;
  doctorName: string;
  pendingNet: number;
  paidNet: number;
  lifetimeGross: number;
  totalCommission: number;
  entryCount: number;
}

// Per-doctor totals for the admin overview table.
export function summarizeByDoctor(): DoctorEarningsSummary[] {
  const map = new Map<string, DoctorEarningsSummary>();
  for (const e of entries) {
    const key = e.doctorEmail || e.doctorId;
    const s = map.get(key) || {
      doctorId: e.doctorId,
      doctorEmail: e.doctorEmail,
      doctorName: e.doctorName,
      pendingNet: 0,
      paidNet: 0,
      lifetimeGross: 0,
      totalCommission: 0,
      entryCount: 0,
    };
    if (e.status === "pending") s.pendingNet = round2(s.pendingNet + e.netAmount);
    else s.paidNet = round2(s.paidNet + e.netAmount);
    s.lifetimeGross = round2(s.lifetimeGross + e.grossAmount);
    s.totalCommission = round2(s.totalCommission + e.commissionAmount);
    s.entryCount++;
    map.set(key, s);
  }
  return Array.from(map.values()).sort((a, b) => b.pendingNet - a.pendingNet);
}

// Available-to-withdraw for a single doctor — sum of pending entries.
export function getPendingBalance(doctorEmail: string): number {
  const needle = doctorEmail.toLowerCase();
  let total = 0;
  for (const e of entries) {
    if (e.doctorEmail === needle && e.status === "pending") total += e.netAmount;
  }
  return round2(total);
}

// Rolling period totals for the doctor dashboard tiles (today / week / month).
export function getPeriodTotals(doctorEmail: string): {
  today: number;
  week: number;
  month: number;
} {
  const needle = doctorEmail.toLowerCase();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - now.getDay() * 24 * 60 * 60 * 1000;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let today = 0;
  let week = 0;
  let month = 0;
  for (const e of entries) {
    if (e.doctorEmail !== needle) continue;
    const t = new Date(e.createdAt).getTime();
    if (t >= startOfToday) today += e.netAmount;
    if (t >= startOfWeek) week += e.netAmount;
    if (t >= startOfMonth) month += e.netAmount;
  }
  return { today: round2(today), week: round2(week), month: round2(month) };
}
