// DPDP Consent Vault.
//
// Single source of truth for every consent the user has issued across
// the platform. The Health Passport store handles its own per-org
// scan grants (because that flow is hot-path scanning), but every
// consent of every kind is *also* mirrored here so the patient sees
// one screen showing "what I've agreed to, with whom, for how long,
// for what purpose" — with one-click revoke and a signed receipt
// they can download as legal proof under the DPDP Act.
//
// This is the regulatory moat: built right, it's a 10x lift over
// what every Indian healthtech competitor offers (most of them have
// an opaque ToS checkbox at signup and call it done).
//
// Receipt shape mirrors the ISO 29184 / DEPA "Electronic Consent
// Framework" used by ABDM — purpose, scope, retention, processor,
// data principal rights, signature. Caller can request the receipt
// JSON via /api/privacy/consent/[id]/receipt and a downloadable PDF
// renders client-side.

import { bindPersistentArray } from "./persistent-array";
import crypto from "node:crypto";

// ─── Purpose taxonomy ─────────────────────────────────────────────
// Every consent must declare a purpose. The taxonomy is locked so
// auditors can map our purposes to DPDP's "specific, informed,
// unconditional" test.
export type ConsentPurpose =
  | "passport_share"           // Health Passport scan share with a clinic
  | "inter_org_transfer"       // Cross-org records transfer (patient transfer / referral / records share)
  | "marketing_email"          // Marketing emails / newsletters / offers
  | "marketing_whatsapp"       // WhatsApp marketing broadcasts (Meta-mandated separate opt-in)
  | "research"                 // Anonymised data inclusion in clinical research
  | "abdm_phr_push"            // Push records into the ABDM PHR ecosystem
  | "doctor_review"            // Public review attribution under the patient's name
  | "ai_training"              // De-identified data for model training
  | "family_view"              // Allow another OduDoc user (family member) to view records
  | "telemedicine_recording"   // Ambient-scribe / video-call recording for the visit
  | "insurance_claim";         // Share records with insurer / TPA for claim processing

export type ConsentStatus = "granted" | "revoked" | "expired";

export interface ConsentRecord {
  id: string;
  /** User who owns the data principal status. */
  userId: string;
  /** When the consent is for a dependent profile rather than the
   *  owner's own record. */
  dependentId?: string;
  /** What we're collecting / sharing. */
  purpose: ConsentPurpose;
  /** Free-text human-readable purpose statement. We render this
   *  verbatim in the consent dialog and the receipt — "We will share
   *  your blood-test results with Apollo Hyderabad for the next 24
   *  hours so they can plan your inpatient admission." */
  purposeStatement: string;
  /** The recipient identifier — most often an Organization id, but
   *  may be a User id (family-view) or "platform" (research / AI). */
  recipientKind: "organization" | "user" | "platform" | "external";
  recipientId: string;
  recipientName: string;
  /** Specific data categories the consent covers. Array of keys
   *  (e.g. "allergies", "diagnoses", "lab_results"). Free-form so
   *  feature owners can declare their own without a schema bump. */
  dataCategories: string[];
  /** ISO timestamp when consent expires; null = until revoked. */
  expiresAt: string | null;
  /** How long after revocation we keep the data on file. Most flows
   *  need ~30d for billing/audit; "0" means hard-delete on revoke. */
  postRevokeRetentionDays?: number;
  /** "Lawful basis" under DPDP. Almost always "consent"; we surface
   *  it explicitly so the receipt PDF can be filed with grievance
   *  officers and ABDM auditors. */
  lawfulBasis: "consent" | "vital_interest" | "legal_obligation";
  status: ConsentStatus;
  grantedAt: string;
  /** Captured at grant time so the receipt can attest the user
   *  saw the exact statement they agreed to. */
  ipAddress?: string;
  userAgent?: string;
  /** ISO timestamp when revoked. */
  revokedAt?: string;
  /** Optional reason captured on revoke — surfaced in the audit log. */
  revokeReason?: string;
  /** HMAC signature over the immutable fields, computed at grant
   *  time. The receipt renders this so the user has cryptographic
   *  proof we didn't tamper. */
  signature: string;
  /** When the receipt has been downloaded by the user. Useful both
   *  for our own metrics and for the audit trail (proof the user
   *  exercised their right to a receipt). */
  receiptDownloadedAt?: string;
}

// ─── Erasure (right-to-be-forgotten) requests ────────────────────
// DPDP §13(2)(b) gives the data principal the right to erase their
// data. We don't auto-purge — there's a 14-day cooling-off period
// during which the user can cancel, and a super-admin reviews to
// ensure no legal-hold conflicts (e.g. ongoing dispute with a
// clinic over a billing claim).
export type ErasureStatus =
  | "pending_review"
  | "cooling_off"
  | "approved"
  | "completed"
  | "rejected"
  | "cancelled";

export interface ErasureRequest {
  id: string;
  userId: string;
  filedAt: string;
  /** Free-text reason captured on the form. */
  reason?: string;
  /** Whether the user wants to keep family/dependent data. The default
   *  is to wipe everything; opting in to keep dependent records lets
   *  parents leave their kids' data in place when they offboard. */
  retainDependents: boolean;
  /** What the user wants gone — categories declared in their request
   *  form; super-admin can scope wider/narrower on review. */
  scopeCategories: string[];
  status: ErasureStatus;
  coolingOffEndsAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  completedAt?: string;
  cancelledAt?: string;
}

// ─── Storage ─────────────────────────────────────────────────────
const consents: ConsentRecord[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<ConsentRecord>(
  "consent_vault",
  consents,
  () => []
);
await hydrate();

const erasures: ErasureRequest[] = [];
const { hydrate: hydrateErasures, flush: flushErasures } = bindPersistentArray<ErasureRequest>(
  "erasure_requests",
  erasures,
  () => []
);
await hydrateErasures();

// ─── Signing ─────────────────────────────────────────────────────
const SECRET = process.env.CONSENT_VAULT_SECRET ||
  process.env.HEALTH_PASSPORT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "dev-only-rotate-in-prod";

function signRecord(c: Omit<ConsentRecord, "signature">): string {
  // Hash a stable canonical string of the immutable fields. We
  // deliberately exclude status / revokedAt / receiptDownloadedAt
  // so the signature stays valid through the full lifecycle —
  // their authenticity is covered by audit-log rows instead.
  const canon = [
    c.id, c.userId, c.dependentId || "",
    c.purpose, c.purposeStatement,
    c.recipientKind, c.recipientId, c.recipientName,
    (c.dataCategories || []).slice().sort().join(","),
    c.expiresAt || "",
    c.lawfulBasis,
    c.grantedAt,
  ].join("|");
  return crypto.createHmac("sha256", SECRET).update(canon).digest("hex");
}

// ─── Read API ────────────────────────────────────────────────────
export function listConsentsForUser(userId: string): ConsentRecord[] {
  return consents
    .filter((c) => c.userId === userId)
    .sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
}

export function getConsent(id: string): ConsentRecord | null {
  return consents.find((c) => c.id === id) || null;
}

export function getConsentForUser(id: string, userId: string): ConsentRecord | null {
  const c = getConsent(id);
  return c && c.userId === userId ? c : null;
}

/** Check whether a given purpose-recipient combo currently has an
 *  active consent for the user/dependent. Stamp expiry on read so
 *  the caller never operates on stale data. */
export function findActiveConsentByPurpose(input: {
  userId: string;
  dependentId?: string;
  purpose: ConsentPurpose;
  recipientId: string;
}): ConsentRecord | null {
  const now = Date.now();
  for (const c of consents) {
    if (c.userId !== input.userId) continue;
    if ((c.dependentId || "") !== (input.dependentId || "")) continue;
    if (c.purpose !== input.purpose) continue;
    if (c.recipientId !== input.recipientId) continue;
    if (c.status === "revoked") continue;
    if (c.expiresAt && new Date(c.expiresAt).getTime() <= now) {
      // Lazily mark expired so the read is honest.
      c.status = "expired";
      flush();
      continue;
    }
    return c;
  }
  return null;
}

// ─── Write API ───────────────────────────────────────────────────
export interface RecordConsentInput {
  userId: string;
  dependentId?: string;
  purpose: ConsentPurpose;
  purposeStatement: string;
  recipientKind: ConsentRecord["recipientKind"];
  recipientId: string;
  recipientName: string;
  dataCategories: string[];
  ttlHours?: number;
  postRevokeRetentionDays?: number;
  lawfulBasis?: ConsentRecord["lawfulBasis"];
  ipAddress?: string;
  userAgent?: string;
}

export function recordConsent(input: RecordConsentInput): ConsentRecord {
  // De-dupe: if there's already an active grant for the same
  // (user, dependent, purpose, recipient) tuple we extend it instead
  // of stacking a new row. Keeps the vault readable.
  const existing = findActiveConsentByPurpose({
    userId: input.userId,
    dependentId: input.dependentId,
    purpose: input.purpose,
    recipientId: input.recipientId,
  });
  const now = new Date().toISOString();
  const expiresAt = input.ttlHours
    ? new Date(Date.now() + input.ttlHours * 60 * 60 * 1000).toISOString()
    : null;
  if (existing) {
    existing.purposeStatement = input.purposeStatement;
    existing.dataCategories = input.dataCategories;
    existing.expiresAt = expiresAt;
    existing.postRevokeRetentionDays = input.postRevokeRetentionDays ?? existing.postRevokeRetentionDays;
    existing.lawfulBasis = input.lawfulBasis ?? existing.lawfulBasis;
    existing.signature = signRecord(existing);
    flush();
    return existing;
  }

  const draft: Omit<ConsentRecord, "signature"> = {
    id: `cv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId: input.userId,
    dependentId: input.dependentId,
    purpose: input.purpose,
    purposeStatement: input.purposeStatement,
    recipientKind: input.recipientKind,
    recipientId: input.recipientId,
    recipientName: input.recipientName,
    dataCategories: input.dataCategories,
    expiresAt,
    postRevokeRetentionDays: input.postRevokeRetentionDays,
    lawfulBasis: input.lawfulBasis ?? "consent",
    status: "granted",
    grantedAt: now,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  };
  const c: ConsentRecord = { ...draft, signature: signRecord(draft) };
  consents.push(c);
  flush();
  return c;
}

export function revokeVaultConsent(
  id: string,
  userId: string,
  reason?: string,
): ConsentRecord | null {
  const c = getConsentForUser(id, userId);
  if (!c) return null;
  if (c.status === "revoked") return c;
  c.status = "revoked";
  c.revokedAt = new Date().toISOString();
  c.revokeReason = reason?.trim() || undefined;
  flush();
  return c;
}

export function markReceiptDownloaded(id: string): ConsentRecord | null {
  const c = consents.find((x) => x.id === id);
  if (!c) return null;
  c.receiptDownloadedAt = new Date().toISOString();
  flush();
  return c;
}

// ─── Receipt builder ─────────────────────────────────────────────
export interface ConsentReceipt {
  receiptId: string;
  receiptVersion: "1.0";
  issuer: { name: string; jurisdiction: string };
  dataPrincipal: { userId: string; dependentId?: string };
  consent: {
    id: string;
    purpose: ConsentPurpose;
    purposeStatement: string;
    recipient: { kind: string; id: string; name: string };
    dataCategories: string[];
    grantedAt: string;
    expiresAt: string | null;
    lawfulBasis: string;
    status: ConsentStatus;
    revokedAt?: string;
  };
  signature: { algorithm: "HMAC-SHA256"; value: string };
  rights: {
    access: string;
    correction: string;
    erasure: string;
    portability: string;
    grievance: string;
  };
}

export function buildReceipt(c: ConsentRecord): ConsentReceipt {
  return {
    receiptId: `receipt-${c.id}`,
    receiptVersion: "1.0",
    issuer: {
      name: "OduDoc Health (Data Fiduciary)",
      jurisdiction: "India · DPDP Act 2023",
    },
    dataPrincipal: {
      userId: c.userId,
      dependentId: c.dependentId,
    },
    consent: {
      id: c.id,
      purpose: c.purpose,
      purposeStatement: c.purposeStatement,
      recipient: {
        kind: c.recipientKind,
        id: c.recipientId,
        name: c.recipientName,
      },
      dataCategories: c.dataCategories,
      grantedAt: c.grantedAt,
      expiresAt: c.expiresAt,
      lawfulBasis: c.lawfulBasis,
      status: c.status,
      revokedAt: c.revokedAt,
    },
    signature: { algorithm: "HMAC-SHA256", value: c.signature },
    rights: {
      access: "Request a full data export at /dashboard/privacy.",
      correction: "Edit allergies / meds / profile data inline in the dashboard.",
      erasure: "File a deletion request at /dashboard/privacy.",
      portability: "Download a JSON export from /dashboard/privacy.",
      grievance: "Email grievance@odudoc.com — response within 7 days.",
    },
  };
}

// ─── Erasure (right-to-be-forgotten) ─────────────────────────────
export function fileErasureRequest(input: {
  userId: string;
  reason?: string;
  retainDependents?: boolean;
  scopeCategories?: string[];
}): ErasureRequest {
  // Only one open request at a time. Re-filing while one is open
  // updates the existing row.
  const existing = erasures.find(
    (e) =>
      e.userId === input.userId &&
      ["pending_review", "cooling_off", "approved"].includes(e.status),
  );
  const now = Date.now();
  const coolingOffEndsAt = new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString();
  if (existing) {
    existing.reason = input.reason ?? existing.reason;
    existing.retainDependents = input.retainDependents ?? existing.retainDependents;
    existing.scopeCategories = input.scopeCategories ?? existing.scopeCategories;
    existing.status = "cooling_off";
    existing.coolingOffEndsAt = coolingOffEndsAt;
    flushErasures();
    return existing;
  }
  const e: ErasureRequest = {
    id: `era-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId: input.userId,
    filedAt: new Date(now).toISOString(),
    reason: input.reason?.trim(),
    retainDependents: input.retainDependents ?? false,
    scopeCategories: input.scopeCategories ?? ["all"],
    status: "cooling_off",
    coolingOffEndsAt,
  };
  erasures.push(e);
  flushErasures();
  return e;
}

export function cancelErasureRequest(
  id: string,
  userId: string,
): ErasureRequest | null {
  const e = erasures.find((x) => x.id === id && x.userId === userId);
  if (!e) return null;
  if (!["pending_review", "cooling_off", "approved"].includes(e.status)) return e;
  e.status = "cancelled";
  e.cancelledAt = new Date().toISOString();
  flushErasures();
  return e;
}

export function listErasureRequestsForUser(userId: string): ErasureRequest[] {
  return erasures
    .filter((e) => e.userId === userId)
    .sort((a, b) => b.filedAt.localeCompare(a.filedAt));
}

export function listOpenErasureRequests(): ErasureRequest[] {
  return erasures.filter((e) =>
    ["pending_review", "cooling_off", "approved"].includes(e.status),
  );
}

export function reviewErasureRequest(
  id: string,
  reviewerEmail: string,
  decision: "approved" | "rejected",
  note?: string,
): ErasureRequest | null {
  const e = erasures.find((x) => x.id === id);
  if (!e) return null;
  e.status = decision;
  e.reviewedBy = reviewerEmail;
  e.reviewedAt = new Date().toISOString();
  e.reviewNote = note?.trim() || undefined;
  flushErasures();
  return e;
}

export function markErasureCompleted(id: string): ErasureRequest | null {
  const e = erasures.find((x) => x.id === id);
  if (!e) return null;
  e.status = "completed";
  e.completedAt = new Date().toISOString();
  flushErasures();
  return e;
}

/** Cleanup hook used by user-deletion paths so the vault drops
 *  consents tied to a user that no longer exists. */
export function deleteVaultConsentsForUser(userId: string): number {
  let n = 0;
  for (let i = consents.length - 1; i >= 0; i--) {
    if (consents[i].userId === userId) {
      tombstone(consents[i].id);
      consents.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flush();
  return n;
}
