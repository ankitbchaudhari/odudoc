// Physiotherapy & Rehabilitation. Tenant-scoped.
//
// Two entities:
//   PhysioPlan    — per-patient course of therapy (diagnosis, goals, assigned
//                   therapist, prescribed sessions, start/expected-end)
//   PhysioSession — each scheduled or delivered visit, linked to a plan
//
// Plan lifecycle:
//   active -> completed   (prescribed sessions delivered)
//          -> discontinued (patient dropped, referred out, etc.)
//
// Session lifecycle:
//   scheduled -> attended -> completed
//             -> missed (no-show)
//             -> cancelled
//
// Pain tracking: VAS 0–10 pre & post. Plan-level avgPainDrop aggregates from
// completed sessions, which feeds the outcome dashboard.
//
// On patient delete: plans + sessions detach (retain rehab audit, match
// maternity/handover/codes policy).

import { bindPersistentArray } from "../persistent-array";

export type PlanStatus = "active" | "completed" | "discontinued";

export type SessionStatus =
  | "scheduled"
  | "attended"
  | "completed"
  | "missed"
  | "cancelled";

export type TherapyModality =
  | "manual"
  | "exercise"
  | "electrotherapy"
  | "ultrasound"
  | "traction"
  | "hydrotherapy"
  | "cryo"
  | "heat"
  | "taping"
  | "gait_training"
  | "respiratory"
  | "neurodev"
  | "other";

export type BodyRegion =
  | "neck"
  | "shoulder"
  | "upper_back"
  | "lower_back"
  | "hip"
  | "knee"
  | "ankle"
  | "wrist"
  | "elbow"
  | "whole_body"
  | "neuro"
  | "cardio_resp"
  | "other";

export interface PhysioPlan {
  id: string;
  organizationId: string;
  planNumber: string; // PT-{suffix}-{seq}
  patientId?: string;
  patientName: string;
  patientMRN?: string;
  diagnosis: string;
  bodyRegion: BodyRegion;
  therapist?: string;
  referredBy?: string; // referring doctor
  goals?: string;
  precautions?: string;
  prescribedSessions: number;
  startedAt: string;
  expectedEndAt?: string;
  endedAt?: string;
  status: PlanStatus;
  dischargeNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhysioSession {
  id: string;
  organizationId: string;
  planId: string;
  sessionNumber: string; // PTS-{suffix}-{seq}
  scheduledAt: string;
  attendedAt?: string;
  completedAt?: string;
  status: SessionStatus;
  durationMin?: number;
  therapist?: string;
  modalities: TherapyModality[];
  exercises?: string; // free-text
  vasPainPre?: number; // 0-10
  vasPainPost?: number; // 0-10
  homeProgram?: string;
  notes?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

const plans: PhysioPlan[] = [];
const sessions: PhysioSession[] = [];

const planBinding = bindPersistentArray<PhysioPlan>(
  "hospital-physio-plans",
  plans,
  () => []
);
const sessionBinding = bindPersistentArray<PhysioSession>(
  "hospital-physio-sessions",
  sessions,
  () => []
);
await planBinding.hydrate();
await sessionBinding.hydrate();

const flushPlans = planBinding.flush;
const flushSessions = sessionBinding.flush;

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}
function nextPlanNumber(orgId: string): string {
  const n = plans.filter((p) => p.organizationId === orgId).length + 1;
  return `PT-${orgSuffix(orgId)}-${String(n).padStart(4, "0")}`;
}
function nextSessionNumber(orgId: string): string {
  const n = sessions.filter((s) => s.organizationId === orgId).length + 1;
  return `PTS-${orgSuffix(orgId)}-${String(n).padStart(5, "0")}`;
}

export const MODALITY_LABEL: Record<TherapyModality, string> = {
  manual: "Manual therapy",
  exercise: "Therapeutic exercise",
  electrotherapy: "Electrotherapy / TENS",
  ultrasound: "Ultrasound",
  traction: "Traction",
  hydrotherapy: "Hydrotherapy",
  cryo: "Cryotherapy",
  heat: "Heat therapy",
  taping: "Taping / strapping",
  gait_training: "Gait training",
  respiratory: "Respiratory / chest physio",
  neurodev: "Neuro-developmental",
  other: "Other",
};

export const REGION_LABEL: Record<BodyRegion, string> = {
  neck: "Neck / cervical",
  shoulder: "Shoulder",
  upper_back: "Upper back / thoracic",
  lower_back: "Lower back / lumbar",
  hip: "Hip",
  knee: "Knee",
  ankle: "Ankle / foot",
  wrist: "Wrist / hand",
  elbow: "Elbow",
  whole_body: "Whole body / multi-site",
  neuro: "Neurological",
  cardio_resp: "Cardio-respiratory",
  other: "Other",
};

// ---------- Plans ----------

export function listPlans(opts: {
  organizationId: string;
  status?: PlanStatus;
  patientId?: string;
  therapist?: string;
}): PhysioPlan[] {
  let list = plans.filter(
    (p) => p.organizationId === opts.organizationId
  );
  if (opts.status) list = list.filter((p) => p.status === opts.status);
  if (opts.patientId) list = list.filter((p) => p.patientId === opts.patientId);
  if (opts.therapist)
    list = list.filter(
      (p) =>
        p.therapist?.toLowerCase() === opts.therapist!.toLowerCase()
    );
  const order: Record<PlanStatus, number> = {
    active: 0,
    completed: 1,
    discontinued: 2,
  };
  return list.sort((a, b) => {
    const s = order[a.status] - order[b.status];
    if (s !== 0) return s;
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  });
}

export interface PlanInput {
  patientId?: string;
  patientName?: string;
  patientMRN?: string;
  diagnosis?: string;
  bodyRegion?: BodyRegion;
  therapist?: string;
  referredBy?: string;
  goals?: string;
  precautions?: string;
  prescribedSessions?: number;
  startedAt?: string;
  expectedEndAt?: string;
  endedAt?: string;
  status?: PlanStatus;
  dischargeNote?: string;
}

export function createPlan(
  organizationId: string,
  input: PlanInput
):
  | { ok: false; error: string }
  | { ok: true; plan: PhysioPlan } {
  if (!input.patientName || !input.patientName.trim())
    return { ok: false, error: "missing_patient" };
  if (!input.diagnosis || !input.diagnosis.trim())
    return { ok: false, error: "missing_diagnosis" };
  const now = new Date().toISOString();
  const p: PhysioPlan = {
    id: `ptpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    planNumber: nextPlanNumber(organizationId),
    patientId: input.patientId || undefined,
    patientName: input.patientName.trim(),
    patientMRN: input.patientMRN?.trim() || undefined,
    diagnosis: input.diagnosis.trim(),
    bodyRegion: input.bodyRegion || "other",
    therapist: input.therapist?.trim() || undefined,
    referredBy: input.referredBy?.trim() || undefined,
    goals: input.goals?.trim() || undefined,
    precautions: input.precautions?.trim() || undefined,
    prescribedSessions: Math.max(1, input.prescribedSessions ?? 6),
    startedAt: input.startedAt || now,
    expectedEndAt: input.expectedEndAt || undefined,
    status: input.status || "active",
    createdAt: now,
    updatedAt: now,
  };
  plans.unshift(p);
  flushPlans();
  return { ok: true, plan: p };
}

export function updatePlan(
  id: string,
  organizationId: string,
  patch: PlanInput
): PhysioPlan | null {
  const p = plans.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!p) return null;
  const now = new Date().toISOString();
  if (patch.patientId !== undefined) p.patientId = patch.patientId || undefined;
  if (patch.patientName !== undefined && patch.patientName.trim())
    p.patientName = patch.patientName.trim();
  if (patch.patientMRN !== undefined)
    p.patientMRN = patch.patientMRN?.trim() || undefined;
  if (patch.diagnosis !== undefined && patch.diagnosis.trim())
    p.diagnosis = patch.diagnosis.trim();
  if (patch.bodyRegion !== undefined) p.bodyRegion = patch.bodyRegion;
  if (patch.therapist !== undefined)
    p.therapist = patch.therapist?.trim() || undefined;
  if (patch.referredBy !== undefined)
    p.referredBy = patch.referredBy?.trim() || undefined;
  if (patch.goals !== undefined) p.goals = patch.goals?.trim() || undefined;
  if (patch.precautions !== undefined)
    p.precautions = patch.precautions?.trim() || undefined;
  if (patch.prescribedSessions !== undefined)
    p.prescribedSessions = Math.max(1, patch.prescribedSessions);
  if (patch.startedAt !== undefined) p.startedAt = patch.startedAt;
  if (patch.expectedEndAt !== undefined)
    p.expectedEndAt = patch.expectedEndAt || undefined;
  if (patch.dischargeNote !== undefined)
    p.dischargeNote = patch.dischargeNote?.trim() || undefined;

  if (patch.status !== undefined && patch.status !== p.status) {
    p.status = patch.status;
    if (patch.status === "completed" || patch.status === "discontinued") {
      if (!p.endedAt) p.endedAt = now;
    } else if (patch.status === "active") {
      // reopen -> clear endedAt
      p.endedAt = undefined;
    }
  }
  p.updatedAt = now;
  flushPlans();
  return p;
}

export function deletePlan(id: string, organizationId: string): boolean {
  const idx = plans.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (idx < 0) return false;
  // cascade: remove all sessions under this plan
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (
      sessions[i].planId === id &&
      sessions[i].organizationId === organizationId
    ) {
      sessions.splice(i, 1);
    }
  }
  plans.splice(idx, 1);
  flushPlans();
  flushSessions();
  return true;
}

// ---------- Sessions ----------

export function listSessions(opts: {
  organizationId: string;
  planId?: string;
  status?: SessionStatus;
  from?: string;
  to?: string;
}): PhysioSession[] {
  let list = sessions.filter(
    (s) => s.organizationId === opts.organizationId
  );
  if (opts.planId) list = list.filter((s) => s.planId === opts.planId);
  if (opts.status) list = list.filter((s) => s.status === opts.status);
  if (opts.from) {
    const f = new Date(opts.from).getTime();
    list = list.filter((s) => new Date(s.scheduledAt).getTime() >= f);
  }
  if (opts.to) {
    const t = new Date(opts.to).getTime();
    list = list.filter((s) => new Date(s.scheduledAt).getTime() <= t);
  }
  const order: Record<SessionStatus, number> = {
    scheduled: 0,
    attended: 1,
    completed: 2,
    missed: 3,
    cancelled: 4,
  };
  return list.sort((a, b) => {
    const s = order[a.status] - order[b.status];
    if (s !== 0) return s;
    return (
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    );
  });
}

export interface SessionInput {
  planId?: string;
  scheduledAt?: string;
  attendedAt?: string;
  completedAt?: string;
  status?: SessionStatus;
  durationMin?: number;
  therapist?: string;
  modalities?: TherapyModality[];
  exercises?: string;
  vasPainPre?: number;
  vasPainPost?: number;
  homeProgram?: string;
  notes?: string;
  cancelReason?: string;
}

export function createSession(
  organizationId: string,
  input: SessionInput
):
  | { ok: false; error: string }
  | { ok: true; session: PhysioSession } {
  if (!input.planId) return { ok: false, error: "missing_plan" };
  const plan = plans.find(
    (p) => p.id === input.planId && p.organizationId === organizationId
  );
  if (!plan) return { ok: false, error: "plan_not_found" };
  const now = new Date().toISOString();
  const s: PhysioSession = {
    id: `pts-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    planId: plan.id,
    sessionNumber: nextSessionNumber(organizationId),
    scheduledAt: input.scheduledAt || now,
    status: input.status || "scheduled",
    therapist: input.therapist?.trim() || plan.therapist,
    modalities: input.modalities || [],
    exercises: input.exercises?.trim() || undefined,
    vasPainPre: input.vasPainPre,
    vasPainPost: input.vasPainPost,
    homeProgram: input.homeProgram?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    durationMin: input.durationMin,
    createdAt: now,
    updatedAt: now,
  };
  sessions.unshift(s);
  flushSessions();
  return { ok: true, session: s };
}

export function updateSession(
  id: string,
  organizationId: string,
  patch: SessionInput & { status?: SessionStatus }
): PhysioSession | null {
  const s = sessions.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!s) return null;
  const now = new Date().toISOString();
  if (patch.scheduledAt !== undefined) s.scheduledAt = patch.scheduledAt;
  if (patch.durationMin !== undefined) s.durationMin = patch.durationMin;
  if (patch.therapist !== undefined)
    s.therapist = patch.therapist?.trim() || undefined;
  if (patch.modalities !== undefined) s.modalities = patch.modalities || [];
  if (patch.exercises !== undefined)
    s.exercises = patch.exercises?.trim() || undefined;
  if (patch.vasPainPre !== undefined) s.vasPainPre = patch.vasPainPre;
  if (patch.vasPainPost !== undefined) s.vasPainPost = patch.vasPainPost;
  if (patch.homeProgram !== undefined)
    s.homeProgram = patch.homeProgram?.trim() || undefined;
  if (patch.notes !== undefined) s.notes = patch.notes?.trim() || undefined;
  if (patch.cancelReason !== undefined)
    s.cancelReason = patch.cancelReason?.trim() || undefined;

  if (patch.status !== undefined && patch.status !== s.status) {
    s.status = patch.status;
    if (patch.status === "attended" && !s.attendedAt) s.attendedAt = now;
    if (patch.status === "completed") {
      if (!s.attendedAt) s.attendedAt = now;
      if (!s.completedAt) s.completedAt = now;
    }
  }
  s.updatedAt = now;
  flushSessions();
  return s;
}

export function deleteSession(
  id: string,
  organizationId: string
): boolean {
  const idx = sessions.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (idx < 0) return false;
  sessions.splice(idx, 1);
  flushSessions();
  return true;
}

// Patient cascade — detach only (keep rehab audit)
export function unlinkPhysioForPatient(
  organizationId: string,
  patientId: string
): number {
  let n = 0;
  for (const p of plans) {
    if (p.organizationId === organizationId && p.patientId === patientId) {
      p.patientId = undefined;
      p.updatedAt = new Date().toISOString();
      n++;
    }
  }
  if (n > 0) flushPlans();
  return n;
  // flush:auto-unlink
  plans.splice(plans.length, 0);
}

// ---------- Derived ----------

export function planProgress(plan: PhysioPlan): {
  delivered: number;
  scheduled: number;
  missed: number;
  remaining: number;
  avgPainDrop: number | null;
  progressPct: number;
} {
  const planSessions = sessions.filter(
    (s) => s.planId === plan.id && s.organizationId === plan.organizationId
  );
  const delivered = planSessions.filter(
    (s) => s.status === "completed" || s.status === "attended"
  ).length;
  const scheduled = planSessions.filter(
    (s) => s.status === "scheduled"
  ).length;
  const missed = planSessions.filter((s) => s.status === "missed").length;
  const remaining = Math.max(0, plan.prescribedSessions - delivered);
  const drops = planSessions
    .filter(
      (s) =>
        s.vasPainPre !== undefined &&
        s.vasPainPost !== undefined &&
        (s.status === "completed" || s.status === "attended")
    )
    .map((s) => s.vasPainPre! - s.vasPainPost!);
  const avgPainDrop = drops.length
    ? Math.round(
        (drops.reduce((a, b) => a + b, 0) / drops.length) * 10
      ) / 10
    : null;
  const progressPct = plan.prescribedSessions
    ? Math.min(100, Math.round((delivered / plan.prescribedSessions) * 100))
    : 0;
  return { delivered, scheduled, missed, remaining, avgPainDrop, progressPct };
}

// ---------- Stats ----------

export interface PhysioStats {
  activePlans: number;
  sessionsToday: number;
  sessionsThisMonth: number;
  completedThisMonth: number;
  noShowRatePct: number; // missed / (missed + attended + completed) this month
  avgPainDropThisMonth: number; // across completed sessions with both vas values
  plansCompletedThisMonth: number;
}

export function computeStats(organizationId: string): PhysioStats {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = todayStart.getTime() + 24 * 3600 * 1000;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const orgPlans = plans.filter((p) => p.organizationId === organizationId);
  const orgSessions = sessions.filter(
    (s) => s.organizationId === organizationId
  );

  const activePlans = orgPlans.filter((p) => p.status === "active").length;
  const sessionsToday = orgSessions.filter((s) => {
    const t = new Date(s.scheduledAt).getTime();
    return t >= todayStart.getTime() && t < todayEnd;
  }).length;

  const monthSessions = orgSessions.filter(
    (s) => new Date(s.scheduledAt).getTime() >= monthStart.getTime()
  );
  const sessionsThisMonth = monthSessions.length;
  const completedThisMonth = monthSessions.filter(
    (s) => s.status === "completed"
  ).length;
  const attendedLike = monthSessions.filter(
    (s) =>
      s.status === "completed" ||
      s.status === "attended" ||
      s.status === "missed"
  );
  const missed = attendedLike.filter((s) => s.status === "missed").length;
  const noShowRatePct = attendedLike.length
    ? Math.round((missed / attendedLike.length) * 100)
    : 0;

  const drops = monthSessions
    .filter(
      (s) =>
        s.vasPainPre !== undefined &&
        s.vasPainPost !== undefined &&
        (s.status === "completed" || s.status === "attended")
    )
    .map((s) => s.vasPainPre! - s.vasPainPost!);
  const avgPainDropThisMonth = drops.length
    ? Math.round((drops.reduce((a, b) => a + b, 0) / drops.length) * 10) / 10
    : 0;

  const plansCompletedThisMonth = orgPlans.filter(
    (p) =>
      p.status === "completed" &&
      p.endedAt &&
      new Date(p.endedAt).getTime() >= monthStart.getTime()
  ).length;

  void now;

  return {
    activePlans,
    sessionsToday,
    sessionsThisMonth,
    completedThisMonth,
    noShowRatePct,
    avgPainDropThisMonth,
    plansCompletedThisMonth,
  };
}
