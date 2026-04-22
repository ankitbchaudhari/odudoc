// Clinical Pathways / Care Protocols. Tenant-scoped.
// Two entities:
//   PathwayDefinition — reusable protocol (e.g. STEMI, sepsis-1hr-bundle)
//   PathwayEnrollment — a patient on that pathway, with step completion tracking
// Detach-only patient cascade on enrollments.

import { bindPersistentArray } from "../persistent-array";

export type PathwayCategory = "cardiac" | "stroke" | "sepsis" | "trauma" | "obstetric" | "neonatal" | "oncology" | "surgical" | "ortho" | "respiratory" | "renal" | "mental_health" | "palliative" | "other";
export type PathwayStatus = "draft" | "active" | "retired";
export type EnrollmentStatus = "enrolled" | "in_progress" | "completed" | "deviated" | "exited" | "cancelled";
export type StepStatus = "pending" | "done" | "skipped" | "not_applicable" | "failed";

export interface PathwayStep {
  id: string;
  order: number;
  phase: string;                       // "Arrival (0-10min)", "Post-op day 1"
  title: string;                       // "12-lead ECG"
  category?: string;                   // "diagnostic", "therapeutic", "nursing"
  targetMinutesFromStart?: number;     // time target
  mandatory: boolean;
  rationale?: string;
}

export interface StepProgress {
  stepId: string;
  status: StepStatus;
  performedAt?: string;
  performedBy?: string;
  notes?: string;
}

export interface PathwayDefinition {
  id: string;                           // CPW-{suffix}-{seq}
  organizationId: string;
  code: string;                         // "STEMI-001"
  title: string;                        // "ST-Elevation MI fast-track"
  category: PathwayCategory;
  indication: string;                   // ICD-10 range / clinical trigger
  targetPopulation?: string;
  status: PathwayStatus;
  version: string;                      // "v2.1"
  effectiveFrom: string;
  retiredAt?: string;
  evidenceRefs?: string;                // guideline citations
  keyMetrics?: string;                  // "Door-to-balloon ≤90min"
  ownerCommittee?: string;              // "Cardiology QA"
  steps: PathwayStep[];
  createdAt: string;
  updatedAt: string;
}

export interface PathwayEnrollment {
  id: string;                           // CPE-{suffix}-{seq}
  organizationId: string;
  pathwayId: string;
  pathwayCode: string;                  // denorm
  pathwayTitle: string;                 // denorm
  patientId: string;
  patientName: string;
  admissionId?: string;
  enrolledBy: string;
  enrolledAt: string;
  startedAt?: string;
  completedAt?: string;
  exitedAt?: string;
  exitReason?: string;
  status: EnrollmentStatus;
  steps: StepProgress[];
  deviationCount: number;
  deviationNotes?: string;
  outcomeSummary?: string;
  createdAt: string;
  updatedAt: string;
}

const defs: PathwayDefinition[] = [];
const enrolls: PathwayEnrollment[] = [];
const hD = bindPersistentArray<PathwayDefinition>("clinical-pathway-defs", defs, () => []);
const hE = bindPersistentArray<PathwayEnrollment>("clinical-pathway-enrolls", enrolls, () => []);
await hD; await hE;

export const CATEGORY_LABEL: Record<PathwayCategory, string> = {
  cardiac: "Cardiac", stroke: "Stroke", sepsis: "Sepsis", trauma: "Trauma",
  obstetric: "Obstetric", neonatal: "Neonatal", oncology: "Oncology",
  surgical: "Surgical", ortho: "Ortho", respiratory: "Respiratory",
  renal: "Renal", mental_health: "Mental health", palliative: "Palliative", other: "Other",
};
export const STATUS_LABEL: Record<PathwayStatus, string> = {
  draft: "Draft", active: "Active", retired: "Retired",
};
export const ENROLL_STATUS_LABEL: Record<EnrollmentStatus, string> = {
  enrolled: "Enrolled", in_progress: "In progress", completed: "Completed",
  deviated: "Deviated", exited: "Exited", cancelled: "Cancelled",
};
export const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  pending: "Pending", done: "Done", skipped: "Skipped",
  not_applicable: "N/A", failed: "Failed",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(prefix: string, list: { id: string }[], orgId: string) {
  const p = `${prefix}-${suf(orgId)}-`;
  const m = list.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

// Definitions
export function listDefinitions(opts: { organizationId: string; status?: PathwayStatus; category?: PathwayCategory }): PathwayDefinition[] {
  return defs.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.category ? r.category === opts.category : true))
    .sort((a, b) => a.title.localeCompare(b.title));
}
export function getDefinition(id: string, orgId: string): PathwayDefinition | null {
  return defs.find((r) => r.id === id && r.organizationId === orgId) || null;
}
export function createDefinition(orgId: string, input: Partial<PathwayDefinition>): { ok: true; record: PathwayDefinition } | { ok: false; error: string } {
  if (!input.code || !input.title || !input.indication || !input.effectiveFrom) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: PathwayDefinition = {
    id: nextId("CPW", defs, orgId), organizationId: orgId,
    code: input.code, title: input.title,
    category: (input.category || "other") as PathwayCategory,
    indication: input.indication,
    targetPopulation: input.targetPopulation,
    status: (input.status || "draft") as PathwayStatus,
    version: input.version || "v1.0",
    effectiveFrom: input.effectiveFrom,
    retiredAt: input.retiredAt,
    evidenceRefs: input.evidenceRefs,
    keyMetrics: input.keyMetrics,
    ownerCommittee: input.ownerCommittee,
    steps: input.steps || [],
    createdAt: now, updatedAt: now,
  };
  defs.push(r);
  return { ok: true, record: r };
}
export function updateDefinition(id: string, orgId: string, patch: Partial<PathwayDefinition>): PathwayDefinition | null {
  const i = defs.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = defs[i];
  const now = new Date().toISOString();
  const next: PathwayDefinition = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.status === "retired" && prev.status !== "retired" && !next.retiredAt) next.retiredAt = now;
  defs[i] = next;
  return next;
}
export function deleteDefinition(id: string, orgId: string): boolean {
  const i = defs.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  defs.splice(i, 1);
  return true;
}

// Enrollments
export function listEnrollments(opts: { organizationId: string; status?: EnrollmentStatus; pathwayId?: string; patientId?: string }): PathwayEnrollment[] {
  return enrolls.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.pathwayId ? r.pathwayId === opts.pathwayId : true))
    .filter((r) => (opts.patientId ? r.patientId === opts.patientId : true))
    .sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt));
}
export function createEnrollment(orgId: string, input: Partial<PathwayEnrollment>): { ok: true; record: PathwayEnrollment } | { ok: false; error: string } {
  if (!input.pathwayId || !input.patientId || !input.patientName || !input.enrolledBy) return { ok: false, error: "missing_required" };
  const def = defs.find((d) => d.id === input.pathwayId && d.organizationId === orgId);
  if (!def) return { ok: false, error: "pathway_not_found" };
  const now = new Date().toISOString();
  const steps: StepProgress[] = input.steps && input.steps.length > 0
    ? input.steps
    : def.steps.map((s) => ({ stepId: s.id, status: "pending" as StepStatus }));
  const r: PathwayEnrollment = {
    id: nextId("CPE", enrolls, orgId), organizationId: orgId,
    pathwayId: def.id, pathwayCode: def.code, pathwayTitle: def.title,
    patientId: input.patientId, patientName: input.patientName,
    admissionId: input.admissionId,
    enrolledBy: input.enrolledBy,
    enrolledAt: input.enrolledAt || now,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    exitedAt: input.exitedAt,
    exitReason: input.exitReason,
    status: (input.status || "enrolled") as EnrollmentStatus,
    steps,
    deviationCount: input.deviationCount ?? 0,
    deviationNotes: input.deviationNotes,
    outcomeSummary: input.outcomeSummary,
    createdAt: now, updatedAt: now,
  };
  enrolls.push(r);
  return { ok: true, record: r };
}
export function updateEnrollment(id: string, orgId: string, patch: Partial<PathwayEnrollment>): PathwayEnrollment | null {
  const i = enrolls.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = enrolls[i];
  const now = new Date().toISOString();
  const next: PathwayEnrollment = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.status === "in_progress" && !next.startedAt) next.startedAt = now;
  if (next.status === "completed" && !next.completedAt) next.completedAt = now;
  if (next.status === "exited" && !next.exitedAt) next.exitedAt = now;
  // Recount deviations as #failed or #skipped-mandatory
  const def = defs.find((d) => d.id === next.pathwayId && d.organizationId === orgId);
  if (def) {
    const mandIds = new Set(def.steps.filter((s) => s.mandatory).map((s) => s.id));
    next.deviationCount = next.steps.filter((s) => s.status === "failed" || (s.status === "skipped" && mandIds.has(s.stepId))).length;
  }
  enrolls[i] = next;
  return next;
}
export function deleteEnrollment(id: string, orgId: string): boolean {
  const i = enrolls.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  enrolls.splice(i, 1);
  return true;
}

export function computeStats(orgId: string) {
  const myD = defs.filter((r) => r.organizationId === orgId);
  const myE = enrolls.filter((r) => r.organizationId === orgId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const active = myE.filter((e) => e.status === "enrolled" || e.status === "in_progress");
  const completedMonth = myE.filter((e) => e.status === "completed" && (e.completedAt || "") >= monthStart);
  const totalStepsCompleted = completedMonth.reduce((s, e) => s + e.steps.filter((x) => x.status === "done").length, 0);
  const totalSteps = completedMonth.reduce((s, e) => s + e.steps.length, 0);
  const complianceRate = totalSteps > 0 ? Math.round((totalStepsCompleted / totalSteps) * 100) : 0;
  const deviationsMonth = myE.filter((e) => e.updatedAt >= monthStart).reduce((s, e) => s + e.deviationCount, 0);
  return {
    activeDefinitions: myD.filter((d) => d.status === "active").length,
    draftDefinitions: myD.filter((d) => d.status === "draft").length,
    activeEnrollments: active.length,
    completedMonth: completedMonth.length,
    complianceRate,
    deviationsMonth,
  };
}

export function unlinkPathwayForPatient(patientId: string, orgId: string): void {
  const stamp = new Date().toISOString();
  for (const r of enrolls) {
    if (r.organizationId === orgId && r.patientId === patientId) {
      r.patientId = "";
      r.patientName = `[removed] ${r.patientName}`;
      if (r.status === "enrolled" || r.status === "in_progress") {
        r.status = "cancelled";
        if (!r.exitedAt) r.exitedAt = stamp;
        if (!r.exitReason) r.exitReason = "patient_removed";
      }
      r.updatedAt = stamp;
    }
  }
  // flush:auto-unlink
  enrolls.splice(enrolls.length, 0);
}
