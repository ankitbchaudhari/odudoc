// Corporate Empanelment. Tenant-scoped.
// CorporateClient (master) + Preauthorization (per-request).
// No patient cascade for clients; preauths detach patient on removal.

import { bindPersistentArray } from "../persistent-array";

export type ClientStatus = "prospect" | "negotiating" | "active" | "suspended" | "terminated" | "expired";
export type ClientType = "corporate" | "tpa" | "insurer" | "psu" | "govt" | "cghs" | "echs" | "railway" | "ngo";
export type BillingMode = "cashless" | "reimbursement" | "hybrid" | "direct_billing";
export type PreauthStatus = "draft" | "submitted" | "approved" | "partially_approved" | "denied" | "info_requested" | "expired" | "cancelled" | "consumed";

export interface TariffItem {
  id: string;
  code?: string;                         // CPT / service code
  description: string;                   // "MRI brain", "OPD consultation"
  standardPrice?: number;
  negotiatedPrice: number;
  discountPct?: number;
  cashlessLimit?: number;
  notes?: string;
}

export interface CorporateClient {
  id: string;                            // EMP-{suffix}-{seq}
  organizationId: string;
  name: string;                          // corporate / TPA name
  shortCode?: string;                    // internal code
  clientType: ClientType;
  status: ClientStatus;
  billingMode: BillingMode;
  gstin?: string;
  pan?: string;
  contactPerson: string;
  contactEmail?: string;
  contactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  contractStartDate: string;
  contractEndDate?: string;
  autoRenew?: boolean;
  employeeHeadcount?: number;            // lives covered
  dependentsCovered?: boolean;
  creditLimit?: number;                  // outstanding cap (INR)
  creditDays?: number;                   // payment terms
  coverageSumInsured?: number;           // per-life
  roomCategory?: string;                 // "Semi-private", "Single AC"
  exclusions?: string;
  inclusions?: string;
  preauthRequired?: boolean;
  cashlessThreshold?: number;            // auto cashless below this amount
  tariffItems: TariffItem[];
  mouUrl?: string;                       // signed MOU link
  rateCardUrl?: string;
  kycDocsComplete?: boolean;
  bankAccountName?: string;              // payment remittance details (no numbers stored)
  notes?: string;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
  terminatedAt?: string;
  terminationReason?: string;
}

export interface Preauthorization {
  id: string;                            // PRA-{suffix}-{seq}
  organizationId: string;
  clientId: string;
  clientName: string;                    // denorm
  patientId: string;
  patientName: string;
  employeeId?: string;                   // corporate emp ID
  policyNumber?: string;
  admissionId?: string;                  // linked admission
  diagnosis: string;
  icd10Code?: string;
  plannedProcedure?: string;
  requestedAmount: number;
  approvedAmount?: number;
  status: PreauthStatus;
  submittedAt?: string;
  approvedAt?: string;
  validUntil?: string;                   // approval validity
  approvalCode?: string;                 // TPA reference
  denialReason?: string;
  infoRequested?: string;                // what TPA asked for
  submittedBy: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const clients: CorporateClient[] = [];
const preauths: Preauthorization[] = [];
const hC = bindPersistentArray<CorporateClient>("corporate-empanelment", clients, () => []);
const hP = bindPersistentArray<Preauthorization>("corporate-preauths", preauths, () => []);
await hC;
await hP;

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  prospect: "Prospect", negotiating: "Negotiating", active: "Active",
  suspended: "Suspended", terminated: "Terminated", expired: "Expired",
};
export const CLIENT_TYPE_LABEL: Record<ClientType, string> = {
  corporate: "Corporate", tpa: "TPA", insurer: "Insurer", psu: "PSU",
  govt: "Government", cghs: "CGHS", echs: "ECHS", railway: "Railway", ngo: "NGO",
};
export const BILLING_MODE_LABEL: Record<BillingMode, string> = {
  cashless: "Cashless", reimbursement: "Reimbursement", hybrid: "Hybrid", direct_billing: "Direct billing",
};
export const PREAUTH_STATUS_LABEL: Record<PreauthStatus, string> = {
  draft: "Draft", submitted: "Submitted", approved: "Approved",
  partially_approved: "Partially approved", denied: "Denied",
  info_requested: "Info requested", expired: "Expired", cancelled: "Cancelled", consumed: "Consumed",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextClientId(o: string) {
  const p = `EMP-${suf(o)}-`;
  const m = clients.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}
function nextPreauthId(o: string) {
  const p = `PRA-${suf(o)}-`;
  const m = preauths.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

// Clients
export function listClients(opts: { organizationId: string; status?: ClientStatus; clientType?: ClientType }): CorporateClient[] {
  return clients.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.clientType ? r.clientType === opts.clientType : true))
    .sort((a, b) => a.name.localeCompare(b.name));
}
export function getClient(id: string, orgId: string): CorporateClient | null {
  return clients.find((r) => r.id === id && r.organizationId === orgId) || null;
}
export function createClient(orgId: string, input: Partial<CorporateClient>): { ok: true; record: CorporateClient } | { ok: false; error: string } {
  if (!input.name || !input.contactPerson || !input.contractStartDate) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: CorporateClient = {
    id: nextClientId(orgId), organizationId: orgId,
    name: input.name, shortCode: input.shortCode,
    clientType: (input.clientType || "corporate") as ClientType,
    status: (input.status || "prospect") as ClientStatus,
    billingMode: (input.billingMode || "cashless") as BillingMode,
    gstin: input.gstin, pan: input.pan,
    contactPerson: input.contactPerson,
    contactEmail: input.contactEmail, contactPhone: input.contactPhone,
    addressLine1: input.addressLine1, addressLine2: input.addressLine2,
    city: input.city, state: input.state, country: input.country, pincode: input.pincode,
    contractStartDate: input.contractStartDate,
    contractEndDate: input.contractEndDate,
    autoRenew: input.autoRenew ?? false,
    employeeHeadcount: input.employeeHeadcount,
    dependentsCovered: input.dependentsCovered ?? false,
    creditLimit: input.creditLimit, creditDays: input.creditDays ?? 30,
    coverageSumInsured: input.coverageSumInsured,
    roomCategory: input.roomCategory,
    exclusions: input.exclusions, inclusions: input.inclusions,
    preauthRequired: input.preauthRequired ?? true,
    cashlessThreshold: input.cashlessThreshold,
    tariffItems: input.tariffItems || [],
    mouUrl: input.mouUrl, rateCardUrl: input.rateCardUrl,
    kycDocsComplete: input.kycDocsComplete ?? false,
    bankAccountName: input.bankAccountName,
    notes: input.notes,
    createdAt: now, updatedAt: now,
  };
  clients.push(r);
  return { ok: true, record: r };
}
export function updateClient(id: string, orgId: string, patch: Partial<CorporateClient>): CorporateClient | null {
  const i = clients.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = clients[i];
  const now = new Date().toISOString();
  const next: CorporateClient = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.status === "active" && prev.status !== "active" && !next.activatedAt) next.activatedAt = now;
  if (next.status === "terminated" && prev.status !== "terminated" && !next.terminatedAt) next.terminatedAt = now;
  clients[i] = next;
  return next;
}
export function deleteClient(id: string, orgId: string): boolean {
  const i = clients.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  clients.splice(i, 1);
  // Cascade delete its preauths (internal records, not patient data)
  for (let j = preauths.length - 1; j >= 0; j--) {
    if (preauths[j].clientId === id && preauths[j].organizationId === orgId) preauths.splice(j, 1);
  }
  return true;
}

// Preauths
export function listPreauths(opts: { organizationId: string; status?: PreauthStatus; clientId?: string; patientId?: string }): Preauthorization[] {
  return preauths.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.clientId ? r.clientId === opts.clientId : true))
    .filter((r) => (opts.patientId ? r.patientId === opts.patientId : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function createPreauth(orgId: string, input: Partial<Preauthorization>): { ok: true; record: Preauthorization } | { ok: false; error: string } {
  if (!input.clientId || !input.patientId || !input.patientName || !input.diagnosis || !input.submittedBy || input.requestedAmount === undefined) return { ok: false, error: "missing_required" };
  const client = clients.find((c) => c.id === input.clientId && c.organizationId === orgId);
  if (!client) return { ok: false, error: "client_not_found" };
  const now = new Date().toISOString();
  const r: Preauthorization = {
    id: nextPreauthId(orgId), organizationId: orgId,
    clientId: client.id, clientName: client.name,
    patientId: input.patientId, patientName: input.patientName,
    employeeId: input.employeeId, policyNumber: input.policyNumber,
    admissionId: input.admissionId,
    diagnosis: input.diagnosis, icd10Code: input.icd10Code,
    plannedProcedure: input.plannedProcedure,
    requestedAmount: Number(input.requestedAmount),
    approvedAmount: input.approvedAmount,
    status: (input.status || "draft") as PreauthStatus,
    submittedAt: input.submittedAt,
    approvedAt: input.approvedAt,
    validUntil: input.validUntil,
    approvalCode: input.approvalCode,
    denialReason: input.denialReason,
    infoRequested: input.infoRequested,
    submittedBy: input.submittedBy,
    notes: input.notes,
    createdAt: now, updatedAt: now,
  };
  preauths.push(r);
  return { ok: true, record: r };
}
export function updatePreauth(id: string, orgId: string, patch: Partial<Preauthorization>): Preauthorization | null {
  const i = preauths.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = preauths[i];
  const now = new Date().toISOString();
  const next: Preauthorization = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.status === "submitted" && prev.status !== "submitted" && !next.submittedAt) next.submittedAt = now;
  if ((next.status === "approved" || next.status === "partially_approved") && !next.approvedAt) next.approvedAt = now;
  preauths[i] = next;
  return next;
}
export function deletePreauth(id: string, orgId: string): boolean {
  const i = preauths.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  preauths.splice(i, 1);
  return true;
}

export function computeStats(orgId: string) {
  const myC = clients.filter((r) => r.organizationId === orgId);
  const myP = preauths.filter((r) => r.organizationId === orgId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const in30 = new Date(now.getTime() + 30 * 86400000).toISOString();
  const active = myC.filter((r) => r.status === "active");
  const expiringSoon = active.filter((r) => r.contractEndDate && r.contractEndDate <= in30 && r.contractEndDate >= now.toISOString()).length;
  const totalLives = active.reduce((s, c) => s + (c.employeeHeadcount || 0), 0);
  const pendingPreauths = myP.filter((r) => r.status === "submitted" || r.status === "info_requested").length;
  const approvedMonth = myP.filter((r) => (r.status === "approved" || r.status === "partially_approved") && (r.approvedAt || "") >= monthStart).length;
  const approvedAmountMonth = myP.filter((r) => (r.status === "approved" || r.status === "partially_approved") && (r.approvedAt || "") >= monthStart).reduce((s, p) => s + (p.approvedAmount || 0), 0);
  const deniedMonth = myP.filter((r) => r.status === "denied" && r.updatedAt >= monthStart).length;
  return {
    activeClients: active.length,
    prospects: myC.filter((r) => r.status === "prospect" || r.status === "negotiating").length,
    expiringSoon,
    totalLives,
    pendingPreauths,
    approvedMonth,
    approvedAmountMonth,
    deniedMonth,
  };
}

export function unlinkPreauthForPatient(patientId: string, orgId: string): void {
  const stamp = new Date().toISOString();
  for (const r of preauths) {
    if (r.organizationId === orgId && r.patientId === patientId) {
      r.patientId = "";
      r.patientName = `[removed] ${r.patientName}`;
      if (r.status === "draft" || r.status === "submitted" || r.status === "info_requested") {
        r.status = "cancelled";
      }
      r.updatedAt = stamp;
    }
  }
  // flush:auto-unlink
  preauths.splice(preauths.length, 0);
}
