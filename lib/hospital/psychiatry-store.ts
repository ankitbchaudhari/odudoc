// Psychiatry / Mental Health. Tenant-scoped.
// Two entities: PsychSession (encounter with MSE + scales) + TherapyPlan (ongoing care plan).
// Detach-only cascade.

import { bindPersistentArray } from "../persistent-array";

export type SessionType = "initial" | "follow_up" | "therapy" | "crisis" | "medication_review" | "family";
export type SessionStatus = "scheduled" | "in_progress" | "completed" | "no_show" | "cancelled";
export type PlanStatus = "active" | "on_hold" | "completed" | "discharged";
export type RiskLevel = "none" | "low" | "moderate" | "high" | "imminent";
export type TherapyModality = "cbt" | "dbt" | "ipt" | "psychodynamic" | "family" | "group" | "act" | "emdr" | "supportive";

export interface ScaleScore {
  name: string;                // "PHQ-9", "GAD-7", "MoCA", "YBOCS", "PANSS", "HAM-D", "MMSE"
  score: number;
  maxScore?: number;
  severity?: string;           // "minimal" | "mild" | "moderate" | "moderately severe" | "severe"
}

export interface MentalStatusExam {
  appearance?: string;
  behavior?: string;
  mood?: string;               // subjective
  affect?: string;             // objective: flat, blunted, restricted, full, labile
  speech?: string;
  thoughtProcess?: string;
  thoughtContent?: string;
  perception?: string;         // hallucinations etc
  cognition?: string;
  insight?: string;            // poor / fair / good
  judgment?: string;
}

export interface RiskAssessment {
  suicidality: RiskLevel;
  homicidality: RiskLevel;
  selfHarm: RiskLevel;
  planOrIntent?: string;
  protectiveFactors?: string;
  safetyPlan?: string;
}

export interface PsychSession {
  id: string;                        // PSY-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  providerName: string;
  scheduledAt: string;
  sessionType: SessionType;
  status: SessionStatus;
  durationMin?: number;
  chiefComplaint?: string;
  hpi?: string;
  mse?: MentalStatusExam;
  scales?: ScaleScore[];
  risk?: RiskAssessment;
  diagnoses?: string;                // ICD-10 / DSM-5 codes + descriptions
  formulation?: string;
  interventions?: string;            // done this session
  medications?: string;
  homework?: string;
  nextSession?: string;
  confidentiality?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface PlanGoal {
  description: string;
  target?: string;
  status?: "in_progress" | "achieved" | "revised" | "dropped";
}

export interface TherapyPlan {
  id: string;                        // TPL-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  primaryProvider: string;
  startedAt: string;
  modality: TherapyModality;
  frequency?: string;                // "weekly", "biweekly"
  sessionCount?: number;             // number of sessions planned
  status: PlanStatus;
  primaryDiagnosis?: string;
  goals: PlanGoal[];
  medications?: string;
  reviewDate?: string;
  notes?: string;
  dischargedAt?: string;
  dischargeReason?: string;
  createdAt: string;
  updatedAt: string;
}

const sessions: PsychSession[] = [];
const plans: TherapyPlan[] = [];
const hydrateS = bindPersistentArray<PsychSession>("psych-sessions", sessions, () => []);
const hydrateP = bindPersistentArray<TherapyPlan>("psych-plans", plans, () => []);
await hydrateS;
await hydrateP;

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  scheduled: "Scheduled", in_progress: "In progress", completed: "Completed",
  no_show: "No show", cancelled: "Cancelled",
};
export const MODALITY_LABEL: Record<TherapyModality, string> = {
  cbt: "CBT", dbt: "DBT", ipt: "IPT", psychodynamic: "Psychodynamic",
  family: "Family", group: "Group", act: "ACT", emdr: "EMDR", supportive: "Supportive",
};

export function phq9Severity(score: number): string {
  if (score <= 4) return "minimal";
  if (score <= 9) return "mild";
  if (score <= 14) return "moderate";
  if (score <= 19) return "moderately severe";
  return "severe";
}
export function gad7Severity(score: number): string {
  if (score <= 4) return "minimal";
  if (score <= 9) return "mild";
  if (score <= 14) return "moderate";
  return "severe";
}

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextSessionId(o: string) {
  const p = `PSY-${suf(o)}-`;
  const m = sessions.filter((s) => s.id.startsWith(p)).reduce((mx, s) => Math.max(mx, Number(s.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}
function nextPlanId(o: string) {
  const p = `TPL-${suf(o)}-`;
  const m = plans.filter((s) => s.id.startsWith(p)).reduce((mx, s) => Math.max(mx, Number(s.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

export function listSessions(opts: { organizationId: string; status?: SessionStatus; patientId?: string }): PsychSession[] {
  return sessions.filter((s) => s.organizationId === opts.organizationId)
    .filter((s) => (opts.status ? s.status === opts.status : true))
    .filter((s) => (opts.patientId ? s.patientId === opts.patientId : true))
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
}

export function createSession(orgId: string, input: Partial<PsychSession>): { ok: true; session: PsychSession } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || !input.providerName || !input.scheduledAt) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const s: PsychSession = {
    id: nextSessionId(orgId), organizationId: orgId,
    patientId: input.patientId, patientName: input.patientName,
    providerName: input.providerName,
    scheduledAt: input.scheduledAt,
    sessionType: (input.sessionType || "initial") as SessionType,
    status: "scheduled",
    chiefComplaint: input.chiefComplaint,
    confidentiality: input.confidentiality ?? true,
    createdAt: now, updatedAt: now,
  };
  sessions.push(s);
  return { ok: true, session: s };
}

export function updateSession(id: string, orgId: string, patch: Partial<PsychSession>): PsychSession | null {
  const i = sessions.findIndex((s) => s.id === id && s.organizationId === orgId);
  if (i < 0) return null;
  const prev = sessions[i];
  const now = new Date().toISOString();
  const next: PsychSession = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.status === "completed" && prev.status !== "completed" && !next.completedAt) next.completedAt = now;
  sessions[i] = next;
  return next;
}

export function deleteSession(id: string, orgId: string): boolean {
  const i = sessions.findIndex((s) => s.id === id && s.organizationId === orgId);
  if (i < 0) return false;
  sessions.splice(i, 1);
  return true;
}

export function listPlans(opts: { organizationId: string; status?: PlanStatus; patientId?: string }): TherapyPlan[] {
  return plans.filter((p) => p.organizationId === opts.organizationId)
    .filter((p) => (opts.status ? p.status === opts.status : true))
    .filter((p) => (opts.patientId ? p.patientId === opts.patientId : true))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function createPlan(orgId: string, input: Partial<TherapyPlan>): { ok: true; plan: TherapyPlan } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || !input.primaryProvider || !input.modality) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const p: TherapyPlan = {
    id: nextPlanId(orgId), organizationId: orgId,
    patientId: input.patientId, patientName: input.patientName,
    primaryProvider: input.primaryProvider,
    startedAt: input.startedAt || now,
    modality: input.modality,
    frequency: input.frequency,
    sessionCount: input.sessionCount,
    status: "active",
    primaryDiagnosis: input.primaryDiagnosis,
    goals: input.goals || [],
    medications: input.medications,
    reviewDate: input.reviewDate,
    notes: input.notes,
    createdAt: now, updatedAt: now,
  };
  plans.push(p);
  return { ok: true, plan: p };
}

export function updatePlan(id: string, orgId: string, patch: Partial<TherapyPlan>): TherapyPlan | null {
  const i = plans.findIndex((p) => p.id === id && p.organizationId === orgId);
  if (i < 0) return null;
  const prev = plans[i];
  const now = new Date().toISOString();
  const next: TherapyPlan = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if ((next.status === "discharged" || next.status === "completed") && prev.status !== next.status && !next.dischargedAt) next.dischargedAt = now;
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
  const myS = sessions.filter((s) => s.organizationId === orgId);
  const myP = plans.filter((p) => p.organizationId === orgId);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const scheduledToday = myS.filter((s) => s.status === "scheduled" && s.scheduledAt >= todayStart && s.scheduledAt < todayEnd).length;
  const completedMonth = myS.filter((s) => s.status === "completed" && (s.completedAt || "") >= monthStart).length;
  const noShowMonth = myS.filter((s) => s.status === "no_show" && s.updatedAt >= monthStart).length;
  const totalRecentStatus = completedMonth + noShowMonth + myS.filter((s) => s.status === "cancelled" && s.updatedAt >= monthStart).length;
  const noShowRate = totalRecentStatus > 0 ? Math.round((noShowMonth / totalRecentStatus) * 100) : 0;
  const activePlans = myP.filter((p) => p.status === "active").length;
  // High-risk alerts: any completed session this month where any risk ≥ high
  const highRiskAlerts = myS.filter((s) => (s.completedAt || "") >= monthStart && s.risk && (s.risk.suicidality === "high" || s.risk.suicidality === "imminent" || s.risk.homicidality === "high" || s.risk.homicidality === "imminent")).length;
  // Severe PHQ-9 / GAD-7: score thresholds
  const severeDepression = myS.filter((s) => s.status === "completed" && (s.scales || []).some((x) => (x.name.toUpperCase().includes("PHQ") && x.score >= 20))).length;
  const severeAnxiety = myS.filter((s) => s.status === "completed" && (s.scales || []).some((x) => (x.name.toUpperCase().includes("GAD") && x.score >= 15))).length;
  return { scheduledToday, completedMonth, noShowRate, activePlans, highRiskAlerts, severeDepression, severeAnxiety };
}

export function unlinkPsychForPatient(patientId: string, orgId: string): void {
  const stamp = new Date().toISOString();
  for (const s of sessions) {
    if (s.organizationId === orgId && s.patientId === patientId) {
      s.patientId = ""; s.patientName = `[removed] ${s.patientName}`; s.updatedAt = stamp;
    }
  }
  for (const p of plans) {
    if (p.organizationId === orgId && p.patientId === patientId) {
      p.patientId = ""; p.patientName = `[removed] ${p.patientName}`;
      if (p.status === "active" || p.status === "on_hold") {
        p.status = "discharged";
        p.dischargedAt = stamp;
        p.dischargeReason = "patient_removed";
      }
      p.updatedAt = stamp;
    }
  }
  // flush:auto-unlink
  sessions.splice(sessions.length, 0);
}
