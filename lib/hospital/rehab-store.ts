// Rehabilitation (PM&R). Tenant-scoped. RehabEpisode + RehabSession.
// Detach-only cascade.

import { bindPersistentArray } from "../persistent-array";

export type RehabDiscipline = "pt" | "ot" | "st" | "pm_r" | "prosthetics" | "orthotics" | "vocational" | "recreational";
export type EpisodeStatus = "referred" | "intake" | "active" | "on_hold" | "discharged" | "cancelled";
export type EpisodeCategory = "neuro" | "ortho" | "cardiac" | "pulmonary" | "pediatric" | "geriatric" | "spinal_cord" | "amputee" | "post_op" | "other";
export type SessionStatus = "scheduled" | "completed" | "missed" | "cancelled";
export type FimCategory = "self_care" | "mobility" | "communication" | "cognition";

export interface FunctionalGoal {
  id: string;
  text: string;
  targetDate?: string;
  baseline?: string;      // initial status
  current?: string;       // latest status
  achieved: boolean;
}

export interface FimScore {
  // Functional Independence Measure (1-7, total 18-126)
  eating?: number;
  grooming?: number;
  bathing?: number;
  upperBodyDressing?: number;
  lowerBodyDressing?: number;
  toileting?: number;
  bladder?: number;
  bowel?: number;
  bedToChairTransfer?: number;
  toiletTransfer?: number;
  tubTransfer?: number;
  walkWheelchair?: number;
  stairs?: number;
  comprehension?: number;
  expression?: number;
  socialInteraction?: number;
  problemSolving?: number;
  memory?: number;
}

export interface RehabEpisode {
  id: string;                  // REH-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  referringProvider?: string;
  rehabProvider: string;
  discipline: RehabDiscipline;
  category: EpisodeCategory;
  status: EpisodeStatus;
  referralDate: string;
  intakeDate?: string;
  dischargeDate?: string;
  primaryDiagnosis?: string;   // e.g. "L stroke - R hemiparesis"
  admissionType?: "inpatient" | "outpatient" | "day_care";
  // Assessment
  initialAssessmentNote?: string;
  precautions?: string;        // weight-bearing, fall, swallow
  equipmentNeeded?: string;    // walker, wheelchair, AFO
  caregiverName?: string;
  caregiverPhone?: string;
  // FIM tracking
  fimAdmission?: FimScore;
  fimDischarge?: FimScore;
  // Goals
  goals: FunctionalGoal[];
  // Planning
  prescribedSessionsPerWeek?: number;
  totalSessionsAuthorized?: number;
  sessionsCompleted?: number;  // maintained from sessions
  dischargeSummary?: string;
  dischargeDestination?: "home" | "home_with_caregiver" | "snf" | "inpatient_rehab" | "expired" | "other";
  createdAt: string;
  updatedAt: string;
}

export interface RehabSession {
  id: string;                  // RSN-{suffix}-{seq}
  organizationId: string;
  episodeId: string;
  patientId: string;
  patientName: string;
  therapistName: string;
  discipline: RehabDiscipline;
  status: SessionStatus;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  durationMin?: number;
  interventions?: string;      // gait training, PROM, e-stim
  painPreNrs?: number;
  painPostNrs?: number;
  tolerance?: "excellent" | "good" | "fair" | "poor";
  progressNote?: string;
  homeProgram?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

const episodes: RehabEpisode[] = [];
const sessions: RehabSession[] = [];
const hE = bindPersistentArray<RehabEpisode>("rehab-episodes", episodes, () => []);
const hS = bindPersistentArray<RehabSession>("rehab-sessions", sessions, () => []);
await hE;
await hS;

export const DISCIPLINE_LABEL: Record<RehabDiscipline, string> = {
  pt: "Physical therapy", ot: "Occupational therapy", st: "Speech therapy",
  pm_r: "Physiatry (PM&R)", prosthetics: "Prosthetics", orthotics: "Orthotics",
  vocational: "Vocational", recreational: "Recreational",
};
export const CATEGORY_LABEL: Record<EpisodeCategory, string> = {
  neuro: "Neurological", ortho: "Orthopedic", cardiac: "Cardiac",
  pulmonary: "Pulmonary", pediatric: "Pediatric", geriatric: "Geriatric",
  spinal_cord: "Spinal cord injury", amputee: "Amputee", post_op: "Post-op", other: "Other",
};
export const EP_STATUS_LABEL: Record<EpisodeStatus, string> = {
  referred: "Referred", intake: "Intake", active: "Active",
  on_hold: "On hold", discharged: "Discharged", cancelled: "Cancelled",
};
export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  scheduled: "Scheduled", completed: "Completed", missed: "Missed", cancelled: "Cancelled",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextEpId(o: string) {
  const p = `REH-${suf(o)}-`;
  const m = episodes.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}
function nextSnId(o: string) {
  const p = `RSN-${suf(o)}-`;
  const m = sessions.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

export function fimTotal(f?: FimScore): number {
  if (!f) return 0;
  const ks: (keyof FimScore)[] = [
    "eating", "grooming", "bathing", "upperBodyDressing", "lowerBodyDressing",
    "toileting", "bladder", "bowel", "bedToChairTransfer", "toiletTransfer",
    "tubTransfer", "walkWheelchair", "stairs", "comprehension", "expression",
    "socialInteraction", "problemSolving", "memory",
  ];
  return ks.reduce((s, k) => s + (Number(f[k]) || 0), 0);
}

// Episodes
export function listEpisodes(opts: { organizationId: string; status?: EpisodeStatus; discipline?: RehabDiscipline; category?: EpisodeCategory; patientId?: string }): RehabEpisode[] {
  return episodes.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.discipline ? r.discipline === opts.discipline : true))
    .filter((r) => (opts.category ? r.category === opts.category : true))
    .filter((r) => (opts.patientId ? r.patientId === opts.patientId : true))
    .sort((a, b) => b.referralDate.localeCompare(a.referralDate));
}
export function createEpisode(orgId: string, input: Partial<RehabEpisode>): { ok: true; record: RehabEpisode } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || !input.rehabProvider) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: RehabEpisode = {
    id: nextEpId(orgId), organizationId: orgId,
    patientId: input.patientId, patientName: input.patientName,
    referringProvider: input.referringProvider,
    rehabProvider: input.rehabProvider,
    discipline: (input.discipline || "pt") as RehabDiscipline,
    category: (input.category || "other") as EpisodeCategory,
    status: (input.status || "referred") as EpisodeStatus,
    referralDate: input.referralDate || now,
    intakeDate: input.intakeDate,
    dischargeDate: input.dischargeDate,
    primaryDiagnosis: input.primaryDiagnosis,
    admissionType: input.admissionType,
    initialAssessmentNote: input.initialAssessmentNote,
    precautions: input.precautions,
    equipmentNeeded: input.equipmentNeeded,
    caregiverName: input.caregiverName,
    caregiverPhone: input.caregiverPhone,
    fimAdmission: input.fimAdmission,
    fimDischarge: input.fimDischarge,
    goals: input.goals || [],
    prescribedSessionsPerWeek: input.prescribedSessionsPerWeek,
    totalSessionsAuthorized: input.totalSessionsAuthorized,
    sessionsCompleted: 0,
    dischargeSummary: input.dischargeSummary,
    dischargeDestination: input.dischargeDestination,
    createdAt: now, updatedAt: now,
  };
  episodes.push(r);
  return { ok: true, record: r };
}
export function updateEpisode(id: string, orgId: string, patch: Partial<RehabEpisode>): RehabEpisode | null {
  const i = episodes.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = episodes[i];
  const now = new Date().toISOString();
  const next: RehabEpisode = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.status === "active" && !next.intakeDate) next.intakeDate = now;
  if (next.status === "discharged" && prev.status !== "discharged" && !next.dischargeDate) next.dischargeDate = now;
  episodes[i] = next;
  return next;
}
export function deleteEpisode(id: string, orgId: string): boolean {
  const i = episodes.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  episodes.splice(i, 1);
  // Delete linked sessions
  for (let j = sessions.length - 1; j >= 0; j--) {
    if (sessions[j].episodeId === id && sessions[j].organizationId === orgId) sessions.splice(j, 1);
  }
  return true;
}

function recountSessions(episodeId: string, orgId: string) {
  const ep = episodes.find((r) => r.id === episodeId && r.organizationId === orgId);
  if (!ep) return;
  ep.sessionsCompleted = sessions.filter((s) => s.episodeId === episodeId && s.organizationId === orgId && s.status === "completed").length;
  ep.updatedAt = new Date().toISOString();
}

// Sessions
export function listSessions(opts: { organizationId: string; episodeId?: string; status?: SessionStatus; patientId?: string }): RehabSession[] {
  return sessions.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.episodeId ? r.episodeId === opts.episodeId : true))
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.patientId ? r.patientId === opts.patientId : true))
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
}
export function createSession(orgId: string, input: Partial<RehabSession>): { ok: true; record: RehabSession } | { ok: false; error: string } {
  if (!input.episodeId || !input.patientId || !input.patientName || !input.therapistName) return { ok: false, error: "missing_required" };
  const ep = episodes.find((r) => r.id === input.episodeId && r.organizationId === orgId);
  if (!ep) return { ok: false, error: "episode_not_found" };
  const now = new Date().toISOString();
  const r: RehabSession = {
    id: nextSnId(orgId), organizationId: orgId,
    episodeId: input.episodeId,
    patientId: input.patientId, patientName: input.patientName,
    therapistName: input.therapistName,
    discipline: (input.discipline || ep.discipline) as RehabDiscipline,
    status: (input.status || "scheduled") as SessionStatus,
    scheduledAt: input.scheduledAt || now,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    durationMin: input.durationMin,
    interventions: input.interventions,
    painPreNrs: input.painPreNrs,
    painPostNrs: input.painPostNrs,
    tolerance: input.tolerance,
    progressNote: input.progressNote,
    homeProgram: input.homeProgram,
    cancelReason: input.cancelReason,
    createdAt: now, updatedAt: now,
  };
  sessions.push(r);
  recountSessions(r.episodeId, orgId);
  return { ok: true, record: r };
}
export function updateSession(id: string, orgId: string, patch: Partial<RehabSession>): RehabSession | null {
  const i = sessions.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = sessions[i];
  const now = new Date().toISOString();
  const next: RehabSession = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.status === "completed" && prev.status !== "completed" && !next.endedAt) next.endedAt = now;
  sessions[i] = next;
  recountSessions(next.episodeId, orgId);
  return next;
}
export function deleteSession(id: string, orgId: string): boolean {
  const i = sessions.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  const epId = sessions[i].episodeId;
  sessions.splice(i, 1);
  recountSessions(epId, orgId);
  return true;
}

export function computeStats(orgId: string) {
  const myE = episodes.filter((r) => r.organizationId === orgId);
  const myS = sessions.filter((r) => r.organizationId === orgId);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return {
    activeEpisodes: myE.filter((r) => r.status === "active").length,
    pendingIntake: myE.filter((r) => r.status === "referred").length,
    onHold: myE.filter((r) => r.status === "on_hold").length,
    dischargedMonth: myE.filter((r) => r.status === "discharged" && (r.dischargeDate || "") >= monthStart).length,
    sessionsToday: myS.filter((r) => r.scheduledAt >= todayStart && r.scheduledAt < todayEnd).length,
    completedWeek: myS.filter((r) => r.status === "completed" && (r.endedAt || r.scheduledAt) >= weekStart).length,
    missedWeek: myS.filter((r) => r.status === "missed" && r.scheduledAt >= weekStart).length,
  };
}

export function unlinkRehabForPatient(patientId: string, orgId: string): void {
  const stamp = new Date().toISOString();
  for (const r of episodes) {
    if (r.organizationId === orgId && r.patientId === patientId) {
      r.patientId = "";
      r.patientName = `[removed] ${r.patientName}`;
      if (r.status === "referred" || r.status === "intake" || r.status === "active" || r.status === "on_hold") {
        r.status = "cancelled";
      }
      r.updatedAt = stamp;
    }
  }
  for (const r of sessions) {
    if (r.organizationId === orgId && r.patientId === patientId) {
      r.patientId = "";
      r.patientName = `[removed] ${r.patientName}`;
      if (r.status === "scheduled") r.status = "cancelled";
      r.updatedAt = stamp;
    }
  }
  // flush:auto-unlink
  episodes.splice(episodes.length, 0);
}
