// Family accounts.
//
// One signed-in user (the "owner") can manage a list of dependents:
// kids, elderly parents, spouse. Dependents are full healthcare
// profiles — they get their own medical-id, allergy list, current
// meds, vaccination history, etc. — but they can't independently sign
// in. The owner switches between profiles in the header; bookings,
// prescriptions, lab orders all carry a dependentId so the doctor
// sees the right patient.
//
// Why a separate store rather than a User row per dependent?
//
//   - Auth identity stays simple: one phone/email per User row.
//   - Owner-revocable. Removing a dependent is a one-click delete on
//     the owner's family page; no cross-tenant cleanup needed.
//   - Lifecycle: a dependent can be "promoted" to a standalone User
//     when they reach majority (16+ in India for Aadhaar-linked
//     records, configurable). Promotion creates a new User keyed by
//     the dependent's phone and migrates ownership.
//
// Privacy note: a dependent's record is only visible to the owner
// (and clinicians the owner has given consent to via inter-org
// transfers). The DPDP-consent vault we'll build next will pin per-
// dependent consent receipts so a 16-year-old promoted to standalone
// can audit who saw what during the dependent phase.

import { bindPersistentArray } from "./persistent-array";

export type Relationship =
  | "child"
  | "spouse"
  | "parent"
  | "sibling"
  | "grandparent"
  | "grandchild"
  | "in_law"
  | "ward"
  | "other";

export type Sex = "male" | "female" | "other";

export interface Dependent {
  id: string;
  /** User.id of the account owner. Multi-owner shared dependents
   *  (e.g., both parents managing the same child) are out of scope
   *  for now — model as primary owner + share via consent later. */
  ownerUserId: string;
  /** Display name. */
  name: string;
  /** ISO date — used for age band, paeds dose checks, vaccine schedule. */
  dateOfBirth?: string;
  sex?: Sex;
  relationship: Relationship;
  /** Optional dedicated phone — most dependents share the owner's. */
  phone?: string;
  photoUrl?: string;
  /** 16-digit medical ID, generated on create. Same format as
   *  primary user medicalId so doctors can scan either. */
  medicalId: string;
  /** Optional ABHA for Indian patients. Linked separately. */
  abhaId?: string;
  /** Captured allergy list. Mirrored into the safety-context store
   *  on first write so the Rx engine can read it. */
  allergies?: string[];
  /** Current meds. Same mirroring story. */
  currentMeds?: string[];
  /** Body weight in kg — driving paediatric mg/kg dosing. */
  weightKg?: number;
  /** Free-form notes the owner can leave (e.g. "anaphylactic to peanuts"). */
  notes?: string;
  /** When promoted to a standalone user, we keep the dependent row
   *  for audit but mark it migrated. */
  promotedToUserId?: string;
  promotedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const dependents: Dependent[] = [];
const {
  hydrate,
  flush,
  tombstone,
} = bindPersistentArray<Dependent>(
  "family_dependents",
  dependents,
  () => []
);
await hydrate();

function genMedicalId(taken: Set<string>): string {
  // 16 digits, like User.medicalId. Pseudo-random; uniqueness check
  // before insert.
  for (let attempt = 0; attempt < 100; attempt++) {
    let s = "";
    for (let i = 0; i < 16; i++) s += Math.floor(Math.random() * 10);
    if (!taken.has(s)) return s;
  }
  // Extremely unlikely; fall back to a timestamp-derived id.
  return `${Date.now()}`.padStart(16, "0").slice(0, 16);
}

export function listDependents(ownerUserId: string): Dependent[] {
  return dependents
    .filter((d) => d.ownerUserId === ownerUserId && !d.promotedToUserId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getDependentById(id: string): Dependent | null {
  return dependents.find((d) => d.id === id) || null;
}

/** Strict ownership check — call before any mutating action. Doesn't
 *  resolve session itself; the caller passes in the owner id from the
 *  authenticated session. */
export function getDependentForOwner(
  id: string,
  ownerUserId: string,
): Dependent | null {
  const d = getDependentById(id);
  if (!d) return null;
  if (d.ownerUserId !== ownerUserId) return null;
  return d;
}

export interface DependentInput {
  ownerUserId: string;
  name: string;
  dateOfBirth?: string;
  sex?: Sex;
  relationship: Relationship;
  phone?: string;
  photoUrl?: string;
  abhaId?: string;
  allergies?: string[];
  currentMeds?: string[];
  weightKg?: number;
  notes?: string;
}

export function createDependent(input: DependentInput): Dependent {
  const taken = new Set(dependents.map((d) => d.medicalId));
  const now = new Date().toISOString();
  const d: Dependent = {
    id: `dep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    ownerUserId: input.ownerUserId,
    name: input.name.trim(),
    dateOfBirth: input.dateOfBirth,
    sex: input.sex,
    relationship: input.relationship,
    phone: input.phone?.trim() || undefined,
    photoUrl: input.photoUrl?.trim() || undefined,
    medicalId: genMedicalId(taken),
    abhaId: input.abhaId?.trim() || undefined,
    allergies: input.allergies,
    currentMeds: input.currentMeds,
    weightKg: input.weightKg,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  dependents.push(d);
  flush();
  return d;
}

export function updateDependent(
  id: string,
  ownerUserId: string,
  patch: Partial<Omit<Dependent, "id" | "ownerUserId" | "medicalId" | "createdAt">>,
): Dependent | null {
  const d = getDependentForOwner(id, ownerUserId);
  if (!d) return null;
  if (patch.name !== undefined) d.name = patch.name.trim();
  if (patch.dateOfBirth !== undefined) d.dateOfBirth = patch.dateOfBirth;
  if (patch.sex !== undefined) d.sex = patch.sex;
  if (patch.relationship !== undefined) d.relationship = patch.relationship;
  if (patch.phone !== undefined) d.phone = patch.phone?.trim() || undefined;
  if (patch.photoUrl !== undefined) d.photoUrl = patch.photoUrl?.trim() || undefined;
  if (patch.abhaId !== undefined) d.abhaId = patch.abhaId?.trim() || undefined;
  if (patch.allergies !== undefined) d.allergies = patch.allergies;
  if (patch.currentMeds !== undefined) d.currentMeds = patch.currentMeds;
  if (patch.weightKg !== undefined) d.weightKg = patch.weightKg;
  if (patch.notes !== undefined) d.notes = patch.notes?.trim() || undefined;
  d.updatedAt = new Date().toISOString();
  flush();
  return d;
}

export function deleteDependent(id: string, ownerUserId: string): boolean {
  const idx = dependents.findIndex(
    (d) => d.id === id && d.ownerUserId === ownerUserId && !d.promotedToUserId,
  );
  if (idx < 0) return false;
  tombstone(dependents[idx].id);
  dependents.splice(idx, 1);
  flush();
  return true;
}

/** Mark a dependent as promoted to a full standalone account. We
 *  keep the row (so prior bookings + records remain auditable) but
 *  hide it from the owner's "active" list. The new User account is
 *  expected to be created separately by the caller. */
export function markDependentPromoted(
  id: string,
  newUserId: string,
): Dependent | null {
  const d = dependents.find((x) => x.id === id);
  if (!d || d.promotedToUserId) return null;
  const now = new Date().toISOString();
  d.promotedToUserId = newUserId;
  d.promotedAt = now;
  d.updatedAt = now;
  flush();
  return d;
}

/** Compute age in years from DOB. Helper duplicated here so callers
 *  don't have to import the safety store just for this. */
export function dependentAgeYears(d: Dependent): number | null {
  if (!d.dateOfBirth) return null;
  const t = new Date(d.dateOfBirth).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (365.25 * 24 * 60 * 60 * 1000));
}

/** Cleanup hook — when a User account is deleted, drop their family. */
export function deleteDependentsForOwner(ownerUserId: string): number {
  let n = 0;
  for (let i = dependents.length - 1; i >= 0; i--) {
    if (dependents[i].ownerUserId === ownerUserId) {
      tombstone(dependents[i].id);
      dependents.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flush();
  return n;
}
