// Cardiology — ECG, Echo, TMT/stress, Holter. Tenant-scoped.
// Single-entity CardiologyStudy with report. Lifecycle: requested -> in_progress -> reported -> amended / cancelled.
// On patient delete: detach-only (diagnostic report is legal record).

import { bindPersistentArray } from "../persistent-array";

export type StudyType =
  | "ecg_12lead" | "echo_tte" | "echo_tee" | "stress_tmt" | "stress_echo"
  | "holter_24h" | "holter_48h" | "event_monitor" | "abpm" | "tilt_table" | "cpet" | "other";

export type StudyStatus = "requested" | "in_progress" | "reported" | "amended" | "cancelled";
export type Rhythm = "sinus" | "sinus_brady" | "sinus_tachy" | "afib" | "aflutter" | "svt" | "vt" | "vf" | "paced" | "avb_1" | "avb_2" | "avb_3" | "other";
export type Urgency = "routine" | "urgent" | "stat";

export interface CardiologyStudy {
  id: string;                         // CARD-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  studyType: StudyType;
  indication: string;
  urgency: Urgency;
  requestedBy?: string;
  performedBy?: string;
  interpretedBy?: string;
  status: StudyStatus;
  requestedAt: string;
  performedAt?: string;
  reportedAt?: string;
  // ECG findings
  heartRate?: number;
  rhythm?: Rhythm;
  prMs?: number;
  qrsMs?: number;
  qtMs?: number;
  qtcMs?: number;
  axis?: string;                      // "-30", "normal", "LAD"
  // Echo findings
  ejectionFraction?: number;          // %
  lvidd?: number;                     // mm
  lvids?: number;
  ivsd?: number;
  lvpwd?: number;
  laDiameter?: number;
  aorticRoot?: number;
  rvsp?: number;                      // mmHg
  // Stress findings
  exerciseMin?: number;
  metsAchieved?: number;
  peakHr?: number;
  peakBp?: string;
  stDepressionMm?: number;
  testResult?: "positive" | "negative" | "equivocal" | "inconclusive";
  // Holter
  totalBeats?: number;
  pvcCount?: number;
  pacCount?: number;
  pausesCount?: number;
  longestPauseSec?: number;
  // Common
  findings?: string;
  conclusion?: string;
  recommendation?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

const studies: CardiologyStudy[] = [];
const hydrate = bindPersistentArray<CardiologyStudy>("cardiology-studies", studies, () => []);
await hydrate;

export const STUDY_LABEL: Record<StudyType, string> = {
  ecg_12lead: "ECG (12-lead)", echo_tte: "Echo (TTE)", echo_tee: "Echo (TEE)",
  stress_tmt: "Stress / TMT", stress_echo: "Stress echo",
  holter_24h: "Holter 24h", holter_48h: "Holter 48h", event_monitor: "Event monitor",
  abpm: "ABPM", tilt_table: "Tilt table", cpet: "CPET", other: "Other",
};
export const RHYTHM_LABEL: Record<Rhythm, string> = {
  sinus: "NSR", sinus_brady: "Sinus brady", sinus_tachy: "Sinus tachy",
  afib: "AFib", aflutter: "AFlutter", svt: "SVT", vt: "VT", vf: "VF",
  paced: "Paced", avb_1: "1° AVB", avb_2: "2° AVB", avb_3: "3° AVB (CHB)", other: "Other",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(o: string) {
  const p = `CARD-${suf(o)}-`;
  const m = studies.filter((s) => s.id.startsWith(p)).reduce((mx, s) => Math.max(mx, Number(s.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

export function listStudies(opts: { organizationId: string; status?: StudyStatus; studyType?: StudyType; patientId?: string; urgency?: Urgency }): CardiologyStudy[] {
  return studies.filter((s) => s.organizationId === opts.organizationId)
    .filter((s) => (opts.status ? s.status === opts.status : true))
    .filter((s) => (opts.studyType ? s.studyType === opts.studyType : true))
    .filter((s) => (opts.patientId ? s.patientId === opts.patientId : true))
    .filter((s) => (opts.urgency ? s.urgency === opts.urgency : true))
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export function createStudy(orgId: string, input: Partial<CardiologyStudy>): { ok: true; study: CardiologyStudy } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || !input.studyType || !input.indication) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const st: CardiologyStudy = {
    id: nextId(orgId), organizationId: orgId,
    patientId: input.patientId, patientName: input.patientName,
    studyType: input.studyType as StudyType, indication: input.indication,
    urgency: (input.urgency || "routine") as Urgency,
    requestedBy: input.requestedBy,
    status: "requested",
    requestedAt: input.requestedAt || now,
    createdAt: now, updatedAt: now,
  };
  studies.push(st);
  return { ok: true, study: st };
}

export function updateStudy(id: string, orgId: string, patch: Partial<CardiologyStudy>): CardiologyStudy | null {
  const i = studies.findIndex((s) => s.id === id && s.organizationId === orgId);
  if (i < 0) return null;
  const prev = studies[i];
  const now = new Date().toISOString();
  const next: CardiologyStudy = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.status === "in_progress" && prev.status !== "in_progress" && !next.performedAt) next.performedAt = now;
  if (next.status === "reported" && prev.status !== "reported" && !next.reportedAt) next.reportedAt = now;
  studies[i] = next;
  return next;
}

export function deleteStudy(id: string, orgId: string): boolean {
  const i = studies.findIndex((s) => s.id === id && s.organizationId === orgId);
  if (i < 0) return false;
  studies.splice(i, 1);
  return true;
}

// Auto-compute QTc (Bazett) if HR + QT provided
export function qtcBazett(qtMs: number, hr: number): number | null {
  if (!qtMs || !hr || hr <= 0) return null;
  const rr = 60 / hr;
  return Math.round(qtMs / Math.sqrt(rr));
}

export function computeStats(orgId: string) {
  const my = studies.filter((s) => s.organizationId === orgId);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const requestedToday = my.filter((s) => s.requestedAt >= todayStart).length;
  const pendingReports = my.filter((s) => s.status === "requested" || s.status === "in_progress").length;
  const statPending = my.filter((s) => s.urgency === "stat" && (s.status === "requested" || s.status === "in_progress")).length;
  const reportedMonth = my.filter((s) => s.status === "reported" && (s.reportedAt || "") >= monthStart).length;
  const amendedMonth = my.filter((s) => s.status === "amended" && (s.reportedAt || "") >= monthStart).length;
  // TAT: avg hours from request->report for last 30 days
  const thirtyAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const tatPool = my.filter((s) => s.status === "reported" && s.reportedAt && s.reportedAt >= thirtyAgo);
  const avgTatHours = tatPool.length > 0 ? Math.round(tatPool.reduce((sum, s) => sum + (new Date(s.reportedAt!).getTime() - new Date(s.requestedAt).getTime()) / 3_600_000, 0) / tatPool.length * 10) / 10 : 0;
  // Abnormal echo: EF<40%
  const abnormalEfMonth = my.filter((s) =>
    (s.studyType === "echo_tte" || s.studyType === "echo_tee" || s.studyType === "stress_echo") &&
    s.status === "reported" && (s.reportedAt || "") >= monthStart &&
    (s.ejectionFraction != null && s.ejectionFraction < 40)
  ).length;
  const positiveStressMonth = my.filter((s) =>
    (s.studyType === "stress_tmt" || s.studyType === "stress_echo") &&
    s.testResult === "positive" && (s.reportedAt || "") >= monthStart
  ).length;
  return {
    requestedToday, pendingReports, statPending, reportedMonth, amendedMonth,
    avgTatHours, abnormalEfMonth, positiveStressMonth,
  };
}

export function unlinkCardiologyForPatient(patientId: string, orgId: string): void {
  for (const s of studies) {
    if (s.organizationId === orgId && s.patientId === patientId) {
      s.patientId = "";
      s.patientName = `[removed] ${s.patientName}`;
      s.updatedAt = new Date().toISOString();
    }
  }
  // flush:auto-unlink
  studies.splice(studies.length, 0);
}
