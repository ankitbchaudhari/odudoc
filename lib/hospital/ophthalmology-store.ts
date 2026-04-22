// Ophthalmology. Tenant-scoped. Single OphthExam entity with per-eye metrics.
// Detach-only cascade.

import { bindPersistentArray } from "../persistent-array";

export type ExamType = "routine" | "refraction" | "pre_op" | "post_op" | "emergency" | "follow_up" | "screening";
export type ExamStatus = "scheduled" | "in_progress" | "completed" | "referred" | "cancelled";
export type LensType = "none" | "glasses" | "rgp" | "soft_cl" | "toric_cl" | "iol_pseudo" | "aphakic";

export interface EyeMetrics {
  uncorrectedVa?: string;            // 6/6, 20/20, CF, HM, LP, PL
  bcva?: string;                     // best-corrected
  pinhole?: string;
  sphere?: number;                   // dioptres, +/-
  cylinder?: number;
  axis?: number;                     // 0-180
  add?: number;
  iopMmhg?: number;                  // intraocular pressure
  anteriorSegment?: string;
  lens?: string;                     // NS grade, PSC, cataract
  fundus?: string;
  cupDiscRatio?: string;             // e.g. "0.4"
  macula?: string;
  peripheralRetina?: string;
}

export interface OphthExam {
  id: string;                        // OPH-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  providerName: string;
  examDate: string;
  examType: ExamType;
  status: ExamStatus;
  chiefComplaint?: string;
  historyNote?: string;
  currentLens?: LensType;
  od: EyeMetrics;                    // right eye
  os: EyeMetrics;                    // left eye
  colorVision?: string;
  stereopsis?: string;
  motility?: string;                 // EOM
  pupils?: string;                   // PERRLA / RAPD etc
  confrontationFields?: string;
  impression?: string;               // diagnosis
  plan?: string;
  prescription?: string;             // final spectacle Rx
  referralTo?: string;
  nextReviewDate?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

const rows: OphthExam[] = [];
const hydrate = bindPersistentArray<OphthExam>("ophth-exams", rows, () => []);
await hydrate;

export const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  routine: "Routine", refraction: "Refraction", pre_op: "Pre-op",
  post_op: "Post-op", emergency: "Emergency", follow_up: "Follow-up", screening: "Screening",
};
export const STATUS_LABEL: Record<ExamStatus, string> = {
  scheduled: "Scheduled", in_progress: "In progress", completed: "Completed",
  referred: "Referred", cancelled: "Cancelled",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(o: string) {
  const p = `OPH-${suf(o)}-`;
  const m = rows.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

export function listExams(opts: { organizationId: string; status?: ExamStatus; examType?: ExamType; patientId?: string }): OphthExam[] {
  return rows.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.examType ? r.examType === opts.examType : true))
    .filter((r) => (opts.patientId ? r.patientId === opts.patientId : true))
    .sort((a, b) => b.examDate.localeCompare(a.examDate));
}

export function createExam(orgId: string, input: Partial<OphthExam>): { ok: true; exam: OphthExam } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || !input.providerName) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: OphthExam = {
    id: nextId(orgId), organizationId: orgId,
    patientId: input.patientId, patientName: input.patientName,
    providerName: input.providerName,
    examDate: input.examDate || now,
    examType: (input.examType || "routine") as ExamType,
    status: "scheduled",
    chiefComplaint: input.chiefComplaint,
    currentLens: input.currentLens,
    od: input.od || {},
    os: input.os || {},
    createdAt: now, updatedAt: now,
  };
  rows.push(r);
  return { ok: true, exam: r };
}

export function updateExam(id: string, orgId: string, patch: Partial<OphthExam>): OphthExam | null {
  const i = rows.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = rows[i];
  const now = new Date().toISOString();
  const next: OphthExam = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
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
  const scheduledToday = my.filter((r) => r.status === "scheduled" && r.examDate >= todayStart && r.examDate < todayEnd).length;
  const inProgress = my.filter((r) => r.status === "in_progress").length;
  const completedMonth = my.filter((r) => r.status === "completed" && (r.completedAt || "") >= monthStart).length;
  const referralsMonth = my.filter((r) => r.status === "referred" && r.updatedAt >= monthStart).length;
  // IOP red flags ≥22 mmHg
  const highIopAlerts = my.filter((r) => (r.status === "completed") && ((r.od.iopMmhg || 0) >= 22 || (r.os.iopMmhg || 0) >= 22)).length;
  // Suspicious CDR ≥0.6
  const suspiciousCdr = my.filter((r) => {
    const odCdr = parseFloat(r.od.cupDiscRatio || "0");
    const osCdr = parseFloat(r.os.cupDiscRatio || "0");
    return r.status === "completed" && (odCdr >= 0.6 || osCdr >= 0.6);
  }).length;
  const refractionMonth = my.filter((r) => r.examType === "refraction" && (r.completedAt || "") >= monthStart).length;
  return { scheduledToday, inProgress, completedMonth, referralsMonth, highIopAlerts, suspiciousCdr, refractionMonth };
}

export function unlinkOphthForPatient(patientId: string, orgId: string): void {
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
