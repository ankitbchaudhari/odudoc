// Vitals & Observation Charts. Tenant-scoped.
//
// Each VitalsReading is a timestamped snapshot of a patient's physiological
// parameters. We compute an EWS (Early Warning Score) inspired by NEWS2 on
// each reading — scored 0..3 per parameter, summed. High EWS triggers
// escalation (≥5 urgent, ≥7 critical).
//
// Parameters are all optional (you may record only BP, for example). Scoring
// uses only parameters that were recorded.

import { bindPersistentArray } from "../persistent-array";

export interface VitalsReading {
  id: string;
  organizationId: string;
  patientId: string;
  admissionId?: string;
  encounterId?: string;
  takenAt: string;
  takenBy?: string; // staff name / id
  // Core vitals
  systolicBp?: number; // mmHg
  diastolicBp?: number; // mmHg
  heartRate?: number; // bpm
  respiratoryRate?: number; // breaths/min
  temperatureC?: number; // Celsius
  spo2?: number; // %
  // Neuro / pain
  painScale?: number; // 0-10
  gcs?: number; // 3-15
  consciousness?: "alert" | "voice" | "pain" | "unresponsive";
  // Anthropometry
  weightKg?: number;
  heightCm?: number;
  // Metabolic
  bloodGlucoseMgDl?: number;
  // Derived
  bmi?: number;
  ewsScore: number;
  ewsLevel: "normal" | "low" | "medium" | "high";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const readings: VitalsReading[] = [];
const { hydrate, flush } = bindPersistentArray<VitalsReading>(
  "hospital-vitals",
  readings,
  () => []
);
await hydrate();

// --- EWS scoring (NEWS2-inspired) ------------------------------------------

function scoreRespRate(rr?: number): number {
  if (rr === undefined) return 0;
  if (rr <= 8) return 3;
  if (rr <= 11) return 1;
  if (rr <= 20) return 0;
  if (rr <= 24) return 2;
  return 3;
}
function scoreSpO2(s?: number): number {
  if (s === undefined) return 0;
  if (s <= 91) return 3;
  if (s <= 93) return 2;
  if (s <= 95) return 1;
  return 0;
}
function scoreTemp(t?: number): number {
  if (t === undefined) return 0;
  if (t <= 35) return 3;
  if (t <= 36) return 1;
  if (t <= 38) return 0;
  if (t <= 39) return 1;
  return 2;
}
function scoreSystolic(s?: number): number {
  if (s === undefined) return 0;
  if (s <= 90) return 3;
  if (s <= 100) return 2;
  if (s <= 110) return 1;
  if (s <= 219) return 0;
  return 3;
}
function scoreHeartRate(h?: number): number {
  if (h === undefined) return 0;
  if (h <= 40) return 3;
  if (h <= 50) return 1;
  if (h <= 90) return 0;
  if (h <= 110) return 1;
  if (h <= 130) return 2;
  return 3;
}
function scoreConsciousness(
  c?: "alert" | "voice" | "pain" | "unresponsive"
): number {
  if (!c || c === "alert") return 0;
  return 3;
}

export function computeEws(v: Partial<VitalsReading>): {
  score: number;
  level: "normal" | "low" | "medium" | "high";
  flags: string[];
} {
  const parts = [
    { name: "RR", s: scoreRespRate(v.respiratoryRate) },
    { name: "SpO2", s: scoreSpO2(v.spo2) },
    { name: "Temp", s: scoreTemp(v.temperatureC) },
    { name: "SBP", s: scoreSystolic(v.systolicBp) },
    { name: "HR", s: scoreHeartRate(v.heartRate) },
    { name: "Conscious", s: scoreConsciousness(v.consciousness) },
  ];
  const score = parts.reduce((a, p) => a + p.s, 0);
  const flags = parts.filter((p) => p.s >= 2).map((p) => p.name);
  const anyThree = parts.some((p) => p.s >= 3);
  let level: "normal" | "low" | "medium" | "high" = "normal";
  if (score >= 7) level = "high";
  else if (score >= 5 || anyThree) level = "medium";
  else if (score >= 1) level = "low";
  return { score, level, flags };
}

// --- CRUD ------------------------------------------------------------------

export function listReadings(opts: {
  organizationId: string;
  patientId?: string;
  admissionId?: string;
  level?: "normal" | "low" | "medium" | "high";
  dateFrom?: string;
  dateTo?: string;
}): VitalsReading[] {
  let list = readings.filter((r) => r.organizationId === opts.organizationId);
  if (opts.patientId) list = list.filter((r) => r.patientId === opts.patientId);
  if (opts.admissionId)
    list = list.filter((r) => r.admissionId === opts.admissionId);
  if (opts.level) list = list.filter((r) => r.ewsLevel === opts.level);
  if (opts.dateFrom) list = list.filter((r) => r.takenAt >= opts.dateFrom!);
  if (opts.dateTo) list = list.filter((r) => r.takenAt <= opts.dateTo!);
  return list.sort(
    (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
  );
}

export interface VitalsInput {
  patientId: string;
  admissionId?: string;
  encounterId?: string;
  takenAt?: string;
  takenBy?: string;
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperatureC?: number;
  spo2?: number;
  painScale?: number;
  gcs?: number;
  consciousness?: "alert" | "voice" | "pain" | "unresponsive";
  weightKg?: number;
  heightCm?: number;
  bloodGlucoseMgDl?: number;
  notes?: string;
}

function coerceNum(n: number | undefined): number | undefined {
  if (n === undefined || n === null || Number.isNaN(n)) return undefined;
  const v = Number(n);
  return Number.isFinite(v) ? v : undefined;
}

export function createReading(
  organizationId: string,
  input: VitalsInput
): VitalsReading {
  const now = new Date().toISOString();
  const weight = coerceNum(input.weightKg);
  const height = coerceNum(input.heightCm);
  const bmi =
    weight && height && height > 0
      ? Math.round((weight / Math.pow(height / 100, 2)) * 10) / 10
      : undefined;

  const partial: Partial<VitalsReading> = {
    systolicBp: coerceNum(input.systolicBp),
    diastolicBp: coerceNum(input.diastolicBp),
    heartRate: coerceNum(input.heartRate),
    respiratoryRate: coerceNum(input.respiratoryRate),
    temperatureC: coerceNum(input.temperatureC),
    spo2: coerceNum(input.spo2),
    consciousness: input.consciousness,
  };
  const ews = computeEws(partial);

  const r: VitalsReading = {
    id: `vt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    patientId: input.patientId,
    admissionId: input.admissionId || undefined,
    encounterId: input.encounterId || undefined,
    takenAt: input.takenAt || now,
    takenBy: input.takenBy?.trim() || undefined,
    systolicBp: partial.systolicBp,
    diastolicBp: partial.diastolicBp,
    heartRate: partial.heartRate,
    respiratoryRate: partial.respiratoryRate,
    temperatureC: partial.temperatureC,
    spo2: partial.spo2,
    painScale: coerceNum(input.painScale),
    gcs: coerceNum(input.gcs),
    consciousness: input.consciousness,
    weightKg: weight,
    heightCm: height,
    bloodGlucoseMgDl: coerceNum(input.bloodGlucoseMgDl),
    bmi,
    ewsScore: ews.score,
    ewsLevel: ews.level,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  readings.unshift(r);
  flush();
  return r;
}

export function updateReading(
  id: string,
  organizationId: string,
  patch: Partial<VitalsInput>
): VitalsReading | null {
  const r = readings.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!r) return null;
  const now = new Date().toISOString();

  if (patch.takenAt !== undefined) r.takenAt = patch.takenAt;
  if (patch.takenBy !== undefined) r.takenBy = patch.takenBy?.trim() || undefined;
  if (patch.systolicBp !== undefined) r.systolicBp = coerceNum(patch.systolicBp);
  if (patch.diastolicBp !== undefined)
    r.diastolicBp = coerceNum(patch.diastolicBp);
  if (patch.heartRate !== undefined) r.heartRate = coerceNum(patch.heartRate);
  if (patch.respiratoryRate !== undefined)
    r.respiratoryRate = coerceNum(patch.respiratoryRate);
  if (patch.temperatureC !== undefined)
    r.temperatureC = coerceNum(patch.temperatureC);
  if (patch.spo2 !== undefined) r.spo2 = coerceNum(patch.spo2);
  if (patch.painScale !== undefined) r.painScale = coerceNum(patch.painScale);
  if (patch.gcs !== undefined) r.gcs = coerceNum(patch.gcs);
  if (patch.consciousness !== undefined) r.consciousness = patch.consciousness;
  if (patch.weightKg !== undefined) r.weightKg = coerceNum(patch.weightKg);
  if (patch.heightCm !== undefined) r.heightCm = coerceNum(patch.heightCm);
  if (patch.bloodGlucoseMgDl !== undefined)
    r.bloodGlucoseMgDl = coerceNum(patch.bloodGlucoseMgDl);
  if (patch.notes !== undefined) r.notes = patch.notes;

  if (r.weightKg && r.heightCm && r.heightCm > 0) {
    r.bmi = Math.round((r.weightKg / Math.pow(r.heightCm / 100, 2)) * 10) / 10;
  }
  const ews = computeEws(r);
  r.ewsScore = ews.score;
  r.ewsLevel = ews.level;
  r.updatedAt = now;
  flush();
  return r;
}

export function deleteReading(id: string, organizationId: string): boolean {
  const i = readings.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  readings.splice(i, 1);
  flush();
  return true;
}

export function deleteVitalsForPatient(
  patientId: string,
  organizationId: string
): number {
  let removed = 0;
  for (let i = readings.length - 1; i >= 0; i--) {
    const r = readings[i];
    if (r.patientId === patientId && r.organizationId === organizationId) {
      readings.splice(i, 1);
      removed++;
    }
  }
  if (removed) flush();
  return removed;
}
