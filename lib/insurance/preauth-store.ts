// Cashless pre-authorization workflow.
//
// Lifecycle: a pre-auth is filed by the hospital (front desk or
// admitting doctor) before the patient is admitted for an insured
// procedure. The TPA / insurer reviews it and returns one of:
//
//   approved              proceed; cashless covered
//   approved_with_query   approved, queries on shortlists / docs
//   rejected              reject; patient pays out of pocket
//
// On discharge, the hospital files a final claim against the
// approved pre-auth (lib/insurance/claims-store.ts).

import { bindPersistentArray } from "../persistent-array";
import { pushNotification } from "../notifications/store";

export type PreauthStatus =
  | "draft"             // hospital still drafting
  | "submitted"         // sent to TPA
  | "approved"          // TPA gave green light
  | "approved_with_query" // approved but TPA wants more info
  | "rejected"          // TPA refused
  | "cancelled";        // hospital withdrew

export interface PreauthRequest {
  id: string;
  organizationId: string;
  patientUserId: string;
  dependentId?: string;
  patientName: string;
  /** Snapshot of policy at submit time. */
  tpaId: string;
  policyId: string;
  memberId: string;
  /** Procedure code from policy-engine. */
  procedureCode: string;
  procedureName: string;
  icd10?: string;
  /** Provisional admission date. */
  proposedAdmissionDate?: string;
  /** Coverage estimate snapshotted at submit so we can later
   *  reconcile against the actual claim payout. */
  estimateRupees: {
    gross: number;
    net: number;
    insurerPays: number;
    patientPays: number;
  };
  /** Treating doctor name. */
  doctorName?: string;
  /** Free-text clinical justification. */
  clinicalNotes?: string;
  /** Document checklist — URLs are deferred; we just track which
   *  items are marked "attached" for the front desk to chase. */
  documents: Array<{ name: string; attached: boolean }>;
  status: PreauthStatus;
  /** TPA reference / approval number. */
  tpaReference?: string;
  /** Approved amount (when status = approved). */
  approvedAmountRupees?: number;
  /** Note from the TPA on query / rejection. */
  tpaNote?: string;
  filedByEmail?: string;
  submittedAt?: string;
  decidedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

const preauths: PreauthRequest[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<PreauthRequest>(
  "insurance_preauths",
  preauths,
  () => []
);
await hydrate();

export function listPreauthsForOrg(orgId: string): PreauthRequest[] {
  return preauths
    .filter((p) => p.organizationId === orgId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listPreauthsForUser(userId: string): PreauthRequest[] {
  return preauths
    .filter((p) => p.patientUserId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getPreauth(id: string): PreauthRequest | null {
  return preauths.find((p) => p.id === id) || null;
}

export interface CreatePreauthInput {
  organizationId: string;
  patientUserId: string;
  dependentId?: string;
  patientName: string;
  tpaId: string;
  policyId: string;
  memberId: string;
  procedureCode: string;
  procedureName: string;
  icd10?: string;
  proposedAdmissionDate?: string;
  estimateRupees: PreauthRequest["estimateRupees"];
  doctorName?: string;
  clinicalNotes?: string;
  filedByEmail?: string;
}

const STANDARD_DOCS = [
  "Filled pre-auth form (signed by hospital + patient)",
  "ID proof (Aadhaar / PAN)",
  "Insurance card photo (front + back)",
  "Treating doctor's notes",
  "Initial investigation reports",
  "Previous discharge summaries (if PED-linked)",
];

export function createPreauth(input: CreatePreauthInput): PreauthRequest {
  const now = new Date().toISOString();
  const p: PreauthRequest = {
    id: `pre-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    patientUserId: input.patientUserId,
    dependentId: input.dependentId,
    patientName: input.patientName,
    tpaId: input.tpaId,
    policyId: input.policyId,
    memberId: input.memberId,
    procedureCode: input.procedureCode,
    procedureName: input.procedureName,
    icd10: input.icd10,
    proposedAdmissionDate: input.proposedAdmissionDate,
    estimateRupees: input.estimateRupees,
    doctorName: input.doctorName,
    clinicalNotes: input.clinicalNotes?.trim() || undefined,
    documents: STANDARD_DOCS.map((name) => ({ name, attached: false })),
    status: "draft",
    filedByEmail: input.filedByEmail,
    createdAt: now,
    updatedAt: now,
  };
  preauths.unshift(p);
  flush();
  return p;
}

export function setDocumentAttached(
  preauthId: string,
  docName: string,
  attached: boolean,
): PreauthRequest | null {
  const p = preauths.find((x) => x.id === preauthId);
  if (!p) return null;
  const d = p.documents.find((x) => x.name === docName);
  if (!d) return null;
  d.attached = attached;
  p.updatedAt = new Date().toISOString();
  flush();
  return p;
}

export function submitPreauth(preauthId: string): PreauthRequest | null {
  const p = preauths.find((x) => x.id === preauthId);
  if (!p) return null;
  if (p.status !== "draft") return p;
  // Soft check: complain if any required doc is missing — we still
  // allow submission so the front desk can submit-then-chase.
  p.status = "submitted";
  p.submittedAt = new Date().toISOString();
  p.updatedAt = p.submittedAt;
  flush();
  if (p.patientUserId) {
    pushNotification({
      userId: p.patientUserId,
      kind: "consent_request",
      severity: "info",
      title: "Cashless preauth submitted",
      body: `${p.procedureName} — sent to TPA. Decision typically within 4 hours.`,
      link: "/dashboard/insurance",
      reference: `preauth:${p.id}:submitted`,
    });
  }
  return p;
}

export function decidePreauth(
  preauthId: string,
  decision: "approved" | "approved_with_query" | "rejected",
  approvedAmountRupees?: number,
  tpaReference?: string,
  tpaNote?: string,
): PreauthRequest | null {
  const p = preauths.find((x) => x.id === preauthId);
  if (!p) return null;
  if (p.status !== "submitted") return p;
  p.status = decision;
  p.approvedAmountRupees = approvedAmountRupees;
  p.tpaReference = tpaReference?.trim() || undefined;
  p.tpaNote = tpaNote?.trim() || undefined;
  p.decidedAt = new Date().toISOString();
  p.updatedAt = p.decidedAt;
  flush();
  if (p.patientUserId) {
    const sev = decision === "approved" ? "success"
              : decision === "rejected" ? "critical" : "warn";
    const title = decision === "approved" ? `Cashless approved: ₹${(approvedAmountRupees || 0).toLocaleString("en-IN")}`
                : decision === "rejected" ? "Cashless preauth rejected"
                : "Cashless approved with query";
    pushNotification({
      userId: p.patientUserId,
      kind: "consent_request",
      severity: sev,
      title,
      body: `${p.procedureName}${tpaNote ? ` — ${tpaNote}` : ""}`,
      link: "/dashboard/insurance",
      reference: `preauth:${p.id}:${decision}`,
    });
  }
  return p;
}

export function cancelPreauth(preauthId: string): PreauthRequest | null {
  const p = preauths.find((x) => x.id === preauthId);
  if (!p) return null;
  if (["approved", "rejected"].includes(p.status)) return p;
  p.status = "cancelled";
  p.cancelledAt = new Date().toISOString();
  p.updatedAt = p.cancelledAt;
  flush();
  return p;
}

export function deletePreauthsForOrg(orgId: string): number {
  let n = 0;
  for (let i = preauths.length - 1; i >= 0; i--) {
    if (preauths[i].organizationId === orgId) {
      tombstone(preauths[i].id);
      preauths.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flush();
  return n;
}
