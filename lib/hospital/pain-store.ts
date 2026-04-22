// Pain Management. Tenant-scoped.
// Two entities: PainAssessment (score snapshots) + PainPlan (ongoing regimen).
// Detach-only cascade.

import { bindPersistentArray } from "../persistent-array";

export type PainScale = "nrs" | "vas" | "wong_baker" | "flacc" | "cpot";
export type PainType = "acute" | "chronic" | "post_op" | "cancer" | "neuropathic" | "procedural";
export type PainLocation = "head" | "neck" | "chest" | "abdomen" | "back" | "limb" | "pelvis" | "generalized" | "other";
export type WhoStep = "step1_nonopioid" | "step2_weak_opioid" | "step3_strong_opioid" | "adjuvant_only";
export type PlanStatus = "active" | "completed" | "discontinued";
export type InterventionType = "oral" | "iv" | "im" | "sc" | "pca" | "epidural" | "nerve_block" | "patch" | "non_pharm";

export interface PainAssessment {
  id: string;                 // PAIN-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  assessedAt: string;
  assessorName?: string;
  scale: PainScale;
  score: number;              // 0-10 scale, FLACC 0-10, CPOT 0-8
  location?: PainLocation;
  locationDetail?: string;
  painType?: PainType;
  quality?: string;           // burning / stabbing / throbbing
  radiation?: string;
  aggravating?: string;
  relieving?: string;
  functionalImpact?: string;
  sedationScore?: number;     // 0-4
  respiratoryRate?: number;
  notes?: string;
  createdAt: string;
}

export interface PainIntervention {
  type: InterventionType;
  detail: string;             // drug, dose, route
  frequency?: string;
}

export interface PainPlan {
  id: string;                 // PPLAN-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  prescriberName: string;
  startedAt: string;
  painType: PainType;
  whoStep: WhoStep;
  goalScore?: number;
  interventions: PainIntervention[];
  rescueOrders?: string;
  sideEffectsWatch?: string;
  reviewDate?: string;
  status: PlanStatus;
  discontinuedAt?: string;
  discontinueReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const assessments: PainAssessment[] = [];
const plans: PainPlan[] = [];
const hydrateA = bindPersistentArray<PainAssessment>("pain-assessments", assessments, () => []);
const hydrateP = bindPersistentArray<PainPlan>("pain-plans", plans, () => []);
await hydrateA;
await hydrateP;

export const SCALE_LABEL: Record<PainScale, string> = {
  nrs: "NRS (0-10)", vas: "VAS", wong_baker: "Wong-Baker", flacc: "FLACC", cpot: "CPOT",
};
export const STEP_LABEL: Record<WhoStep, string> = {
  step1_nonopioid: "Step 1 — Non-opioid", step2_weak_opioid: "Step 2 — Weak opioid",
  step3_strong_opioid: "Step 3 — Strong opioid", adjuvant_only: "Adjuvant only",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextIdA(o: string) {
  const p = `PAIN-${suf(o)}-`;
  const m = assessments.filter((a) => a.id.startsWith(p)).reduce((mx, a) => Math.max(mx, Number(a.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}
function nextIdP(o: string) {
  const p = `PPLAN-${suf(o)}-`;
  const m = plans.filter((a) => a.id.startsWith(p)).reduce((mx, a) => Math.max(mx, Number(a.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

export function listAssessments(opts: { organizationId: string; patientId?: string; from?: string; to?: string }): PainAssessment[] {
  return assessments.filter((a) => a.organizationId === opts.organizationId)
    .filter((a) => (opts.patientId ? a.patientId === opts.patientId : true))
    .filter((a) => (opts.from ? a.assessedAt >= opts.from : true))
    .filter((a) => (opts.to ? a.assessedAt <= opts.to : true))
    .sort((a, b) => b.assessedAt.localeCompare(a.assessedAt));
}

export function createAssessment(orgId: string, input: Partial<PainAssessment>): { ok: true; assessment: PainAssessment } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || input.score == null || !input.scale) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const a: PainAssessment = {
    id: nextIdA(orgId), organizationId: orgId,
    patientId: input.patientId, patientName: input.patientName,
    assessedAt: input.assessedAt || now,
    assessorName: input.assessorName,
    scale: input.scale,
    score: Number(input.score),
    location: input.location, locationDetail: input.locationDetail,
    painType: input.painType, quality: input.quality, radiation: input.radiation,
    aggravating: input.aggravating, relieving: input.relieving,
    functionalImpact: input.functionalImpact,
    sedationScore: input.sedationScore,
    respiratoryRate: input.respiratoryRate,
    notes: input.notes,
    createdAt: now,
  };
  assessments.push(a);
  return { ok: true, assessment: a };
}

export function deleteAssessment(id: string, orgId: string): boolean {
  const i = assessments.findIndex((a) => a.id === id && a.organizationId === orgId);
  if (i < 0) return false;
  assessments.splice(i, 1);
  return true;
}

export function listPlans(opts: { organizationId: string; status?: PlanStatus; patientId?: string }): PainPlan[] {
  return plans.filter((p) => p.organizationId === opts.organizationId)
    .filter((p) => (opts.status ? p.status === opts.status : true))
    .filter((p) => (opts.patientId ? p.patientId === opts.patientId : true))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function createPlan(orgId: string, input: Partial<PainPlan>): { ok: true; plan: PainPlan } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || !input.prescriberName || !input.painType || !input.whoStep) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const p: PainPlan = {
    id: nextIdP(orgId), organizationId: orgId,
    patientId: input.patientId, patientName: input.patientName,
    prescriberName: input.prescriberName,
    startedAt: input.startedAt || now,
    painType: input.painType,
    whoStep: input.whoStep,
    goalScore: input.goalScore,
    interventions: input.interventions || [],
    rescueOrders: input.rescueOrders,
    sideEffectsWatch: input.sideEffectsWatch,
    reviewDate: input.reviewDate,
    status: "active",
    notes: input.notes,
    createdAt: now, updatedAt: now,
  };
  plans.push(p);
  return { ok: true, plan: p };
}

export function updatePlan(id: string, orgId: string, patch: Partial<PainPlan>): PainPlan | null {
  const i = plans.findIndex((p) => p.id === id && p.organizationId === orgId);
  if (i < 0) return null;
  const prev = plans[i];
  const now = new Date().toISOString();
  const next: PainPlan = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if ((next.status === "discontinued" || next.status === "completed") && prev.status === "active" && !next.discontinuedAt) next.discontinuedAt = now;
  plans[i] = next;
  return next;
}

export function deletePlan(id: string, orgId: string): boolean {
  const i = plans.findIndex((p) => p.id === id && p.organizationId === orgId);
  if (i < 0) return false;
  plans.splice(i, 1);
  return true;
}

export function computeStats(orgId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const myA = assessments.filter((a) => a.organizationId === orgId);
  const myP = plans.filter((p) => p.organizationId === orgId);
  const assessedToday = myA.filter((a) => a.assessedAt >= todayStart).length;
  const severeWeek = myA.filter((a) => a.assessedAt >= weekAgo && a.score >= 7).length;
  const avgScoreWeek = (() => {
    const pool = myA.filter((a) => a.assessedAt >= weekAgo);
    return pool.length ? Math.round(pool.reduce((s, a) => s + a.score, 0) / pool.length * 10) / 10 : 0;
  })();
  const activePlans = myP.filter((p) => p.status === "active").length;
  const strongOpioidPlans = myP.filter((p) => p.status === "active" && p.whoStep === "step3_strong_opioid").length;
  const overdueReview = myP.filter((p) => p.status === "active" && p.reviewDate && p.reviewDate < todayStart).length;
  const highSedation = myA.filter((a) => a.assessedAt >= weekAgo && (a.sedationScore || 0) >= 3).length;
  return { assessedToday, severeWeek, avgScoreWeek, activePlans, strongOpioidPlans, overdueReview, highSedation };
}

export function unlinkPainForPatient(patientId: string, orgId: string): void {
  const stamp = new Date().toISOString();
  for (const a of assessments) {
    if (a.organizationId === orgId && a.patientId === patientId) {
      a.patientId = "";
      a.patientName = `[removed] ${a.patientName}`;
    }
  }
  for (const p of plans) {
    if (p.organizationId === orgId && p.patientId === patientId) {
      p.patientId = "";
      p.patientName = `[removed] ${p.patientName}`;
      if (p.status === "active") {
        p.status = "discontinued";
        p.discontinuedAt = stamp;
        p.discontinueReason = "patient_removed";
      }
      p.updatedAt = stamp;
    }
  }
  // flush:auto-unlink
  assessments.splice(assessments.length, 0);
}
