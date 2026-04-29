// EMR store — patients + visit notes, scoped per doctor.
//
// Two stores keyed in app_kv via bindPersistentArray:
//   - emr-patients : patient demographic + chronic-condition records
//   - emr-visits   : SOAP-format visit notes, each tied to a patient
//
// Every record carries `doctorEmail` so each doctor only sees their
// own clinic's data. Admins (role=admin) bypass this filter via the
// list helpers below.
//
// Privacy posture: patient records contain PHI. They live in the same
// Postgres KV as other stores — no separate column-level encryption,
// no separate retention policy. If a clinic on this product ever
// crosses the threshold where compliance matters, this module is the
// place to bolt encryption-at-rest on top.

import { bindPersistentArray } from "./persistent-array";

export type Sex = "Male" | "Female" | "Other" | "";

export interface EmrPatient {
  id: string;
  doctorEmail: string;
  // Display + identification
  firstName: string;
  lastName: string;
  age: string;
  sex: Sex;
  phone: string;
  email?: string;
  address?: string;
  // Clinical
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  notes?: string;
  // Bookkeeping
  createdAt: string; // ISO
  updatedAt: string; // ISO
  archivedAt?: string | null;
}

export interface EmrVisit {
  id: string;
  patientId: string;
  doctorEmail: string;
  visitDate: string; // ISO date "2026-04-29"
  // SOAP
  chiefComplaint: string;
  subjective: string; // history of present illness, patient's own words
  objective: string;  // exam findings, vitals
  assessment: string; // diagnosis / impression
  plan: string;       // treatment plan, follow-up
  // Optional structured fields
  vitals?: string;
  prescriptionId?: string; // link to /api/prescriptions if doctor attached one
  createdAt: string;
}

const patients: EmrPatient[] = [];
const {
  hydrate: hydratePatients,
  reload: reloadPatientsInternal,
  tombstone: tombstonePatient,
} = bindPersistentArray<EmrPatient>("emr-patients", patients, () => []);

const visits: EmrVisit[] = [];
const {
  hydrate: hydrateVisits,
  reload: reloadVisitsInternal,
  tombstone: tombstoneVisit,
} = bindPersistentArray<EmrVisit>("emr-visits", visits, () => []);

export async function reloadPatients(): Promise<void> {
  await reloadPatientsInternal();
}

export async function reloadVisits(): Promise<void> {
  await reloadVisitsInternal();
}

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36).slice(-4)}`;
}

/* ---------- Patients ---------- */

export interface CreatePatientInput {
  doctorEmail: string;
  firstName: string;
  lastName: string;
  age: string;
  sex: Sex;
  phone: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  notes?: string;
}

export async function createPatient(input: CreatePatientInput): Promise<EmrPatient> {
  await hydratePatients();
  const now = nowIso();
  const record: EmrPatient = {
    id: uid("pt"),
    doctorEmail: input.doctorEmail.toLowerCase(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    age: input.age,
    sex: input.sex,
    phone: input.phone.trim(),
    email: input.email?.trim() || undefined,
    address: input.address?.trim() || undefined,
    bloodGroup: input.bloodGroup?.trim() || undefined,
    allergies: input.allergies?.trim() || undefined,
    chronicConditions: input.chronicConditions?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
  patients.push(record);
  return record;
}

export interface ListPatientsOptions {
  doctorEmail?: string; // undefined = all (admin)
  query?: string;       // matches name / phone / email
  includeArchived?: boolean;
}

export async function listPatients(opts: ListPatientsOptions = {}): Promise<EmrPatient[]> {
  await hydratePatients();
  const q = (opts.query || "").trim().toLowerCase();
  const filterByDoctor = opts.doctorEmail ? opts.doctorEmail.toLowerCase() : null;
  return patients
    .filter((p) => (filterByDoctor ? p.doctorEmail === filterByDoctor : true))
    .filter((p) => (opts.includeArchived ? true : !p.archivedAt))
    .filter((p) => {
      if (!q) return true;
      const hay = [
        p.firstName,
        p.lastName,
        p.phone,
        p.email || "",
        p.chronicConditions || "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getPatientById(
  id: string,
  doctorEmail?: string
): Promise<EmrPatient | undefined> {
  await hydratePatients();
  const p = patients.find((x) => x.id === id);
  if (!p) return undefined;
  if (doctorEmail && p.doctorEmail !== doctorEmail.toLowerCase()) return undefined;
  return p;
}

export interface UpdatePatientInput {
  firstName?: string;
  lastName?: string;
  age?: string;
  sex?: Sex;
  phone?: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  notes?: string;
  archivedAt?: string | null;
}

export async function updatePatient(
  id: string,
  patch: UpdatePatientInput,
  doctorEmail?: string
): Promise<EmrPatient | undefined> {
  await hydratePatients();
  const idx = patients.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  const current = patients[idx];
  if (doctorEmail && current.doctorEmail !== doctorEmail.toLowerCase()) return undefined;
  const next: EmrPatient = {
    ...current,
    ...patch,
    updatedAt: nowIso(),
  };
  patients.splice(idx, 1, next);
  return next;
}

export async function deletePatient(
  id: string,
  doctorEmail?: string
): Promise<boolean> {
  await hydratePatients();
  const idx = patients.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  const current = patients[idx];
  if (doctorEmail && current.doctorEmail !== doctorEmail.toLowerCase()) return false;
  patients.splice(idx, 1);
  await tombstonePatient(id);
  // Cascade: drop the patient's visits too.
  await hydrateVisits();
  for (let i = visits.length - 1; i >= 0; i--) {
    if (visits[i].patientId === id) {
      const removed = visits.splice(i, 1)[0];
      await tombstoneVisit(removed.id);
    }
  }
  return true;
}

/* ---------- Visits ---------- */

export interface CreateVisitInput {
  patientId: string;
  doctorEmail: string;
  visitDate?: string;
  chiefComplaint: string;
  subjective?: string;
  objective?: string;
  assessment: string;
  plan: string;
  vitals?: string;
  prescriptionId?: string;
}

export async function createVisit(input: CreateVisitInput): Promise<EmrVisit> {
  await hydrateVisits();
  const now = nowIso();
  const visit: EmrVisit = {
    id: uid("vt"),
    patientId: input.patientId,
    doctorEmail: input.doctorEmail.toLowerCase(),
    visitDate: input.visitDate || now.slice(0, 10),
    chiefComplaint: input.chiefComplaint.trim(),
    subjective: (input.subjective || "").trim(),
    objective: (input.objective || "").trim(),
    assessment: input.assessment.trim(),
    plan: input.plan.trim(),
    vitals: input.vitals?.trim() || undefined,
    prescriptionId: input.prescriptionId,
    createdAt: now,
  };
  visits.push(visit);
  // Bump patient's updatedAt so the list re-sorts to surface them.
  await hydratePatients();
  const idx = patients.findIndex((p) => p.id === input.patientId);
  if (idx !== -1) {
    patients.splice(idx, 1, { ...patients[idx], updatedAt: now });
  }
  return visit;
}

export async function listVisitsForPatient(
  patientId: string,
  doctorEmail?: string
): Promise<EmrVisit[]> {
  await hydrateVisits();
  return visits
    .filter((v) => v.patientId === patientId)
    .filter((v) => (doctorEmail ? v.doctorEmail === doctorEmail.toLowerCase() : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listRecentVisits(
  doctorEmail: string,
  limit = 10
): Promise<EmrVisit[]> {
  await hydrateVisits();
  return visits
    .filter((v) => v.doctorEmail === doctorEmail.toLowerCase())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function deleteVisit(
  id: string,
  doctorEmail?: string
): Promise<boolean> {
  await hydrateVisits();
  const idx = visits.findIndex((v) => v.id === id);
  if (idx === -1) return false;
  const current = visits[idx];
  if (doctorEmail && current.doctorEmail !== doctorEmail.toLowerCase()) return false;
  visits.splice(idx, 1);
  await tombstoneVisit(id);
  return true;
}

/* ---------- Stats (for EMR dashboard) ---------- */

export interface EmrStats {
  totalPatients: number;
  totalVisits: number;
  visitsToday: number;
  visitsThisMonth: number;
  newPatientsThisMonth: number;
}

export async function getDoctorEmrStats(doctorEmail: string): Promise<EmrStats> {
  await hydratePatients();
  await hydrateVisits();
  const email = doctorEmail.toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date().toISOString().slice(0, 7); // "2026-04"
  const myPatients = patients.filter((p) => p.doctorEmail === email && !p.archivedAt);
  const myVisits = visits.filter((v) => v.doctorEmail === email);
  return {
    totalPatients: myPatients.length,
    totalVisits: myVisits.length,
    visitsToday: myVisits.filter((v) => v.visitDate === today).length,
    visitsThisMonth: myVisits.filter((v) => v.visitDate.startsWith(monthStart)).length,
    newPatientsThisMonth: myPatients.filter((p) =>
      p.createdAt.startsWith(monthStart)
    ).length,
  };
}
