// Emergency profile + biometric unlock.
//
// Two-store design:
//   1. emergency_profile  — the limited set of facts hospitals need
//      when a patient is brought in unconscious: blood group,
//      allergies, current Rx, primary doctor, next-of-kin. Patient
//      curates this from /dashboard/emergency-profile.
//   2. biometric_enrollments — opaque hashes of fingerprint or face
//      templates. We do NOT store raw biometric data; the device
//      hashes the template with HMAC-SHA-256 keyed on a per-user
//      salt and only the hash arrives here. A match returns the
//      userId, which then authorizes a read of the emergency_profile.
//
// Consent: every enrollment carries a consentRecordId pointing at
// /lib/consent-store. Without an active consent the hospital UX
// cannot enroll or query — this prevents an org from opportunistic-
// ally collecting biometrics and using them later.
//
// Audit: every emergency lookup is recorded against the patient
// (subject) and the looking-up org (actor) with IP + ward context.
// Patients see suspicious lookups on /dashboard/audit.

import { bindPersistentArray } from "../persistent-array";
import { recordAuditEvent } from "../audit/store";

export interface EmergencyProfile {
  /** id == userId. Only one profile per user. */
  id: string;
  userId: string;
  /** "A+", "O-", etc. — free-text to allow Bombay phenotype + rare types. */
  bloodGroup?: string;
  /** Drug + non-drug allergies. */
  allergies?: string;
  /** Current chronic medications, free-text formatted. */
  currentMedications?: string;
  /** Existing chronic conditions ("Type 2 Diabetes, Hypertension"). */
  chronicConditions?: string;
  /** Free-text DNAR / advance directive flag. */
  advanceDirective?: string;
  /** Primary doctor name + phone. */
  primaryDoctorName?: string;
  primaryDoctorPhone?: string;
  /** Next of kin to call. */
  kinName?: string;
  kinRelation?: string;
  kinPhone?: string;
  /** Organ donor flag. */
  organDonor?: boolean;
  notes?: string;
  updatedAt: string;
  createdAt: string;
}

export type BiometricKind = "fingerprint" | "face";

export interface BiometricEnrollment {
  id: string;
  userId: string;
  kind: BiometricKind;
  /** HMAC-SHA-256 of the device-side template, base64. We never see
   *  the underlying biometric. */
  templateHash: string;
  /** Per-user salt used by the device when computing templateHash. */
  salt: string;
  /** Consent record id referencing /lib/consent-store. */
  consentRecordId: string;
  /** Org that performed the enrollment (typically a hospital
   *  reception kiosk). */
  enrolledByOrgId: string;
  enrolledAt: string;
  /** Allow patient to pause biometric without deleting the row,
   *  preserving the audit trail. */
  active: boolean;
}

const profiles: EmergencyProfile[] = [];
const enrollments: BiometricEnrollment[] = [];
const { hydrate: hydrateProfiles, flush: flushProfiles, tombstone: tombstoneProfile } =
  bindPersistentArray<EmergencyProfile>("emergency_profiles", profiles, () => []);
const { hydrate: hydrateEnrollments, flush: flushEnrollments, tombstone: tombstoneEnrollment } =
  bindPersistentArray<BiometricEnrollment>("biometric_enrollments", enrollments, () => []);
await hydrateProfiles();
await hydrateEnrollments();

// ── Profile ─────────────────────────────────────────────────────────

export function getEmergencyProfile(userId: string): EmergencyProfile | null {
  return profiles.find((p) => p.userId === userId) || null;
}

export interface UpsertProfileInput {
  userId: string;
  bloodGroup?: string;
  allergies?: string;
  currentMedications?: string;
  chronicConditions?: string;
  advanceDirective?: string;
  primaryDoctorName?: string;
  primaryDoctorPhone?: string;
  kinName?: string;
  kinRelation?: string;
  kinPhone?: string;
  organDonor?: boolean;
  notes?: string;
}

export function upsertEmergencyProfile(input: UpsertProfileInput): EmergencyProfile {
  const at = new Date().toISOString();
  let p = profiles.find((x) => x.userId === input.userId);
  if (p) {
    Object.assign(p, {
      bloodGroup: input.bloodGroup ?? p.bloodGroup,
      allergies: input.allergies ?? p.allergies,
      currentMedications: input.currentMedications ?? p.currentMedications,
      chronicConditions: input.chronicConditions ?? p.chronicConditions,
      advanceDirective: input.advanceDirective ?? p.advanceDirective,
      primaryDoctorName: input.primaryDoctorName ?? p.primaryDoctorName,
      primaryDoctorPhone: input.primaryDoctorPhone ?? p.primaryDoctorPhone,
      kinName: input.kinName ?? p.kinName,
      kinRelation: input.kinRelation ?? p.kinRelation,
      kinPhone: input.kinPhone ?? p.kinPhone,
      organDonor: input.organDonor ?? p.organDonor,
      notes: input.notes ?? p.notes,
      updatedAt: at,
    });
  } else {
    p = {
      ...input,
      id: `ep-${input.userId}`,
      updatedAt: at, createdAt: at,
    } as EmergencyProfile;
    profiles.push(p);
  }
  flushProfiles();
  return p;
}

export function deleteEmergencyProfile(userId: string): boolean {
  const i = profiles.findIndex((p) => p.userId === userId);
  if (i < 0) return false;
  tombstoneProfile(profiles[i].id);
  profiles.splice(i, 1);
  flushProfiles();
  return true;
}

// ── Biometric ───────────────────────────────────────────────────────

/** Generate a per-user salt. Caller hands it to the device which
 *  uses it to compute templateHash. Salt is stored alongside the
 *  enrollment so the device can recompute on subsequent scans. */
export function generateSalt(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

export interface EnrollInput {
  userId: string;
  kind: BiometricKind;
  templateHash: string;
  salt: string;
  consentRecordId: string;
  enrolledByOrgId: string;
}

export function enrollBiometric(input: EnrollInput): BiometricEnrollment {
  // Replace any existing active enrollment of the same kind for the
  // user — we only honour the latest registration.
  for (const e of enrollments) {
    if (e.userId === input.userId && e.kind === input.kind && e.active) {
      e.active = false;
    }
  }
  const e: BiometricEnrollment = {
    id: `bio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    ...input,
    enrolledAt: new Date().toISOString(),
    active: true,
  };
  enrollments.unshift(e);
  flushEnrollments();
  return e;
}

export function deactivateBiometric(userId: string, kind?: BiometricKind): number {
  let n = 0;
  for (const e of enrollments) {
    if (e.userId === userId && e.active && (!kind || e.kind === kind)) {
      e.active = false;
      n++;
    }
  }
  if (n) flushEnrollments();
  return n;
}

export function listEnrollments(userId: string): BiometricEnrollment[] {
  return enrollments
    .filter((e) => e.userId === userId)
    .sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt));
}

/** Lookup by template hash. Returns the matched userId if any
 *  active enrollment matches, or null. Side effect: records an
 *  emergency-lookup audit event. */
export interface EmergencyLookupInput {
  kind: BiometricKind;
  templateHash: string;
  /** Org performing the lookup (hospital reception). */
  lookingUpOrgId: string;
  lookingUpUserId?: string;
  lookingUpEmail?: string;
  ip?: string;
  reason?: string;
}

export interface EmergencyLookupResult {
  matchedUserId: string;
  enrollment: BiometricEnrollment;
}

export function emergencyLookupByHash(input: EmergencyLookupInput): EmergencyLookupResult | null {
  const hit = enrollments.find((e) =>
    e.active && e.kind === input.kind && e.templateHash === input.templateHash
  );
  if (!hit) return null;

  // Record the lookup against the patient (subject) and the actor.
  recordAuditEvent({
    actorUserId: input.lookingUpUserId || `org:${input.lookingUpOrgId}`,
    actorEmail: input.lookingUpEmail,
    actorRole: "admin", // hospital reception
    subjectUserId: hit.userId,
    resource: "consent",
    resourceId: hit.id,
    action: "view",
    ip: input.ip,
    reason: input.reason || "biometric emergency lookup",
    organizationId: input.lookingUpOrgId,
  });
  return { matchedUserId: hit.userId, enrollment: hit };
}

export function deleteBiometricsForUser(userId: string): number {
  let n = 0;
  for (let i = enrollments.length - 1; i >= 0; i--) {
    if (enrollments[i].userId === userId) {
      tombstoneEnrollment(enrollments[i].id);
      enrollments.splice(i, 1);
      n++;
    }
  }
  if (n) flushEnrollments();
  return n;
}
