// ICU / Critical Care. Tenant-scoped.
//
// Two entities:
//   ICUStay        — patient in ICU (reason, vent/pressor flags, SOFA/APACHE,
//                    admission and discharge info)
//   ICUObservation — periodic (hourly / q4h / shift) nurse charting entry
//                    with vitals, vent settings, pressors, GCS/RASS, I/O
//
// Stay lifecycle:
//   active -> closed  (with endReason: stepped_down / transferred / deceased / discharged)
//
// On patient delete: stays + observations detach (clinical record survives).

import { bindPersistentArray } from "../persistent-array";

export type StayStatus = "active" | "closed";

export type StayEndReason =
  | "stepped_down"
  | "transferred"
  | "discharged"
  | "deceased"
  | "dama"              // discharge against medical advice
  | "other";

export type AdmissionSource =
  | "ed"
  | "ward"
  | "ot"
  | "transfer_in"
  | "direct"
  | "other";

export type VentMode =
  | "none"
  | "niv"               // non-invasive (BiPAP/CPAP)
  | "ac_vc"             // assist-control volume
  | "ac_pc"             // assist-control pressure
  | "simv"
  | "psv"               // pressure support
  | "spont"             // spontaneous (weaning)
  | "hfnc"              // high-flow nasal cannula
  | "t_piece";

export type SedationAgent =
  | "none"
  | "propofol"
  | "midazolam"
  | "fentanyl"
  | "morphine"
  | "dexmedetomidine"
  | "ketamine"
  | "paralytic"
  | "other";

export type ICUReason =
  | "sepsis"
  | "ards"
  | "post_op"
  | "cardiac_arrest"
  | "stroke"
  | "mi"
  | "respiratory_failure"
  | "renal_failure"
  | "dka"
  | "trauma"
  | "tbi"               // traumatic brain injury
  | "poisoning"
  | "gi_bleed"
  | "shock"
  | "other";

export interface Pressor {
  name: string;          // noradrenaline, adrenaline, dopamine, dobutamine, vasopressin, milrinone
  rate: string;          // "0.1 mcg/kg/min", "5 mcg/min"
}

export interface ICUStay {
  id: string;            // ICU-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  intensivist?: string;
  bed?: string;          // ICU bed label
  admissionSource: AdmissionSource;
  reason: ICUReason;
  diagnosis: string;
  admittedAt: string;
  sofaAdmission?: number;     // 0-24
  apacheIi?: number;          // APACHE II score 0-71
  status: StayStatus;
  closedAt?: string;
  endReason?: StayEndReason;
  endNote?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ICUObservation {
  id: string;            // OBS-{suffix}-{seq}
  organizationId: string;
  stayId: string;
  recordedAt: string;
  nurse?: string;
  // Vitals
  heartRate?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  map?: number;          // mean arterial pressure
  temperature?: number;
  respRate?: number;
  spo2?: number;
  // Neuro
  gcs?: number;          // 3-15
  rass?: number;         // -5..+4 Richmond agitation-sedation scale
  pupilLeft?: string;    // size/reactivity note
  pupilRight?: string;
  // Respiratory
  ventMode: VentMode;
  fio2?: number;         // %
  peep?: number;         // cmH2O
  tidalVolume?: number;  // mL
  ventRate?: number;
  pip?: number;          // peak inspiratory pressure
  // Hemodynamics / drugs
  pressors?: Pressor[];
  sedation?: SedationAgent;
  sedationRate?: string;
  // I/O for the hour
  urineOutputMl?: number;
  drainOutputMl?: number;
  ngOutputMl?: number;
  fluidInMl?: number;
  // Labs (optional hourly)
  lactate?: number;
  glucose?: number;
  // SOFA recomputed (optional)
  sofaCurrent?: number;
  notes?: string;
  createdAt: string;
}

const stays: ICUStay[] = [];
const observations: ICUObservation[] = [];

export const REASON_LABEL: Record<ICUReason, string> = {
  sepsis: "Sepsis",
  ards: "ARDS",
  post_op: "Post-op",
  cardiac_arrest: "Cardiac arrest",
  stroke: "Stroke",
  mi: "MI",
  respiratory_failure: "Respiratory failure",
  renal_failure: "Renal failure",
  dka: "DKA",
  trauma: "Trauma",
  tbi: "TBI",
  poisoning: "Poisoning",
  gi_bleed: "GI bleed",
  shock: "Shock",
  other: "Other",
};

export const VENT_LABEL: Record<VentMode, string> = {
  none: "Room air / none",
  niv: "NIV (BiPAP/CPAP)",
  ac_vc: "AC-VC",
  ac_pc: "AC-PC",
  simv: "SIMV",
  psv: "PSV",
  spont: "Spontaneous",
  hfnc: "HFNC",
  t_piece: "T-piece",
};

export const SEDATION_LABEL: Record<SedationAgent, string> = {
  none: "None",
  propofol: "Propofol",
  midazolam: "Midazolam",
  fentanyl: "Fentanyl",
  morphine: "Morphine",
  dexmedetomidine: "Dexmedetomidine",
  ketamine: "Ketamine",
  paralytic: "Paralytic",
  other: "Other",
};

const hydrate = Promise.all([
  bindPersistentArray<ICUStay>("icu-stays", stays, () => []),
  bindPersistentArray<ICUObservation>("icu-observations", observations, () => []),
]);
await hydrate;

export type ICUStats = ReturnType<typeof computeStats>;

function orgSuffix(orgId: string): string {
  return orgId.slice(0, 4).toUpperCase();
}

function nextStayId(orgId: string): string {
  const prefix = `ICU-${orgSuffix(orgId)}-`;
  const maxSeq = stays
    .filter((s) => s.id.startsWith(prefix))
    .reduce((m, s) => Math.max(m, Number(s.id.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

function nextObsId(orgId: string): string {
  const prefix = `OBS-${orgSuffix(orgId)}-`;
  const maxSeq = observations
    .filter((o) => o.id.startsWith(prefix))
    .reduce((m, o) => Math.max(m, Number(o.id.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

// ---------- Stays ----------

export function listStays(opts: {
  organizationId: string;
  status?: StayStatus;
  patientId?: string;
  reason?: ICUReason;
}): ICUStay[] {
  return stays
    .filter((s) => s.organizationId === opts.organizationId)
    .filter((s) => (opts.status ? s.status === opts.status : true))
    .filter((s) => (opts.patientId ? s.patientId === opts.patientId : true))
    .filter((s) => (opts.reason ? s.reason === opts.reason : true))
    .sort((a, b) => (b.admittedAt || "").localeCompare(a.admittedAt || ""));
}

export function createStay(
  orgId: string,
  input: Partial<ICUStay>
): { ok: true; stay: ICUStay } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName) return { ok: false, error: "missing_patient" };
  if (!input.diagnosis) return { ok: false, error: "missing_diagnosis" };
  const now = new Date().toISOString();
  const stay: ICUStay = {
    id: nextStayId(orgId),
    organizationId: orgId,
    patientId: input.patientId,
    patientName: input.patientName,
    intensivist: input.intensivist,
    bed: input.bed,
    admissionSource: (input.admissionSource as AdmissionSource) || "ward",
    reason: (input.reason as ICUReason) || "other",
    diagnosis: input.diagnosis,
    admittedAt: input.admittedAt || now,
    sofaAdmission: input.sofaAdmission,
    apacheIi: input.apacheIi,
    status: "active",
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  stays.push(stay);
  return { ok: true, stay };
}

export function updateStay(id: string, orgId: string, patch: Partial<ICUStay>): ICUStay | null {
  const i = stays.findIndex((s) => s.id === id && s.organizationId === orgId);
  if (i < 0) return null;
  const now = new Date().toISOString();
  const prev = stays[i];
  const next: ICUStay = {
    ...prev,
    ...patch,
    id: prev.id,
    organizationId: prev.organizationId,
    updatedAt: now,
  };
  if (next.status === "closed" && prev.status !== "closed" && !next.closedAt) {
    next.closedAt = now;
  }
  if (next.status === "active" && prev.status === "closed") {
    next.closedAt = undefined;
    next.endReason = undefined;
  }
  stays[i] = next;
  return next;
}

export function deleteStay(id: string, orgId: string): boolean {
  const i = stays.findIndex((s) => s.id === id && s.organizationId === orgId);
  if (i < 0) return false;
  // Cascade observations
  for (let j = observations.length - 1; j >= 0; j--) {
    if (observations[j].stayId === id && observations[j].organizationId === orgId) {
      observations.splice(j, 1);
    }
  }
  stays.splice(i, 1);
  return true;
}

// ---------- Observations ----------

export function listObservations(opts: {
  organizationId: string;
  stayId?: string;
  from?: string;
  to?: string;
}): ICUObservation[] {
  return observations
    .filter((o) => o.organizationId === opts.organizationId)
    .filter((o) => (opts.stayId ? o.stayId === opts.stayId : true))
    .filter((o) => (opts.from ? o.recordedAt >= opts.from : true))
    .filter((o) => (opts.to ? o.recordedAt <= opts.to : true))
    .sort((a, b) => (b.recordedAt || "").localeCompare(a.recordedAt || ""));
}

export function createObservation(
  orgId: string,
  input: Partial<ICUObservation>
): { ok: true; observation: ICUObservation } | { ok: false; error: string } {
  if (!input.stayId) return { ok: false, error: "missing_stay" };
  const stay = stays.find((s) => s.id === input.stayId && s.organizationId === orgId);
  if (!stay) return { ok: false, error: "stay_not_found" };
  const now = new Date().toISOString();
  const obs: ICUObservation = {
    id: nextObsId(orgId),
    organizationId: orgId,
    stayId: input.stayId,
    recordedAt: input.recordedAt || now,
    nurse: input.nurse,
    heartRate: input.heartRate,
    bpSystolic: input.bpSystolic,
    bpDiastolic: input.bpDiastolic,
    map: input.map,
    temperature: input.temperature,
    respRate: input.respRate,
    spo2: input.spo2,
    gcs: input.gcs,
    rass: input.rass,
    pupilLeft: input.pupilLeft,
    pupilRight: input.pupilRight,
    ventMode: (input.ventMode as VentMode) || "none",
    fio2: input.fio2,
    peep: input.peep,
    tidalVolume: input.tidalVolume,
    ventRate: input.ventRate,
    pip: input.pip,
    pressors: input.pressors || [],
    sedation: input.sedation,
    sedationRate: input.sedationRate,
    urineOutputMl: input.urineOutputMl,
    drainOutputMl: input.drainOutputMl,
    ngOutputMl: input.ngOutputMl,
    fluidInMl: input.fluidInMl,
    lactate: input.lactate,
    glucose: input.glucose,
    sofaCurrent: input.sofaCurrent,
    notes: input.notes,
    createdAt: now,
  };
  observations.push(obs);
  return { ok: true, observation: obs };
}

export function updateObservation(
  id: string,
  orgId: string,
  patch: Partial<ICUObservation>
): ICUObservation | null {
  const i = observations.findIndex((o) => o.id === id && o.organizationId === orgId);
  if (i < 0) return null;
  const prev = observations[i];
  observations.splice(i, 1, {
    ...prev,
    ...patch,
    id: prev.id,
    organizationId: prev.organizationId,
    stayId: prev.stayId,
  });
  return observations[i];
}

export function deleteObservation(id: string, orgId: string): boolean {
  const i = observations.findIndex((o) => o.id === id && o.organizationId === orgId);
  if (i < 0) return false;
  observations.splice(i, 1);
  return true;
}

// ---------- Derived ----------

export function latestObservation(stay: ICUStay): ICUObservation | null {
  return (
    observations
      .filter((o) => o.stayId === stay.id && o.organizationId === stay.organizationId)
      .sort((a, b) => (b.recordedAt || "").localeCompare(a.recordedAt || ""))[0] || null
  );
}

export function stayLengthHours(stay: ICUStay): number {
  const start = new Date(stay.admittedAt).getTime();
  const end = stay.closedAt ? new Date(stay.closedAt).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / 3_600_000);
}

export function stayStatusFlags(stay: ICUStay): {
  ventilated: boolean;
  onPressors: boolean;
  pressorCount: number;
  sedated: boolean;
} {
  const last = latestObservation(stay);
  if (!last) {
    return { ventilated: false, onPressors: false, pressorCount: 0, sedated: false };
  }
  const ventilated = !!last.ventMode && last.ventMode !== "none" && last.ventMode !== "hfnc";
  const pressorCount = (last.pressors || []).filter((p) => p.name && p.rate).length;
  const sedated = !!last.sedation && last.sedation !== "none";
  return { ventilated, onPressors: pressorCount > 0, pressorCount, sedated };
}

export function computeStats(orgId: string): {
  activeStays: number;
  ventilated: number;
  onPressors: number;
  observationsToday: number;
  admissionsMonth: number;
  mortality30d: number;        // closed with endReason=deceased in last 30d
  mortalityRate90d: number;    // % of stays closed in last 90d that died
  avgLosHours: number;         // average length of stay (hours) over closed stays in last 90d
} {
  const my = stays.filter((s) => s.organizationId === orgId);
  const activeStaysList = my.filter((s) => s.status === "active");
  let ventilated = 0;
  let onPressors = 0;
  for (const s of activeStaysList) {
    const f = stayStatusFlags(s);
    if (f.ventilated) ventilated++;
    if (f.onPressors) onPressors++;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thirtyAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const ninetyAgo = new Date(now.getTime() - 90 * 86_400_000).toISOString();

  const observationsToday = observations
    .filter((o) => o.organizationId === orgId)
    .filter((o) => o.recordedAt >= todayStart).length;

  const admissionsMonth = my.filter((s) => s.admittedAt >= monthStart).length;

  const mortality30d = my.filter(
    (s) => s.status === "closed" && s.endReason === "deceased" && (s.closedAt || "") >= thirtyAgo
  ).length;

  const recentClosed = my.filter((s) => s.status === "closed" && (s.closedAt || "") >= ninetyAgo);
  const recentDeaths = recentClosed.filter((s) => s.endReason === "deceased").length;
  const mortalityRate90d = recentClosed.length > 0
    ? Math.round((recentDeaths / recentClosed.length) * 100)
    : 0;

  const avgLosHours = recentClosed.length > 0
    ? Math.round(recentClosed.reduce((sum, s) => sum + stayLengthHours(s), 0) / recentClosed.length)
    : 0;

  return {
    activeStays: activeStaysList.length,
    ventilated,
    onPressors,
    observationsToday,
    admissionsMonth,
    mortality30d,
    mortalityRate90d,
    avgLosHours,
  };
}

// Patient cascade (detach-only)
export function unlinkIcuForPatient(patientId: string, orgId: string): void {
  for (const s of stays) {
    if (s.organizationId === orgId && s.patientId === patientId) {
      s.patientId = "";
      s.patientName = `[removed] ${s.patientName}`;
      s.updatedAt = new Date().toISOString();
    }
  }
  // flush:auto-unlink
  stays.splice(stays.length, 0);
}
