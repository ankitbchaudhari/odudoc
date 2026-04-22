// Pre-Anesthesia Check (PAC). Tenant-scoped.
// Single PacAssessment per pre-op patient. Lifecycle: pending -> in_review -> cleared / deferred / rejected.
// Detach-only cascade. Links to surgery booking optional (bookingId).

import { bindPersistentArray } from "../persistent-array";

export type AsaClass = "I" | "II" | "III" | "IV" | "V" | "VI" | "E";
export type Mallampati = "I" | "II" | "III" | "IV";
export type PacStatus = "pending" | "in_review" | "cleared" | "deferred" | "rejected";
export type AnesthesiaPlan = "general" | "regional" | "spinal" | "epidural" | "mac" | "local" | "combined";

export interface PacAssessment {
  id: string;                    // PAC-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  bookingId?: string;
  procedureName: string;
  surgeryDate?: string;
  anesthetistName?: string;
  anesthetistId?: string;
  status: PacStatus;
  asaClass?: AsaClass;
  mallampati?: Mallampati;
  plannedAnesthesia?: AnesthesiaPlan;
  // airway
  mouthOpeningCm?: number;
  thyromentalCm?: number;
  neckMovement?: "normal" | "restricted";
  dentition?: "intact" | "partial" | "edentulous" | "loose";
  // vitals
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  heartRate?: number;
  spo2?: number;
  // comorbidities
  hypertension?: boolean;
  diabetes?: boolean;
  ihd?: boolean;
  copd?: boolean;
  asthma?: boolean;
  osa?: boolean;
  ckd?: boolean;
  hepaticDisease?: boolean;
  pregnancy?: boolean;
  allergies?: string;
  currentMedications?: string;
  previousAnesthesia?: string;
  // labs gating
  cbcDone?: boolean;
  bmpDone?: boolean;
  coagsDone?: boolean;
  ecgDone?: boolean;
  cxrDone?: boolean;
  echoDone?: boolean;
  // NPO
  npoSolidsHours?: number;
  npoLiquidsHours?: number;
  // consent
  anesthesiaConsent?: boolean;
  bloodConsent?: boolean;
  // plan
  recommendation?: string;
  risks?: string;
  deferReason?: string;
  optimizationPlan?: string;
  createdAt: string;
  updatedAt: string;
  clearedAt?: string;
}

const rows: PacAssessment[] = [];
const hydrate = bindPersistentArray<PacAssessment>("pac-assessments", rows, () => []);
await hydrate;

export const ASA_LABEL: Record<AsaClass, string> = {
  I: "I — Healthy", II: "II — Mild systemic", III: "III — Severe systemic",
  IV: "IV — Severe / life-threat", V: "V — Moribund", VI: "VI — Brain dead", E: "E — Emergency",
};
export const STATUS_LABEL: Record<PacStatus, string> = {
  pending: "Pending", in_review: "In review", cleared: "Cleared",
  deferred: "Deferred", rejected: "Rejected",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(o: string) {
  const p = `PAC-${suf(o)}-`;
  const m = rows.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

export function listPac(opts: { organizationId: string; status?: PacStatus; patientId?: string; bookingId?: string }): PacAssessment[] {
  return rows.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.patientId ? r.patientId === opts.patientId : true))
    .filter((r) => (opts.bookingId ? r.bookingId === opts.bookingId : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createPac(orgId: string, input: Partial<PacAssessment>): { ok: true; pac: PacAssessment } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || !input.procedureName) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  let bmi: number | undefined;
  if (input.heightCm && input.weightKg && input.heightCm > 0) {
    const m = input.heightCm / 100;
    bmi = Math.round((input.weightKg / (m * m)) * 10) / 10;
  }
  const r: PacAssessment = {
    id: nextId(orgId), organizationId: orgId,
    patientId: input.patientId, patientName: input.patientName,
    bookingId: input.bookingId,
    procedureName: input.procedureName,
    surgeryDate: input.surgeryDate,
    anesthetistName: input.anesthetistName, anesthetistId: input.anesthetistId,
    status: "pending",
    heightCm: input.heightCm, weightKg: input.weightKg, bmi,
    allergies: input.allergies, currentMedications: input.currentMedications,
    createdAt: now, updatedAt: now,
  };
  rows.push(r);
  return { ok: true, pac: r };
}

export function updatePac(id: string, orgId: string, patch: Partial<PacAssessment>): PacAssessment | null {
  const i = rows.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = rows[i];
  const now = new Date().toISOString();
  const next: PacAssessment = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.heightCm && next.weightKg && next.heightCm > 0) {
    const m = next.heightCm / 100;
    next.bmi = Math.round((next.weightKg / (m * m)) * 10) / 10;
  }
  if (next.status === "cleared" && prev.status !== "cleared" && !next.clearedAt) next.clearedAt = now;
  rows[i] = next;
  return next;
}

export function deletePac(id: string, orgId: string): boolean {
  const i = rows.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  rows.splice(i, 1);
  return true;
}

export function computeStats(orgId: string) {
  const my = rows.filter((r) => r.organizationId === orgId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const pending = my.filter((r) => r.status === "pending").length;
  const inReview = my.filter((r) => r.status === "in_review").length;
  const clearedMonth = my.filter((r) => r.status === "cleared" && (r.clearedAt || "") >= monthStart).length;
  const deferredMonth = my.filter((r) => r.status === "deferred" && r.updatedAt >= monthStart).length;
  const rejectedMonth = my.filter((r) => r.status === "rejected" && r.updatedAt >= monthStart).length;
  const highRisk = my.filter((r) => r.asaClass === "III" || r.asaClass === "IV" || r.asaClass === "V").length;
  const difficultAirway = my.filter((r) => r.mallampati === "III" || r.mallampati === "IV").length;
  // same-day clearances
  const tatPool = my.filter((r) => r.status === "cleared" && r.clearedAt);
  const avgClearHours = tatPool.length > 0 ? Math.round(tatPool.reduce((s, r) => s + (new Date(r.clearedAt!).getTime() - new Date(r.createdAt).getTime()) / 3_600_000, 0) / tatPool.length * 10) / 10 : 0;
  return { pending, inReview, clearedMonth, deferredMonth, rejectedMonth, highRisk, difficultAirway, avgClearHours };
}

export function unlinkPacForPatient(patientId: string, orgId: string): void {
  for (const r of rows) {
    if (r.organizationId === orgId && r.patientId === patientId) {
      r.patientId = "";
      r.patientName = `[removed] ${r.patientName}`;
      r.updatedAt = new Date().toISOString();
    }
  }
  // flush:auto-unlink
  rows.splice(rows.length, 0);
}
