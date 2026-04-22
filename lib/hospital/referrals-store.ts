// Referrals. Tenant-scoped.
//
// Tracks both inbound (sent to us) and outbound (sent from us to an external
// provider / another department) referrals. Captures routing, clinical
// summary, urgency, and the return-feedback loop from the receiving
// clinician.
//
// Status machine:
//   pending → accepted → in_progress → completed
//          ↘ declined
//          ↘ cancelled

import { bindPersistentArray } from "../persistent-array";

export type ReferralDirection = "inbound" | "outbound" | "internal";
export type ReferralUrgency = "routine" | "urgent" | "emergency";
export type ReferralStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "declined"
  | "cancelled";

export interface ReferralAttachment {
  label: string;
  url: string;
}

export interface Referral {
  id: string;
  organizationId: string;
  referralNumber: string; // REF-{suffix}-{seq}
  patientId: string;
  direction: ReferralDirection;

  // Source (who is sending)
  fromProvider?: string;
  fromOrganization?: string; // external org name for inbound
  fromSpecialty?: string;

  // Destination (who is receiving)
  toProvider?: string;
  toOrganization?: string; // external org name for outbound
  toSpecialty?: string;
  toDepartment?: string; // for internal

  reason: string; // short reason
  clinicalSummary?: string; // extended narrative
  provisionalDiagnosis?: string;
  urgency: ReferralUrgency;

  requestedDate: string; // when referral was written
  scheduledDate?: string; // booked appointment, if any
  completedDate?: string;

  status: ReferralStatus;
  feedback?: string; // from receiving clinician back to referrer
  feedbackBy?: string;
  feedbackAt?: string;
  declineReason?: string;
  cancelReason?: string;

  attachments: ReferralAttachment[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const referrals: Referral[] = [];
const { hydrate, flush } = bindPersistentArray<Referral>(
  "hospital-referrals",
  referrals,
  () => []
);
await hydrate();

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}

function nextReferralNumber(orgId: string): string {
  const n = referrals.filter((r) => r.organizationId === orgId).length + 1;
  return `REF-${orgSuffix(orgId)}-${String(n).padStart(5, "0")}`;
}

export const DIRECTION_LABEL: Record<ReferralDirection, string> = {
  inbound: "Inbound",
  outbound: "Outbound",
  internal: "Internal",
};

export const URGENCY_LABEL: Record<ReferralUrgency, string> = {
  routine: "Routine",
  urgent: "Urgent",
  emergency: "Emergency",
};

function sanitizeAttachments(
  atts?: ReferralAttachment[]
): ReferralAttachment[] {
  if (!atts || !Array.isArray(atts)) return [];
  return atts
    .map((a) => ({
      label: String(a.label || "").trim(),
      url: String(a.url || "").trim(),
    }))
    .filter((a) => a.url.length > 0);
}

export function listReferrals(opts: {
  organizationId: string;
  patientId?: string;
  direction?: ReferralDirection;
  status?: ReferralStatus;
  urgency?: ReferralUrgency;
}): Referral[] {
  let list = referrals.filter((r) => r.organizationId === opts.organizationId);
  if (opts.patientId) list = list.filter((r) => r.patientId === opts.patientId);
  if (opts.direction) list = list.filter((r) => r.direction === opts.direction);
  if (opts.status) list = list.filter((r) => r.status === opts.status);
  if (opts.urgency) list = list.filter((r) => r.urgency === opts.urgency);
  // Emergency/urgent first within pending; then recency.
  const urgOrder: Record<ReferralUrgency, number> = {
    emergency: 0,
    urgent: 1,
    routine: 2,
  };
  const statusOrder: Record<ReferralStatus, number> = {
    pending: 0,
    accepted: 1,
    in_progress: 2,
    completed: 3,
    declined: 4,
    cancelled: 5,
  };
  return list.sort((a, b) => {
    const s = statusOrder[a.status] - statusOrder[b.status];
    if (s !== 0) return s;
    const u = urgOrder[a.urgency] - urgOrder[b.urgency];
    if (u !== 0) return u;
    return (
      new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime()
    );
  });
}

export interface ReferralInput {
  patientId: string;
  direction?: ReferralDirection;
  fromProvider?: string;
  fromOrganization?: string;
  fromSpecialty?: string;
  toProvider?: string;
  toOrganization?: string;
  toSpecialty?: string;
  toDepartment?: string;
  reason: string;
  clinicalSummary?: string;
  provisionalDiagnosis?: string;
  urgency?: ReferralUrgency;
  requestedDate?: string;
  scheduledDate?: string;
  attachments?: ReferralAttachment[];
  notes?: string;
  status?: ReferralStatus;
}

export function createReferral(
  organizationId: string,
  input: ReferralInput
): Referral {
  const now = new Date().toISOString();
  const r: Referral = {
    id: `ref-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    referralNumber: nextReferralNumber(organizationId),
    patientId: input.patientId,
    direction: input.direction || "outbound",
    fromProvider: input.fromProvider?.trim() || undefined,
    fromOrganization: input.fromOrganization?.trim() || undefined,
    fromSpecialty: input.fromSpecialty?.trim() || undefined,
    toProvider: input.toProvider?.trim() || undefined,
    toOrganization: input.toOrganization?.trim() || undefined,
    toSpecialty: input.toSpecialty?.trim() || undefined,
    toDepartment: input.toDepartment?.trim() || undefined,
    reason: input.reason.trim(),
    clinicalSummary: input.clinicalSummary?.trim() || undefined,
    provisionalDiagnosis: input.provisionalDiagnosis?.trim() || undefined,
    urgency: input.urgency || "routine",
    requestedDate: input.requestedDate || now,
    scheduledDate: input.scheduledDate || undefined,
    status: input.status || "pending",
    attachments: sanitizeAttachments(input.attachments),
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  referrals.unshift(r);
  flush();
  return r;
}

export interface ReferralPatch extends ReferralInput {
  feedback?: string;
  feedbackBy?: string;
  declineReason?: string;
  cancelReason?: string;
  completedDate?: string;
}

export function updateReferral(
  id: string,
  organizationId: string,
  patch: ReferralPatch
): Referral | null {
  const r = referrals.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!r) return null;
  const now = new Date().toISOString();

  if (patch.direction !== undefined) r.direction = patch.direction;
  if (patch.fromProvider !== undefined)
    r.fromProvider = patch.fromProvider?.trim() || undefined;
  if (patch.fromOrganization !== undefined)
    r.fromOrganization = patch.fromOrganization?.trim() || undefined;
  if (patch.fromSpecialty !== undefined)
    r.fromSpecialty = patch.fromSpecialty?.trim() || undefined;
  if (patch.toProvider !== undefined)
    r.toProvider = patch.toProvider?.trim() || undefined;
  if (patch.toOrganization !== undefined)
    r.toOrganization = patch.toOrganization?.trim() || undefined;
  if (patch.toSpecialty !== undefined)
    r.toSpecialty = patch.toSpecialty?.trim() || undefined;
  if (patch.toDepartment !== undefined)
    r.toDepartment = patch.toDepartment?.trim() || undefined;
  if (patch.reason !== undefined) r.reason = patch.reason.trim();
  if (patch.clinicalSummary !== undefined)
    r.clinicalSummary = patch.clinicalSummary?.trim() || undefined;
  if (patch.provisionalDiagnosis !== undefined)
    r.provisionalDiagnosis = patch.provisionalDiagnosis?.trim() || undefined;
  if (patch.urgency !== undefined) r.urgency = patch.urgency;
  if (patch.requestedDate !== undefined)
    r.requestedDate = patch.requestedDate || r.requestedDate;
  if (patch.scheduledDate !== undefined)
    r.scheduledDate = patch.scheduledDate || undefined;
  if (patch.attachments !== undefined)
    r.attachments = sanitizeAttachments(patch.attachments);
  if (patch.notes !== undefined) r.notes = patch.notes?.trim() || undefined;

  if (patch.feedback !== undefined) {
    r.feedback = patch.feedback?.trim() || undefined;
    if (r.feedback) {
      r.feedbackAt = now;
      if (patch.feedbackBy !== undefined)
        r.feedbackBy = patch.feedbackBy?.trim() || undefined;
    }
  }

  if (patch.status !== undefined && patch.status !== r.status) {
    r.status = patch.status;
    if (patch.status === "completed") {
      r.completedDate = patch.completedDate || now;
    }
    if (patch.status === "declined") {
      r.declineReason = patch.declineReason?.trim() || r.declineReason;
    }
    if (patch.status === "cancelled") {
      r.cancelReason = patch.cancelReason?.trim() || r.cancelReason;
    }
  } else {
    // Allow capturing reasons even without status change.
    if (patch.declineReason !== undefined)
      r.declineReason = patch.declineReason?.trim() || undefined;
    if (patch.cancelReason !== undefined)
      r.cancelReason = patch.cancelReason?.trim() || undefined;
    if (patch.completedDate !== undefined)
      r.completedDate = patch.completedDate || undefined;
  }

  r.updatedAt = now;
  flush();
  return r;
}

export function deleteReferral(id: string, organizationId: string): boolean {
  const i = referrals.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  referrals.splice(i, 1);
  flush();
  return true;
}

export function deleteReferralsForPatient(
  patientId: string,
  organizationId: string
): number {
  let removed = 0;
  for (let i = referrals.length - 1; i >= 0; i--) {
    const r = referrals[i];
    if (r.patientId === patientId && r.organizationId === organizationId) {
      referrals.splice(i, 1);
      removed++;
    }
  }
  if (removed) flush();
  return removed;
}
