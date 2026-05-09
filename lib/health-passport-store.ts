// Health Passport consent grants.
//
// Every patient owns a permanent QR encoding their medical-ID. When a
// partner clinic scans it, our server checks whether the patient has
// granted that clinic consent — and if so, returns a curated "passport
// bundle" (allergies, current meds, recent diagnoses, recent
// prescriptions). No grant, no data: the clinic gets a deep-link the
// patient can tap on their own phone to issue consent.
//
// DPDP / HIPAA shape:
//   - Consent is per-(patient OR dependent) → per-receiving-org.
//   - Time-bounded: "for the next 24h" / "30 days" / "permanent until
//     revoked". Default we encourage is 24h — the typical visit.
//   - Scope-bounded: the patient picks which sections of the bundle
//     to share (allergies always shared, others opt-in).
//   - Audit-logged: every grant, revoke, and scan-read writes a row.
//   - Revocable instantly: revoking flips the row to revokedAt and
//     subsequent scans return 403 with "consent_revoked".
//
// We deliberately do NOT replicate the patient's actual records into
// the receiving clinic. The bundle is a transient, time-stamped read
// that the clinic's staff can copy into their EMR if useful — we give
// the patient a clean revoke button and a clean audit trail.

import { bindPersistentArray } from "./persistent-array";

export type PassportScope =
  | "allergies"
  | "current_meds"
  | "diagnoses"
  | "prescriptions"
  | "vaccinations"
  | "vitals";

export interface PassportConsent {
  id: string;
  /** The user who owns the passport. For dependent profiles, this is
   *  the owner User; the dependentId field qualifies which profile. */
  ownerUserId: string;
  /** When set, this consent grant covers a dependent (child / parent)
   *  rather than the owner's own record. */
  dependentId?: string;
  /** The clinic the patient is granting access to. */
  grantedToOrgId: string;
  /** Allowed sections. allergies is always implicitly included so the
   *  receiving clinic can run drug-safety checks even on minimal-grant
   *  scans. */
  scopes: PassportScope[];
  /** ISO timestamp when the consent expires. null = until revoked. */
  expiresAt: string | null;
  createdAt: string;
  /** Filled when revoked. After this the consent stops gating reads. */
  revokedAt?: string;
  /** Free-text reason the patient picked when granting (or revoking). */
  note?: string;
  /** How many times the consent has actually been used (a successful
   *  scan-read). UI surfaces this so the patient sees if a grant they
   *  forgot is being heavily used. */
  scanCount: number;
  lastScanAt?: string;
}

const consents: PassportConsent[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<PassportConsent>(
  "passport_consents",
  consents,
  () => []
);
await hydrate();

export function listConsentsForOwner(
  ownerUserId: string,
  dependentId?: string,
): PassportConsent[] {
  return consents
    .filter(
      (c) =>
        c.ownerUserId === ownerUserId &&
        (dependentId === undefined ? !c.dependentId : c.dependentId === dependentId),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** All consents the patient has ever issued, across self + dependents.
 *  Used by the "consent vault" view in /dashboard/health-passport. */
export function listAllConsentsForOwner(ownerUserId: string): PassportConsent[] {
  return consents
    .filter((c) => c.ownerUserId === ownerUserId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function findActiveConsent(
  ownerUserId: string,
  dependentId: string | null,
  grantedToOrgId: string,
): PassportConsent | null {
  const now = Date.now();
  return (
    consents.find(
      (c) =>
        c.ownerUserId === ownerUserId &&
        ((!dependentId && !c.dependentId) || c.dependentId === dependentId) &&
        c.grantedToOrgId === grantedToOrgId &&
        !c.revokedAt &&
        (!c.expiresAt || new Date(c.expiresAt).getTime() > now),
    ) || null
  );
}

export interface GrantConsentInput {
  ownerUserId: string;
  dependentId?: string;
  grantedToOrgId: string;
  scopes: PassportScope[];
  ttlHours?: number;        // 0 / undefined → "until revoked"
  note?: string;
}

export function grantConsent(input: GrantConsentInput): PassportConsent {
  // If an active consent for the same (owner, dependent, org) tuple
  // already exists, we extend it rather than stacking duplicates.
  const existing = findActiveConsent(
    input.ownerUserId,
    input.dependentId || null,
    input.grantedToOrgId,
  );
  const now = new Date().toISOString();
  const expiresAt = input.ttlHours
    ? new Date(Date.now() + input.ttlHours * 60 * 60 * 1000).toISOString()
    : null;
  const scopes = ensureAllergiesIncluded(input.scopes);

  if (existing) {
    existing.scopes = scopes;
    existing.expiresAt = expiresAt;
    existing.note = input.note?.trim() || existing.note;
    flush();
    return existing;
  }
  const c: PassportConsent = {
    id: `cnst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    ownerUserId: input.ownerUserId,
    dependentId: input.dependentId,
    grantedToOrgId: input.grantedToOrgId,
    scopes,
    expiresAt,
    createdAt: now,
    note: input.note?.trim() || undefined,
    scanCount: 0,
  };
  consents.push(c);
  flush();
  return c;
}

function ensureAllergiesIncluded(scopes: PassportScope[]): PassportScope[] {
  return scopes.includes("allergies") ? scopes : ["allergies", ...scopes];
}

export function revokeConsent(
  id: string,
  ownerUserId: string,
): PassportConsent | null {
  const c = consents.find((x) => x.id === id);
  if (!c || c.ownerUserId !== ownerUserId) return null;
  if (c.revokedAt) return c;
  c.revokedAt = new Date().toISOString();
  flush();
  return c;
}

export function tickScan(consentId: string): PassportConsent | null {
  const c = consents.find((x) => x.id === consentId);
  if (!c) return null;
  c.scanCount++;
  c.lastScanAt = new Date().toISOString();
  flush();
  return c;
}

export function deleteConsentsForOwner(ownerUserId: string): number {
  let n = 0;
  for (let i = consents.length - 1; i >= 0; i--) {
    if (consents[i].ownerUserId === ownerUserId) {
      tombstone(consents[i].id);
      consents.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flush();
  return n;
}
