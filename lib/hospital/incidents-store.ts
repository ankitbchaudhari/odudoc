// Incident Reports. Tenant-scoped.
//
// NABH / JCI style quality-and-safety reporting: adverse events, near-misses,
// falls, medication errors, sharps injuries, equipment failures, etc.
//
// Status workflow:
//   reported → under_review → investigating → rca_complete → closed
//                                                        ↺ reopened
//
// Severity uses a 6-tier scale loosely aligned with the NCC MERP / WHO
// classifications — from near-miss (no reach) through sentinel event
// (permanent harm / death).

import { bindPersistentArray } from "../persistent-array";

export type IncidentCategory =
  | "medication_error"
  | "fall"
  | "needle_stick"
  | "patient_identification"
  | "equipment"
  | "infection"
  | "surgical"
  | "behavioral"
  | "security"
  | "documentation"
  | "transfusion"
  | "other";

export type IncidentSubject = "patient" | "staff" | "visitor" | "property" | "facility";

export type IncidentSeverity =
  | "near_miss" // reached no one
  | "no_harm"
  | "mild"
  | "moderate"
  | "severe"
  | "sentinel"; // permanent harm / death

export type IncidentStatus =
  | "reported"
  | "under_review"
  | "investigating"
  | "rca_complete"
  | "closed"
  | "reopened";

export interface IncidentReport {
  id: string;
  organizationId: string;
  incidentNumber: string; // INC-{suffix}-{seq}
  category: IncidentCategory;
  subject: IncidentSubject;
  patientId?: string; // if subject = patient
  location: string; // "Ward 3B", "OT-2", "Pharmacy"
  occurredAt: string;
  reportedAt: string;
  reportedBy: string;
  staffInvolved?: string; // names, comma-separated
  witnesses?: string;
  description: string;
  immediateAction?: string;
  severity: IncidentSeverity;
  confidential: boolean;

  // Investigation / RCA
  rootCause?: string;
  contributingFactors?: string;
  correctiveAction?: string; // what we're doing now
  preventiveAction?: string; // what stops recurrence
  capaOwner?: string;
  capaTargetDate?: string;
  capaCompletedAt?: string;

  status: IncidentStatus;
  closedAt?: string;
  closedBy?: string;
  closureNotes?: string;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const incidents: IncidentReport[] = [];
const { hydrate, flush } = bindPersistentArray<IncidentReport>(
  "hospital-incidents",
  incidents,
  () => []
);
await hydrate();

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}

function nextIncidentNumber(orgId: string): string {
  const n = incidents.filter((i) => i.organizationId === orgId).length + 1;
  return `INC-${orgSuffix(orgId)}-${String(n).padStart(5, "0")}`;
}

export const CATEGORY_LABEL: Record<IncidentCategory, string> = {
  medication_error: "Medication Error",
  fall: "Patient Fall",
  needle_stick: "Needle-stick / Sharps",
  patient_identification: "Patient Identification",
  equipment: "Equipment Failure",
  infection: "Infection / HAI",
  surgical: "Surgical / Procedural",
  behavioral: "Behavioral / Violent",
  security: "Security",
  documentation: "Documentation",
  transfusion: "Transfusion Reaction",
  other: "Other",
};

export const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  near_miss: "Near Miss",
  no_harm: "No Harm",
  mild: "Mild Harm",
  moderate: "Moderate Harm",
  severe: "Severe Harm",
  sentinel: "Sentinel Event",
};

export function listIncidents(opts: {
  organizationId: string;
  patientId?: string;
  category?: IncidentCategory;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  subject?: IncidentSubject;
}): IncidentReport[] {
  let list = incidents.filter((i) => i.organizationId === opts.organizationId);
  if (opts.patientId) list = list.filter((i) => i.patientId === opts.patientId);
  if (opts.category) list = list.filter((i) => i.category === opts.category);
  if (opts.severity) list = list.filter((i) => i.severity === opts.severity);
  if (opts.status) list = list.filter((i) => i.status === opts.status);
  if (opts.subject) list = list.filter((i) => i.subject === opts.subject);

  const sevOrder: Record<IncidentSeverity, number> = {
    sentinel: 0,
    severe: 1,
    moderate: 2,
    mild: 3,
    no_harm: 4,
    near_miss: 5,
  };
  const statusOrder: Record<IncidentStatus, number> = {
    reported: 0,
    under_review: 1,
    investigating: 2,
    reopened: 3,
    rca_complete: 4,
    closed: 5,
  };
  return list.sort((a, b) => {
    const s = statusOrder[a.status] - statusOrder[b.status];
    if (s !== 0) return s;
    const sev = sevOrder[a.severity] - sevOrder[b.severity];
    if (sev !== 0) return sev;
    return (
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );
  });
}

export interface IncidentInput {
  category?: IncidentCategory;
  subject?: IncidentSubject;
  patientId?: string;
  location?: string;
  occurredAt?: string;
  reportedAt?: string;
  reportedBy?: string;
  staffInvolved?: string;
  witnesses?: string;
  description: string;
  immediateAction?: string;
  severity?: IncidentSeverity;
  confidential?: boolean;
  rootCause?: string;
  contributingFactors?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  capaOwner?: string;
  capaTargetDate?: string;
  capaCompletedAt?: string;
  closureNotes?: string;
  closedBy?: string;
  notes?: string;
  status?: IncidentStatus;
}

export function createIncident(
  organizationId: string,
  input: IncidentInput
): IncidentReport {
  const now = new Date().toISOString();
  const i: IncidentReport = {
    id: `inc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    incidentNumber: nextIncidentNumber(organizationId),
    category: input.category || "other",
    subject: input.subject || "patient",
    patientId: input.patientId || undefined,
    location: input.location?.trim() || "",
    occurredAt: input.occurredAt || now,
    reportedAt: input.reportedAt || now,
    reportedBy: input.reportedBy?.trim() || "",
    staffInvolved: input.staffInvolved?.trim() || undefined,
    witnesses: input.witnesses?.trim() || undefined,
    description: input.description.trim(),
    immediateAction: input.immediateAction?.trim() || undefined,
    severity: input.severity || "no_harm",
    confidential: input.confidential ?? false,
    rootCause: input.rootCause?.trim() || undefined,
    contributingFactors: input.contributingFactors?.trim() || undefined,
    correctiveAction: input.correctiveAction?.trim() || undefined,
    preventiveAction: input.preventiveAction?.trim() || undefined,
    capaOwner: input.capaOwner?.trim() || undefined,
    capaTargetDate: input.capaTargetDate || undefined,
    capaCompletedAt: input.capaCompletedAt || undefined,
    status: input.status || "reported",
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  incidents.unshift(i);
  flush();
  return i;
}

export function updateIncident(
  id: string,
  organizationId: string,
  patch: Partial<IncidentInput>
): IncidentReport | null {
  const i = incidents.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!i) return null;
  const now = new Date().toISOString();

  if (patch.category !== undefined) i.category = patch.category;
  if (patch.subject !== undefined) i.subject = patch.subject;
  if (patch.patientId !== undefined) i.patientId = patch.patientId || undefined;
  if (patch.location !== undefined) i.location = patch.location.trim();
  if (patch.occurredAt !== undefined)
    i.occurredAt = patch.occurredAt || i.occurredAt;
  if (patch.reportedAt !== undefined)
    i.reportedAt = patch.reportedAt || i.reportedAt;
  if (patch.reportedBy !== undefined) i.reportedBy = patch.reportedBy.trim();
  if (patch.staffInvolved !== undefined)
    i.staffInvolved = patch.staffInvolved?.trim() || undefined;
  if (patch.witnesses !== undefined)
    i.witnesses = patch.witnesses?.trim() || undefined;
  if (patch.description !== undefined) i.description = patch.description.trim();
  if (patch.immediateAction !== undefined)
    i.immediateAction = patch.immediateAction?.trim() || undefined;
  if (patch.severity !== undefined) i.severity = patch.severity;
  if (patch.confidential !== undefined) i.confidential = patch.confidential;

  if (patch.rootCause !== undefined)
    i.rootCause = patch.rootCause?.trim() || undefined;
  if (patch.contributingFactors !== undefined)
    i.contributingFactors = patch.contributingFactors?.trim() || undefined;
  if (patch.correctiveAction !== undefined)
    i.correctiveAction = patch.correctiveAction?.trim() || undefined;
  if (patch.preventiveAction !== undefined)
    i.preventiveAction = patch.preventiveAction?.trim() || undefined;
  if (patch.capaOwner !== undefined)
    i.capaOwner = patch.capaOwner?.trim() || undefined;
  if (patch.capaTargetDate !== undefined)
    i.capaTargetDate = patch.capaTargetDate || undefined;
  if (patch.capaCompletedAt !== undefined)
    i.capaCompletedAt = patch.capaCompletedAt || undefined;

  if (patch.notes !== undefined) i.notes = patch.notes?.trim() || undefined;
  if (patch.closureNotes !== undefined)
    i.closureNotes = patch.closureNotes?.trim() || undefined;
  if (patch.closedBy !== undefined)
    i.closedBy = patch.closedBy?.trim() || undefined;

  if (patch.status !== undefined && patch.status !== i.status) {
    const prev = i.status;
    i.status = patch.status;
    if (patch.status === "closed" && prev !== "closed") {
      i.closedAt = now;
    }
    if (patch.status === "reopened" || (prev === "closed" && patch.status !== "closed")) {
      i.closedAt = undefined;
      i.closedBy = undefined;
    }
    if (patch.status === "rca_complete" && !i.capaCompletedAt) {
      // auto-timestamp the CAPA completion if not set
      i.capaCompletedAt = now;
    }
  }

  i.updatedAt = now;
  flush();
  return i;
}

export function deleteIncident(id: string, organizationId: string): boolean {
  const idx = incidents.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (idx < 0) return false;
  incidents.splice(idx, 1);
  flush();
  return true;
}

// For patient cascade we *unlink* rather than delete — incident reports
// are org-level quality records that should survive patient deletion.
export function unlinkIncidentsForPatient(
  patientId: string,
  organizationId: string
): number {
  let unlinked = 0;
  for (const x of incidents) {
    if (x.patientId === patientId && x.organizationId === organizationId) {
      x.patientId = undefined;
      unlinked++;
    }
  }
  if (unlinked) flush();
  return unlinked;
  // flush:auto-unlink
  incidents.splice(incidents.length, 0);
}
