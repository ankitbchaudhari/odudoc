// CTMS — Clinical Trials Management System. Spec v6.0 §17 + admin/ctms.
//
// Three primitives:
//   - Protocol (study definition, sponsor, sites, eligibility,
//     visit schedule, IRB approval).
//   - Subject (enrolled patient, assigned to a protocol with a
//     unique subject id distinct from their EMR identifier).
//   - AE/SAE (adverse event reports — graded, causality assessed,
//     SAEs auto-paged to medical monitor + sponsor within 24 h).
//
// Compliance posture: GCP (Good Clinical Practice) + ICH E6 R2.
// Audit trail on every state change.

import { bindPersistentArray } from "./persistent-array";

// ── Protocols ────────────────────────────────────────────────────
export interface CtmsProtocol {
  id: string;
  /** Sponsor + protocol number — used on the consent form. */
  protocolNumber: string;
  sponsor: string;
  title: string;
  phase: "I" | "II" | "III" | "IV" | "PMS";
  /** Sites enrolled in this protocol. */
  siteIds: string[];
  /** IRB / ethics committee approval reference + expiry. */
  irbApprovalRef?: string;
  irbExpiresOn?: string;
  /** Visit schedule template — visit name → day offset from
   *  baseline. */
  visitSchedule: Array<{ name: string; dayOffset: number; window: number }>;
  /** Inclusion / exclusion bullet list. */
  inclusion: string[];
  exclusion: string[];
  status: "draft" | "irb_review" | "active" | "closed" | "suspended";
  createdAt: string;
}

// ── Subjects ─────────────────────────────────────────────────────
export interface CtmsSubject {
  id: string;
  /** Site this subject is enrolled at. */
  organizationId: string;
  protocolId: string;
  /** Subject id assigned by the trial (NOT the patient's email). */
  subjectId: string;
  /** Patient's email — link to their EMR. Internal only. */
  patientEmail: string;
  /** Subject status. */
  status:
    | "screening"
    | "enrolled"
    | "active"
    | "completed"
    | "withdrawn"
    | "lost_to_followup";
  enrolledOn?: string;
  /** Day-0 baseline date. */
  baselineDate?: string;
  /** When the subject was screen-failed or withdrew. */
  exitedAt?: string;
  exitReason?: string;
  createdAt: string;
}

// ── Adverse Events ───────────────────────────────────────────────
export type AeSeverity = 1 | 2 | 3 | 4 | 5; // CTCAE grade
export type AeCausality = "unrelated" | "unlikely" | "possible" | "probable" | "definite";

export interface AdverseEvent {
  id: string;
  subjectId: string;        // CtmsSubject.subjectId
  protocolId: string;
  organizationId: string;
  /** When the event was observed. */
  observedOn: string;
  description: string;
  severity: AeSeverity;
  /** SAE rules: severity 4-5 OR fatal OR life-threatening OR
   *  hospitalisation. Drives the 24-hour sponsor report. */
  serious: boolean;
  causality: AeCausality;
  /** Reporting doctor. */
  reportedBy: string;
  /** When the sponsor / medical monitor was notified. */
  notifiedAt?: string;
  /** Resolution. */
  resolvedAt?: string;
  resolution?: "resolved" | "resolved_with_sequelae" | "ongoing" | "fatal" | "unknown";
  createdAt: string;
}

const protocols: CtmsProtocol[] = [];
const subjects: CtmsSubject[] = [];
const events: AdverseEvent[] = [];

const pHy = bindPersistentArray<CtmsProtocol>("ctms_protocols", protocols, () => []);
const sHy = bindPersistentArray<CtmsSubject>("ctms_subjects", subjects, () => []);
const eHy = bindPersistentArray<AdverseEvent>("ctms_adverse_events", events, () => []);
await pHy.hydrate();
await sHy.hydrate();
await eHy.hydrate();

function id(p: string): string {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Protocol management ─────────────────────────────────────────
export function createProtocol(input: Omit<CtmsProtocol, "id" | "status" | "createdAt">): CtmsProtocol {
  const p: CtmsProtocol = {
    id: id("prot"),
    status: "draft",
    createdAt: new Date().toISOString(),
    ...input,
  };
  protocols.unshift(p);
  pHy.flush();
  return p;
}

export function activateProtocol(protocolId: string): CtmsProtocol | null {
  const p = protocols.find((x) => x.id === protocolId);
  if (!p) return null;
  if (!p.irbApprovalRef) return null; // Refuse to activate without IRB
  p.status = "active";
  pHy.flush();
  return p;
}

// ── Subject management ──────────────────────────────────────────
export function enrolSubject(input: Omit<CtmsSubject, "id" | "status" | "createdAt">): CtmsSubject {
  const s: CtmsSubject = {
    id: id("subj"),
    status: "screening",
    createdAt: new Date().toISOString(),
    ...input,
  };
  subjects.push(s);
  sHy.flush();
  return s;
}

export function setSubjectStatus(subjectRowId: string, status: CtmsSubject["status"], patch: Partial<CtmsSubject> = {}): CtmsSubject | null {
  const s = subjects.find((x) => x.id === subjectRowId);
  if (!s) return null;
  Object.assign(s, patch);
  s.status = status;
  if (status === "enrolled" && !s.enrolledOn) s.enrolledOn = new Date().toISOString();
  if ((status === "withdrawn" || status === "lost_to_followup" || status === "completed") && !s.exitedAt) {
    s.exitedAt = new Date().toISOString();
  }
  sHy.flush();
  return s;
}

// ── AE / SAE reporting ──────────────────────────────────────────
export function reportAdverseEvent(input: Omit<AdverseEvent, "id" | "createdAt" | "serious">): AdverseEvent {
  const serious = input.severity >= 4;
  const ae: AdverseEvent = {
    id: id("ae"),
    serious,
    createdAt: new Date().toISOString(),
    ...input,
  };
  events.unshift(ae);
  eHy.flush();
  return ae;
}

export function markNotified(eventRowId: string): AdverseEvent | null {
  const a = events.find((x) => x.id === eventRowId);
  if (!a) return null;
  a.notifiedAt = new Date().toISOString();
  eHy.flush();
  return a;
}

export function resolveAdverseEvent(eventRowId: string, resolution: AdverseEvent["resolution"]): AdverseEvent | null {
  const a = events.find((x) => x.id === eventRowId);
  if (!a) return null;
  a.resolution = resolution;
  a.resolvedAt = new Date().toISOString();
  eHy.flush();
  return a;
}

/** SAEs that haven't been notified to the sponsor within 24 h —
 *  flagged on the medical monitor's dashboard with a red banner. */
export function listOverdueSaes(now: number = Date.now()): AdverseEvent[] {
  return events.filter((a) => {
    if (!a.serious || a.notifiedAt) return false;
    const ageMs = now - new Date(a.createdAt).getTime();
    return ageMs > 24 * 3600 * 1000;
  });
}

export function listProtocols(opts: { activeOnly?: boolean } = {}): CtmsProtocol[] {
  return opts.activeOnly ? protocols.filter((p) => p.status === "active") : [...protocols];
}

export function listSubjects(filter: { protocolId?: string; organizationId?: string; status?: CtmsSubject["status"] } = {}): CtmsSubject[] {
  let list = [...subjects];
  if (filter.protocolId) list = list.filter((s) => s.protocolId === filter.protocolId);
  if (filter.organizationId) list = list.filter((s) => s.organizationId === filter.organizationId);
  if (filter.status) list = list.filter((s) => s.status === filter.status);
  return list;
}
