// CTMS: Clinical Trial Management. Trials + Enrollments. Tenant-scoped.
import { bindPersistentArray } from "../persistent-array";

export type TrialPhase = "preclinical" | "phase1" | "phase2" | "phase3" | "phase4" | "observational" | "registry";
export type TrialStatus = "planning" | "submitted" | "approved" | "enrolling" | "active" | "paused" | "closed" | "terminated" | "completed";
export type EnrollmentStatus = "screening" | "enrolled" | "active" | "withdrawn" | "completed" | "screen_failed" | "lost_to_followup";
export type Sponsor = "industry" | "academic" | "government" | "investigator" | "cooperative";

export interface Trial {
  id: string; organizationId: string;
  kind: "trial";
  protocolNumber: string;
  title: string;
  shortTitle?: string;
  phase: TrialPhase;
  status: TrialStatus;
  sponsorType: Sponsor;
  sponsorName?: string;
  principalInvestigator: string;
  coordinator?: string;
  therapeuticArea?: string;
  indication?: string;
  targetEnrollment: number;
  currentEnrollment: number;
  irbNumber?: string;
  irbApprovalDate?: string;
  irbExpiryDate?: string;
  startDate?: string;
  endDate?: string;
  enrollmentOpenDate?: string;
  enrollmentCloseDate?: string;
  budgetTotal?: number;
  budgetSpent?: number;
  ctgovId?: string;
  euCtrNumber?: string;
  monitoringFrequency?: string;
  lastMonitoringVisit?: string;
  nextMonitoringVisit?: string;
  notes?: string;
  createdAt: string; updatedAt: string;
}

export interface TrialEnrollment {
  id: string; organizationId: string;
  kind: "enrollment";
  trialId: string;
  trialProtocol: string;
  subjectNumber: string;
  patientId?: string;
  patientName?: string;
  status: EnrollmentStatus;
  arm?: string;
  screeningDate?: string;
  consentDate?: string;
  enrollmentDate?: string;
  randomizationDate?: string;
  randomizationCode?: string;
  firstDoseDate?: string;
  lastDoseDate?: string;
  completionDate?: string;
  withdrawalDate?: string;
  withdrawalReason?: string;
  saeReported: boolean;
  saeCount: number;
  lastVisitDate?: string;
  nextVisitDate?: string;
  deviationCount: number;
  notes?: string;
  createdAt: string; updatedAt: string;
}

const records: (Trial | TrialEnrollment)[] = [];
const h = bindPersistentArray<Trial | TrialEnrollment>("ctms", records, () => []);
await h;

export const PHASE_LABEL: Record<TrialPhase, string> = { preclinical: "Preclinical", phase1: "Phase I", phase2: "Phase II", phase3: "Phase III", phase4: "Phase IV", observational: "Observational", registry: "Registry" };
export const TRIAL_STATUS_LABEL: Record<TrialStatus, string> = { planning: "Planning", submitted: "IRB Submitted", approved: "IRB Approved", enrolling: "Enrolling", active: "Active", paused: "Paused", closed: "Closed", terminated: "Terminated", completed: "Completed" };
export const ENROLL_STATUS_LABEL: Record<EnrollmentStatus, string> = { screening: "Screening", enrolled: "Enrolled", active: "Active", withdrawn: "Withdrawn", completed: "Completed", screen_failed: "Screen-failed", lost_to_followup: "Lost to F/U" };
export const SPONSOR_LABEL: Record<Sponsor, string> = { industry: "Industry", academic: "Academic", government: "Government", investigator: "Investigator", cooperative: "Cooperative" };

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(kind: "trial" | "enrollment", orgId: string) {
  const prefix = kind === "trial" ? "TRL" : "ENR";
  const p = `${prefix}-${suf(orgId)}-`;
  const m = records.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

function isTrial(r: Trial | TrialEnrollment): r is Trial { return r.kind === "trial"; }
function isEnrollment(r: Trial | TrialEnrollment): r is TrialEnrollment { return r.kind === "enrollment"; }

function recomputeTrialEnrollment(trialId: string, orgId: string) {
  const t = records.find((r) => r.id === trialId && r.organizationId === orgId && isTrial(r)) as Trial | undefined;
  if (!t) return;
  t.currentEnrollment = records.filter((r) => isEnrollment(r) && r.trialId === trialId && r.organizationId === orgId && (r.status === "enrolled" || r.status === "active")).length;
  t.updatedAt = new Date().toISOString();
}

export function listTrials(orgId: string): Trial[] {
  return records.filter((r): r is Trial => isTrial(r) && r.organizationId === orgId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function listEnrollments(opts: { organizationId: string; trialId?: string; patientId?: string; status?: EnrollmentStatus }): TrialEnrollment[] {
  return records.filter((r): r is TrialEnrollment => isEnrollment(r) && r.organizationId === opts.organizationId)
    .filter((r) => (opts.trialId ? r.trialId === opts.trialId : true))
    .filter((r) => (opts.patientId ? r.patientId === opts.patientId : true))
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createTrial(orgId: string, input: Partial<Trial>): { ok: true; record: Trial } | { ok: false; error: string } {
  if (!input.protocolNumber || !input.title || !input.principalInvestigator) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: Trial = {
    id: nextId("trial", orgId), organizationId: orgId, kind: "trial",
    protocolNumber: input.protocolNumber, title: input.title, shortTitle: input.shortTitle,
    phase: (input.phase || "phase2") as TrialPhase,
    status: (input.status || "planning") as TrialStatus,
    sponsorType: (input.sponsorType || "industry") as Sponsor,
    sponsorName: input.sponsorName, principalInvestigator: input.principalInvestigator, coordinator: input.coordinator,
    therapeuticArea: input.therapeuticArea, indication: input.indication,
    targetEnrollment: input.targetEnrollment ?? 0, currentEnrollment: 0,
    irbNumber: input.irbNumber, irbApprovalDate: input.irbApprovalDate, irbExpiryDate: input.irbExpiryDate,
    startDate: input.startDate, endDate: input.endDate,
    enrollmentOpenDate: input.enrollmentOpenDate, enrollmentCloseDate: input.enrollmentCloseDate,
    budgetTotal: input.budgetTotal, budgetSpent: input.budgetSpent ?? 0,
    ctgovId: input.ctgovId, euCtrNumber: input.euCtrNumber,
    monitoringFrequency: input.monitoringFrequency, lastMonitoringVisit: input.lastMonitoringVisit, nextMonitoringVisit: input.nextMonitoringVisit,
    notes: input.notes, createdAt: now, updatedAt: now,
  };
  records.push(r); return { ok: true, record: r };
}

export function updateTrial(id: string, orgId: string, patch: Partial<Trial>): Trial | null {
  const i = records.findIndex((r) => r.id === id && r.organizationId === orgId && isTrial(r));
  if (i < 0) return null;
  const cur = records[i] as Trial;
  const next: Trial = { ...cur, ...patch, id: cur.id, organizationId: cur.organizationId, kind: "trial", currentEnrollment: cur.currentEnrollment, updatedAt: new Date().toISOString() };
  records[i] = next; return next;
}

export function deleteTrial(id: string, orgId: string): boolean {
  const i = records.findIndex((r) => r.id === id && r.organizationId === orgId && isTrial(r));
  if (i < 0) return false;
  records.splice(i, 1);
  for (let j = records.length - 1; j >= 0; j--) { const e = records[j]; if (isEnrollment(e) && e.trialId === id && e.organizationId === orgId) records.splice(j, 1); }
  return true;
}

export function createEnrollment(orgId: string, input: Partial<TrialEnrollment>): { ok: true; record: TrialEnrollment } | { ok: false; error: string } {
  if (!input.trialId || !input.subjectNumber) return { ok: false, error: "missing_required" };
  const trial = records.find((r) => r.id === input.trialId && r.organizationId === orgId && isTrial(r)) as Trial | undefined;
  if (!trial) return { ok: false, error: "trial_not_found" };
  const now = new Date().toISOString();
  const r: TrialEnrollment = {
    id: nextId("enrollment", orgId), organizationId: orgId, kind: "enrollment",
    trialId: input.trialId, trialProtocol: trial.protocolNumber,
    subjectNumber: input.subjectNumber,
    patientId: input.patientId, patientName: input.patientName,
    status: (input.status || "screening") as EnrollmentStatus,
    arm: input.arm,
    screeningDate: input.screeningDate, consentDate: input.consentDate,
    enrollmentDate: input.enrollmentDate, randomizationDate: input.randomizationDate, randomizationCode: input.randomizationCode,
    firstDoseDate: input.firstDoseDate, lastDoseDate: input.lastDoseDate,
    completionDate: input.completionDate, withdrawalDate: input.withdrawalDate, withdrawalReason: input.withdrawalReason,
    saeReported: input.saeReported ?? false, saeCount: input.saeCount ?? 0,
    lastVisitDate: input.lastVisitDate, nextVisitDate: input.nextVisitDate,
    deviationCount: input.deviationCount ?? 0,
    notes: input.notes, createdAt: now, updatedAt: now,
  };
  records.push(r);
  recomputeTrialEnrollment(r.trialId, orgId);
  return { ok: true, record: r };
}

export function updateEnrollment(id: string, orgId: string, patch: Partial<TrialEnrollment>): TrialEnrollment | null {
  const i = records.findIndex((r) => r.id === id && r.organizationId === orgId && isEnrollment(r));
  if (i < 0) return null;
  const cur = records[i] as TrialEnrollment;
  const next: TrialEnrollment = { ...cur, ...patch, id: cur.id, organizationId: cur.organizationId, kind: "enrollment", trialId: cur.trialId, trialProtocol: cur.trialProtocol, updatedAt: new Date().toISOString() };
  records[i] = next;
  recomputeTrialEnrollment(next.trialId, orgId);
  return next;
}

export function deleteEnrollment(id: string, orgId: string): boolean {
  const i = records.findIndex((r) => r.id === id && r.organizationId === orgId && isEnrollment(r));
  if (i < 0) return false;
  const e = records[i] as TrialEnrollment;
  records.splice(i, 1);
  recomputeTrialEnrollment(e.trialId, orgId);
  return true;
}

export function computeStats(orgId: string) {
  const trials = records.filter((r): r is Trial => isTrial(r) && r.organizationId === orgId);
  const enrolls = records.filter((r): r is TrialEnrollment => isEnrollment(r) && r.organizationId === orgId);
  return {
    totalTrials: trials.length,
    activeTrials: trials.filter((t) => t.status === "active" || t.status === "enrolling").length,
    enrolling: trials.filter((t) => t.status === "enrolling").length,
    totalEnrollments: enrolls.length,
    activeSubjects: enrolls.filter((e) => e.status === "enrolled" || e.status === "active").length,
    saeCount: enrolls.reduce((s, e) => s + (e.saeCount || 0), 0),
  };
}

export function unlinkCtmsForPatient(patientId: string, orgId: string): void {
  const stamp = new Date().toISOString();
  for (const r of records) {
    if (isEnrollment(r) && r.organizationId === orgId && r.patientId === patientId) {
      r.patientId = "";
      r.patientName = `[removed] ${r.patientName || ""}`.trim();
      r.updatedAt = stamp;
    }
  }
  // flush:auto-unlink
  records.splice(records.length, 0);
}
