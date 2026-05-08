// Patient digital consent records.
//
// A consent row grants a specific institution (target ownerEmail)
// time-limited access to a patient's chart from another clinic.
// Without a row, the ownerEmail filter in resolveClinic blocks all
// cross-clinic access. With one, the receiving clinic's doctors
// can read up to the scope the patient signed off.
//
// This is the "Inter-hospital: patient must grant explicit digital
// consent" line in the visibility matrix.

import { bindPersistentArray } from "./persistent-array";

export type ConsentScope =
  | "demographics_only"
  | "summary"
  | "full_chart"
  | "psychiatric";       // explicitly requires this scope to unlock psych section

export interface PatientConsent {
  id: string;
  /** Clinic that holds the source record (the patient's primary clinic). */
  sourceOwnerEmail: string;
  /** Clinic being granted access. */
  grantedToOwnerEmail: string;
  patientId: string;
  patientEmail?: string;
  scope: ConsentScope;
  /** Free-text reason the patient agreed to share (visit, second
   *  opinion, transfer, etc.) — captured at consent time. */
  purpose?: string;
  /** Patient signature artifact — typed name + IP + UA hash, or
   *  base64 image of a drawn signature. */
  signatureRef?: string;
  /** ISO datetime when the consent expires. */
  expiresAt?: string;
  revokedAt?: string;
  revokedBy?: string;     // patient email or admin email
  createdAt: string;
}

const consents: PatientConsent[] = [];
const {
  hydrate: hydrateConsent,
  reload: reloadConsentInternal,
  flush: flushConsent,
} = bindPersistentArray<PatientConsent>("emr-consent", consents, () => []);

await hydrateConsent();
export async function reloadConsent() { await reloadConsentInternal(); }

const nowIso = () => new Date().toISOString();
const newId = () => `cns-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export interface CreateConsentInput {
  sourceOwnerEmail: string;
  grantedToOwnerEmail: string;
  patientId: string;
  patientEmail?: string;
  scope: ConsentScope;
  purpose?: string;
  signatureRef?: string;
  expiresAt?: string;
}

export async function createConsent(input: CreateConsentInput): Promise<PatientConsent> {
  const row: PatientConsent = {
    id: newId(),
    sourceOwnerEmail: input.sourceOwnerEmail.toLowerCase(),
    grantedToOwnerEmail: input.grantedToOwnerEmail.toLowerCase(),
    patientId: input.patientId,
    patientEmail: input.patientEmail?.toLowerCase(),
    scope: input.scope,
    purpose: input.purpose,
    signatureRef: input.signatureRef,
    expiresAt: input.expiresAt,
    createdAt: nowIso(),
  };
  consents.push(row);
  flushConsent();
  return row;
}

export async function revokeConsent(id: string, by: string): Promise<PatientConsent | null> {
  await hydrateConsent();
  const r = consents.find((x) => x.id === id);
  if (!r) return null;
  r.revokedAt = nowIso();
  r.revokedBy = by.toLowerCase();
  flushConsent();
  return r;
}

export async function listConsentsForPatient(patientEmail: string): Promise<PatientConsent[]> {
  await hydrateConsent();
  const e = patientEmail.toLowerCase();
  return consents.filter((c) => (c.patientEmail || "") === e).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Server-side gate used by cross-clinic read paths.
 *  Returns the ConsentScope granted to the requesting clinic for
 *  the given patient, or null if no active consent exists. */
export async function activeConsentScope(opts: {
  sourceOwnerEmail: string;
  grantedToOwnerEmail: string;
  patientId: string;
}): Promise<ConsentScope | null> {
  await hydrateConsent();
  const now = Date.now();
  const src = opts.sourceOwnerEmail.toLowerCase();
  const dst = opts.grantedToOwnerEmail.toLowerCase();
  for (const c of consents) {
    if (c.sourceOwnerEmail !== src) continue;
    if (c.grantedToOwnerEmail !== dst) continue;
    if (c.patientId !== opts.patientId) continue;
    if (c.revokedAt) continue;
    if (c.expiresAt) {
      const t = Date.parse(c.expiresAt);
      if (Number.isFinite(t) && t < now) continue;
    }
    return c.scope;
  }
  return null;
}
