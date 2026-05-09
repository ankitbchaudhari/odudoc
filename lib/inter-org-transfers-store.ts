// Inter-organization patient & records transfers.
//
// Once two orgs are connected via lib/inter-org-network-store, doctors
// and admins can initiate transfers. A transfer is one of:
//
//   - "patient_transfer" — physically moving a patient (ICU transfer,
//     post-op step-down, escalation to a tertiary care center). The
//     receiving org becomes the primary clinical custodian after
//     acceptance and discharge from the sending org.
//
//   - "records_share" — read-only push of a record bundle to another
//     org, typically because the patient is also a patient there
//     (cross-checking, second opinion, continuity of care).
//
//   - "referral" — sending org books the patient into the receiving
//     org's calendar (specialist consult, surgical evaluation).
//
// The state machine: pending → accepted → completed, with declined /
// cancelled as terminal escape hatches. Acceptance carries a per-
// transfer scope of items (which records the receiving org may read)
// and a patient-consent flag — both are surfaced in the audit log so
// HIPAA / DPDP / GDPR audit asks can answer "who saw what, when".
//
// We do not (yet) replicate the underlying records; the receiving org
// gets a scoped read-link into the sending org's data via the items
// list. Replication is a follow-on once we have storage budgets per
// org. For now, links + audit are enough to prove the model end-to-end.

import { bindPersistentArray } from "./persistent-array";

export type TransferType = "patient_transfer" | "records_share" | "referral";

export type TransferStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "completed"
  | "cancelled";

export type TransferUrgency = "routine" | "urgent" | "emergency";

/** What the sending org is sharing. Keys map to module flags so the
 *  UI can pre-filter to modules the sending org actually has on. */
export type TransferItemKind =
  | "demographics"
  | "encounter_notes"
  | "lab_results"
  | "pathology"
  | "imaging"          // radiology / DICOM
  | "prescriptions"
  | "discharge_summary"
  | "vitals"
  | "allergies"
  | "immunizations"
  | "consent_forms";

export interface TransferItem {
  kind: TransferItemKind;
  // Free-form pointer back into the sending org's data — could be a
  // record id, an order id, a date range, etc. The receiving org's UI
  // resolves these via /api/inter-org/transfers/[id]/items.
  ref?: string;
  label?: string;       // "Chest X-ray, 2026-01-12"
}

export interface InterOrgTransfer {
  id: string;
  fromOrgId: string;
  toOrgId: string;
  // The sending org's patient id. Receiving org may map it to a local
  // patient on accept (mergeAsLocalPatientId) — that's where consent-
  // for-merge becomes relevant.
  patientId: string;
  patientName: string;        // denormalised so receiving org can show it pre-accept
  type: TransferType;
  status: TransferStatus;
  urgency: TransferUrgency;
  reason: string;             // clinical reason — required
  items: TransferItem[];
  // Patient consent. Required for non-emergency. Emergency flagged
  // transfers bypass with a "break-glass" audit note that surfaces
  // prominently in the receiving org's UI.
  patientConsent: {
    granted: boolean;
    method?: "in_person" | "esign" | "phone_otp" | "break_glass";
    capturedAt?: string;
    capturedBy?: string;       // user id
    breakGlassReason?: string; // required when method === break_glass
  };
  // Lifecycle timestamps + actors.
  requestedByUserId: string;
  requestedByEmail: string;
  requestedAt: string;
  acceptedByUserId?: string;
  acceptedAt?: string;
  declinedReason?: string;
  declinedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledReason?: string;
  // Receiving org's local patient id, if they merged on accept.
  mergedAsLocalPatientId?: string;
  // Free-text notes from the receiving doctor on completion.
  completionNotes?: string;
  updatedAt: string;
}

const transfers: InterOrgTransfer[] = [];
const {
  hydrate,
  reload: reloadTransfersInternal,
  flush,
  tombstone,
} = bindPersistentArray<InterOrgTransfer>(
  "inter_org_transfers",
  transfers,
  () => []
);
await hydrate();

export async function reloadTransfers() {
  await reloadTransfersInternal();
}

export interface ListFilter {
  orgId: string;
  direction?: "inbound" | "outbound" | "any";
  status?: TransferStatus | "open"; // "open" = pending or accepted
}

export function listTransfers(filter: ListFilter): InterOrgTransfer[] {
  const dir = filter.direction || "any";
  return transfers
    .filter((t) => {
      if (dir === "inbound") return t.toOrgId === filter.orgId;
      if (dir === "outbound") return t.fromOrgId === filter.orgId;
      return t.fromOrgId === filter.orgId || t.toOrgId === filter.orgId;
    })
    .filter((t) => {
      if (!filter.status) return true;
      if (filter.status === "open") return t.status === "pending" || t.status === "accepted";
      return t.status === filter.status;
    })
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export function getTransferById(id: string): InterOrgTransfer | null {
  return transfers.find((t) => t.id === id) || null;
}

export interface CreateTransferInput {
  fromOrgId: string;
  toOrgId: string;
  patientId: string;
  patientName: string;
  type: TransferType;
  urgency?: TransferUrgency;
  reason: string;
  items: TransferItem[];
  patientConsent: InterOrgTransfer["patientConsent"];
  requestedByUserId: string;
  requestedByEmail: string;
}

export function createTransfer(input: CreateTransferInput): InterOrgTransfer {
  const now = new Date().toISOString();
  const t: InterOrgTransfer = {
    id: `xfer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    fromOrgId: input.fromOrgId,
    toOrgId: input.toOrgId,
    patientId: input.patientId,
    patientName: input.patientName,
    type: input.type,
    status: "pending",
    urgency: input.urgency || "routine",
    reason: input.reason.trim(),
    items: input.items,
    patientConsent: input.patientConsent,
    requestedByUserId: input.requestedByUserId,
    requestedByEmail: input.requestedByEmail,
    requestedAt: now,
    updatedAt: now,
  };
  transfers.unshift(t);
  flush();
  return t;
}

export function acceptTransfer(
  id: string,
  byUserId: string,
  mergeAsLocalPatientId?: string,
): InterOrgTransfer | null {
  const t = transfers.find((x) => x.id === id);
  if (!t || t.status !== "pending") return null;
  t.status = "accepted";
  t.acceptedByUserId = byUserId;
  t.acceptedAt = new Date().toISOString();
  if (mergeAsLocalPatientId) t.mergedAsLocalPatientId = mergeAsLocalPatientId;
  t.updatedAt = t.acceptedAt;
  flush();
  return t;
}

export function declineTransfer(
  id: string,
  reason: string,
): InterOrgTransfer | null {
  const t = transfers.find((x) => x.id === id);
  if (!t || t.status !== "pending") return null;
  t.status = "declined";
  t.declinedReason = reason.trim();
  t.declinedAt = new Date().toISOString();
  t.updatedAt = t.declinedAt;
  flush();
  return t;
}

export function completeTransfer(
  id: string,
  completionNotes?: string,
): InterOrgTransfer | null {
  const t = transfers.find((x) => x.id === id);
  if (!t || t.status !== "accepted") return null;
  t.status = "completed";
  t.completedAt = new Date().toISOString();
  t.completionNotes = completionNotes?.trim();
  t.updatedAt = t.completedAt;
  flush();
  return t;
}

export function cancelTransfer(
  id: string,
  reason: string,
): InterOrgTransfer | null {
  const t = transfers.find((x) => x.id === id);
  if (!t || (t.status !== "pending" && t.status !== "accepted")) return null;
  t.status = "cancelled";
  t.cancelledReason = reason.trim();
  t.cancelledAt = new Date().toISOString();
  t.updatedAt = t.cancelledAt;
  flush();
  return t;
}

export function deleteTransfer(id: string): boolean {
  const i = transfers.findIndex((t) => t.id === id);
  if (i < 0) return false;
  transfers.splice(i, 1);
  tombstone(id);
  flush();
  return true;
}

export function deleteTransfersForOrg(orgId: string): number {
  let count = 0;
  for (let i = transfers.length - 1; i >= 0; i--) {
    if (transfers[i].fromOrgId === orgId || transfers[i].toOrgId === orgId) {
      tombstone(transfers[i].id);
      transfers.splice(i, 1);
      count++;
    }
  }
  if (count > 0) flush();
  return count;
}
