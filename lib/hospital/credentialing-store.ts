// Credentialing & Privileging. Tenant-scoped. No patient cascade.
//  Credential — a license, certification, DEA, malpractice, board cert per staff
//  PrivilegeGrant — clinical privileges granted at this facility (scope, expiry)

import { bindPersistentArray } from "../persistent-array";

export type CredentialType =
  | "medical_license"
  | "dea_registration"
  | "board_certification"
  | "malpractice_insurance"
  | "acls" | "bls" | "pals" | "atls" | "nrp"
  | "dnb" | "md" | "ms" | "mch" | "dm"
  | "nursing_license" | "paramedical" | "allied_health"
  | "continuing_education" | "immunization" | "background_check" | "other";

export type CredentialStatus = "active" | "expiring_soon" | "expired" | "pending_verification" | "suspended" | "revoked";
export type VerificationMethod = "primary_source" | "copy_on_file" | "self_reported" | "third_party" | "pending";

export type PrivilegeCategory = "core" | "non_core" | "emergency" | "proctored" | "surgical" | "procedural" | "admitting";
export type PrivilegeStatus = "requested" | "granted" | "proctored" | "suspended" | "expired" | "withdrawn";

export interface Credential {
  id: string;                   // CRED-{suffix}-{seq}
  organizationId: string;
  staffId?: string;             // optional FK to staff store
  staffName: string;
  role?: string;                // Cardiologist, Staff Nurse, RMO
  credentialType: CredentialType;
  credentialName: string;       // e.g. "Medical Council of India Reg. #"
  credentialNumber?: string;    // license number, DEA#, policy#
  issuingAuthority?: string;
  issuedDate?: string;
  expiresDate?: string;
  verificationMethod: VerificationMethod;
  verifiedBy?: string;
  verifiedAt?: string;
  status: CredentialStatus;
  coverageAmount?: number;      // for malpractice
  coverageCurrency?: string;
  documentUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrivilegeGrant {
  id: string;                   // PRIV-{suffix}-{seq}
  organizationId: string;
  staffId?: string;
  staffName: string;
  department?: string;
  specialty?: string;
  category: PrivilegeCategory;
  privilegeName: string;        // e.g. "PCI - diagnostic", "Lap chole"
  scope?: string;               // inclusions, limitations, co-signing requirements
  status: PrivilegeStatus;
  grantedDate?: string;
  effectiveDate?: string;
  expiresDate?: string;
  proctorName?: string;
  casesRequired?: number;
  casesCompleted?: number;
  reviewerName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const credentials: Credential[] = [];
const privileges: PrivilegeGrant[] = [];
const hC = bindPersistentArray<Credential>("credentialing-creds", credentials, () => []);
const hP = bindPersistentArray<PrivilegeGrant>("credentialing-privileges", privileges, () => []);
await hC;
await hP;

export const CREDENTIAL_TYPE_LABEL: Record<CredentialType, string> = {
  medical_license: "Medical license",
  dea_registration: "DEA / narcotic reg.",
  board_certification: "Board certification",
  malpractice_insurance: "Malpractice insurance",
  acls: "ACLS", bls: "BLS", pals: "PALS", atls: "ATLS", nrp: "NRP",
  dnb: "DNB", md: "MD", ms: "MS", mch: "MCh", dm: "DM",
  nursing_license: "Nursing license",
  paramedical: "Paramedical",
  allied_health: "Allied health",
  continuing_education: "CME / CE",
  immunization: "Immunization",
  background_check: "Background check",
  other: "Other",
};
export const CRED_STATUS_LABEL: Record<CredentialStatus, string> = {
  active: "Active",
  expiring_soon: "Expiring soon",
  expired: "Expired",
  pending_verification: "Pending verification",
  suspended: "Suspended",
  revoked: "Revoked",
};
export const VERIFY_LABEL: Record<VerificationMethod, string> = {
  primary_source: "Primary source",
  copy_on_file: "Copy on file",
  self_reported: "Self-reported",
  third_party: "Third-party",
  pending: "Pending",
};
export const PRIV_CATEGORY_LABEL: Record<PrivilegeCategory, string> = {
  core: "Core", non_core: "Non-core", emergency: "Emergency",
  proctored: "Proctored", surgical: "Surgical", procedural: "Procedural", admitting: "Admitting",
};
export const PRIV_STATUS_LABEL: Record<PrivilegeStatus, string> = {
  requested: "Requested", granted: "Granted", proctored: "Proctored",
  suspended: "Suspended", expired: "Expired", withdrawn: "Withdrawn",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextCredId(o: string) {
  const p = `CRED-${suf(o)}-`;
  const m = credentials.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}
function nextPrivId(o: string) {
  const p = `PRIV-${suf(o)}-`;
  const m = privileges.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

function computeCredStatus(c: Credential): CredentialStatus {
  if (c.status === "suspended" || c.status === "revoked") return c.status;
  if (c.verificationMethod === "pending" && !c.verifiedAt) return "pending_verification";
  if (!c.expiresDate) return "active";
  const days = (new Date(c.expiresDate).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return "active";
}

// Credentials
export function listCredentials(opts: { organizationId: string; status?: CredentialStatus; staffId?: string; credentialType?: CredentialType }): Credential[] {
  const base = credentials.filter((r) => r.organizationId === opts.organizationId);
  // Auto-refresh derived status before filtering
  for (const c of base) {
    const calc = computeCredStatus(c);
    if (calc !== c.status && (c.status === "active" || c.status === "expiring_soon" || c.status === "expired")) c.status = calc;
  }
  return base
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.staffId ? r.staffId === opts.staffId : true))
    .filter((r) => (opts.credentialType ? r.credentialType === opts.credentialType : true))
    .sort((a, b) => (a.expiresDate || "9999").localeCompare(b.expiresDate || "9999"));
}
export function createCredential(orgId: string, input: Partial<Credential>): { ok: true; record: Credential } | { ok: false; error: string } {
  if (!input.staffName || !input.credentialType || !input.credentialName) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: Credential = {
    id: nextCredId(orgId), organizationId: orgId,
    staffId: input.staffId, staffName: input.staffName, role: input.role,
    credentialType: input.credentialType as CredentialType,
    credentialName: input.credentialName,
    credentialNumber: input.credentialNumber,
    issuingAuthority: input.issuingAuthority,
    issuedDate: input.issuedDate,
    expiresDate: input.expiresDate,
    verificationMethod: (input.verificationMethod || "pending") as VerificationMethod,
    verifiedBy: input.verifiedBy,
    verifiedAt: input.verifiedAt,
    status: (input.status || "pending_verification") as CredentialStatus,
    coverageAmount: input.coverageAmount,
    coverageCurrency: input.coverageCurrency || (input.coverageAmount ? "INR" : undefined),
    documentUrl: input.documentUrl,
    notes: input.notes,
    createdAt: now, updatedAt: now,
  };
  r.status = computeCredStatus(r);
  credentials.push(r);
  return { ok: true, record: r };
}
export function updateCredential(id: string, orgId: string, patch: Partial<Credential>): Credential | null {
  const i = credentials.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = credentials[i];
  const now = new Date().toISOString();
  const next: Credential = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  // Stamp verifiedAt if verification method changes to a verified value and not already set
  if (patch.verificationMethod && patch.verificationMethod !== "pending" && !next.verifiedAt) next.verifiedAt = now;
  next.status = computeCredStatus(next);
  credentials[i] = next;
  return next;
}
export function deleteCredential(id: string, orgId: string): boolean {
  const i = credentials.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  credentials.splice(i, 1);
  return true;
}

// Privileges
export function listPrivileges(opts: { organizationId: string; status?: PrivilegeStatus; category?: PrivilegeCategory; staffId?: string }): PrivilegeGrant[] {
  const base = privileges.filter((r) => r.organizationId === opts.organizationId);
  // Auto-expire
  const today = new Date().toISOString();
  for (const p of base) {
    if (p.status === "granted" && p.expiresDate && p.expiresDate < today) p.status = "expired";
  }
  return base
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.category ? r.category === opts.category : true))
    .filter((r) => (opts.staffId ? r.staffId === opts.staffId : true))
    .sort((a, b) => a.staffName.localeCompare(b.staffName));
}
export function createPrivilege(orgId: string, input: Partial<PrivilegeGrant>): { ok: true; record: PrivilegeGrant } | { ok: false; error: string } {
  if (!input.staffName || !input.privilegeName) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: PrivilegeGrant = {
    id: nextPrivId(orgId), organizationId: orgId,
    staffId: input.staffId, staffName: input.staffName,
    department: input.department, specialty: input.specialty,
    category: (input.category || "core") as PrivilegeCategory,
    privilegeName: input.privilegeName,
    scope: input.scope,
    status: (input.status || "requested") as PrivilegeStatus,
    grantedDate: input.grantedDate,
    effectiveDate: input.effectiveDate,
    expiresDate: input.expiresDate,
    proctorName: input.proctorName,
    casesRequired: input.casesRequired,
    casesCompleted: input.casesCompleted ?? 0,
    reviewerName: input.reviewerName,
    notes: input.notes,
    createdAt: now, updatedAt: now,
  };
  privileges.push(r);
  return { ok: true, record: r };
}
export function updatePrivilege(id: string, orgId: string, patch: Partial<PrivilegeGrant>): PrivilegeGrant | null {
  const i = privileges.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = privileges[i];
  const now = new Date().toISOString();
  const next: PrivilegeGrant = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.status === "granted" && prev.status !== "granted" && !next.grantedDate) next.grantedDate = now;
  privileges[i] = next;
  return next;
}
export function deletePrivilege(id: string, orgId: string): boolean {
  const i = privileges.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  privileges.splice(i, 1);
  return true;
}

export function computeStats(orgId: string) {
  const myC = credentials.filter((r) => r.organizationId === orgId);
  const myP = privileges.filter((r) => r.organizationId === orgId);
  // ensure derived status
  for (const c of myC) c.status = computeCredStatus(c);
  const today = new Date().toISOString();
  for (const p of myP) {
    if (p.status === "granted" && p.expiresDate && p.expiresDate < today) p.status = "expired";
  }
  return {
    activeCreds: myC.filter((r) => r.status === "active").length,
    expiringSoon: myC.filter((r) => r.status === "expiring_soon").length,
    expired: myC.filter((r) => r.status === "expired").length,
    pendingVerify: myC.filter((r) => r.status === "pending_verification").length,
    grantedPrivs: myP.filter((r) => r.status === "granted").length,
    proctoredPrivs: myP.filter((r) => r.status === "proctored").length,
    expiredPrivs: myP.filter((r) => r.status === "expired").length,
  };
}
