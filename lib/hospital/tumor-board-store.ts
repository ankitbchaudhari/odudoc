// Tumor Board / Multidisciplinary Team (MDT) meetings. Tenant-scoped.
// TumorBoardMeeting (event) + TumorBoardCase (per-patient case presented).
// Detach-only patient cascade.

import { bindPersistentArray } from "../persistent-array";

export type CancerSite = "breast" | "lung" | "colorectal" | "gastric" | "prostate" | "head_neck" | "gynae" | "hepatobiliary" | "pancreas" | "lymphoma" | "leukemia" | "sarcoma" | "cns" | "skin" | "renal" | "bladder" | "thyroid" | "other";
export type CaseIntent = "curative" | "palliative" | "adjuvant" | "neoadjuvant" | "salvage" | "supportive";
export type TreatmentModality = "surgery" | "chemotherapy" | "radiotherapy" | "immunotherapy" | "targeted" | "hormonal" | "transplant" | "best_supportive_care" | "watch_wait" | "referral_out";
export type MeetingStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type CaseStatus = "new" | "follow_up" | "discussed" | "deferred" | "closed";
export type PerformanceStatus = 0 | 1 | 2 | 3 | 4 | 5;   // ECOG

export interface Attendee {
  id: string;
  name: string;
  specialty: string;           // "Medical oncology", "Radiation oncology", "Surgical onc", "Pathology", "Radiology"
  role?: "chair" | "member" | "presenter" | "observer";
}

export interface TumorBoardMeeting {
  id: string;                  // TBM-{suffix}-{seq}
  organizationId: string;
  title: string;               // "Breast MDT - Jan 15"
  meetingDate: string;
  startTime?: string;
  endTime?: string;
  venue?: string;               // "Cancer centre conference room"
  virtualLink?: string;
  boardType: CancerSite;        // primary focus of the MDT
  chair: string;
  status: MeetingStatus;
  attendees: Attendee[];
  minutesUrl?: string;
  agendaNotes?: string;
  quorumMet?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TumorBoardCase {
  id: string;                   // TBC-{suffix}-{seq}
  organizationId: string;
  meetingId?: string;           // which meeting presented
  meetingTitle?: string;        // denorm
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientGender?: "male" | "female" | "other" | "unspecified";
  primarySite: CancerSite;
  histology?: string;           // "Invasive ductal carcinoma"
  stageTnm?: string;            // "cT2N1M0"
  grade?: string;               // "G2"
  biomarkers?: string;          // ER+/PR+/HER2-, EGFR mutant, BRAF V600E etc.
  ecog?: PerformanceStatus;
  priorTreatment?: string;
  presentingConcern: string;    // reason for MDT discussion
  imagingSummary?: string;
  pathologySummary?: string;
  labSummary?: string;
  intent?: CaseIntent;
  presentedBy: string;          // consultant name
  discussion?: string;
  recommendation?: string;      // MDT recommendation
  plannedModalities: TreatmentModality[];
  nextStep?: string;
  nextReviewDate?: string;
  caseStatus: CaseStatus;
  trialEligibility?: string;    // clinical trial match notes
  secondOpinionRequested?: boolean;
  patientInformedAt?: string;
  consentObtained?: boolean;
  createdAt: string;
  updatedAt: string;
}

const meetings: TumorBoardMeeting[] = [];
const cases: TumorBoardCase[] = [];
const hM = bindPersistentArray<TumorBoardMeeting>("tumor-board-meetings", meetings, () => []);
const hC = bindPersistentArray<TumorBoardCase>("tumor-board-cases", cases, () => []);
await hM; await hC;

export const SITE_LABEL: Record<CancerSite, string> = {
  breast: "Breast", lung: "Lung", colorectal: "Colorectal", gastric: "Gastric",
  prostate: "Prostate", head_neck: "Head & neck", gynae: "Gynae",
  hepatobiliary: "Hepatobiliary", pancreas: "Pancreas", lymphoma: "Lymphoma",
  leukemia: "Leukemia", sarcoma: "Sarcoma", cns: "CNS", skin: "Skin",
  renal: "Renal", bladder: "Bladder", thyroid: "Thyroid", other: "Other",
};
export const INTENT_LABEL: Record<CaseIntent, string> = {
  curative: "Curative", palliative: "Palliative", adjuvant: "Adjuvant",
  neoadjuvant: "Neoadjuvant", salvage: "Salvage", supportive: "Supportive",
};
export const MODALITY_LABEL: Record<TreatmentModality, string> = {
  surgery: "Surgery", chemotherapy: "Chemotherapy", radiotherapy: "Radiotherapy",
  immunotherapy: "Immunotherapy", targeted: "Targeted", hormonal: "Hormonal",
  transplant: "Transplant", best_supportive_care: "BSC",
  watch_wait: "Watch & wait", referral_out: "Referral out",
};
export const MEETING_STATUS_LABEL: Record<MeetingStatus, string> = {
  scheduled: "Scheduled", in_progress: "In progress",
  completed: "Completed", cancelled: "Cancelled",
};
export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  new: "New", follow_up: "Follow-up", discussed: "Discussed",
  deferred: "Deferred", closed: "Closed",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(prefix: string, list: { id: string }[], orgId: string) {
  const p = `${prefix}-${suf(orgId)}-`;
  const m = list.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

// Meetings
export function listMeetings(opts: { organizationId: string; status?: MeetingStatus; boardType?: CancerSite }): TumorBoardMeeting[] {
  return meetings.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.boardType ? r.boardType === opts.boardType : true))
    .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
}
export function createMeeting(orgId: string, input: Partial<TumorBoardMeeting>): { ok: true; record: TumorBoardMeeting } | { ok: false; error: string } {
  if (!input.title || !input.meetingDate || !input.chair) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: TumorBoardMeeting = {
    id: nextId("TBM", meetings, orgId), organizationId: orgId,
    title: input.title,
    meetingDate: input.meetingDate,
    startTime: input.startTime, endTime: input.endTime,
    venue: input.venue, virtualLink: input.virtualLink,
    boardType: (input.boardType || "other") as CancerSite,
    chair: input.chair,
    status: (input.status || "scheduled") as MeetingStatus,
    attendees: input.attendees || [],
    minutesUrl: input.minutesUrl,
    agendaNotes: input.agendaNotes,
    quorumMet: input.quorumMet,
    createdAt: now, updatedAt: now,
  };
  meetings.push(r);
  return { ok: true, record: r };
}
export function updateMeeting(id: string, orgId: string, patch: Partial<TumorBoardMeeting>): TumorBoardMeeting | null {
  const i = meetings.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  meetings.splice(i, 1, { ...meetings[i], ...patch, id: meetings[i].id, organizationId: meetings[i].organizationId, updatedAt: new Date().toISOString() });
  // Re-denorm title on cases when title/date changes
  if (patch.title) for (const c of cases) if (c.meetingId === id && c.organizationId === orgId) c.meetingTitle = patch.title;
  return meetings[i];
}
export function deleteMeeting(id: string, orgId: string): boolean {
  const i = meetings.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  meetings.splice(i, 1);
  // Detach cases from this meeting
  for (const c of cases) if (c.meetingId === id && c.organizationId === orgId) { c.meetingId = undefined; c.meetingTitle = undefined; }
  return true;
}

// Cases
export function listCases(opts: { organizationId: string; meetingId?: string; caseStatus?: CaseStatus; primarySite?: CancerSite; patientId?: string }): TumorBoardCase[] {
  return cases.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.meetingId ? r.meetingId === opts.meetingId : true))
    .filter((r) => (opts.caseStatus ? r.caseStatus === opts.caseStatus : true))
    .filter((r) => (opts.primarySite ? r.primarySite === opts.primarySite : true))
    .filter((r) => (opts.patientId ? r.patientId === opts.patientId : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function createCase(orgId: string, input: Partial<TumorBoardCase>): { ok: true; record: TumorBoardCase } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || !input.presentingConcern || !input.presentedBy) return { ok: false, error: "missing_required" };
  const meeting = input.meetingId ? meetings.find((m) => m.id === input.meetingId && m.organizationId === orgId) : undefined;
  const now = new Date().toISOString();
  const r: TumorBoardCase = {
    id: nextId("TBC", cases, orgId), organizationId: orgId,
    meetingId: meeting?.id,
    meetingTitle: meeting?.title,
    patientId: input.patientId, patientName: input.patientName,
    patientAge: input.patientAge, patientGender: input.patientGender,
    primarySite: (input.primarySite || "other") as CancerSite,
    histology: input.histology, stageTnm: input.stageTnm, grade: input.grade,
    biomarkers: input.biomarkers, ecog: input.ecog,
    priorTreatment: input.priorTreatment,
    presentingConcern: input.presentingConcern,
    imagingSummary: input.imagingSummary,
    pathologySummary: input.pathologySummary,
    labSummary: input.labSummary,
    intent: input.intent,
    presentedBy: input.presentedBy,
    discussion: input.discussion,
    recommendation: input.recommendation,
    plannedModalities: input.plannedModalities || [],
    nextStep: input.nextStep, nextReviewDate: input.nextReviewDate,
    caseStatus: (input.caseStatus || "new") as CaseStatus,
    trialEligibility: input.trialEligibility,
    secondOpinionRequested: input.secondOpinionRequested ?? false,
    patientInformedAt: input.patientInformedAt,
    consentObtained: input.consentObtained ?? false,
    createdAt: now, updatedAt: now,
  };
  cases.push(r);
  return { ok: true, record: r };
}
export function updateCase(id: string, orgId: string, patch: Partial<TumorBoardCase>): TumorBoardCase | null {
  const i = cases.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = cases[i];
  const now = new Date().toISOString();
  const next: TumorBoardCase = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (patch.meetingId) {
    const m = meetings.find((x) => x.id === patch.meetingId && x.organizationId === orgId);
    next.meetingTitle = m?.title;
  }
  cases[i] = next;
  return next;
}
export function deleteCase(id: string, orgId: string): boolean {
  const i = cases.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  cases.splice(i, 1);
  return true;
}

export function computeStats(orgId: string) {
  const myM = meetings.filter((r) => r.organizationId === orgId);
  const myC = cases.filter((r) => r.organizationId === orgId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const upcoming = myM.filter((m) => m.status === "scheduled" && m.meetingDate >= now.toISOString().slice(0, 10)).length;
  const completedMonth = myM.filter((m) => m.status === "completed" && m.meetingDate >= monthStart.slice(0, 10)).length;
  const newCases = myC.filter((c) => c.caseStatus === "new").length;
  const deferred = myC.filter((c) => c.caseStatus === "deferred").length;
  const casesDiscussedMonth = myC.filter((c) => c.caseStatus === "discussed" && c.updatedAt >= monthStart).length;
  const siteCounts: Record<string, number> = {};
  for (const c of myC.filter((x) => x.updatedAt >= monthStart)) siteCounts[c.primarySite] = (siteCounts[c.primarySite] || 0) + 1;
  const trialReferralsMonth = myC.filter((c) => c.trialEligibility && c.updatedAt >= monthStart).length;
  return {
    upcomingMeetings: upcoming,
    completedMeetingsMonth: completedMonth,
    newCases, deferred,
    casesDiscussedMonth,
    siteCounts,
    trialReferralsMonth,
  };
}

export function unlinkTumorBoardForPatient(patientId: string, orgId: string): void {
  const stamp = new Date().toISOString();
  for (const c of cases) {
    if (c.organizationId === orgId && c.patientId === patientId) {
      c.patientId = "";
      c.patientName = `[removed] ${c.patientName}`;
      if (c.caseStatus !== "closed") c.caseStatus = "closed";
      c.updatedAt = stamp;
    }
  }
  // flush:auto-unlink
  cases.splice(cases.length, 0);
}
