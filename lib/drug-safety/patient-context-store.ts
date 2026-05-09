// Patient safety context — the per-patient inputs the Rx safety
// engine needs that aren't part of the prescription itself:
//
//   - Allergies (drug name + reaction severity)
//   - Current medications (name + dose) for DDI checks
//   - Renal function (eGFR) for dose adjustment
//   - Pregnancy status + trimester for teratogen screening
//   - Date-of-birth so we can compute age-band rules (paeds, geriatric)
//   - Weight for paediatric mg/kg dosing checks
//
// Stored per-patient per-org. We deliberately keep this distinct from
// the canonical patient record so Rx safety can ship before the full
// EHR refactor, and so the safety engine has a clean read surface.

import { bindPersistentArray } from "../persistent-array";

export type AllergyReaction = "rash" | "anaphylaxis" | "angioedema" | "gi_upset" | "respiratory" | "other";
export type AllergySeverity = "mild" | "moderate" | "severe";

export interface PatientAllergy {
  /** Free-text drug name as captured (we normalise on check). */
  drugName: string;
  reaction?: AllergyReaction;
  severity: AllergySeverity;
  noted?: string; // ISO date the allergy was first recorded
  notes?: string;
}

export interface PatientCurrentMed {
  drugName: string;
  strength?: string;
  startedAt?: string;
  /** Non-empty when this med is owned by another org (ie, captured
   *  via inter-org records-share). Used by the safety engine to flag
   *  that the prescriber should verify with the originating clinic. */
  externalSource?: string;
}

export interface PatientSafetyContext {
  id: string;
  organizationId: string;
  patientId: string;
  dateOfBirth?: string;
  /** Body weight in kg — required for paediatric mg/kg checks. */
  weightKg?: number;
  /** Estimated GFR (mL/min/1.73m²). Below 60 triggers renal advice. */
  egfr?: number;
  /** Pregnancy state at the time of Rx. */
  pregnancyStatus?: "not_pregnant" | "pregnant" | "lactating" | "unknown";
  pregnancyTrimester?: 1 | 2 | 3;
  allergies: PatientAllergy[];
  currentMeds: PatientCurrentMed[];
  updatedAt: string;
  updatedByEmail?: string;
}

const contexts: PatientSafetyContext[] = [];
const { hydrate, flush } = bindPersistentArray<PatientSafetyContext>(
  "patient_safety_context",
  contexts,
  () => []
);
await hydrate();

export function getContext(
  organizationId: string,
  patientId: string,
): PatientSafetyContext | null {
  return (
    contexts.find(
      (c) => c.organizationId === organizationId && c.patientId === patientId,
    ) || null
  );
}

export interface UpsertContextInput {
  organizationId: string;
  patientId: string;
  dateOfBirth?: string;
  weightKg?: number;
  egfr?: number;
  pregnancyStatus?: PatientSafetyContext["pregnancyStatus"];
  pregnancyTrimester?: 1 | 2 | 3;
  allergies?: PatientAllergy[];
  currentMeds?: PatientCurrentMed[];
  updatedByEmail?: string;
}

export function upsertContext(input: UpsertContextInput): PatientSafetyContext {
  const existing = getContext(input.organizationId, input.patientId);
  const now = new Date().toISOString();
  if (existing) {
    if (input.dateOfBirth !== undefined) existing.dateOfBirth = input.dateOfBirth;
    if (input.weightKg !== undefined) existing.weightKg = input.weightKg;
    if (input.egfr !== undefined) existing.egfr = input.egfr;
    if (input.pregnancyStatus !== undefined) existing.pregnancyStatus = input.pregnancyStatus;
    if (input.pregnancyTrimester !== undefined) existing.pregnancyTrimester = input.pregnancyTrimester;
    if (input.allergies) existing.allergies = input.allergies;
    if (input.currentMeds) existing.currentMeds = input.currentMeds;
    existing.updatedAt = now;
    existing.updatedByEmail = input.updatedByEmail;
    flush();
    return existing;
  }
  const ctx: PatientSafetyContext = {
    id: `psc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    patientId: input.patientId,
    dateOfBirth: input.dateOfBirth,
    weightKg: input.weightKg,
    egfr: input.egfr,
    pregnancyStatus: input.pregnancyStatus,
    pregnancyTrimester: input.pregnancyTrimester,
    allergies: input.allergies || [],
    currentMeds: input.currentMeds || [],
    updatedAt: now,
    updatedByEmail: input.updatedByEmail,
  };
  contexts.push(ctx);
  flush();
  return ctx;
}

export function ageYears(dob?: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
}
