// Immunization Registry. Tenant-scoped.
//
// Two entities:
//   Vaccine  — catalog entry (name, code, manufacturer, dose-series schedule).
//   VaccineDose — a single administered dose for a patient.
//
// "Next due" is computed on read from the catalog schedule + the patient's
// prior doses of the same vaccine. A dose can record AEFI (Adverse Events
// Following Immunization) with a severity tier.

import { bindPersistentArray } from "../persistent-array";

export interface Vaccine {
  id: string;
  organizationId: string;
  name: string; // "BCG", "Hepatitis B", "COVID-19 (Covishield)"
  code?: string; // internal / CVX code
  manufacturer?: string;
  doseCount: number; // total doses in full series
  // Interval in days from dose N → N+1. Length = doseCount-1.
  // e.g. [30, 150] means dose-2 is 30 days after dose-1, dose-3 is 150 after dose-2.
  intervalsDays: number[];
  minAgeDays?: number;
  maxAgeDays?: number;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AefiSeverity = "none" | "mild" | "moderate" | "severe";

export interface VaccineDose {
  id: string;
  organizationId: string;
  patientId: string;
  vaccineId: string;
  vaccineName: string; // snapshotted
  doseNumber: number;
  administeredAt: string;
  lotNumber?: string;
  expiryDate?: string;
  route?: string; // IM, SC, oral, intranasal
  site?: string; // left deltoid, right thigh, etc.
  administeredBy?: string; // nurse/doctor name
  aefiSeverity: AefiSeverity;
  aefiDescription?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const vaccines: Vaccine[] = [];
const doses: VaccineDose[] = [];

const { hydrate: hydrateV, flush: flushV } = bindPersistentArray<Vaccine>(
  "hospital-vaccines",
  vaccines,
  () => []
);
const { hydrate: hydrateD, flush: flushD } = bindPersistentArray<VaccineDose>(
  "hospital-vaccine-doses",
  doses,
  () => []
);
await hydrateV();
await hydrateD();

// ─── Vaccine catalog ────────────────────────────────────────────

export function listVaccines(opts: {
  organizationId: string;
  active?: boolean;
}): Vaccine[] {
  let list = vaccines.filter((v) => v.organizationId === opts.organizationId);
  if (opts.active !== undefined)
    list = list.filter((v) => v.active === opts.active);
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export interface VaccineInput {
  name: string;
  code?: string;
  manufacturer?: string;
  doseCount?: number;
  intervalsDays?: number[];
  minAgeDays?: number;
  maxAgeDays?: number;
  notes?: string;
  active?: boolean;
}

export function createVaccine(
  organizationId: string,
  input: VaccineInput
): Vaccine {
  const now = new Date().toISOString();
  const doseCount = Math.max(1, Math.round(input.doseCount ?? 1));
  const rawIntervals = Array.isArray(input.intervalsDays)
    ? input.intervalsDays
    : [];
  const intervals = rawIntervals
    .slice(0, doseCount - 1)
    .map((n) => Math.max(0, Math.round(Number(n) || 0)));
  while (intervals.length < doseCount - 1) intervals.push(0);

  const v: Vaccine = {
    id: `vac-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    name: input.name.trim(),
    code: input.code?.trim() || undefined,
    manufacturer: input.manufacturer?.trim() || undefined,
    doseCount,
    intervalsDays: intervals,
    minAgeDays:
      typeof input.minAgeDays === "number" && input.minAgeDays >= 0
        ? Math.round(input.minAgeDays)
        : undefined,
    maxAgeDays:
      typeof input.maxAgeDays === "number" && input.maxAgeDays >= 0
        ? Math.round(input.maxAgeDays)
        : undefined,
    notes: input.notes?.trim() || undefined,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  vaccines.unshift(v);
  flushV();
  return v;
}

export function updateVaccine(
  id: string,
  organizationId: string,
  patch: Partial<VaccineInput>
): Vaccine | null {
  const v = vaccines.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!v) return null;
  const now = new Date().toISOString();
  if (patch.name !== undefined) v.name = patch.name.trim();
  if (patch.code !== undefined) v.code = patch.code?.trim() || undefined;
  if (patch.manufacturer !== undefined)
    v.manufacturer = patch.manufacturer?.trim() || undefined;
  if (patch.doseCount !== undefined)
    v.doseCount = Math.max(1, Math.round(patch.doseCount));
  if (patch.intervalsDays !== undefined) {
    const cleaned = patch.intervalsDays
      .slice(0, v.doseCount - 1)
      .map((n) => Math.max(0, Math.round(Number(n) || 0)));
    while (cleaned.length < v.doseCount - 1) cleaned.push(0);
    v.intervalsDays = cleaned;
  }
  if (patch.minAgeDays !== undefined)
    v.minAgeDays =
      typeof patch.minAgeDays === "number" && patch.minAgeDays >= 0
        ? Math.round(patch.minAgeDays)
        : undefined;
  if (patch.maxAgeDays !== undefined)
    v.maxAgeDays =
      typeof patch.maxAgeDays === "number" && patch.maxAgeDays >= 0
        ? Math.round(patch.maxAgeDays)
        : undefined;
  if (patch.notes !== undefined) v.notes = patch.notes?.trim() || undefined;
  if (patch.active !== undefined) v.active = patch.active;
  v.updatedAt = now;
  flushV();
  return v;
}

export function deleteVaccine(id: string, organizationId: string): boolean {
  const i = vaccines.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  vaccines.splice(i, 1);
  flushV();
  return true;
}

// ─── Dose records ───────────────────────────────────────────────

export function listDoses(opts: {
  organizationId: string;
  patientId?: string;
  vaccineId?: string;
}): VaccineDose[] {
  let list = doses.filter((d) => d.organizationId === opts.organizationId);
  if (opts.patientId) list = list.filter((d) => d.patientId === opts.patientId);
  if (opts.vaccineId) list = list.filter((d) => d.vaccineId === opts.vaccineId);
  return list.sort(
    (a, b) =>
      new Date(b.administeredAt).getTime() -
      new Date(a.administeredAt).getTime()
  );
}

export interface DoseInput {
  patientId: string;
  vaccineId: string;
  doseNumber?: number;
  administeredAt?: string;
  lotNumber?: string;
  expiryDate?: string;
  route?: string;
  site?: string;
  administeredBy?: string;
  aefiSeverity?: AefiSeverity;
  aefiDescription?: string;
  notes?: string;
}

export function createDose(
  organizationId: string,
  input: DoseInput
): VaccineDose | null {
  const vac = vaccines.find(
    (v) => v.id === input.vaccineId && v.organizationId === organizationId
  );
  if (!vac) return null;
  const now = new Date().toISOString();

  // Auto-increment dose number within patient+vaccine.
  const priorCount = doses.filter(
    (d) =>
      d.organizationId === organizationId &&
      d.patientId === input.patientId &&
      d.vaccineId === input.vaccineId
  ).length;
  const doseNumber = Math.max(
    1,
    Math.min(
      vac.doseCount,
      Math.round(input.doseNumber ?? priorCount + 1)
    )
  );

  const d: VaccineDose = {
    id: `dose-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    patientId: input.patientId,
    vaccineId: vac.id,
    vaccineName: vac.name,
    doseNumber,
    administeredAt: input.administeredAt || now,
    lotNumber: input.lotNumber?.trim() || undefined,
    expiryDate: input.expiryDate || undefined,
    route: input.route?.trim() || undefined,
    site: input.site?.trim() || undefined,
    administeredBy: input.administeredBy?.trim() || undefined,
    aefiSeverity: input.aefiSeverity || "none",
    aefiDescription: input.aefiDescription?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  doses.unshift(d);
  flushD();
  return d;
}

export function updateDose(
  id: string,
  organizationId: string,
  patch: Partial<DoseInput>
): VaccineDose | null {
  const d = doses.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!d) return null;
  const now = new Date().toISOString();
  if (patch.doseNumber !== undefined)
    d.doseNumber = Math.max(1, Math.round(patch.doseNumber));
  if (patch.administeredAt !== undefined)
    d.administeredAt = patch.administeredAt || d.administeredAt;
  if (patch.lotNumber !== undefined)
    d.lotNumber = patch.lotNumber?.trim() || undefined;
  if (patch.expiryDate !== undefined)
    d.expiryDate = patch.expiryDate || undefined;
  if (patch.route !== undefined) d.route = patch.route?.trim() || undefined;
  if (patch.site !== undefined) d.site = patch.site?.trim() || undefined;
  if (patch.administeredBy !== undefined)
    d.administeredBy = patch.administeredBy?.trim() || undefined;
  if (patch.aefiSeverity !== undefined) d.aefiSeverity = patch.aefiSeverity;
  if (patch.aefiDescription !== undefined)
    d.aefiDescription = patch.aefiDescription?.trim() || undefined;
  if (patch.notes !== undefined) d.notes = patch.notes?.trim() || undefined;
  d.updatedAt = now;
  flushD();
  return d;
}

export function deleteDose(id: string, organizationId: string): boolean {
  const i = doses.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  doses.splice(i, 1);
  flushD();
  return true;
}

// ─── Schedule / due-date computation ────────────────────────────

export interface ImmunizationStatus {
  vaccineId: string;
  vaccineName: string;
  doseCount: number;
  completedDoses: number;
  lastDoseAt?: string;
  nextDoseNumber?: number; // undefined if series complete
  nextDueAt?: string; // undefined if series complete OR never started (first dose can be any time)
  overdue: boolean; // nextDueAt is in the past
}

export function patientImmunizationStatus(opts: {
  organizationId: string;
  patientId: string;
}): ImmunizationStatus[] {
  const orgVaccines = vaccines.filter(
    (v) => v.organizationId === opts.organizationId && v.active
  );
  const now = Date.now();
  return orgVaccines
    .map<ImmunizationStatus>((v) => {
      const taken = doses
        .filter(
          (d) =>
            d.organizationId === opts.organizationId &&
            d.patientId === opts.patientId &&
            d.vaccineId === v.id
        )
        .sort(
          (a, b) =>
            new Date(a.administeredAt).getTime() -
            new Date(b.administeredAt).getTime()
        );
      const completed = taken.length;
      const last = taken[taken.length - 1];
      const lastDoseAt = last?.administeredAt;
      let nextDueAt: string | undefined;
      let nextDoseNumber: number | undefined;
      if (completed < v.doseCount) {
        nextDoseNumber = completed + 1;
        if (completed > 0) {
          const interval = v.intervalsDays[completed - 1] ?? 0;
          if (lastDoseAt) {
            const t = new Date(lastDoseAt).getTime() + interval * 86400000;
            nextDueAt = new Date(t).toISOString();
          }
        }
      }
      const overdue = !!nextDueAt && new Date(nextDueAt).getTime() < now;
      return {
        vaccineId: v.id,
        vaccineName: v.name,
        doseCount: v.doseCount,
        completedDoses: completed,
        lastDoseAt,
        nextDoseNumber,
        nextDueAt,
        overdue,
      };
    })
    .sort((a, b) => {
      // Overdue first, then due-soon, then complete.
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      const ad = a.nextDueAt ? new Date(a.nextDueAt).getTime() : Infinity;
      const bd = b.nextDueAt ? new Date(b.nextDueAt).getTime() : Infinity;
      return ad - bd;
    });
}

// ─── Cascade helpers ────────────────────────────────────────────

export function deleteImmunizationsForPatient(
  patientId: string,
  organizationId: string
): number {
  let removed = 0;
  for (let i = doses.length - 1; i >= 0; i--) {
    const d = doses[i];
    if (d.patientId === patientId && d.organizationId === organizationId) {
      doses.splice(i, 1);
      removed++;
    }
  }
  if (removed) flushD();
  return removed;
}
