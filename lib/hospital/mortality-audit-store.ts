// Morbidity & Mortality (M&M) Audit. Tenant-scoped.
// Each review is an analysis of a death or adverse outcome.
// Detach-only cascade for patient reference.

import { bindPersistentArray } from "../persistent-array";

export type AuditType = "mortality" | "morbidity" | "sentinel_event" | "near_miss" | "readmission" | "return_to_ot" | "unexpected_icu" | "perinatal" | "maternal" | "other";
export type AuditStatus = "draft" | "under_review" | "committee_review" | "closed" | "reopened";
export type Preventability = "not_preventable" | "possibly_preventable" | "probably_preventable" | "definitely_preventable" | "unknown";
export type CareQuality = "appropriate" | "suboptimal_no_harm" | "suboptimal_harm" | "unknown";
export type RCAStatus = "not_started" | "in_progress" | "complete" | "not_applicable";

export interface ActionItem {
  id: string;
  action: string;                         // CAPA
  owner: string;
  targetDate?: string;
  status: "open" | "in_progress" | "completed" | "cancelled";
  completedAt?: string;
  evidence?: string;
}

export interface MortalityAudit {
  id: string;                             // MMA-{suffix}-{seq}
  organizationId: string;
  auditType: AuditType;
  status: AuditStatus;

  // Subject
  patientId: string;                      // may be detached
  patientName: string;
  patientAge?: number;
  patientGender?: "male" | "female" | "other" | "unspecified";
  admissionId?: string;
  admissionDate?: string;
  eventDate: string;                      // death / adverse event date
  department: string;                     // primary service
  attendingConsultant: string;
  diagnosisFinal: string;
  icd10Codes?: string;                    // comma separated
  procedurePerformed?: string;
  causeOfDeath?: string;                  // ICD-mortality if applicable
  autopsyPerformed?: boolean;
  autopsyFindings?: string;

  // Committee review
  reviewedAt?: string;
  reviewedBy?: string;
  committeeMeetingDate?: string;
  chairperson?: string;
  attendees?: string;                     // free-form comma separated
  preventability?: Preventability;
  careQuality?: CareQuality;
  contributingFactors?: string;           // themes: diagnostic delay, communication failure, etc.
  systemIssuesIdentified?: string;
  clinicalIssuesIdentified?: string;
  commendations?: string;                 // positive aspects of care
  lessonsLearned?: string;
  literatureReviewed?: string;
  rcaStatus: RCAStatus;
  rcaSummary?: string;

  // Actions
  actions: ActionItem[];

  // Reporting
  reportableToRegulator?: boolean;
  regulatorReportRef?: string;
  reportedToRegulatorAt?: string;
  familyDebriefed?: boolean;
  familyDebriefDate?: string;

  closedAt?: string;
  closureRemarks?: string;
  confidential: boolean;                  // typical M&M is privileged
  createdAt: string;
  updatedAt: string;
}

const audits: MortalityAudit[] = [];
const hA = bindPersistentArray<MortalityAudit>("mortality-audits", audits, () => []);
await hA;

export const AUDIT_TYPE_LABEL: Record<AuditType, string> = {
  mortality: "Mortality", morbidity: "Morbidity", sentinel_event: "Sentinel event",
  near_miss: "Near miss", readmission: "Unplanned readmission", return_to_ot: "Return to OT",
  unexpected_icu: "Unexpected ICU escalation", perinatal: "Perinatal", maternal: "Maternal", other: "Other",
};
export const STATUS_LABEL: Record<AuditStatus, string> = {
  draft: "Draft", under_review: "Under review", committee_review: "Committee review",
  closed: "Closed", reopened: "Reopened",
};
export const PREVENTABILITY_LABEL: Record<Preventability, string> = {
  not_preventable: "Not preventable", possibly_preventable: "Possibly preventable",
  probably_preventable: "Probably preventable", definitely_preventable: "Definitely preventable",
  unknown: "Unknown",
};
export const CARE_QUALITY_LABEL: Record<CareQuality, string> = {
  appropriate: "Appropriate", suboptimal_no_harm: "Suboptimal (no harm)",
  suboptimal_harm: "Suboptimal (harm)", unknown: "Unknown",
};
export const RCA_STATUS_LABEL: Record<RCAStatus, string> = {
  not_started: "Not started", in_progress: "In progress",
  complete: "Complete", not_applicable: "N/A",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(orgId: string) {
  const p = `MMA-${suf(orgId)}-`;
  const m = audits.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

export function listAudits(opts: { organizationId: string; status?: AuditStatus; auditType?: AuditType; department?: string }): MortalityAudit[] {
  return audits.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.auditType ? r.auditType === opts.auditType : true))
    .filter((r) => (opts.department ? r.department === opts.department : true))
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
}
export function getAudit(id: string, orgId: string): MortalityAudit | null {
  return audits.find((r) => r.id === id && r.organizationId === orgId) || null;
}
export function createAudit(orgId: string, input: Partial<MortalityAudit>): { ok: true; record: MortalityAudit } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || !input.eventDate || !input.department || !input.attendingConsultant || !input.diagnosisFinal) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: MortalityAudit = {
    id: nextId(orgId), organizationId: orgId,
    auditType: (input.auditType || "mortality") as AuditType,
    status: (input.status || "draft") as AuditStatus,
    patientId: input.patientId, patientName: input.patientName,
    patientAge: input.patientAge, patientGender: input.patientGender,
    admissionId: input.admissionId, admissionDate: input.admissionDate,
    eventDate: input.eventDate,
    department: input.department,
    attendingConsultant: input.attendingConsultant,
    diagnosisFinal: input.diagnosisFinal,
    icd10Codes: input.icd10Codes,
    procedurePerformed: input.procedurePerformed,
    causeOfDeath: input.causeOfDeath,
    autopsyPerformed: input.autopsyPerformed ?? false,
    autopsyFindings: input.autopsyFindings,
    reviewedAt: input.reviewedAt, reviewedBy: input.reviewedBy,
    committeeMeetingDate: input.committeeMeetingDate,
    chairperson: input.chairperson,
    attendees: input.attendees,
    preventability: input.preventability,
    careQuality: input.careQuality,
    contributingFactors: input.contributingFactors,
    systemIssuesIdentified: input.systemIssuesIdentified,
    clinicalIssuesIdentified: input.clinicalIssuesIdentified,
    commendations: input.commendations,
    lessonsLearned: input.lessonsLearned,
    literatureReviewed: input.literatureReviewed,
    rcaStatus: (input.rcaStatus || "not_started") as RCAStatus,
    rcaSummary: input.rcaSummary,
    actions: input.actions || [],
    reportableToRegulator: input.reportableToRegulator ?? false,
    regulatorReportRef: input.regulatorReportRef,
    reportedToRegulatorAt: input.reportedToRegulatorAt,
    familyDebriefed: input.familyDebriefed ?? false,
    familyDebriefDate: input.familyDebriefDate,
    closedAt: input.closedAt,
    closureRemarks: input.closureRemarks,
    confidential: input.confidential ?? true,
    createdAt: now, updatedAt: now,
  };
  audits.push(r);
  return { ok: true, record: r };
}
export function updateAudit(id: string, orgId: string, patch: Partial<MortalityAudit>): MortalityAudit | null {
  const i = audits.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = audits[i];
  const now = new Date().toISOString();
  const next: MortalityAudit = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.status === "closed" && prev.status !== "closed" && !next.closedAt) next.closedAt = now;
  audits[i] = next;
  return next;
}
export function deleteAudit(id: string, orgId: string): boolean {
  const i = audits.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  audits.splice(i, 1);
  return true;
}

export function computeStats(orgId: string) {
  const my = audits.filter((r) => r.organizationId === orgId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const ytdStart = new Date(now.getFullYear(), 0, 1).toISOString();
  const mortalityMonth = my.filter((r) => r.auditType === "mortality" && r.eventDate >= monthStart).length;
  const sentinelYtd = my.filter((r) => r.auditType === "sentinel_event" && r.eventDate >= ytdStart).length;
  const preventableYtd = my.filter((r) => r.eventDate >= ytdStart && (r.preventability === "probably_preventable" || r.preventability === "definitely_preventable")).length;
  const openActions = my.reduce((s, r) => s + r.actions.filter((a) => a.status === "open" || a.status === "in_progress").length, 0);
  const pendingReview = my.filter((r) => r.status === "draft" || r.status === "under_review").length;
  const awaitingCommittee = my.filter((r) => r.status === "committee_review").length;
  const closedMonth = my.filter((r) => r.status === "closed" && (r.closedAt || "") >= monthStart).length;
  return {
    totalAudits: my.length,
    mortalityMonth, sentinelYtd, preventableYtd,
    openActions, pendingReview, awaitingCommittee, closedMonth,
  };
}

export function unlinkAuditForPatient(patientId: string, orgId: string): void {
  const stamp = new Date().toISOString();
  for (const r of audits) {
    if (r.organizationId === orgId && r.patientId === patientId) {
      r.patientId = "";
      r.patientName = `[removed] ${r.patientName}`;
      r.updatedAt = stamp;
    }
  }
  // flush:auto-unlink
  audits.splice(audits.length, 0);
}
