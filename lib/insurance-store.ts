// Insurance entity records + claims + empanelment — V7 §2 of the
// Master Spec.
//
// The insurer-side data the rest of the platform interacts with:
//   - Insurer entity profile (registration, GST/TIN, policy lines)
//   - Empanelment requests from hospitals (V7 §2.2)
//   - Pre-authorisation requests (V7 §2.4)
//   - Claims submitted on discharge (V7 §2.6)
//
// PPME (V9 §3) is its own store (lib/ppme-store.ts) because PPME has
// its own settlement leg. Everything else insurer-touching lives here.

import { bindPersistentArray } from "@/lib/persistent-array";
import { recordEvent } from "@/lib/accountability-store";

export type ClaimStatus = "submitted" | "under_review" | "approved" | "rejected" | "paid";
export type PreAuthStatus = "pending" | "approved" | "rejected" | "expired";
export type EmpanelStatus = "applied" | "approved" | "rejected" | "suspended";

export interface InsurerCompany {
  id: string;
  name: string;
  /** Registration / tax IDs — IRDAI (India), NAIC (US), GIA (UAE). */
  regulatorId?: string;
  taxId?: string;
  country: string;
  city?: string;
  /** Policy lines this insurer offers. */
  lines: Array<"health" | "life" | "critical_illness" | "travel" | "motor" | "home">;
  /** Default PPME tier required by policy line. Insurer admin can
   *  override per V9 §3.10. */
  defaultPpmeTier: Record<string, "basic" | "standard" | "comprehensive" | "executive">;
  /** Wallet balance is on the wallet itself; here we just keep
   *  display-friendly billing email. */
  billingEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HospitalEmpanelment {
  id: string;
  insurerId: string;
  hospitalId: string;
  hospitalName: string;
  /** Status of the empanelment (V7 §2.2). */
  status: EmpanelStatus;
  /** Categories the hospital is empanelled for (cashless OPD, IPD,
   *  daycare procedures, etc.). */
  categories: Array<"opd" | "ipd" | "daycare" | "emergency" | "maternity" | "dialysis" | "chemo">;
  /** Discount % the hospital offers vs MRP for empanelled patients. */
  discountPct?: number;
  appliedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  notes?: string;
}

export interface PreAuthRequest {
  id: string;
  insurerId: string;
  patientId: string;
  patientName: string;
  policyNumber: string;
  hospitalId: string;
  hospitalName: string;
  /** Procedure / diagnosis codes the request is for. */
  procedureCode?: string;
  diagnosis: string;
  /** Estimated cost in cents — what the hospital expects to bill. */
  estimatedCostCents: number;
  currency: string;
  status: PreAuthStatus;
  /** Cap approved by the insurer if status=approved (in cents). */
  approvedCapCents?: number;
  /** Validity window for an approved pre-auth. */
  validFromAt?: string;
  validUntilAt?: string;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  notes?: string;
}

export interface Claim {
  id: string;
  insurerId: string;
  patientId: string;
  patientName: string;
  policyNumber: string;
  hospitalId: string;
  hospitalName: string;
  /** Linked pre-auth (if any). */
  preAuthId?: string;
  /** Final billed amount in cents (what the hospital is claiming). */
  billedCents: number;
  /** Amount approved by the insurer (may differ from billed). */
  approvedCents?: number;
  currency: string;
  status: ClaimStatus;
  diagnosis: string;
  dischargeDate: string;
  submittedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  paidAt?: string;
  /** Documents bundled with the claim (V7 §2.7). */
  documentUrls: string[];
  notes?: string;
}

const insurers: InsurerCompany[] = [];
const empanelments: HospitalEmpanelment[] = [];
const preAuths: PreAuthRequest[] = [];
const claims: Claim[] = [];

const insurersHandle    = bindPersistentArray<InsurerCompany>("insurers", insurers, () => SEED_INSURERS);
const empanelHandle     = bindPersistentArray<HospitalEmpanelment>("insurance_empanelments", empanelments);
const preAuthHandle     = bindPersistentArray<PreAuthRequest>("insurance_pre_auths", preAuths);
const claimsHandle      = bindPersistentArray<Claim>("insurance_claims", claims);

let hydrated = false;
async function ensureHydrated() {
  if (hydrated) return;
  await Promise.all([
    insurersHandle.hydrate(),
    empanelHandle.hydrate(),
    preAuthHandle.hydrate(),
    claimsHandle.hydrate(),
  ]);
  hydrated = true;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ── Insurer reads ─────────────────────────────────────────────────

export async function listInsurers(): Promise<InsurerCompany[]> {
  await ensureHydrated();
  return [...insurers].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getInsurer(id: string): Promise<InsurerCompany | null> {
  await ensureHydrated();
  return insurers.find((i) => i.id === id) || null;
}

// ── Empanelment ───────────────────────────────────────────────────

export async function listEmpanelments(filter: { insurerId?: string; hospitalId?: string; status?: EmpanelStatus } = {}): Promise<HospitalEmpanelment[]> {
  await ensureHydrated();
  let rows = [...empanelments];
  if (filter.insurerId)  rows = rows.filter((e) => e.insurerId === filter.insurerId);
  if (filter.hospitalId) rows = rows.filter((e) => e.hospitalId === filter.hospitalId);
  if (filter.status)     rows = rows.filter((e) => e.status === filter.status);
  return rows.sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
}

export async function applyEmpanelment(input: {
  insurerId: string;
  hospitalId: string;
  hospitalName: string;
  categories: HospitalEmpanelment["categories"];
  discountPct?: number;
}): Promise<HospitalEmpanelment> {
  await ensureHydrated();
  const e: HospitalEmpanelment = {
    id: uid("emp"),
    insurerId: input.insurerId,
    hospitalId: input.hospitalId,
    hospitalName: input.hospitalName,
    status: "applied",
    categories: input.categories,
    discountPct: input.discountPct,
    appliedAt: new Date().toISOString(),
  };
  empanelments.push(e);
  empanelHandle.flush();
  return e;
}

export async function decideEmpanelment(
  id: string,
  by: { email: string; role?: string },
  decision: "approved" | "rejected",
  notes?: string,
): Promise<HospitalEmpanelment | null> {
  await ensureHydrated();
  const e = empanelments.find((x) => x.id === id);
  if (!e) return null;
  e.status = decision;
  e.decidedAt = new Date().toISOString();
  e.decidedBy = by.email;
  e.notes = notes;
  empanelHandle.flush();
  await recordEvent({
    category: "admin",
    action: `empanelment.${decision}`,
    actorEmail: by.email,
    actorRole: by.role,
    subjectKind: "empanelment",
    subjectId: e.id,
    summary: `${e.hospitalName} empanelment ${decision}${notes ? `: ${notes}` : ""}.`,
  }).catch(() => {/* ignore */});
  return e;
}

// ── Pre-authorisation ────────────────────────────────────────────

export async function listPreAuths(filter: { insurerId?: string; hospitalId?: string; status?: PreAuthStatus } = {}): Promise<PreAuthRequest[]> {
  await ensureHydrated();
  let rows = [...preAuths];
  if (filter.insurerId)  rows = rows.filter((p) => p.insurerId === filter.insurerId);
  if (filter.hospitalId) rows = rows.filter((p) => p.hospitalId === filter.hospitalId);
  if (filter.status)     rows = rows.filter((p) => p.status === filter.status);
  return rows.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export async function submitPreAuth(input: Omit<PreAuthRequest, "id" | "status" | "requestedAt">): Promise<PreAuthRequest> {
  await ensureHydrated();
  const p: PreAuthRequest = {
    ...input,
    id: uid("pa"),
    status: "pending",
    requestedAt: new Date().toISOString(),
  };
  preAuths.push(p);
  preAuthHandle.flush();
  return p;
}

export async function decidePreAuth(
  id: string,
  by: { email: string; role?: string },
  decision: "approved" | "rejected",
  approvedCapCents?: number,
  validityDays = 30,
  notes?: string,
): Promise<PreAuthRequest | null> {
  await ensureHydrated();
  const p = preAuths.find((x) => x.id === id);
  if (!p) return null;
  p.status = decision;
  p.decidedAt = new Date().toISOString();
  p.decidedBy = by.email;
  if (decision === "approved") {
    p.approvedCapCents = approvedCapCents ?? p.estimatedCostCents;
    p.validFromAt = p.decidedAt;
    p.validUntilAt = new Date(Date.now() + validityDays * 86_400_000).toISOString();
  }
  p.notes = notes;
  preAuthHandle.flush();
  await recordEvent({
    category: "admin",
    action: `pre_auth.${decision}`,
    actorEmail: by.email,
    actorRole: by.role,
    subjectKind: "pre_auth",
    subjectId: p.id,
    summary: `Pre-auth ${p.id} for ${p.patientName} ${decision}${decision === "approved" ? ` · cap ${((p.approvedCapCents || 0) / 100).toLocaleString()} ${p.currency}` : ""}.`,
  }).catch(() => {/* ignore */});
  return p;
}

// ── Claims ───────────────────────────────────────────────────────

export async function listClaims(filter: { insurerId?: string; hospitalId?: string; status?: ClaimStatus } = {}): Promise<Claim[]> {
  await ensureHydrated();
  let rows = [...claims];
  if (filter.insurerId)  rows = rows.filter((c) => c.insurerId === filter.insurerId);
  if (filter.hospitalId) rows = rows.filter((c) => c.hospitalId === filter.hospitalId);
  if (filter.status)     rows = rows.filter((c) => c.status === filter.status);
  return rows.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function submitClaim(input: Omit<Claim, "id" | "status" | "submittedAt">): Promise<Claim> {
  await ensureHydrated();
  const c: Claim = {
    ...input,
    id: uid("clm"),
    status: "submitted",
    submittedAt: new Date().toISOString(),
  };
  claims.push(c);
  claimsHandle.flush();
  // V6 §5.17 — claim submitted fan-out (tenant notify + bundle assembly)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const xc = require("@/lib/cross-connections") as typeof import("@/lib/cross-connections");
    xc.emit("insurance.claim.submitted", {
      claimId: c.id,
      insurerId: c.insurerId,
      hospitalId: c.hospitalId,
      patientName: c.patientName,
      billedCents: c.billedCents,
      currency: c.currency,
      actorEmail: undefined,
    });
  } catch {/* ignore */}
  return c;
}

export async function decideClaim(
  id: string,
  by: { email: string; role?: string },
  decision: "approved" | "rejected",
  approvedCents?: number,
  notes?: string,
): Promise<Claim | null> {
  await ensureHydrated();
  const c = claims.find((x) => x.id === id);
  if (!c) return null;
  c.status = decision;
  c.decidedAt = new Date().toISOString();
  c.decidedBy = by.email;
  if (decision === "approved") c.approvedCents = approvedCents ?? c.billedCents;
  c.notes = notes;
  claimsHandle.flush();
  await recordEvent({
    category: "admin",
    action: `claim.${decision}`,
    actorEmail: by.email,
    actorRole: by.role,
    subjectKind: "claim",
    subjectId: c.id,
    summary: `Claim ${c.id} ${decision}${decision === "approved" ? ` · ${((c.approvedCents || 0) / 100).toLocaleString()} ${c.currency}` : ""}.`,
  }).catch(() => {/* ignore */});
  return c;
}

/** Mark an approved claim as paid (the actual wallet transfer is
 *  triggered separately so this store stays pure). */
export async function payClaim(id: string, by: { email: string; role?: string }): Promise<Claim | null> {
  await ensureHydrated();
  const c = claims.find((x) => x.id === id);
  if (!c || c.status !== "approved") return null;
  c.status = "paid";
  c.paidAt = new Date().toISOString();
  claimsHandle.flush();
  await recordEvent({
    category: "financial",
    action: "claim.paid",
    actorEmail: by.email,
    actorRole: by.role,
    subjectKind: "claim",
    subjectId: c.id,
    summary: `Claim ${c.id} marked paid · ${((c.approvedCents || 0) / 100).toLocaleString()} ${c.currency}`,
  }).catch(() => {/* ignore */});
  return c;
}

// ── Seeds — so the dashboard isn't empty on first run ────────────

const SEED_INSURERS: InsurerCompany[] = [
  {
    id: "demo-insurer",
    name: "Demo Insurance Co",
    regulatorId: "IRDAI-DEMO",
    country: "India",
    city: "Mumbai",
    lines: ["health", "life", "critical_illness"],
    defaultPpmeTier: { health: "standard", life: "comprehensive", critical_illness: "executive", travel: "basic" },
    billingEmail: "billing@demo-insurer.example",
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
  },
];
