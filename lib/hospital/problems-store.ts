// Allergies & Problem List. Tenant-scoped.
//
// Two entities sharing one module:
//   Allergy  — substance-reaction pairs with severity and verification.
//   Problem  — chronic / active clinical problems (diagnosis + ICD10).
//
// Allergy severity tiers follow common EMR convention (mild / moderate /
// severe / life-threatening). Verification status distinguishes patient-
// reported hunches from clinically confirmed or refuted entries.

import { bindPersistentArray } from "../persistent-array";

export type AllergyType = "drug" | "food" | "environmental" | "biologic" | "other";
export type AllergySeverity = "mild" | "moderate" | "severe" | "life_threatening";
export type VerificationStatus = "unconfirmed" | "confirmed" | "refuted" | "resolved";

export interface Allergy {
  id: string;
  organizationId: string;
  patientId: string;
  substance: string; // "Penicillin", "Peanuts", "Latex"
  type: AllergyType;
  reaction?: string; // "Rash", "Anaphylaxis", "GI upset"
  severity: AllergySeverity;
  verificationStatus: VerificationStatus;
  onsetDate?: string;
  notedBy?: string; // clinician name
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProblemStatus = "active" | "resolved" | "inactive" | "recurrent";
export type ProblemPriority = "routine" | "significant" | "urgent";

export interface Problem {
  id: string;
  organizationId: string;
  patientId: string;
  diagnosis: string;
  icd10Code?: string;
  status: ProblemStatus;
  priority: ProblemPriority;
  onsetDate?: string;
  resolvedDate?: string;
  notedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const allergies: Allergy[] = [];
const problems: Problem[] = [];

const { hydrate: hydrateA, flush: flushA } = bindPersistentArray<Allergy>(
  "hospital-allergies",
  allergies,
  () => []
);
const { hydrate: hydrateP, flush: flushP } = bindPersistentArray<Problem>(
  "hospital-problems",
  problems,
  () => []
);
await hydrateA();
await hydrateP();

// ─── Allergies ─────────────────────────────────────────────────

export function listAllergies(opts: {
  organizationId: string;
  patientId?: string;
  type?: AllergyType;
  severity?: AllergySeverity;
  verificationStatus?: VerificationStatus;
}): Allergy[] {
  let list = allergies.filter((a) => a.organizationId === opts.organizationId);
  if (opts.patientId) list = list.filter((a) => a.patientId === opts.patientId);
  if (opts.type) list = list.filter((a) => a.type === opts.type);
  if (opts.severity) list = list.filter((a) => a.severity === opts.severity);
  if (opts.verificationStatus)
    list = list.filter((a) => a.verificationStatus === opts.verificationStatus);
  // Severe first, then by recency.
  const sevOrder: Record<AllergySeverity, number> = {
    life_threatening: 0,
    severe: 1,
    moderate: 2,
    mild: 3,
  };
  return list.sort((a, b) => {
    const s = sevOrder[a.severity] - sevOrder[b.severity];
    if (s !== 0) return s;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export interface AllergyInput {
  patientId: string;
  substance: string;
  type?: AllergyType;
  reaction?: string;
  severity?: AllergySeverity;
  verificationStatus?: VerificationStatus;
  onsetDate?: string;
  notedBy?: string;
  notes?: string;
}

export function createAllergy(
  organizationId: string,
  input: AllergyInput
): Allergy {
  const now = new Date().toISOString();
  const a: Allergy = {
    id: `alg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    patientId: input.patientId,
    substance: input.substance.trim(),
    type: input.type || "drug",
    reaction: input.reaction?.trim() || undefined,
    severity: input.severity || "moderate",
    verificationStatus: input.verificationStatus || "unconfirmed",
    onsetDate: input.onsetDate || undefined,
    notedBy: input.notedBy?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  allergies.unshift(a);
  flushA();
  return a;
}

export function updateAllergy(
  id: string,
  organizationId: string,
  patch: Partial<AllergyInput>
): Allergy | null {
  const a = allergies.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!a) return null;
  const now = new Date().toISOString();
  if (patch.substance !== undefined) a.substance = patch.substance.trim();
  if (patch.type !== undefined) a.type = patch.type;
  if (patch.reaction !== undefined)
    a.reaction = patch.reaction?.trim() || undefined;
  if (patch.severity !== undefined) a.severity = patch.severity;
  if (patch.verificationStatus !== undefined)
    a.verificationStatus = patch.verificationStatus;
  if (patch.onsetDate !== undefined) a.onsetDate = patch.onsetDate || undefined;
  if (patch.notedBy !== undefined)
    a.notedBy = patch.notedBy?.trim() || undefined;
  if (patch.notes !== undefined) a.notes = patch.notes?.trim() || undefined;
  a.updatedAt = now;
  flushA();
  return a;
}

export function deleteAllergy(id: string, organizationId: string): boolean {
  const i = allergies.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  allergies.splice(i, 1);
  flushA();
  return true;
}

// ─── Problem List ──────────────────────────────────────────────

export function listProblems(opts: {
  organizationId: string;
  patientId?: string;
  status?: ProblemStatus;
  priority?: ProblemPriority;
}): Problem[] {
  let list = problems.filter((p) => p.organizationId === opts.organizationId);
  if (opts.patientId) list = list.filter((p) => p.patientId === opts.patientId);
  if (opts.status) list = list.filter((p) => p.status === opts.status);
  if (opts.priority) list = list.filter((p) => p.priority === opts.priority);
  const prioOrder: Record<ProblemPriority, number> = {
    urgent: 0,
    significant: 1,
    routine: 2,
  };
  const statusOrder: Record<ProblemStatus, number> = {
    active: 0,
    recurrent: 1,
    inactive: 2,
    resolved: 3,
  };
  return list.sort((a, b) => {
    const s = statusOrder[a.status] - statusOrder[b.status];
    if (s !== 0) return s;
    const p = prioOrder[a.priority] - prioOrder[b.priority];
    if (p !== 0) return p;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export interface ProblemInput {
  patientId: string;
  diagnosis: string;
  icd10Code?: string;
  status?: ProblemStatus;
  priority?: ProblemPriority;
  onsetDate?: string;
  resolvedDate?: string;
  notedBy?: string;
  notes?: string;
}

export function createProblem(
  organizationId: string,
  input: ProblemInput
): Problem {
  const now = new Date().toISOString();
  const status = input.status || "active";
  const p: Problem = {
    id: `prb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    patientId: input.patientId,
    diagnosis: input.diagnosis.trim(),
    icd10Code: input.icd10Code?.trim() || undefined,
    status,
    priority: input.priority || "routine",
    onsetDate: input.onsetDate || undefined,
    resolvedDate:
      status === "resolved" ? input.resolvedDate || now : input.resolvedDate || undefined,
    notedBy: input.notedBy?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  problems.unshift(p);
  flushP();
  return p;
}

export function updateProblem(
  id: string,
  organizationId: string,
  patch: Partial<ProblemInput>
): Problem | null {
  const p = problems.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!p) return null;
  const now = new Date().toISOString();
  if (patch.diagnosis !== undefined) p.diagnosis = patch.diagnosis.trim();
  if (patch.icd10Code !== undefined)
    p.icd10Code = patch.icd10Code?.trim() || undefined;
  if (patch.status !== undefined) {
    const prev = p.status;
    p.status = patch.status;
    if (patch.status === "resolved" && prev !== "resolved" && !p.resolvedDate) {
      p.resolvedDate = now;
    }
    if (patch.status !== "resolved" && prev === "resolved") {
      // reopening clears the resolved date unless explicitly provided later
      p.resolvedDate = patch.resolvedDate || undefined;
    }
  }
  if (patch.priority !== undefined) p.priority = patch.priority;
  if (patch.onsetDate !== undefined) p.onsetDate = patch.onsetDate || undefined;
  if (patch.resolvedDate !== undefined)
    p.resolvedDate = patch.resolvedDate || undefined;
  if (patch.notedBy !== undefined)
    p.notedBy = patch.notedBy?.trim() || undefined;
  if (patch.notes !== undefined) p.notes = patch.notes?.trim() || undefined;
  p.updatedAt = now;
  flushP();
  return p;
}

export function deleteProblem(id: string, organizationId: string): boolean {
  const i = problems.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  problems.splice(i, 1);
  flushP();
  return true;
}

// ─── Cascade ───────────────────────────────────────────────────

export function deleteAllergiesAndProblemsForPatient(
  patientId: string,
  organizationId: string
): { allergies: number; problems: number } {
  let a = 0;
  let b = 0;
  for (let i = allergies.length - 1; i >= 0; i--) {
    const x = allergies[i];
    if (x.patientId === patientId && x.organizationId === organizationId) {
      allergies.splice(i, 1);
      a++;
    }
  }
  for (let i = problems.length - 1; i >= 0; i--) {
    const x = problems[i];
    if (x.patientId === patientId && x.organizationId === organizationId) {
      problems.splice(i, 1);
      b++;
    }
  }
  if (a) flushA();
  if (b) flushP();
  return { allergies: a, problems: b };
}
