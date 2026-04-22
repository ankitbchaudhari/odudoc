// Discharge Summaries. Tenant-scoped.
//
// Medico-legal document that closes an inpatient episode. Pulls together
// admission details, diagnoses, procedures, hospital course, condition at
// discharge, medications, and follow-up plan.
//
// Status machine:  draft → finalized → amended
//
// A finalized summary is immutable. An "amendment" creates a new summary
// that supersedes the prior one (tracked via `supersedesId`) — we never
// silently edit a signed clinical document.

import { bindPersistentArray } from "../persistent-array";

export type DischargeDisposition =
  | "home"
  | "home_with_care"
  | "transfer_hospital"
  | "transfer_rehab"
  | "lama" // left against medical advice
  | "absconded"
  | "expired";

export type DischargeStatus = "draft" | "finalized" | "amended";

export interface DischargeMedication {
  drug: string;
  strength?: string;
  dose?: string;
  frequency?: string;
  durationDays?: number;
  notes?: string;
}

export interface DischargeSummary {
  id: string;
  organizationId: string;
  summaryNumber: string; // DS-{suffix}-{seq}
  patientId: string;
  admissionId?: string;
  encounterId?: string;
  admittingDoctor?: string;
  dischargingDoctor?: string;
  admissionDate?: string;
  dischargeDate: string;
  lengthOfStayDays?: number;
  primaryDiagnosis: string;
  secondaryDiagnoses?: string; // free text, one per line
  chiefComplaint?: string;
  historySummary?: string;
  examinationFindings?: string;
  investigationsSummary?: string;
  proceduresPerformed?: string; // free text, one per line
  hospitalCourse?: string; // narrative of the stay
  complications?: string;
  conditionAtDischarge?: string;
  disposition: DischargeDisposition;
  medications: DischargeMedication[];
  dietAdvice?: string;
  activityAdvice?: string;
  followUpPlan?: string; // who to see, when
  followUpDate?: string;
  warningSignsAdvised?: string;
  status: DischargeStatus;
  supersedesId?: string; // points to the prior summary if this is an amendment
  supersededById?: string; // set on the prior summary when amended
  finalizedAt?: string;
  amendedAt?: string;
  amendmentReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const summaries: DischargeSummary[] = [];
const { hydrate, flush } = bindPersistentArray<DischargeSummary>(
  "hospital-discharge-summaries",
  summaries,
  () => []
);
await hydrate();

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}

function nextSummaryNumber(orgId: string): string {
  const n = summaries.filter((s) => s.organizationId === orgId).length + 1;
  return `DS-${orgSuffix(orgId)}-${String(n).padStart(5, "0")}`;
}

function computeLos(admission?: string, discharge?: string): number | undefined {
  if (!admission || !discharge) return undefined;
  const a = new Date(admission).getTime();
  const d = new Date(discharge).getTime();
  if (Number.isNaN(a) || Number.isNaN(d) || d < a) return undefined;
  return Math.max(0, Math.round((d - a) / (1000 * 60 * 60 * 24)));
}

export const DISPOSITION_LABEL: Record<DischargeDisposition, string> = {
  home: "Home",
  home_with_care: "Home with Home Care",
  transfer_hospital: "Transfer — Another Hospital",
  transfer_rehab: "Transfer — Rehab / Step-down",
  lama: "LAMA (Against Medical Advice)",
  absconded: "Absconded",
  expired: "Expired",
};

export function listSummaries(opts: {
  organizationId: string;
  patientId?: string;
  admissionId?: string;
  status?: DischargeStatus;
  disposition?: DischargeDisposition;
}): DischargeSummary[] {
  let list = summaries.filter((s) => s.organizationId === opts.organizationId);
  if (opts.patientId) list = list.filter((s) => s.patientId === opts.patientId);
  if (opts.admissionId)
    list = list.filter((s) => s.admissionId === opts.admissionId);
  if (opts.status) list = list.filter((s) => s.status === opts.status);
  if (opts.disposition)
    list = list.filter((s) => s.disposition === opts.disposition);
  return list.sort(
    (a, b) =>
      new Date(b.dischargeDate).getTime() - new Date(a.dischargeDate).getTime()
  );
}

export interface SummaryInput {
  patientId: string;
  admissionId?: string;
  encounterId?: string;
  admittingDoctor?: string;
  dischargingDoctor?: string;
  admissionDate?: string;
  dischargeDate?: string;
  primaryDiagnosis?: string;
  secondaryDiagnoses?: string;
  chiefComplaint?: string;
  historySummary?: string;
  examinationFindings?: string;
  investigationsSummary?: string;
  proceduresPerformed?: string;
  hospitalCourse?: string;
  complications?: string;
  conditionAtDischarge?: string;
  disposition?: DischargeDisposition;
  medications?: DischargeMedication[];
  dietAdvice?: string;
  activityAdvice?: string;
  followUpPlan?: string;
  followUpDate?: string;
  warningSignsAdvised?: string;
  notes?: string;
  status?: DischargeStatus;
}

function sanitizeMeds(
  meds?: DischargeMedication[]
): DischargeMedication[] {
  if (!meds || !Array.isArray(meds)) return [];
  return meds
    .map((m) => ({
      drug: String(m.drug || "").trim(),
      strength: m.strength?.trim() || undefined,
      dose: m.dose?.trim() || undefined,
      frequency: m.frequency?.trim() || undefined,
      durationDays:
        typeof m.durationDays === "number" && m.durationDays > 0
          ? Math.round(m.durationDays)
          : undefined,
      notes: m.notes?.trim() || undefined,
    }))
    .filter((m) => m.drug.length > 0);
}

export function createSummary(
  organizationId: string,
  input: SummaryInput
): DischargeSummary {
  const now = new Date().toISOString();
  const dischargeDate = input.dischargeDate || now;
  const los = computeLos(input.admissionDate, dischargeDate);
  const s: DischargeSummary = {
    id: `ds-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    summaryNumber: nextSummaryNumber(organizationId),
    patientId: input.patientId,
    admissionId: input.admissionId || undefined,
    encounterId: input.encounterId || undefined,
    admittingDoctor: input.admittingDoctor?.trim() || undefined,
    dischargingDoctor: input.dischargingDoctor?.trim() || undefined,
    admissionDate: input.admissionDate || undefined,
    dischargeDate,
    lengthOfStayDays: los,
    primaryDiagnosis: input.primaryDiagnosis?.trim() || "",
    secondaryDiagnoses: input.secondaryDiagnoses?.trim() || undefined,
    chiefComplaint: input.chiefComplaint?.trim() || undefined,
    historySummary: input.historySummary?.trim() || undefined,
    examinationFindings: input.examinationFindings?.trim() || undefined,
    investigationsSummary: input.investigationsSummary?.trim() || undefined,
    proceduresPerformed: input.proceduresPerformed?.trim() || undefined,
    hospitalCourse: input.hospitalCourse?.trim() || undefined,
    complications: input.complications?.trim() || undefined,
    conditionAtDischarge: input.conditionAtDischarge?.trim() || undefined,
    disposition: input.disposition || "home",
    medications: sanitizeMeds(input.medications),
    dietAdvice: input.dietAdvice?.trim() || undefined,
    activityAdvice: input.activityAdvice?.trim() || undefined,
    followUpPlan: input.followUpPlan?.trim() || undefined,
    followUpDate: input.followUpDate || undefined,
    warningSignsAdvised: input.warningSignsAdvised?.trim() || undefined,
    status: input.status || "draft",
    finalizedAt: input.status === "finalized" ? now : undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  summaries.unshift(s);
  flush();
  return s;
}

export interface SummaryPatch extends SummaryInput {
  amendmentReason?: string;
}

export function updateSummary(
  id: string,
  organizationId: string,
  patch: SummaryPatch
): DischargeSummary | null {
  const s = summaries.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!s) return null;
  const now = new Date().toISOString();
  const locked = s.status === "finalized" || s.status === "amended";

  if (!locked) {
    if (patch.admissionId !== undefined) s.admissionId = patch.admissionId || undefined;
    if (patch.encounterId !== undefined) s.encounterId = patch.encounterId || undefined;
    if (patch.admittingDoctor !== undefined)
      s.admittingDoctor = patch.admittingDoctor?.trim() || undefined;
    if (patch.dischargingDoctor !== undefined)
      s.dischargingDoctor = patch.dischargingDoctor?.trim() || undefined;
    if (patch.admissionDate !== undefined) s.admissionDate = patch.admissionDate || undefined;
    if (patch.dischargeDate !== undefined) s.dischargeDate = patch.dischargeDate || s.dischargeDate;
    s.lengthOfStayDays = computeLos(s.admissionDate, s.dischargeDate);
    if (patch.primaryDiagnosis !== undefined)
      s.primaryDiagnosis = patch.primaryDiagnosis.trim();
    if (patch.secondaryDiagnoses !== undefined)
      s.secondaryDiagnoses = patch.secondaryDiagnoses?.trim() || undefined;
    if (patch.chiefComplaint !== undefined)
      s.chiefComplaint = patch.chiefComplaint?.trim() || undefined;
    if (patch.historySummary !== undefined)
      s.historySummary = patch.historySummary?.trim() || undefined;
    if (patch.examinationFindings !== undefined)
      s.examinationFindings = patch.examinationFindings?.trim() || undefined;
    if (patch.investigationsSummary !== undefined)
      s.investigationsSummary = patch.investigationsSummary?.trim() || undefined;
    if (patch.proceduresPerformed !== undefined)
      s.proceduresPerformed = patch.proceduresPerformed?.trim() || undefined;
    if (patch.hospitalCourse !== undefined)
      s.hospitalCourse = patch.hospitalCourse?.trim() || undefined;
    if (patch.complications !== undefined)
      s.complications = patch.complications?.trim() || undefined;
    if (patch.conditionAtDischarge !== undefined)
      s.conditionAtDischarge = patch.conditionAtDischarge?.trim() || undefined;
    if (patch.disposition !== undefined) s.disposition = patch.disposition;
    if (patch.medications !== undefined) s.medications = sanitizeMeds(patch.medications);
    if (patch.dietAdvice !== undefined)
      s.dietAdvice = patch.dietAdvice?.trim() || undefined;
    if (patch.activityAdvice !== undefined)
      s.activityAdvice = patch.activityAdvice?.trim() || undefined;
    if (patch.followUpPlan !== undefined)
      s.followUpPlan = patch.followUpPlan?.trim() || undefined;
    if (patch.followUpDate !== undefined) s.followUpDate = patch.followUpDate || undefined;
    if (patch.warningSignsAdvised !== undefined)
      s.warningSignsAdvised = patch.warningSignsAdvised?.trim() || undefined;
  }

  if (patch.notes !== undefined) s.notes = patch.notes;

  if (patch.status !== undefined && patch.status !== s.status) {
    if (patch.status === "finalized" && s.status === "draft") {
      s.status = "finalized";
      s.finalizedAt = now;
    } else {
      // other transitions ignored — amendments go through `amendSummary`
    }
  }

  s.updatedAt = now;
  flush();
  return s;
}

// Creates a new summary that supersedes an existing finalized one.
// The original is marked `amended` and linked via supersededById.
export function amendSummary(
  id: string,
  organizationId: string,
  patch: SummaryInput & { amendmentReason?: string }
): DischargeSummary | null {
  const orig = summaries.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!orig) return null;
  if (orig.status !== "finalized") return null;
  const now = new Date().toISOString();

  const next = createSummary(organizationId, {
    ...patch,
    patientId: patch.patientId || orig.patientId,
    status: "finalized",
  });
  next.supersedesId = orig.id;
  orig.status = "amended";
  orig.supersededById = next.id;
  orig.amendedAt = now;
  orig.amendmentReason = patch.amendmentReason?.trim() || undefined;
  orig.updatedAt = now;
  flush();
  return next;
}

export function deleteSummary(id: string, organizationId: string): boolean {
  const i = summaries.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  summaries.splice(i, 1);
  flush();
  return true;
}

export function deleteDischargeForPatient(
  patientId: string,
  organizationId: string
): number {
  let removed = 0;
  for (let i = summaries.length - 1; i >= 0; i--) {
    const s = summaries[i];
    if (s.patientId === patientId && s.organizationId === organizationId) {
      summaries.splice(i, 1);
      removed++;
    }
  }
  if (removed) flush();
  return removed;
}
