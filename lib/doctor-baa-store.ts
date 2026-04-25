// Doctor BAA / DPA acceptance audit store.
//
// Whenever a doctor accepts a HIPAA Business Associate Agreement, an
// EU GDPR Data Processing Agreement, or our generic data-processing
// agreement, we record the version they accepted, the timestamp, the
// IP address from which they accepted, and the typed-name signature
// they entered. That bundle is what we'd produce in a regulatory
// audit or a dispute.
//
// We bump CURRENT_VERSIONS whenever the wording changes; old
// acceptances are NOT silently rolled forward — the doctor sees a
// re-acceptance prompt at the top of their dashboard until they
// accept the new revision. The store keeps every historical
// acceptance, never deletes.
//
// Backed by Postgres via bindPersistentArray, like every other store.

import { bindPersistentArray } from "./persistent-array";

export type ComplianceFramework = "HIPAA_BAA" | "GDPR_DPA" | "GENERIC_DPA";

export interface ComplianceAcceptance {
  id: string;
  doctorId?: string; // populated post-approval; null at application time
  applicationId?: string; // populated at application time
  email: string; // canonical lookup key — survives id changes
  framework: ComplianceFramework;
  /** Document version the applicant accepted (e.g. "v1.0.0"). Bump
   *  when wording changes to force re-acceptance. */
  version: string;
  acceptedAt: string; // ISO
  ipAddress?: string;
  userAgent?: string;
  /** Typed-name signature the applicant entered. */
  signature: string;
}

/** Current published version per framework. Bump these when the
 *  legal wording changes — old acceptances become stale and the
 *  doctor sees a re-acceptance prompt on their dashboard. */
export const CURRENT_VERSIONS: Record<ComplianceFramework, string> = {
  HIPAA_BAA: "v1.0.0",
  GDPR_DPA: "v1.0.0",
  GENERIC_DPA: "v1.0.0",
};

const acceptances: ComplianceAcceptance[] = [];
const { hydrate, flush } = bindPersistentArray<ComplianceAcceptance>(
  "doctor-baa-acceptances",
  acceptances,
  () => [],
);
await hydrate();

export interface RecordAcceptanceInput {
  doctorId?: string;
  applicationId?: string;
  email: string;
  framework: ComplianceFramework;
  version?: string; // defaults to CURRENT_VERSIONS[framework]
  ipAddress?: string;
  userAgent?: string;
  signature: string;
}

export function recordAcceptance(input: RecordAcceptanceInput): ComplianceAcceptance {
  const row: ComplianceAcceptance = {
    id: `baa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    doctorId: input.doctorId,
    applicationId: input.applicationId,
    email: input.email.toLowerCase(),
    framework: input.framework,
    version: input.version || CURRENT_VERSIONS[input.framework],
    acceptedAt: new Date().toISOString(),
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    signature: input.signature.trim(),
  };
  acceptances.push(row);
  flush();
  return row;
}

/** Latest acceptance for a doctor email + framework combo, if any. */
export function latestAcceptance(
  email: string,
  framework: ComplianceFramework,
): ComplianceAcceptance | null {
  const e = email.toLowerCase();
  const matches = acceptances.filter((a) => a.email === e && a.framework === framework);
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.acceptedAt.localeCompare(a.acceptedAt));
  return matches[0]!;
}

/** True when the latest acceptance matches the current version — i.e.
 *  the doctor doesn't need to re-accept on dashboard load. */
export function isCurrent(email: string, framework: ComplianceFramework): boolean {
  const latest = latestAcceptance(email, framework);
  return !!latest && latest.version === CURRENT_VERSIONS[framework];
}

export function listAcceptances(): ComplianceAcceptance[] {
  return [...acceptances].sort((a, b) => b.acceptedAt.localeCompare(a.acceptedAt));
}
