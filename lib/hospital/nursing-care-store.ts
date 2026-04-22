// Nursing Care Plans (NANDA-I / NIC / NOC). Tenant-scoped, patient-linked.
// Detach-only cascade.

import { bindPersistentArray } from "../persistent-array";

export type CarePlanStatus = "active" | "completed" | "cancelled" | "on_hold";
export type DiagnosisStatus = "active" | "resolved" | "at_risk" | "potential";
export type InterventionFrequency = "continuous" | "q15m" | "q30m" | "hourly" | "q2h" | "q4h" | "q6h" | "q8h" | "q12h" | "daily" | "bid" | "tid" | "qid" | "prn" | "weekly";
export type GoalStatus = "not_met" | "partially_met" | "met" | "exceeded";
export type NursingShift = "morning" | "evening" | "night";

export interface NursingDiagnosis {
  id: string;
  code?: string;                     // NANDA code e.g. "00132"
  title: string;                     // "Acute pain"
  relatedTo?: string;                // related factors
  evidencedBy?: string;              // defining characteristics
  status: DiagnosisStatus;
  priority: 1 | 2 | 3;               // 1 high / 2 med / 3 low
  onsetDate?: string;
  resolvedDate?: string;
}

export interface NursingGoal {
  id: string;
  diagnosisId?: string;              // FK to diagnosis within plan
  nocCode?: string;                  // NOC outcome code
  text: string;                      // "Patient will report pain ≤3/10"
  baseline?: string;
  targetDate?: string;
  indicators?: string;               // measurable indicators
  status: GoalStatus;
  evaluationNote?: string;
  evaluatedAt?: string;
}

export interface NursingIntervention {
  id: string;
  diagnosisId?: string;
  nicCode?: string;                  // NIC intervention code
  title: string;                     // "Pain management"
  rationale?: string;
  frequency: InterventionFrequency;
  assignedTo?: string;               // nurse name/role
  active: boolean;
}

export interface NursingProgressEntry {
  id: string;
  recordedAt: string;
  recordedBy: string;
  shift: NursingShift;
  subjective?: string;               // SOAP S
  objective?: string;                // SOAP O
  assessment?: string;               // SOAP A
  plan?: string;                     // SOAP P
  vitalsSummary?: string;
  painScoreNrs?: number;
  interventionsPerformed?: string;
  patientResponse?: string;
}

export interface CarePlan {
  id: string;                        // NCP-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  admissionId?: string;              // optional FK to admission
  primaryNurse: string;
  status: CarePlanStatus;
  startedAt: string;
  lastReviewedAt?: string;
  reviewFrequencyHours?: number;     // e.g. 24
  diagnoses: NursingDiagnosis[];
  goals: NursingGoal[];
  interventions: NursingIntervention[];
  progress: NursingProgressEntry[];
  closedAt?: string;
  closeReason?: string;
  createdAt: string;
  updatedAt: string;
}

const plans: CarePlan[] = [];
const hydrate = bindPersistentArray<CarePlan>("nursing-care-plans", plans, () => []);
await hydrate;

export const STATUS_LABEL: Record<CarePlanStatus, string> = {
  active: "Active", completed: "Completed", cancelled: "Cancelled", on_hold: "On hold",
};
export const DX_STATUS_LABEL: Record<DiagnosisStatus, string> = {
  active: "Active", resolved: "Resolved", at_risk: "At risk", potential: "Potential",
};
export const GOAL_LABEL: Record<GoalStatus, string> = {
  not_met: "Not met", partially_met: "Partially met", met: "Met", exceeded: "Exceeded",
};
export const FREQ_LABEL: Record<InterventionFrequency, string> = {
  continuous: "Continuous", q15m: "q15m", q30m: "q30m", hourly: "Hourly",
  q2h: "q2h", q4h: "q4h", q6h: "q6h", q8h: "q8h", q12h: "q12h",
  daily: "Daily", bid: "BID", tid: "TID", qid: "QID", prn: "PRN", weekly: "Weekly",
};
export const SHIFT_LABEL: Record<NursingShift, string> = {
  morning: "Morning", evening: "Evening", night: "Night",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(o: string) {
  const p = `NCP-${suf(o)}-`;
  const m = plans.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

export function listPlans(opts: { organizationId: string; status?: CarePlanStatus; patientId?: string }): CarePlan[] {
  return plans.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.patientId ? r.patientId === opts.patientId : true))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
export function getPlan(id: string, orgId: string): CarePlan | null {
  return plans.find((r) => r.id === id && r.organizationId === orgId) || null;
}
export function createPlan(orgId: string, input: Partial<CarePlan>): { ok: true; record: CarePlan } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || !input.primaryNurse) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: CarePlan = {
    id: nextId(orgId), organizationId: orgId,
    patientId: input.patientId, patientName: input.patientName,
    admissionId: input.admissionId,
    primaryNurse: input.primaryNurse,
    status: (input.status || "active") as CarePlanStatus,
    startedAt: input.startedAt || now,
    lastReviewedAt: input.lastReviewedAt,
    reviewFrequencyHours: input.reviewFrequencyHours ?? 24,
    diagnoses: input.diagnoses || [],
    goals: input.goals || [],
    interventions: input.interventions || [],
    progress: input.progress || [],
    closedAt: input.closedAt,
    closeReason: input.closeReason,
    createdAt: now, updatedAt: now,
  };
  plans.push(r);
  return { ok: true, record: r };
}
export function updatePlan(id: string, orgId: string, patch: Partial<CarePlan>): CarePlan | null {
  const i = plans.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = plans[i];
  const now = new Date().toISOString();
  const next: CarePlan = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if ((next.status === "completed" || next.status === "cancelled") && prev.status !== next.status && !next.closedAt) next.closedAt = now;
  plans[i] = next;
  return next;
}
export function deletePlan(id: string, orgId: string): boolean {
  const i = plans.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  plans.splice(i, 1);
  return true;
}

// Targeted append operation for progress notes — more ergonomic from UI
export function addProgressEntry(planId: string, orgId: string, entry: Omit<NursingProgressEntry, "id" | "recordedAt"> & { recordedAt?: string }): CarePlan | null {
  const p = plans.find((r) => r.id === planId && r.organizationId === orgId);
  if (!p) return null;
  const now = new Date().toISOString();
  p.progress.unshift({
    id: `pe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    recordedAt: entry.recordedAt || now,
    recordedBy: entry.recordedBy,
    shift: entry.shift,
    subjective: entry.subjective,
    objective: entry.objective,
    assessment: entry.assessment,
    plan: entry.plan,
    vitalsSummary: entry.vitalsSummary,
    painScoreNrs: entry.painScoreNrs,
    interventionsPerformed: entry.interventionsPerformed,
    patientResponse: entry.patientResponse,
  });
  p.lastReviewedAt = now;
  p.updatedAt = now;
  return p;
}

export function computeStats(orgId: string) {
  const my = plans.filter((r) => r.organizationId === orgId);
  const now = Date.now();
  const active = my.filter((r) => r.status === "active");
  const totalActiveDx = active.reduce((s, p) => s + p.diagnoses.filter((d) => d.status === "active" || d.status === "at_risk").length, 0);
  const highPriorityDx = active.reduce((s, p) => s + p.diagnoses.filter((d) => d.priority === 1 && (d.status === "active" || d.status === "at_risk")).length, 0);
  const overdueReview = active.filter((p) => {
    const freq = (p.reviewFrequencyHours ?? 24) * 3_600_000;
    const last = p.lastReviewedAt ? new Date(p.lastReviewedAt).getTime() : new Date(p.startedAt).getTime();
    return (now - last) > freq;
  }).length;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const completedMonth = my.filter((r) => r.status === "completed" && (r.closedAt || "") >= monthStart).length;
  return {
    active: active.length,
    onHold: my.filter((r) => r.status === "on_hold").length,
    completedMonth,
    activeDiagnoses: totalActiveDx,
    highPriority: highPriorityDx,
    overdueReview,
  };
}

export function unlinkNursingCareForPatient(patientId: string, orgId: string): void {
  const stamp = new Date().toISOString();
  for (const r of plans) {
    if (r.organizationId === orgId && r.patientId === patientId) {
      r.patientId = "";
      r.patientName = `[removed] ${r.patientName}`;
      if (r.status === "active" || r.status === "on_hold") {
        r.status = "cancelled";
        if (!r.closedAt) r.closedAt = stamp;
        if (!r.closeReason) r.closeReason = "patient_removed";
      }
      r.updatedAt = stamp;
    }
  }
  // flush:auto-unlink
  plans.splice(plans.length, 0);
}
