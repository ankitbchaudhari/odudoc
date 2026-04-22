// ENT (Otolaryngology). Tenant-scoped. Single EntExam entity.
// Detach-only cascade.

import { bindPersistentArray } from "../persistent-array";

export type EntVisitType = "routine" | "emergency" | "post_op" | "follow_up" | "screening" | "audiology";
export type EntStatus = "scheduled" | "in_progress" | "completed" | "referred" | "cancelled";
export type EntRegion = "ear" | "nose" | "throat" | "head_neck" | "multi";

export interface EarFinding {
  canal?: string;                   // wax, discharge, inflammation
  tympanicMembrane?: string;        // intact / perforated / retracted
  mobility?: string;                // normal / reduced / absent
  hearingGross?: string;            // WNL / decreased
}

export interface EntExam {
  id: string;                       // ENT-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  providerName: string;
  visitDate: string;
  visitType: EntVisitType;
  status: EntStatus;
  region: EntRegion;
  chiefComplaint?: string;
  historyNote?: string;
  rightEar?: EarFinding;
  leftEar?: EarFinding;
  noseFindings?: string;            // septum, turbinates, polyps
  throatFindings?: string;          // pharynx, tonsils, larynx
  neckFindings?: string;            // LN, thyroid
  // Audiology
  rightPtaDb?: number;              // pure-tone average in dB HL
  leftPtaDb?: number;
  tympanometryRight?: string;       // A / As / Ad / B / C
  tympanometryLeft?: string;
  // Endoscopy / scope findings
  scopeFindings?: string;
  impression?: string;              // diagnosis
  plan?: string;
  prescriptionNote?: string;
  referralTo?: string;
  nextReviewDate?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

const rows: EntExam[] = [];
const hydrate = bindPersistentArray<EntExam>("ent-exams", rows, () => []);
await hydrate;

export const VISIT_LABEL: Record<EntVisitType, string> = {
  routine: "Routine", emergency: "Emergency", post_op: "Post-op",
  follow_up: "Follow-up", screening: "Screening", audiology: "Audiology",
};
export const STATUS_LABEL: Record<EntStatus, string> = {
  scheduled: "Scheduled", in_progress: "In progress", completed: "Completed",
  referred: "Referred", cancelled: "Cancelled",
};
export const REGION_LABEL: Record<EntRegion, string> = {
  ear: "Ear", nose: "Nose", throat: "Throat", head_neck: "Head/neck", multi: "Multi-region",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(o: string) {
  const p = `ENT-${suf(o)}-`;
  const m = rows.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

export function listExams(opts: { organizationId: string; status?: EntStatus; visitType?: EntVisitType; region?: EntRegion; patientId?: string }): EntExam[] {
  return rows.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.visitType ? r.visitType === opts.visitType : true))
    .filter((r) => (opts.region ? r.region === opts.region : true))
    .filter((r) => (opts.patientId ? r.patientId === opts.patientId : true))
    .sort((a, b) => b.visitDate.localeCompare(a.visitDate));
}

export function createExam(orgId: string, input: Partial<EntExam>): { ok: true; exam: EntExam } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || !input.providerName) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: EntExam = {
    id: nextId(orgId), organizationId: orgId,
    patientId: input.patientId, patientName: input.patientName,
    providerName: input.providerName,
    visitDate: input.visitDate || now,
    visitType: (input.visitType || "routine") as EntVisitType,
    status: "scheduled",
    region: (input.region || "multi") as EntRegion,
    chiefComplaint: input.chiefComplaint,
    historyNote: input.historyNote,
    rightEar: input.rightEar || {},
    leftEar: input.leftEar || {},
    noseFindings: input.noseFindings,
    throatFindings: input.throatFindings,
    neckFindings: input.neckFindings,
    rightPtaDb: input.rightPtaDb,
    leftPtaDb: input.leftPtaDb,
    tympanometryRight: input.tympanometryRight,
    tympanometryLeft: input.tympanometryLeft,
    scopeFindings: input.scopeFindings,
    impression: input.impression,
    plan: input.plan,
    prescriptionNote: input.prescriptionNote,
    referralTo: input.referralTo,
    nextReviewDate: input.nextReviewDate,
    createdAt: now, updatedAt: now,
  };
  rows.push(r);
  return { ok: true, exam: r };
}

export function updateExam(id: string, orgId: string, patch: Partial<EntExam>): EntExam | null {
  const i = rows.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = rows[i];
  const now = new Date().toISOString();
  const next: EntExam = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.status === "completed" && prev.status !== "completed" && !next.completedAt) next.completedAt = now;
  rows[i] = next;
  return next;
}

export function deleteExam(id: string, orgId: string): boolean {
  const i = rows.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  rows.splice(i, 1);
  return true;
}

export function computeStats(orgId: string) {
  const my = rows.filter((r) => r.organizationId === orgId);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const scheduledToday = my.filter((r) => r.status === "scheduled" && r.visitDate >= todayStart && r.visitDate < todayEnd).length;
  const inProgress = my.filter((r) => r.status === "in_progress").length;
  const completedMonth = my.filter((r) => r.status === "completed" && (r.completedAt || "") >= monthStart).length;
  const audiologyMonth = my.filter((r) => r.visitType === "audiology" && (r.completedAt || "") >= monthStart).length;
  const referralsMonth = my.filter((r) => r.status === "referred" && r.updatedAt >= monthStart).length;
  // Hearing-loss flag: PTA > 25 dB HL on either ear
  const hearingLossFlags = my.filter((r) => r.status === "completed" && ((r.rightPtaDb || 0) > 25 || (r.leftPtaDb || 0) > 25)).length;
  const emergencyMonth = my.filter((r) => r.visitType === "emergency" && r.visitDate >= monthStart).length;
  return { scheduledToday, inProgress, completedMonth, audiologyMonth, referralsMonth, hearingLossFlags, emergencyMonth };
}

export function unlinkEntForPatient(patientId: string, orgId: string): void {
  const stamp = new Date().toISOString();
  for (const r of rows) {
    if (r.organizationId === orgId && r.patientId === patientId) {
      r.patientId = "";
      r.patientName = `[removed] ${r.patientName}`;
      r.updatedAt = stamp;
    }
  }
  // flush:auto-unlink
  rows.splice(rows.length, 0);
}
