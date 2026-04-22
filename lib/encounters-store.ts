// Encounters — a single patient visit. Everything clinical hangs off an
// encounter: vitals, diagnoses, notes, prescriptions, lab orders.
//
// Tenant-scoped: every encounter carries organizationId and is resolved
// only within the active org's patient set.

import { bindPersistentArray } from "./persistent-array";

export type EncounterType =
  | "opd"
  | "ipd"
  | "emergency"
  | "followup"
  | "telemedicine";

export type EncounterStatus = "open" | "closed" | "cancelled";

export interface Vitals {
  bloodPressure?: string; // "120/80"
  heartRate?: number; // bpm
  temperatureC?: number;
  respiratoryRate?: number;
  spo2?: number; // % oxygen sat
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  painScore?: number; // 0–10
}

export interface Encounter {
  id: string;
  organizationId: string;
  patientId: string;
  type: EncounterType;
  status: EncounterStatus;
  // Clinician (free-text for now — we'll link to staff records once the
  // memberships-driven staff directory is scoped per-org).
  doctorName?: string;
  department?: string;
  // Clinical content
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  examination?: string;
  diagnosis?: string; // primary diagnosis text / ICD-10 code
  treatmentPlan?: string;
  vitals: Vitals;
  notes?: string;
  // Timing
  startedAt: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const encounters: Encounter[] = [];
const { hydrate, flush } = bindPersistentArray<Encounter>(
  "encounters",
  encounters,
  () => []
);
await hydrate();

function computeBmi(v: Vitals): number | undefined {
  if (!v.weightKg || !v.heightCm) return undefined;
  const m = v.heightCm / 100;
  if (m <= 0) return undefined;
  return Math.round((v.weightKg / (m * m)) * 10) / 10;
}

export function listEncounters(opts: {
  organizationId: string;
  patientId?: string;
  status?: EncounterStatus;
  type?: EncounterType;
}): Encounter[] {
  let list = encounters.filter((e) => e.organizationId === opts.organizationId);
  if (opts.patientId) list = list.filter((e) => e.patientId === opts.patientId);
  if (opts.status) list = list.filter((e) => e.status === opts.status);
  if (opts.type) list = list.filter((e) => e.type === opts.type);
  return list.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}

export function getEncounterById(
  id: string,
  organizationId: string
): Encounter | null {
  const e = encounters.find((x) => x.id === id);
  if (!e || e.organizationId !== organizationId) return null;
  return e;
}

export interface EncounterInput {
  patientId: string;
  type: EncounterType;
  doctorName?: string;
  department?: string;
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  examination?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  vitals?: Vitals;
  notes?: string;
  startedAt?: string;
}

export function createEncounter(
  organizationId: string,
  input: EncounterInput
): Encounter {
  const now = new Date().toISOString();
  const vitals: Vitals = { ...(input.vitals || {}) };
  vitals.bmi = computeBmi(vitals);
  const e: Encounter = {
    id: `enc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    patientId: input.patientId,
    type: input.type,
    status: "open",
    doctorName: input.doctorName?.trim() || undefined,
    department: input.department?.trim() || undefined,
    chiefComplaint: input.chiefComplaint?.trim() || undefined,
    historyOfPresentIllness: input.historyOfPresentIllness?.trim() || undefined,
    examination: input.examination?.trim() || undefined,
    diagnosis: input.diagnosis?.trim() || undefined,
    treatmentPlan: input.treatmentPlan?.trim() || undefined,
    vitals,
    notes: input.notes?.trim() || undefined,
    startedAt: input.startedAt || now,
    createdAt: now,
    updatedAt: now,
  };
  encounters.unshift(e);
  flush();
  return e;
}

export function updateEncounter(
  id: string,
  organizationId: string,
  patch: Partial<EncounterInput & { status: EncounterStatus; closedAt?: string }>
): Encounter | null {
  const e = encounters.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!e) return null;
  if (patch.type !== undefined) e.type = patch.type;
  if (patch.doctorName !== undefined)
    e.doctorName = patch.doctorName?.trim() || undefined;
  if (patch.department !== undefined)
    e.department = patch.department?.trim() || undefined;
  if (patch.chiefComplaint !== undefined)
    e.chiefComplaint = patch.chiefComplaint?.trim() || undefined;
  if (patch.historyOfPresentIllness !== undefined)
    e.historyOfPresentIllness = patch.historyOfPresentIllness?.trim() || undefined;
  if (patch.examination !== undefined)
    e.examination = patch.examination?.trim() || undefined;
  if (patch.diagnosis !== undefined)
    e.diagnosis = patch.diagnosis?.trim() || undefined;
  if (patch.treatmentPlan !== undefined)
    e.treatmentPlan = patch.treatmentPlan?.trim() || undefined;
  if (patch.notes !== undefined) e.notes = patch.notes?.trim() || undefined;
  if (patch.vitals !== undefined) {
    e.vitals = { ...e.vitals, ...patch.vitals };
    e.vitals.bmi = computeBmi(e.vitals);
  }
  if (patch.status !== undefined) {
    e.status = patch.status;
    if (patch.status === "closed" && !e.closedAt) {
      e.closedAt = new Date().toISOString();
    }
    if (patch.status === "open") {
      e.closedAt = undefined;
    }
  }
  if (patch.closedAt !== undefined) e.closedAt = patch.closedAt;
  if (patch.startedAt !== undefined) e.startedAt = patch.startedAt;
  e.updatedAt = new Date().toISOString();
  flush();
  return e;
}

export function deleteEncounter(id: string, organizationId: string): boolean {
  const i = encounters.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  encounters.splice(i, 1);
  flush();
  return true;
}

// Delete all encounters for a patient — used when a patient record is removed.
export function deleteEncountersForPatient(
  patientId: string,
  organizationId: string
): number {
  let removed = 0;
  for (let i = encounters.length - 1; i >= 0; i--) {
    const e = encounters[i];
    if (e.patientId === patientId && e.organizationId === organizationId) {
      encounters.splice(i, 1);
      removed++;
    }
  }
  if (removed) flush();
  return removed;
}
