// Dialysis Sessions & Machine Management. Tenant-scoped.
//
// Two entities:
//   - DialysisMachine  (equipment register: availability + service due)
//   - DialysisSession  (per-patient per-date treatment record)
//
// Session lifecycle:
//   scheduled -> in_progress -> completed / cancelled
// Machine state flips to `in_use` while a session is in_progress and
// returns to `available` when the session ends. Lifetime running hours
// accrue from (endedAt - startedAt).
//
// Clinical snapshot captured per session: vascular access, anticoagulation,
// blood & dialysate flow rates, pre/post weight + vitals, ultrafiltration
// target vs achieved, complications, notes, assigned nurse + nephrologist.

import { bindPersistentArray } from "../persistent-array";

export type MachineStatus =
  | "available"
  | "in_use"
  | "maintenance"
  | "retired";

export type SessionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type AccessType =
  | "avf"
  | "avg"
  | "cvc_tunneled"
  | "cvc_temp";

export type Anticoagulant =
  | "heparin"
  | "lmwh"
  | "citrate"
  | "none";

export type Complication =
  | "hypotension"
  | "cramps"
  | "clotting"
  | "fever"
  | "bleeding"
  | "nausea"
  | "arrhythmia"
  | "other";

export interface DialysisMachine {
  id: string;
  organizationId: string;
  machineNumber: string; // DIAL-{suffix}-{seq}
  model: string;
  manufacturer?: string;
  serialNumber?: string;
  commissionedAt?: string;
  status: MachineStatus;
  location?: string; // ward/unit
  lastServicedAt?: string;
  nextServiceDueAt?: string;
  totalHours: number;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DialysisSession {
  id: string;
  organizationId: string;
  sessionNumber: string; // DSESS-{suffix}-{seq}
  patientId?: string;
  patientName: string;
  patientMRN?: string;
  machineId?: string;
  machineNumber?: string; // denormalized
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  status: SessionStatus;
  plannedDurationMin: number;
  actualDurationMin?: number;
  accessType: AccessType;
  anticoagulant: Anticoagulant;
  anticoagDose?: string;
  dialyzerModel?: string;
  bloodFlowRate?: number; // ml/min
  dialysateFlowRate?: number; // ml/min
  preWeight?: number; // kg
  postWeight?: number; // kg
  ufTarget?: number; // litres
  ufAchieved?: number; // litres
  preBpSys?: number;
  preBpDia?: number;
  prePulse?: number;
  postBpSys?: number;
  postBpDia?: number;
  postPulse?: number;
  complications: Complication[];
  nurse?: string;
  nephrologist?: string;
  notes?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

const machines: DialysisMachine[] = [];
const sessions: DialysisSession[] = [];

const machineBinding = bindPersistentArray<DialysisMachine>(
  "hospital-dialysis-machines",
  machines,
  () => []
);
const sessionBinding = bindPersistentArray<DialysisSession>(
  "hospital-dialysis-sessions",
  sessions,
  () => []
);
await machineBinding.hydrate();
await sessionBinding.hydrate();

const flushMachines = machineBinding.flush;
const flushSessions = sessionBinding.flush;

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}
function nextMachineNumber(orgId: string): string {
  const n = machines.filter((m) => m.organizationId === orgId).length + 1;
  return `DIAL-${orgSuffix(orgId)}-${String(n).padStart(3, "0")}`;
}
function nextSessionNumber(orgId: string): string {
  const n = sessions.filter((s) => s.organizationId === orgId).length + 1;
  return `DSESS-${orgSuffix(orgId)}-${String(n).padStart(5, "0")}`;
}

export const ACCESS_LABEL: Record<AccessType, string> = {
  avf: "AV Fistula",
  avg: "AV Graft",
  cvc_tunneled: "Tunneled CVC",
  cvc_temp: "Temporary CVC",
};
export const ANTICOAG_LABEL: Record<Anticoagulant, string> = {
  heparin: "Heparin",
  lmwh: "LMWH",
  citrate: "Citrate",
  none: "None (heparin-free)",
};
export const COMPLICATION_LABEL: Record<Complication, string> = {
  hypotension: "Hypotension",
  cramps: "Muscle cramps",
  clotting: "Circuit clotting",
  fever: "Fever / rigors",
  bleeding: "Access bleeding",
  nausea: "Nausea / vomiting",
  arrhythmia: "Arrhythmia",
  other: "Other",
};

// ---------- Machines ----------

export function listMachines(organizationId: string): DialysisMachine[] {
  return machines
    .filter((m) => m.organizationId === organizationId)
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      const order: Record<MachineStatus, number> = {
        available: 0,
        in_use: 1,
        maintenance: 2,
        retired: 3,
      };
      const s = order[a.status] - order[b.status];
      if (s !== 0) return s;
      return a.machineNumber.localeCompare(b.machineNumber);
    });
}

export interface MachineInput {
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  commissionedAt?: string;
  status?: MachineStatus;
  location?: string;
  lastServicedAt?: string;
  nextServiceDueAt?: string;
  notes?: string;
  active?: boolean;
}

export function createMachine(
  organizationId: string,
  input: MachineInput
): DialysisMachine {
  const now = new Date().toISOString();
  const m: DialysisMachine = {
    id: `dmac-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    machineNumber: nextMachineNumber(organizationId),
    model: input.model?.trim() || "Unnamed",
    manufacturer: input.manufacturer?.trim() || undefined,
    serialNumber: input.serialNumber?.trim() || undefined,
    commissionedAt: input.commissionedAt || undefined,
    status: input.status || "available",
    location: input.location?.trim() || undefined,
    lastServicedAt: input.lastServicedAt || undefined,
    nextServiceDueAt: input.nextServiceDueAt || undefined,
    totalHours: 0,
    notes: input.notes?.trim() || undefined,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  machines.unshift(m);
  flushMachines();
  return m;
}

export function updateMachine(
  id: string,
  organizationId: string,
  patch: Partial<MachineInput>
): DialysisMachine | null {
  const m = machines.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!m) return null;
  if (patch.model !== undefined) m.model = patch.model.trim() || m.model;
  if (patch.manufacturer !== undefined)
    m.manufacturer = patch.manufacturer?.trim() || undefined;
  if (patch.serialNumber !== undefined)
    m.serialNumber = patch.serialNumber?.trim() || undefined;
  if (patch.commissionedAt !== undefined)
    m.commissionedAt = patch.commissionedAt || undefined;
  if (patch.status !== undefined) m.status = patch.status;
  if (patch.location !== undefined)
    m.location = patch.location?.trim() || undefined;
  if (patch.lastServicedAt !== undefined)
    m.lastServicedAt = patch.lastServicedAt || undefined;
  if (patch.nextServiceDueAt !== undefined)
    m.nextServiceDueAt = patch.nextServiceDueAt || undefined;
  if (patch.notes !== undefined)
    m.notes = patch.notes?.trim() || undefined;
  if (patch.active !== undefined) m.active = patch.active;
  m.updatedAt = new Date().toISOString();
  flushMachines();
  return m;
}

export function deleteMachine(
  id: string,
  organizationId: string
): boolean {
  const idx = machines.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (idx < 0) return false;
  // Refuse delete if referenced by an active session.
  const busy = sessions.some(
    (s) =>
      s.organizationId === organizationId &&
      s.machineId === id &&
      (s.status === "scheduled" || s.status === "in_progress")
  );
  if (busy) return false;
  machines.splice(idx, 1);
  flushMachines();
  return true;
}

// ---------- Sessions ----------

export function listSessions(opts: {
  organizationId: string;
  status?: SessionStatus;
  patientId?: string;
  machineId?: string;
  from?: string;
  to?: string;
}): DialysisSession[] {
  let list = sessions.filter(
    (s) => s.organizationId === opts.organizationId
  );
  if (opts.status) list = list.filter((s) => s.status === opts.status);
  if (opts.patientId) list = list.filter((s) => s.patientId === opts.patientId);
  if (opts.machineId) list = list.filter((s) => s.machineId === opts.machineId);
  if (opts.from) {
    const f = new Date(opts.from).getTime();
    list = list.filter((s) => new Date(s.scheduledAt).getTime() >= f);
  }
  if (opts.to) {
    const t = new Date(opts.to).getTime();
    list = list.filter((s) => new Date(s.scheduledAt).getTime() <= t);
  }
  const statusOrder: Record<SessionStatus, number> = {
    in_progress: 0,
    scheduled: 1,
    completed: 2,
    cancelled: 3,
  };
  return list.sort((a, b) => {
    const s = statusOrder[a.status] - statusOrder[b.status];
    if (s !== 0) return s;
    return (
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    );
  });
}

export interface SessionInput {
  patientId?: string;
  patientName?: string;
  patientMRN?: string;
  machineId?: string;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  status?: SessionStatus;
  plannedDurationMin?: number;
  accessType?: AccessType;
  anticoagulant?: Anticoagulant;
  anticoagDose?: string;
  dialyzerModel?: string;
  bloodFlowRate?: number;
  dialysateFlowRate?: number;
  preWeight?: number;
  postWeight?: number;
  ufTarget?: number;
  ufAchieved?: number;
  preBpSys?: number;
  preBpDia?: number;
  prePulse?: number;
  postBpSys?: number;
  postBpDia?: number;
  postPulse?: number;
  complications?: Complication[];
  nurse?: string;
  nephrologist?: string;
  notes?: string;
  cancelReason?: string;
}

function resolveMachineNumber(
  organizationId: string,
  machineId?: string
): string | undefined {
  if (!machineId) return undefined;
  const m = machines.find(
    (x) => x.id === machineId && x.organizationId === organizationId
  );
  return m?.machineNumber;
}

export function createSession(
  organizationId: string,
  input: SessionInput
):
  | { ok: false; error: string }
  | { ok: true; session: DialysisSession } {
  if (!input.patientName || !input.patientName.trim()) {
    return { ok: false, error: "missing_patient" };
  }
  const now = new Date().toISOString();
  const s: DialysisSession = {
    id: `dses-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    sessionNumber: nextSessionNumber(organizationId),
    patientId: input.patientId || undefined,
    patientName: input.patientName.trim(),
    patientMRN: input.patientMRN?.trim() || undefined,
    machineId: input.machineId || undefined,
    machineNumber: resolveMachineNumber(organizationId, input.machineId),
    scheduledAt: input.scheduledAt || now,
    status: input.status || "scheduled",
    plannedDurationMin: Math.max(30, input.plannedDurationMin ?? 240),
    accessType: input.accessType || "avf",
    anticoagulant: input.anticoagulant || "heparin",
    anticoagDose: input.anticoagDose?.trim() || undefined,
    dialyzerModel: input.dialyzerModel?.trim() || undefined,
    bloodFlowRate: input.bloodFlowRate,
    dialysateFlowRate: input.dialysateFlowRate,
    preWeight: input.preWeight,
    postWeight: input.postWeight,
    ufTarget: input.ufTarget,
    ufAchieved: input.ufAchieved,
    preBpSys: input.preBpSys,
    preBpDia: input.preBpDia,
    prePulse: input.prePulse,
    postBpSys: input.postBpSys,
    postBpDia: input.postBpDia,
    postPulse: input.postPulse,
    complications: input.complications || [],
    nurse: input.nurse?.trim() || undefined,
    nephrologist: input.nephrologist?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  sessions.unshift(s);
  flushSessions();
  return { ok: true, session: s };
}

function computeDurationMin(startedAt?: string, endedAt?: string): number | undefined {
  if (!startedAt || !endedAt) return undefined;
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.round(ms / 60000);
}

function assignMachineState(
  organizationId: string,
  machineId: string | undefined,
  desired: MachineStatus
): void {
  if (!machineId) return;
  const m = machines.find(
    (x) => x.id === machineId && x.organizationId === organizationId
  );
  if (!m) return;
  if (m.status === "retired" || m.status === "maintenance") return;
  m.status = desired;
  m.updatedAt = new Date().toISOString();
}

export function updateSession(
  id: string,
  organizationId: string,
  patch: SessionInput & { status?: SessionStatus }
): DialysisSession | null {
  const s = sessions.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!s) return null;
  const now = new Date().toISOString();

  if (patch.patientId !== undefined) s.patientId = patch.patientId || undefined;
  if (patch.patientName !== undefined && patch.patientName.trim())
    s.patientName = patch.patientName.trim();
  if (patch.patientMRN !== undefined)
    s.patientMRN = patch.patientMRN?.trim() || undefined;
  if (patch.machineId !== undefined) {
    s.machineId = patch.machineId || undefined;
    s.machineNumber = resolveMachineNumber(organizationId, s.machineId);
  }
  if (patch.scheduledAt !== undefined) s.scheduledAt = patch.scheduledAt;
  if (patch.plannedDurationMin !== undefined)
    s.plannedDurationMin = Math.max(30, patch.plannedDurationMin);
  if (patch.accessType !== undefined) s.accessType = patch.accessType;
  if (patch.anticoagulant !== undefined) s.anticoagulant = patch.anticoagulant;
  if (patch.anticoagDose !== undefined)
    s.anticoagDose = patch.anticoagDose?.trim() || undefined;
  if (patch.dialyzerModel !== undefined)
    s.dialyzerModel = patch.dialyzerModel?.trim() || undefined;
  if (patch.bloodFlowRate !== undefined) s.bloodFlowRate = patch.bloodFlowRate;
  if (patch.dialysateFlowRate !== undefined)
    s.dialysateFlowRate = patch.dialysateFlowRate;
  if (patch.preWeight !== undefined) s.preWeight = patch.preWeight;
  if (patch.postWeight !== undefined) s.postWeight = patch.postWeight;
  if (patch.ufTarget !== undefined) s.ufTarget = patch.ufTarget;
  if (patch.ufAchieved !== undefined) s.ufAchieved = patch.ufAchieved;
  if (patch.preBpSys !== undefined) s.preBpSys = patch.preBpSys;
  if (patch.preBpDia !== undefined) s.preBpDia = patch.preBpDia;
  if (patch.prePulse !== undefined) s.prePulse = patch.prePulse;
  if (patch.postBpSys !== undefined) s.postBpSys = patch.postBpSys;
  if (patch.postBpDia !== undefined) s.postBpDia = patch.postBpDia;
  if (patch.postPulse !== undefined) s.postPulse = patch.postPulse;
  if (patch.complications !== undefined)
    s.complications = patch.complications || [];
  if (patch.nurse !== undefined) s.nurse = patch.nurse?.trim() || undefined;
  if (patch.nephrologist !== undefined)
    s.nephrologist = patch.nephrologist?.trim() || undefined;
  if (patch.notes !== undefined) s.notes = patch.notes?.trim() || undefined;
  if (patch.cancelReason !== undefined)
    s.cancelReason = patch.cancelReason?.trim() || undefined;

  // Status transitions with side-effects
  if (patch.status !== undefined && patch.status !== s.status) {
    const prev = s.status;
    s.status = patch.status;

    if (patch.status === "in_progress" && prev === "scheduled") {
      s.startedAt = patch.startedAt || now;
      assignMachineState(organizationId, s.machineId, "in_use");
    }
    if (patch.status === "completed" && prev !== "completed") {
      s.endedAt = patch.endedAt || now;
      if (!s.startedAt) s.startedAt = s.scheduledAt;
      s.actualDurationMin = computeDurationMin(s.startedAt, s.endedAt);
      // Accrue machine hours & release
      if (s.machineId && s.actualDurationMin) {
        const m = machines.find(
          (x) => x.id === s.machineId && x.organizationId === organizationId
        );
        if (m) {
          m.totalHours = Math.round(
            (m.totalHours + s.actualDurationMin / 60) * 100
          ) / 100;
        }
      }
      assignMachineState(organizationId, s.machineId, "available");
      flushMachines();
    }
    if (patch.status === "cancelled" && prev !== "cancelled") {
      // Release machine if it was reserved
      if (prev === "in_progress") {
        assignMachineState(organizationId, s.machineId, "available");
        flushMachines();
      }
    }
  } else {
    // Allow direct startedAt/endedAt edits without status change
    if (patch.startedAt !== undefined) s.startedAt = patch.startedAt;
    if (patch.endedAt !== undefined) s.endedAt = patch.endedAt;
    if (s.startedAt && s.endedAt) {
      s.actualDurationMin = computeDurationMin(s.startedAt, s.endedAt);
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
  const s = sessions[idx];
  // Release machine if session was live
  if (s.status === "in_progress") {
    assignMachineState(organizationId, s.machineId, "available");
    flushMachines();
  }
  sessions.splice(idx, 1);
  flushSessions();
  return true;
}

// Patient cascade — detach only (retain clinical history / audit).
export function unlinkDialysisForPatient(
  organizationId: string,
  patientId: string
): number {
  let n = 0;
  for (const s of sessions) {
    if (s.organizationId === organizationId && s.patientId === patientId) {
      s.patientId = undefined;
      s.updatedAt = new Date().toISOString();
      n++;
    }
  }
  if (n > 0) flushSessions();
  return n;
  // flush:auto-unlink
  sessions.splice(sessions.length, 0);
}

// ---------- Stats ----------

export interface DialysisStats {
  sessionsToday: number;
  activeSessions: number;
  completedThisMonth: number;
  cancelledThisMonth: number;
  availableMachines: number;
  inUseMachines: number;
  maintenanceMachines: number;
  servicesDueSoon: number; // machines with next service in <=14d or overdue
  avgUfAchievementPct: number; // completed this month, ufAchieved/ufTarget
  complicationRatePct: number; // completed this month with any complication
}

export function computeStats(organizationId: string): DialysisStats {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = todayStart.getTime() + 24 * 3600 * 1000;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const twoWeeks = now + 14 * 24 * 3600 * 1000;

  const orgSessions = sessions.filter(
    (s) => s.organizationId === organizationId
  );
  const orgMachines = machines.filter(
    (m) => m.organizationId === organizationId && m.active
  );

  const sessionsToday = orgSessions.filter((s) => {
    const t = new Date(s.scheduledAt).getTime();
    return t >= todayStart.getTime() && t < todayEnd;
  }).length;
  const activeSessions = orgSessions.filter(
    (s) => s.status === "in_progress"
  ).length;
  const monthCompleted = orgSessions.filter(
    (s) =>
      s.status === "completed" &&
      s.endedAt &&
      new Date(s.endedAt).getTime() >= monthStart.getTime()
  );
  const completedThisMonth = monthCompleted.length;
  const cancelledThisMonth = orgSessions.filter(
    (s) =>
      s.status === "cancelled" &&
      new Date(s.updatedAt).getTime() >= monthStart.getTime()
  ).length;

  const availableMachines = orgMachines.filter(
    (m) => m.status === "available"
  ).length;
  const inUseMachines = orgMachines.filter(
    (m) => m.status === "in_use"
  ).length;
  const maintenanceMachines = orgMachines.filter(
    (m) => m.status === "maintenance"
  ).length;
  const servicesDueSoon = orgMachines.filter(
    (m) =>
      m.nextServiceDueAt &&
      new Date(m.nextServiceDueAt).getTime() <= twoWeeks
  ).length;

  const ufSessions = monthCompleted.filter(
    (s) => (s.ufTarget || 0) > 0 && s.ufAchieved !== undefined
  );
  const avgUfAchievementPct = ufSessions.length
    ? Math.round(
        (ufSessions.reduce(
          (sum, s) => sum + (s.ufAchieved! / (s.ufTarget || 1)),
          0
        ) /
          ufSessions.length) *
          100
      )
    : 0;
  const complicationRatePct = completedThisMonth
    ? Math.round(
        (monthCompleted.filter((s) => s.complications.length > 0).length /
          completedThisMonth) *
          100
      )
    : 0;

  return {
    sessionsToday,
    activeSessions,
    completedThisMonth,
    cancelledThisMonth,
    availableMachines,
    inUseMachines,
    maintenanceMachines,
    servicesDueSoon,
    avgUfAchievementPct,
    complicationRatePct,
  };
}
