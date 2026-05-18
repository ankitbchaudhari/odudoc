// Time-limited patient share tokens. Spec v6.0 §33 + Privacy.
//
// A patient grants a non-OduDoc consumer (foreign doctor, insurer
// reviewer, second-opinion specialist) view-only access to a
// specific record slice for a bounded time window. The token is a
// short opaque string that resolves to the patient + scope on
// /share/<token> — no login required at the consumer end.
//
// Scopes (additive — patient can combine any subset):
//   - consultations (specific id or "all")
//   - prescriptions (specific id or "all")
//   - lab_reports
//   - radiology
//   - vitals
//   - vaccinations
//
// Every dereference is logged for the patient's audit page.

import crypto from "crypto";
import { bindPersistentArray } from "./persistent-array";

export type ShareScope =
  | "consultations"
  | "prescriptions"
  | "lab_reports"
  | "radiology"
  | "vitals"
  | "vaccinations";

export interface ShareToken {
  /** The opaque token (URL-safe base64, 32 chars). */
  token: string;
  /** Patient who issued the share. */
  patientEmail: string;
  /** Optional consumer label so the patient remembers who they
   *  shared with ("Dr. Sharma at Apollo"). */
  consumerLabel?: string;
  /** Optional consumer email — used to email the link on grant. */
  consumerEmail?: string;
  /** What's accessible. Empty array = no access (revoked). */
  scopes: ShareScope[];
  /** Specific record ids the share is pinned to (optional —
   *  empty means the scope covers all of that type). */
  consultationIds?: string[];
  prescriptionIds?: string[];
  createdAt: string;
  expiresAt: string;
  /** Audit — every dereference. */
  accesses: Array<{ at: string; ipFingerprint?: string; userAgent?: string }>;
  /** Revoked by the patient before expiry. */
  revokedAt?: string;
}

const tokens: ShareToken[] = [];
const { hydrate, flush } = bindPersistentArray<ShareToken>(
  "share_tokens",
  tokens,
  () => [],
);
await hydrate();

function mintToken(): string {
  // 32-char base64url — single-use the URL, plenty of keyspace.
  return crypto.randomBytes(24).toString("base64url");
}

export function createShareToken(input: {
  patientEmail: string;
  scopes: ShareScope[];
  consumerLabel?: string;
  consumerEmail?: string;
  consultationIds?: string[];
  prescriptionIds?: string[];
  /** Hours of validity. */
  validHours: number;
}): ShareToken {
  const t: ShareToken = {
    token: mintToken(),
    patientEmail: input.patientEmail.toLowerCase().trim(),
    consumerLabel: input.consumerLabel,
    consumerEmail: input.consumerEmail,
    scopes: input.scopes,
    consultationIds: input.consultationIds,
    prescriptionIds: input.prescriptionIds,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + input.validHours * 3600 * 1000).toISOString(),
    accesses: [],
  };
  tokens.unshift(t);
  flush();
  return t;
}

export function revokeShareToken(token: string, patientEmail: string): ShareToken | null {
  const t = tokens.find((x) => x.token === token && x.patientEmail === patientEmail.toLowerCase().trim());
  if (!t || t.revokedAt) return null;
  t.revokedAt = new Date().toISOString();
  flush();
  return t;
}

/** Resolve a token. Returns null if invalid / expired / revoked.
 *  Records the dereference for audit. */
export function dereferenceShareToken(token: string, ipFingerprint?: string, userAgent?: string): ShareToken | null {
  const t = tokens.find((x) => x.token === token);
  if (!t) return null;
  if (t.revokedAt) return null;
  if (new Date(t.expiresAt).getTime() < Date.now()) return null;
  t.accesses.push({ at: new Date().toISOString(), ipFingerprint, userAgent });
  flush();
  return t;
}

export function listSharesForPatient(patientEmail: string): ShareToken[] {
  return tokens
    .filter((t) => t.patientEmail === patientEmail.toLowerCase().trim())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
