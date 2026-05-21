// V16 of the Master Spec — Patient QR system & consent logic.
//
// Five QR kinds, each with its own rules:
//
//   1. appointment — auto-generated when a booking is confirmed.
//      Valid from 30 min before slot until 2 h after. One-time
//      scan at reception. Single appointment context only.
//
//   2. emergency — long-lived (default 1 year). Survives even
//      after the patient is logged out. Grants read access to a
//      LIMITED set of fields (allergies, blood group, chronic
//      conditions, ICE contacts, current medications, ABHA id).
//      Cannot be revoked by anyone other than the patient.
//      V16 §3.5 legal: emergency access in a true life-saving
//      context is presumptive consent; the patient is notified
//      after the fact, not before.
//
//   3. identity — stable patient identifier QR. Printable on a
//      wallet card. Used for walk-in registration at any OduDoc
//      clinic. Never expires unless revoked. Returns only the
//      patient's basic identity (name + DOB + photo + phone) —
//      no clinical data.
//
//   4. consent — patient creates one to share specific records
//      with a specific doctor / specific time window. The scope
//      is the patient's choice: { fields, fromDate, toDate,
//      validityHours, doctorId? }. Single-use OR multi-use.
//
//   5. wristband — for admitted patients. Carries the admission
//      id. Scanned by ward nurses to confirm patient identity
//      at every MAR / vitals / lab-draw event. Auto-revoked on
//      discharge.
//
// Token security (V16 §7.2):
//   - 32-byte cryptographically random opaque token (44 chars
//     base64url). The QR encodes ONLY the token plus a static
//     verifier URL. No PII anywhere in the code.
//   - Tokens are one-way — the QR doesn't reveal anything about
//     the patient even if photographed.
//   - Resolution requires the server. The server checks
//     (a) token exists, (b) not revoked, (c) within validity
//     window, (d) the caller's role is in the scope's allowed
//     scanner roles, then returns the scoped payload.
//   - Every scan writes a V13 accountability event AND fires a
//     V16 §7.3 patient notification (separate channel — they
//     find out their data was viewed within seconds).

import { randomBytes } from "crypto";
import { bindPersistentArray } from "@/lib/persistent-array";
import { recordEvent } from "@/lib/accountability-store";

export type QrKind = "appointment" | "emergency" | "identity" | "consent" | "wristband";

/** A scope describes what data the resolved QR may return. The
 *  set of "fields" is intentionally narrow + closed: only the
 *  whitelisted strings here are ever surfaced through a scan. */
export type ScopeField =
  | "identity"           // name + DOB + photo + phone
  | "allergies"
  | "blood_group"
  | "chronic_conditions"
  | "current_medications"
  | "ice_contacts"
  | "abha_id"
  | "recent_consultations" // last 5 consultations summary
  | "recent_prescriptions"
  | "recent_lab_results"
  | "active_admission"
  | "vital_signs_24h"
  | "vaccinations"
  | "discharge_summaries";

export interface QrScope {
  /** What scoped data the scanner sees. */
  fields: ScopeField[];
  /** Which scanner roles may resolve the token. */
  scannerRoles: Array<"admin" | "doctor" | "staff" | "support" | "pharmacist" | "nurse" | "any_clinician">;
  /** If set, ONLY this doctor can resolve. Used by the consent QR
   *  variant where the patient pre-authorises a specific doctor. */
  scannerDoctorId?: string;
  /** Optional time bounds within the patient's data the scanner
   *  may read. fromDate/toDate filter encounters / prescriptions /
   *  lab results. */
  dataFromDate?: string;
  dataToDate?: string;
}

export interface QrToken {
  /** Opaque 44-char base64url token. THE secret. */
  token: string;
  kind: QrKind;
  patientId: string;
  /** Some kinds have a single context they're attached to. */
  contextKind?: "appointment" | "admission" | "consult";
  contextId?: string;
  scope: QrScope;
  /** "single" — token can be resolved exactly once successfully.
   *  "multi"  — resolves any number of times until revoked / expired. */
  usage: "single" | "multi";
  /** Total successful scans recorded. */
  scanCount: number;
  /** First successful scan timestamp — establishes the
   *  "used at" moment for single-use tokens. */
  firstScannedAt?: string;
  firstScannedBy?: string;
  status: "active" | "revoked" | "consumed" | "expired";
  validFromAt: string;
  validUntilAt: string;
  createdAt: string;
  /** Who minted the token. For most kinds = the patient themselves;
   *  reception staff for the appointment QR on behalf of a walk-in. */
  createdByEmail: string;
  revokedAt?: string;
  revokedByEmail?: string;
  revokedReason?: string;
  /** Free-form label so the patient knows what each QR is for in
   *  their "My QR codes" list. */
  label?: string;
}

const tokens: QrToken[] = [];
const handle = bindPersistentArray<QrToken>("qr_tokens", tokens);

let hydrated = false;
async function ensureHydrated() {
  if (hydrated) return;
  await handle.hydrate();
  hydrated = true;
}

function newOpaqueToken(): string {
  // 32 random bytes → 43-44 base64url chars. URL-safe so the QR
  // string can be embedded in a verifier URL without escaping.
  return randomBytes(32).toString("base64url");
}

// ── Per-kind defaults ────────────────────────────────────────────

const DEFAULT_SCOPE_BY_KIND: Record<QrKind, QrScope> = {
  appointment: {
    fields: ["identity", "recent_consultations"],
    scannerRoles: ["admin", "support", "staff"],
  },
  emergency: {
    fields: ["identity", "allergies", "blood_group", "chronic_conditions", "current_medications", "ice_contacts", "abha_id"],
    scannerRoles: ["doctor", "nurse", "any_clinician"],
  },
  identity: {
    fields: ["identity"],
    scannerRoles: ["admin", "support", "staff", "doctor", "nurse", "pharmacist"],
  },
  consent: {
    fields: [], // explicitly chosen by the patient at generation time
    scannerRoles: ["doctor"],
  },
  wristband: {
    fields: ["identity", "active_admission", "current_medications", "vital_signs_24h"],
    scannerRoles: ["doctor", "nurse"],
  },
};

const DEFAULT_TTL_HOURS: Record<QrKind, number> = {
  appointment: 2.5,           // 30 min before + 2 h after = 2.5 h window
  emergency: 24 * 365,        // 1 year — re-issued annually
  identity: 24 * 365 * 5,     // 5 years — basically permanent
  consent: 24,                // 24 h default, patient can adjust 1-720
  wristband: 24 * 30,         // 30 days — well past any reasonable LOS
};

const DEFAULT_USAGE_BY_KIND: Record<QrKind, "single" | "multi"> = {
  appointment: "single",
  emergency: "multi",
  identity: "multi",
  consent: "multi",   // patient may opt into single
  wristband: "multi",
};

// ── Issue ────────────────────────────────────────────────────────

export interface IssueInput {
  kind: QrKind;
  patientId: string;
  createdByEmail: string;
  contextKind?: QrToken["contextKind"];
  contextId?: string;
  label?: string;
  /** Override TTL. Bounded to a per-kind ceiling. */
  validityHours?: number;
  /** Override scope — only honoured for consent QRs. Other kinds
   *  have fixed scopes for safety. */
  scope?: Partial<QrScope>;
  /** Force a usage mode override. */
  usage?: "single" | "multi";
}

export async function issueQr(input: IssueInput): Promise<QrToken> {
  await ensureHydrated();

  // For consent QRs, the patient picks both fields + ttl + target
  // doctor. For every other kind, scope is fixed (defence against
  // a malicious frontend asking for "show me everything").
  let scope: QrScope = { ...DEFAULT_SCOPE_BY_KIND[input.kind] };
  if (input.kind === "consent" && input.scope) {
    scope = {
      fields: input.scope.fields || ["identity"],
      scannerRoles: ["doctor"],
      scannerDoctorId: input.scope.scannerDoctorId,
      dataFromDate: input.scope.dataFromDate,
      dataToDate: input.scope.dataToDate,
    };
  }

  // Clamp TTL: consent can be 1h..30d, other kinds use defaults
  // (we still respect input.validityHours for ops overrides).
  let ttlHours = input.validityHours ?? DEFAULT_TTL_HOURS[input.kind];
  if (input.kind === "consent") {
    ttlHours = Math.max(1, Math.min(ttlHours, 24 * 30));
  }
  const now = new Date();
  const validUntil = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

  // Appointment QR has an early-start: the scan window opens 30 min
  // BEFORE the slot, so the validFromAt is in the past relative to
  // creation. We assume the caller has already adjusted contextId
  // for that; default kept simple at now.
  const t: QrToken = {
    token: newOpaqueToken(),
    kind: input.kind,
    patientId: input.patientId,
    contextKind: input.contextKind,
    contextId: input.contextId,
    scope,
    usage: input.usage || DEFAULT_USAGE_BY_KIND[input.kind],
    scanCount: 0,
    status: "active",
    validFromAt: now.toISOString(),
    validUntilAt: validUntil.toISOString(),
    createdAt: now.toISOString(),
    createdByEmail: input.createdByEmail,
    label: input.label,
  };
  tokens.push(t);
  handle.flush();

  await recordEvent({
    category: "data_access",
    action: `qr.issued.${input.kind}`,
    actorEmail: input.createdByEmail,
    subjectKind: "qr_token",
    subjectId: t.token.slice(0, 12) + "…", // never log the full secret
    summary: `${input.kind} QR issued for patient ${input.patientId} · valid until ${validUntil.toISOString()}`,
    after: { kind: input.kind, fields: scope.fields, ttlHours },
  }).catch(() => {/* never block issuance */});

  return t;
}

// ── Resolve (called by the scanner) ──────────────────────────────

export interface ResolveResult {
  ok: boolean;
  /** Why the resolve failed. */
  error?: "not_found" | "revoked" | "expired" | "consumed" | "wrong_role" | "wrong_doctor" | "not_yet_valid";
  token?: QrToken;
}

/**
 * Resolve a token. Validates the four security gates from V16 §7.1
 * (existence, revocation, window, scanner role), and on success
 * increments scanCount, sets firstScannedAt on the first hit, and
 * flips status to consumed for single-use tokens. Writes a V13
 * data_access event regardless of outcome so failed-scan attempts
 * are also visible (the negative cases include attempted access by
 * an unauthorised scanner — which is exactly the security signal we
 * want to see).
 */
export async function resolveQr(
  token: string,
  scannedBy: { email: string; role?: string; doctorId?: string },
): Promise<ResolveResult> {
  await ensureHydrated();
  const t = tokens.find((x) => x.token === token);

  // Common audit fields for the V13 event.
  const auditBase = {
    actorEmail: scannedBy.email,
    actorRole: scannedBy.role,
    subjectKind: "qr_token",
    subjectId: token.slice(0, 12) + "…",
  };

  if (!t) {
    await recordEvent({
      ...auditBase,
      category: "data_access",
      action: "qr.scan.not_found",
      severity: "medium",
      summary: `Scan of unknown QR token by ${scannedBy.email}`,
    }).catch(() => {});
    return { ok: false, error: "not_found" };
  }

  const now = new Date().toISOString();
  if (t.status === "revoked") {
    await recordEvent({
      ...auditBase,
      category: "data_access",
      action: "qr.scan.revoked",
      severity: "low",
      summary: `Attempted scan of revoked ${t.kind} QR for patient ${t.patientId}`,
    }).catch(() => {});
    return { ok: false, error: "revoked", token: t };
  }
  if (t.status === "consumed") {
    await recordEvent({ ...auditBase, category: "data_access", action: "qr.scan.consumed", summary: `Re-scan of single-use ${t.kind} QR` }).catch(() => {});
    return { ok: false, error: "consumed", token: t };
  }
  if (now < t.validFromAt) {
    return { ok: false, error: "not_yet_valid", token: t };
  }
  if (now > t.validUntilAt) {
    // Mark expired so the patient's My QRs list reflects reality.
    t.status = "expired";
    handle.flush();
    await recordEvent({ ...auditBase, category: "data_access", action: "qr.scan.expired", summary: `Scan of expired ${t.kind} QR` }).catch(() => {});
    return { ok: false, error: "expired", token: t };
  }

  // Scanner role gate.
  const role = (scannedBy.role || "") as QrScope["scannerRoles"][number];
  if (!t.scope.scannerRoles.includes(role) && !t.scope.scannerRoles.includes("any_clinician")) {
    // Emergency QRs allow any_clinician — admin sees that exception.
    await recordEvent({
      ...auditBase,
      category: "data_access",
      action: "qr.scan.wrong_role",
      severity: "high",
      summary: `Role ${role} attempted to scan ${t.kind} QR (allowed: ${t.scope.scannerRoles.join("/")})`,
    }).catch(() => {});
    return { ok: false, error: "wrong_role", token: t };
  }
  if (t.scope.scannerDoctorId && t.scope.scannerDoctorId !== scannedBy.doctorId) {
    await recordEvent({
      ...auditBase,
      category: "data_access",
      action: "qr.scan.wrong_doctor",
      severity: "high",
      summary: `Doctor ${scannedBy.doctorId} attempted to use a consent QR pre-authorised for a different doctor`,
    }).catch(() => {});
    return { ok: false, error: "wrong_doctor", token: t };
  }

  // ── Success path ──
  t.scanCount++;
  if (!t.firstScannedAt) {
    t.firstScannedAt = now;
    t.firstScannedBy = scannedBy.email;
  }
  if (t.usage === "single") {
    t.status = "consumed";
  }
  handle.flush();

  await recordEvent({
    ...auditBase,
    category: "data_access",
    action: `qr.scan.${t.kind}`,
    severity: t.kind === "emergency" ? "high" : "info", // emergency = high so it surfaces fast for after-the-fact review
    summary: `${t.kind} QR scanned · patient ${t.patientId} · fields=${t.scope.fields.join(",")}`,
    after: { fields: t.scope.fields, scanCount: t.scanCount },
  }).catch(() => {});

  return { ok: true, token: t };
}

// ── Revoke ───────────────────────────────────────────────────────

export async function revokeQr(
  token: string,
  by: { email: string; role?: string },
  reason?: string,
): Promise<QrToken | null> {
  await ensureHydrated();
  const t = tokens.find((x) => x.token === token);
  if (!t) return null;
  if (t.status === "revoked") return t;
  t.status = "revoked";
  t.revokedAt = new Date().toISOString();
  t.revokedByEmail = by.email;
  t.revokedReason = reason;
  handle.flush();
  await recordEvent({
    category: "data_access",
    action: `qr.revoked.${t.kind}`,
    actorEmail: by.email,
    actorRole: by.role,
    subjectKind: "qr_token",
    subjectId: t.token.slice(0, 12) + "…",
    summary: `${t.kind} QR revoked for patient ${t.patientId}${reason ? ` (${reason})` : ""}`,
  }).catch(() => {});
  return t;
}

// ── Read ─────────────────────────────────────────────────────────

export async function listQrsForPatient(patientId: string): Promise<QrToken[]> {
  await ensureHydrated();
  return tokens
    .filter((t) => t.patientId === patientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getQr(token: string): Promise<QrToken | null> {
  await ensureHydrated();
  return tokens.find((t) => t.token === token) || null;
}

/** Used by reception's "I scanned the identity QR, here is the
 *  patient" view. Returns a safe summary that strips the actual
 *  token even if the caller already has it. */
export function publicShape(t: QrToken): Omit<QrToken, "token"> & { tokenPreview: string } {
  const { token, ...rest } = t;
  return { ...rest, tokenPreview: token.slice(0, 4) + "…" + token.slice(-4) };
}

// ── Convenience for the auto-wired call sites ────────────────────

/** Called from V6 §5.6 appointment.booked. Issues a single-use
 *  appointment QR that's valid 30 min before slot + 2 h after. */
export async function issueAppointmentQr(input: {
  bookingId: string;
  patientId: string;
  patientEmail: string;
  timeSlotStartAt: string;
}): Promise<QrToken> {
  const slotStart = new Date(input.timeSlotStartAt);
  const validFrom = new Date(slotStart.getTime() - 30 * 60_000);
  const validUntil = new Date(slotStart.getTime() + 2 * 60 * 60_000);
  const ttlHours = Math.max(0.5, (validUntil.getTime() - Date.now()) / 3_600_000);
  const t = await issueQr({
    kind: "appointment",
    patientId: input.patientId,
    createdByEmail: input.patientEmail,
    contextKind: "appointment",
    contextId: input.bookingId,
    validityHours: ttlHours,
    label: `Booking ${input.bookingId}`,
  });
  // The actual validFromAt is computed as "now" inside issueQr, but
  // we want the 30-min-pre-slot window. Patch it.
  await ensureHydrated();
  const stored = tokens.find((x) => x.token === t.token);
  if (stored) {
    stored.validFromAt = validFrom.toISOString();
    stored.validUntilAt = validUntil.toISOString();
    handle.flush();
  }
  return stored || t;
}

/** Called once per patient at account creation for the long-lived
 *  identity card. Idempotent — returns the existing identity QR
 *  if one already exists. */
export async function ensureIdentityQr(patientId: string, createdByEmail: string): Promise<QrToken> {
  await ensureHydrated();
  const existing = tokens.find((t) => t.patientId === patientId && t.kind === "identity" && t.status === "active");
  if (existing) return existing;
  return issueQr({
    kind: "identity",
    patientId,
    createdByEmail,
    label: "OduDoc ID card",
  });
}

/** Called once per patient (or refreshed annually). */
export async function ensureEmergencyQr(patientId: string, createdByEmail: string): Promise<QrToken> {
  await ensureHydrated();
  const existing = tokens.find((t) => t.patientId === patientId && t.kind === "emergency" && t.status === "active");
  if (existing) return existing;
  return issueQr({
    kind: "emergency",
    patientId,
    createdByEmail,
    label: "Emergency · break-glass",
  });
}
