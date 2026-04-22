// Dental records. Tenant-scoped. Two entities: ToothChart record + TreatmentPlan.
// Uses FDI (ISO 3950) notation: 11-48 permanent, 51-85 primary.
// Detach-only cascade.

import { bindPersistentArray } from "../persistent-array";

export type ToothCondition =
  | "healthy" | "caries" | "filled" | "crown" | "rct_done" | "rct_needed"
  | "extracted" | "missing" | "impacted" | "fractured" | "mobile" | "implant"
  | "veneer" | "bridge_abutment" | "bridge_pontic";
export type Surface = "mesial" | "distal" | "occlusal" | "buccal" | "lingual" | "incisal" | "palatal";
export type PlanStatus = "proposed" | "accepted" | "in_progress" | "completed" | "cancelled";
export type ProcedureStatus = "planned" | "done" | "cancelled";

export interface ToothFinding {
  fdi: string;                         // "11", "36", "75"
  condition: ToothCondition;
  surfaces?: Surface[];
  note?: string;
}

export interface ChartRecord {
  id: string;                          // DCHT-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  dentistName: string;
  examDate: string;
  chiefComplaint?: string;
  ohi?: "good" | "fair" | "poor";      // oral hygiene index
  plaqueIndex?: number;                // 0-3
  bleedingOnProbing?: number;          // % sites
  findings: ToothFinding[];
  softTissue?: string;
  occlusion?: string;                  // Angle class I/II/III
  perioNotes?: string;
  imaging?: string;                    // OPG, IOPA, CBCT refs
  diagnosis?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanProcedure {
  code?: string;                       // CDT / procedure code
  name: string;
  toothFdi?: string;
  cost?: number;
  status: ProcedureStatus;
  doneAt?: string;
  doneBy?: string;
}

export interface TreatmentPlan {
  id: string;                          // DTP-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  dentistName: string;
  createdDate: string;
  status: PlanStatus;
  phases?: string;                     // multi-phase description
  procedures: PlanProcedure[];
  estimatedCost?: number;
  actualCost?: number;
  consentSigned?: boolean;
  notes?: string;
  acceptedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const charts: ChartRecord[] = [];
const plans: TreatmentPlan[] = [];
const hydrateC = bindPersistentArray<ChartRecord>("dental-charts", charts, () => []);
const hydrateP = bindPersistentArray<TreatmentPlan>("dental-plans", plans, () => []);
await hydrateC;
await hydrateP;

export const CONDITION_LABEL: Record<ToothCondition, string> = {
  healthy: "Healthy", caries: "Caries", filled: "Filled", crown: "Crown",
  rct_done: "RCT done", rct_needed: "RCT needed",
  extracted: "Extracted", missing: "Missing", impacted: "Impacted",
  fractured: "Fractured", mobile: "Mobile", implant: "Implant",
  veneer: "Veneer", bridge_abutment: "Bridge abutment", bridge_pontic: "Bridge pontic",
};
export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  proposed: "Proposed", accepted: "Accepted", in_progress: "In progress",
  completed: "Completed", cancelled: "Cancelled",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextChartId(o: string) {
  const p = `DCHT-${suf(o)}-`;
  const m = charts.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}
function nextPlanId(o: string) {
  const p = `DTP-${suf(o)}-`;
  const m = plans.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

export function listCharts(opts: { organizationId: string; patientId?: string }): ChartRecord[] {
  return charts.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.patientId ? r.patientId === opts.patientId : true))
    .sort((a, b) => b.examDate.localeCompare(a.examDate));
}

export function createChart(orgId: string, input: Partial<ChartRecord>): { ok: true; chart: ChartRecord } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || !input.dentistName) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: ChartRecord = {
    id: nextChartId(orgId), organizationId: orgId,
    patientId: input.patientId, patientName: input.patientName,
    dentistName: input.dentistName,
    examDate: input.examDate || now,
    chiefComplaint: input.chiefComplaint,
    ohi: input.ohi, plaqueIndex: input.plaqueIndex, bleedingOnProbing: input.bleedingOnProbing,
    findings: input.findings || [],
    softTissue: input.softTissue, occlusion: input.occlusion, perioNotes: input.perioNotes,
    imaging: input.imaging, diagnosis: input.diagnosis, notes: input.notes,
    createdAt: now, updatedAt: now,
  };
  charts.push(r);
  return { ok: true, chart: r };
}

export function updateChart(id: string, orgId: string, patch: Partial<ChartRecord>): ChartRecord | null {
  const i = charts.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = charts[i];
  const next: ChartRecord = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: new Date().toISOString() };
  charts[i] = next;
  return next;
}

export function deleteChart(id: string, orgId: string): boolean {
  const i = charts.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  charts.splice(i, 1);
  return true;
}

export function listPlans(opts: { organizationId: string; status?: PlanStatus; patientId?: string }): TreatmentPlan[] {
  return plans.filter((p) => p.organizationId === opts.organizationId)
    .filter((p) => (opts.status ? p.status === opts.status : true))
    .filter((p) => (opts.patientId ? p.patientId === opts.patientId : true))
    .sort((a, b) => b.createdDate.localeCompare(a.createdDate));
}

export function createPlan(orgId: string, input: Partial<TreatmentPlan>): { ok: true; plan: TreatmentPlan } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || !input.dentistName) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const procs = (input.procedures || []).map((p) => ({ ...p, status: (p.status || "planned") as ProcedureStatus }));
  const estimated = procs.reduce((s, p) => s + (p.cost || 0), 0);
  const p: TreatmentPlan = {
    id: nextPlanId(orgId), organizationId: orgId,
    patientId: input.patientId, patientName: input.patientName,
    dentistName: input.dentistName,
    createdDate: input.createdDate || now,
    status: "proposed",
    phases: input.phases,
    procedures: procs,
    estimatedCost: input.estimatedCost != null ? input.estimatedCost : estimated,
    actualCost: 0,
    consentSigned: !!input.consentSigned,
    notes: input.notes,
    createdAt: now, updatedAt: now,
  };
  plans.push(p);
  return { ok: true, plan: p };
}

export function updatePlan(id: string, orgId: string, patch: Partial<TreatmentPlan>): TreatmentPlan | null {
  const i = plans.findIndex((p) => p.id === id && p.organizationId === orgId);
  if (i < 0) return null;
  const prev = plans[i];
  const now = new Date().toISOString();
  const next: TreatmentPlan = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  // recalc actual cost from done procedures
  next.actualCost = next.procedures.filter((pr) => pr.status === "done").reduce((s, pr) => s + (pr.cost || 0), 0);
  if (next.status === "accepted" && prev.status !== "accepted" && !next.acceptedAt) next.acceptedAt = now;
  if (next.status === "completed" && prev.status !== "completed" && !next.completedAt) next.completedAt = now;
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
  const myC = charts.filter((r) => r.organizationId === orgId);
  const myP = plans.filter((p) => p.organizationId === orgId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const chartsMonth = myC.filter((r) => r.examDate >= monthStart).length;
  const activePlans = myP.filter((p) => p.status === "accepted" || p.status === "in_progress").length;
  const proposedPlans = myP.filter((p) => p.status === "proposed").length;
  const completedMonth = myP.filter((p) => p.status === "completed" && (p.completedAt || "") >= monthStart).length;
  const revenueMonth = myP.filter((p) => (p.completedAt || "") >= monthStart || p.status === "in_progress").reduce((s, p) => s + (p.actualCost || 0), 0);
  const cariesFindings = myC.reduce((s, r) => s + r.findings.filter((f) => f.condition === "caries" || f.condition === "rct_needed").length, 0);
  const extractions = myP.reduce((s, p) => s + p.procedures.filter((pr) => pr.status === "done" && /extract/i.test(pr.name)).length, 0);
  return { chartsMonth, activePlans, proposedPlans, completedMonth, revenueMonth, cariesFindings, extractions };
}

export function unlinkDentalForPatient(patientId: string, orgId: string): void {
  const stamp = new Date().toISOString();
  for (const r of charts) {
    if (r.organizationId === orgId && r.patientId === patientId) {
      r.patientId = ""; r.patientName = `[removed] ${r.patientName}`; r.updatedAt = stamp;
    }
  }
  for (const p of plans) {
    if (p.organizationId === orgId && p.patientId === patientId) {
      p.patientId = ""; p.patientName = `[removed] ${p.patientName}`;
      if (p.status === "proposed" || p.status === "accepted" || p.status === "in_progress") p.status = "cancelled";
      p.updatedAt = stamp;
    }
  }
  // flush:auto-unlink
  charts.splice(charts.length, 0);
}
