// Insurance policies & TPA claims. Tenant-scoped.
//
// Two entities:
// - InsurancePolicy: patient × insurer × policy number × sum insured.
// - InsuranceClaim: patient × policy × (optional invoice), with TPA metadata,
//   pre-auth and settlement tracking. Status machine:
//     draft → submitted → queried/approved/partial/rejected → paid
//
// Per-org claim numbers: CLM-{orgSuffix}-{seq}.

import { bindPersistentArray } from "../persistent-array";

export type CoverageType = "cashless" | "reimbursement" | "both";
export type PolicyStatus = "active" | "expired" | "cancelled";

export interface InsurancePolicy {
  id: string;
  organizationId: string;
  patientId: string;
  insurerName: string;
  planName?: string;
  policyNumber: string;
  policyHolderName?: string;
  relationToPatient?: string; // self / spouse / parent / employer
  validFrom?: string; // YYYY-MM-DD
  validTo?: string;
  sumInsured?: number;
  copayPct?: number;
  coverage: CoverageType;
  status: PolicyStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ClaimStatus =
  | "draft"
  | "submitted"
  | "queried"
  | "approved"
  | "partial"
  | "rejected"
  | "paid";

export interface ClaimDocument {
  name: string; // "Discharge Summary", "ID Proof"
  url?: string;
  uploadedAt: string;
}

export interface InsuranceClaim {
  id: string;
  organizationId: string;
  claimNumber: string;
  patientId: string;
  policyId?: string;
  invoiceId?: string;
  insurerName: string;
  tpaName?: string;
  preauthNumber?: string;
  admissionId?: string;
  diagnosis?: string;
  treatmentSummary?: string;
  claimedAmount: number;
  approvedAmount?: number;
  settledAmount?: number;
  rejectionReason?: string;
  queryMessage?: string;
  submittedAt?: string;
  approvedAt?: string;
  settledAt?: string;
  documents: ClaimDocument[];
  status: ClaimStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const policies: InsurancePolicy[] = [];
const claims: InsuranceClaim[] = [];

const { hydrate: hp, flush: fp } = bindPersistentArray<InsurancePolicy>(
  "hospital-insurance-policies",
  policies,
  () => []
);
const { hydrate: hc, flush: fc } = bindPersistentArray<InsuranceClaim>(
  "hospital-insurance-claims",
  claims,
  () => []
);
await hp();
await hc();

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}

// --- Policies --------------------------------------------------------------

export function listPolicies(opts: {
  organizationId: string;
  patientId?: string;
  status?: PolicyStatus;
  search?: string;
}): InsurancePolicy[] {
  let list = policies.filter(
    (p) => p.organizationId === opts.organizationId
  );
  if (opts.patientId) list = list.filter((p) => p.patientId === opts.patientId);
  if (opts.status) list = list.filter((p) => p.status === opts.status);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.insurerName.toLowerCase().includes(q) ||
        p.policyNumber.toLowerCase().includes(q) ||
        (p.policyHolderName || "").toLowerCase().includes(q)
    );
  }
  return list.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export interface PolicyInput {
  patientId: string;
  insurerName: string;
  planName?: string;
  policyNumber: string;
  policyHolderName?: string;
  relationToPatient?: string;
  validFrom?: string;
  validTo?: string;
  sumInsured?: number;
  copayPct?: number;
  coverage?: CoverageType;
  status?: PolicyStatus;
  notes?: string;
}

export function createPolicy(
  organizationId: string,
  input: PolicyInput
): InsurancePolicy {
  const now = new Date().toISOString();
  const p: InsurancePolicy = {
    id: `pol-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    patientId: input.patientId,
    insurerName: input.insurerName.trim(),
    planName: input.planName?.trim() || undefined,
    policyNumber: input.policyNumber.trim(),
    policyHolderName: input.policyHolderName?.trim() || undefined,
    relationToPatient: input.relationToPatient?.trim() || undefined,
    validFrom: input.validFrom,
    validTo: input.validTo,
    sumInsured: input.sumInsured,
    copayPct: input.copayPct,
    coverage: input.coverage || "cashless",
    status: input.status || "active",
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  policies.unshift(p);
  fp();
  return p;
}

export function updatePolicy(
  id: string,
  organizationId: string,
  patch: Partial<PolicyInput>
): InsurancePolicy | null {
  const p = policies.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!p) return null;
  if (patch.insurerName !== undefined) p.insurerName = patch.insurerName.trim();
  if (patch.planName !== undefined)
    p.planName = patch.planName?.trim() || undefined;
  if (patch.policyNumber !== undefined)
    p.policyNumber = patch.policyNumber.trim();
  if (patch.policyHolderName !== undefined)
    p.policyHolderName = patch.policyHolderName?.trim() || undefined;
  if (patch.relationToPatient !== undefined)
    p.relationToPatient = patch.relationToPatient?.trim() || undefined;
  if (patch.validFrom !== undefined) p.validFrom = patch.validFrom;
  if (patch.validTo !== undefined) p.validTo = patch.validTo;
  if (patch.sumInsured !== undefined) p.sumInsured = patch.sumInsured;
  if (patch.copayPct !== undefined) p.copayPct = patch.copayPct;
  if (patch.coverage !== undefined) p.coverage = patch.coverage;
  if (patch.status !== undefined) p.status = patch.status;
  if (patch.notes !== undefined) p.notes = patch.notes;
  p.updatedAt = new Date().toISOString();
  fp();
  return p;
}

export function deletePolicy(id: string, organizationId: string): boolean {
  const i = policies.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  policies.splice(i, 1);
  fp();
  return true;
}

// --- Claims ----------------------------------------------------------------

export function listClaims(opts: {
  organizationId: string;
  patientId?: string;
  status?: ClaimStatus;
  insurerName?: string;
}): InsuranceClaim[] {
  let list = claims.filter(
    (c) => c.organizationId === opts.organizationId
  );
  if (opts.patientId) list = list.filter((c) => c.patientId === opts.patientId);
  if (opts.status) list = list.filter((c) => c.status === opts.status);
  if (opts.insurerName)
    list = list.filter(
      (c) =>
        c.insurerName.toLowerCase() === opts.insurerName!.toLowerCase()
    );
  return list.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export interface ClaimInput {
  patientId: string;
  policyId?: string;
  invoiceId?: string;
  insurerName: string;
  tpaName?: string;
  preauthNumber?: string;
  admissionId?: string;
  diagnosis?: string;
  treatmentSummary?: string;
  claimedAmount: number;
  notes?: string;
  status?: ClaimStatus;
}

function nextClaimNumber(orgId: string): string {
  const n =
    claims.filter((c) => c.organizationId === orgId).length + 1;
  return `CLM-${orgSuffix(orgId)}-${String(n).padStart(5, "0")}`;
}

export function createClaim(
  organizationId: string,
  input: ClaimInput
): InsuranceClaim {
  const now = new Date().toISOString();
  const c: InsuranceClaim = {
    id: `clm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    claimNumber: nextClaimNumber(organizationId),
    patientId: input.patientId,
    policyId: input.policyId || undefined,
    invoiceId: input.invoiceId || undefined,
    insurerName: input.insurerName.trim(),
    tpaName: input.tpaName?.trim() || undefined,
    preauthNumber: input.preauthNumber?.trim() || undefined,
    admissionId: input.admissionId || undefined,
    diagnosis: input.diagnosis?.trim() || undefined,
    treatmentSummary: input.treatmentSummary?.trim() || undefined,
    claimedAmount: Math.max(0, Number(input.claimedAmount) || 0),
    documents: [],
    status: input.status || "draft",
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  claims.unshift(c);
  fc();
  return c;
}

export interface ClaimPatch {
  insurerName?: string;
  tpaName?: string;
  preauthNumber?: string;
  admissionId?: string;
  diagnosis?: string;
  treatmentSummary?: string;
  claimedAmount?: number;
  approvedAmount?: number;
  settledAmount?: number;
  rejectionReason?: string;
  queryMessage?: string;
  status?: ClaimStatus;
  notes?: string;
  addDocument?: { name: string; url?: string };
  removeDocumentName?: string;
}

export function updateClaim(
  id: string,
  organizationId: string,
  patch: ClaimPatch
): InsuranceClaim | null {
  const c = claims.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!c) return null;
  const now = new Date().toISOString();

  if (patch.insurerName !== undefined) c.insurerName = patch.insurerName.trim();
  if (patch.tpaName !== undefined)
    c.tpaName = patch.tpaName?.trim() || undefined;
  if (patch.preauthNumber !== undefined)
    c.preauthNumber = patch.preauthNumber?.trim() || undefined;
  if (patch.admissionId !== undefined)
    c.admissionId = patch.admissionId || undefined;
  if (patch.diagnosis !== undefined)
    c.diagnosis = patch.diagnosis?.trim() || undefined;
  if (patch.treatmentSummary !== undefined)
    c.treatmentSummary = patch.treatmentSummary?.trim() || undefined;
  if (patch.claimedAmount !== undefined)
    c.claimedAmount = Math.max(0, Number(patch.claimedAmount) || 0);
  if (patch.approvedAmount !== undefined)
    c.approvedAmount = Math.max(0, Number(patch.approvedAmount) || 0);
  if (patch.settledAmount !== undefined)
    c.settledAmount = Math.max(0, Number(patch.settledAmount) || 0);
  if (patch.rejectionReason !== undefined)
    c.rejectionReason = patch.rejectionReason;
  if (patch.queryMessage !== undefined) c.queryMessage = patch.queryMessage;
  if (patch.notes !== undefined) c.notes = patch.notes;

  if (patch.status !== undefined) {
    c.status = patch.status;
    if (patch.status === "submitted" && !c.submittedAt) c.submittedAt = now;
    if (
      (patch.status === "approved" || patch.status === "partial") &&
      !c.approvedAt
    )
      c.approvedAt = now;
    if (patch.status === "paid" && !c.settledAt) c.settledAt = now;
  }

  if (patch.addDocument && patch.addDocument.name.trim()) {
    c.documents.push({
      name: patch.addDocument.name.trim(),
      url: patch.addDocument.url?.trim() || undefined,
      uploadedAt: now,
    });
  }
  if (patch.removeDocumentName) {
    c.documents = c.documents.filter(
      (d) => d.name !== patch.removeDocumentName
    );
  }

  c.updatedAt = now;
  fc();
  return c;
}

export function deleteClaim(id: string, organizationId: string): boolean {
  const i = claims.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  claims.splice(i, 1);
  fc();
  return true;
}

export function deleteInsuranceForPatient(
  patientId: string,
  organizationId: string
): number {
  let removed = 0;
  for (let i = claims.length - 1; i >= 0; i--) {
    const c = claims[i];
    if (c.patientId === patientId && c.organizationId === organizationId) {
      claims.splice(i, 1);
      removed++;
    }
  }
  for (let i = policies.length - 1; i >= 0; i--) {
    const p = policies[i];
    if (p.patientId === patientId && p.organizationId === organizationId) {
      policies.splice(i, 1);
      removed++;
    }
  }
  if (removed) {
    fc();
    fp();
  }
  return removed;
}
