// ABDM care-context registry.
//
// A "care context" in ABDM-speak is a discoverable record bundle —
// typically one encounter, with metadata describing what's inside
// (OPDConsultation / DischargeSummary / Prescription / DiagnosticReport
// / WellnessRecord / ImmunizationRecord). When a HIU (Health
// Information User — another hospital, an insurer, a research org)
// asks for a patient's records via the Consent Manager, NHA returns
// the list of registered care contexts that match the patient's
// ABHA → and the HIP (us) is responsible for serving the actual
// FHIR bundle on demand.
//
// We register a care context the moment an encounter / Rx / report
// is finalised in our system, so it's always discoverable. Linking
// happens lazily — until the patient initiates a "fetch records"
// flow from any PHR app, the context just sits here.

import { bindPersistentArray } from "../persistent-array";

export type CareContextType =
  | "OPDConsultation"
  | "DischargeSummary"
  | "Prescription"
  | "DiagnosticReport"
  | "ImmunizationRecord"
  | "WellnessRecord"
  | "HealthDocumentRecord";

export type CareContextStatus =
  | "draft"            // generated locally; not yet pushed to NHA
  | "registered"       // pushed to NHA registry; discoverable
  | "linked"           // patient's PHR has linked it
  | "withdrawn";       // we pulled it back (correction / patient delete)

export interface CareContext {
  id: string;
  organizationId: string;
  /** ABHA number this context belongs to. */
  abhaNumber: string;
  /** Internal patient id at our HIP. */
  patientUserId: string;
  /** What the context represents. */
  type: CareContextType;
  /** Human-readable title shown in the patient's PHR app
   *  ("Consultation with Dr. Sharma at OduDoc Hospital, 12 May 2026"). */
  display: string;
  /** Encounter / Rx / report id we'd resolve into a FHIR bundle on
   *  fetch. Free-form so any module can register without a schema
   *  bump. */
  internalRef: string;
  /** ISO date the underlying record was created. */
  recordDate: string;
  status: CareContextStatus;
  /** When pushed to NHA, the registry returns a contextId — stash
   *  it for subsequent operations (de-link / withdraw). */
  nhaContextId?: string;
  registeredAt?: string;
  linkedAt?: string;
  withdrawnAt?: string;
  createdAt: string;
  updatedAt: string;
}

const contexts: CareContext[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<CareContext>(
  "abdm_care_contexts",
  contexts,
  () => []
);
await hydrate();

export function listContextsForAbha(abhaNumber: string): CareContext[] {
  const norm = abhaNumber.replace(/[^0-9]/g, "");
  return contexts
    .filter((c) => c.abhaNumber.replace(/[^0-9]/g, "") === norm)
    .sort((a, b) => b.recordDate.localeCompare(a.recordDate));
}

export function listContextsForOrg(organizationId: string): CareContext[] {
  return contexts
    .filter((c) => c.organizationId === organizationId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getContext(id: string): CareContext | null {
  return contexts.find((c) => c.id === id) || null;
}

export interface RegisterContextInput {
  organizationId: string;
  abhaNumber: string;
  patientUserId: string;
  type: CareContextType;
  display: string;
  internalRef: string;
  recordDate?: string;
  nhaContextId?: string;
  status?: CareContextStatus;
}

export function registerContext(input: RegisterContextInput): CareContext {
  const now = new Date().toISOString();
  const c: CareContext = {
    id: `cc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    abhaNumber: input.abhaNumber.trim(),
    patientUserId: input.patientUserId,
    type: input.type,
    display: input.display.trim(),
    internalRef: input.internalRef,
    recordDate: input.recordDate || now,
    status: input.status || "draft",
    nhaContextId: input.nhaContextId,
    registeredAt: input.status === "registered" ? now : undefined,
    createdAt: now,
    updatedAt: now,
  };
  contexts.unshift(c);
  flush();
  return c;
}

export function transitionContext(
  id: string,
  status: CareContextStatus,
  nhaContextId?: string,
): CareContext | null {
  const c = contexts.find((x) => x.id === id);
  if (!c) return null;
  const now = new Date().toISOString();
  c.status = status;
  if (nhaContextId) c.nhaContextId = nhaContextId;
  if (status === "registered") c.registeredAt = now;
  if (status === "linked") c.linkedAt = now;
  if (status === "withdrawn") c.withdrawnAt = now;
  c.updatedAt = now;
  flush();
  return c;
}

export function deleteContextsForOrg(organizationId: string): number {
  let n = 0;
  for (let i = contexts.length - 1; i >= 0; i--) {
    if (contexts[i].organizationId === organizationId) {
      tombstone(contexts[i].id);
      contexts.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flush();
  return n;
}

export function deleteContextsForUser(userId: string): number {
  let n = 0;
  for (let i = contexts.length - 1; i >= 0; i--) {
    if (contexts[i].patientUserId === userId) {
      tombstone(contexts[i].id);
      contexts.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flush();
  return n;
}
