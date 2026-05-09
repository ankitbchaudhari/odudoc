// TPA / insurer registry + per-org empanelment.
//
// In India, hospitals deal with ~30 active TPAs (Third-Party
// Administrators) plus a few direct insurers. Each TPA has its own
// pre-auth portal, document checklist, and turnaround SLA. To run
// cashless we need three things plumbed:
//
//   1. The list of TPAs the platform supports (curated here).
//   2. Per-org empanelment: which TPAs is this hospital signed up
//      with, what's the agreed tariff package, what's the discount.
//      Without empanelment, we have to fall back to reimbursement.
//   3. The patient's policies: which insurer, member id, plan,
//      sum-insured, valid-through date. Stored against the User row
//      via this store rather than mutating users-store, so the
//      insurance feature ships without a User schema migration.
//
// Coverage decisions live in lib/insurance/policy-engine.ts (pure
// rules over a procedure-code → tariff table). This store is just
// data plumbing.

import { bindPersistentArray } from "../persistent-array";

// ── Curated TPA registry ────────────────────────────────────────
// India's biggest TPAs by claim volume + a handful of direct
// insurers (Star, Aditya Birla, etc. are insurers but operate their
// own in-house TPA function and are commonly transacted with directly).
// Easy to extend — add a row.

export interface TpaRegistryEntry {
  id: string;                   // stable slug
  name: string;                 // display name
  shortCode: string;            // 3-4 char code shown on chips
  /** insurer = direct payer; tpa = third-party admin handling many insurers. */
  kind: "tpa" | "insurer";
  preauthSlaHours: number;      // typical turnaround
  website?: string;
  notes?: string;
}

export const TPA_REGISTRY: TpaRegistryEntry[] = [
  // Public insurers
  { id: "nia",        name: "New India Assurance",  shortCode: "NIA", kind: "insurer", preauthSlaHours: 24 },
  { id: "uiic",       name: "United India Insurance", shortCode: "UIIC", kind: "insurer", preauthSlaHours: 24 },
  { id: "oicl",       name: "Oriental Insurance",    shortCode: "OICL", kind: "insurer", preauthSlaHours: 24 },
  { id: "niacl",      name: "National Insurance",    shortCode: "NIC", kind: "insurer", preauthSlaHours: 24 },
  // Private insurers (also operate own claims functions)
  { id: "star",       name: "Star Health",            shortCode: "STAR", kind: "insurer", preauthSlaHours: 6 },
  { id: "hdfcergo",   name: "HDFC ERGO",              shortCode: "HE",  kind: "insurer", preauthSlaHours: 6 },
  { id: "bajaj",      name: "Bajaj Allianz",          shortCode: "BAJ", kind: "insurer", preauthSlaHours: 8 },
  { id: "icici-lomb", name: "ICICI Lombard",          shortCode: "ICL", kind: "insurer", preauthSlaHours: 8 },
  { id: "tata-aig",   name: "TATA AIG",               shortCode: "TAIG", kind: "insurer", preauthSlaHours: 8 },
  { id: "reliance",   name: "Reliance General",       shortCode: "RGI", kind: "insurer", preauthSlaHours: 12 },
  { id: "manipal",    name: "ManipalCigna",           shortCode: "MC",  kind: "insurer", preauthSlaHours: 6 },
  { id: "niva",       name: "Niva Bupa",              shortCode: "NB",  kind: "insurer", preauthSlaHours: 6 },
  { id: "aditya",     name: "Aditya Birla Health",    shortCode: "ABH", kind: "insurer", preauthSlaHours: 6 },
  { id: "care",       name: "Care Health",            shortCode: "CH",  kind: "insurer", preauthSlaHours: 8 },
  // TPAs (handle multiple insurers' books)
  { id: "mediassist", name: "MediAssist TPA",         shortCode: "MA",  kind: "tpa", preauthSlaHours: 8 },
  { id: "paramount",  name: "Paramount TPA",          shortCode: "PT",  kind: "tpa", preauthSlaHours: 12 },
  { id: "vidal",      name: "Vidal Health TPA",       shortCode: "VH",  kind: "tpa", preauthSlaHours: 12 },
  { id: "fhpl",       name: "Family Health Plan TPA", shortCode: "FHPL", kind: "tpa", preauthSlaHours: 12 },
  { id: "heritage",   name: "Heritage Health TPA",    shortCode: "HH",  kind: "tpa", preauthSlaHours: 12 },
  { id: "medivisor",  name: "Medivisor TPA",          shortCode: "MV",  kind: "tpa", preauthSlaHours: 12 },
  { id: "raksha",     name: "Raksha TPA",             shortCode: "RT",  kind: "tpa", preauthSlaHours: 12 },
  { id: "good-health",name: "Good Health TPA",        shortCode: "GH",  kind: "tpa", preauthSlaHours: 12 },
  // Govt schemes
  { id: "abpmjay",    name: "Ayushman Bharat (PM-JAY)", shortCode: "AB", kind: "insurer", preauthSlaHours: 24, notes: "Govt scheme; empanelment via NHA portal." },
  { id: "cghs",       name: "CGHS (Central Govt Health Scheme)", shortCode: "CGHS", kind: "insurer", preauthSlaHours: 48 },
];

export function getTpa(id: string): TpaRegistryEntry | null {
  return TPA_REGISTRY.find((t) => t.id === id) || null;
}

// ── Per-org empanelment ─────────────────────────────────────────
// One row per (orgId, tpaId) pair with the agreed discount %, claim
// portal URL, and any contact / desk-officer info the front desk
// needs at the point of pre-auth.

export interface OrgEmpanelment {
  id: string;
  organizationId: string;
  tpaId: string;
  /** Discount % the hospital extends on tariff for this TPA. */
  discountPct: number;
  /** Internal claim portal URL the front desk uses. */
  portalUrl?: string;
  /** Direct contact for the desk officer at the TPA / insurer. */
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  /** Empanelment expiry — after this we surface a renewal nudge. */
  validUntil?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const empanelments: OrgEmpanelment[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<OrgEmpanelment>(
  "tpa_empanelments",
  empanelments,
  () => []
);
await hydrate();

export function listEmpanelmentsForOrg(orgId: string): OrgEmpanelment[] {
  return empanelments
    .filter((e) => e.organizationId === orgId)
    .sort((a, b) => a.tpaId.localeCompare(b.tpaId));
}

export function getEmpanelment(orgId: string, tpaId: string): OrgEmpanelment | null {
  return empanelments.find((e) => e.organizationId === orgId && e.tpaId === tpaId) || null;
}

export interface UpsertEmpanelmentInput {
  organizationId: string;
  tpaId: string;
  discountPct?: number;
  portalUrl?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  validUntil?: string;
  notes?: string;
}

export function upsertEmpanelment(input: UpsertEmpanelmentInput): OrgEmpanelment {
  if (!getTpa(input.tpaId)) throw new Error("unknown_tpa");
  const existing = getEmpanelment(input.organizationId, input.tpaId);
  const now = new Date().toISOString();
  if (existing) {
    if (input.discountPct !== undefined) existing.discountPct = input.discountPct;
    if (input.portalUrl !== undefined) existing.portalUrl = input.portalUrl;
    if (input.contactPerson !== undefined) existing.contactPerson = input.contactPerson;
    if (input.contactPhone !== undefined) existing.contactPhone = input.contactPhone;
    if (input.contactEmail !== undefined) existing.contactEmail = input.contactEmail;
    if (input.validUntil !== undefined) existing.validUntil = input.validUntil;
    if (input.notes !== undefined) existing.notes = input.notes;
    existing.updatedAt = now;
    flush();
    return existing;
  }
  const e: OrgEmpanelment = {
    id: `emp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    tpaId: input.tpaId,
    discountPct: input.discountPct ?? 0,
    portalUrl: input.portalUrl,
    contactPerson: input.contactPerson,
    contactPhone: input.contactPhone,
    contactEmail: input.contactEmail,
    validUntil: input.validUntil,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  empanelments.push(e);
  flush();
  return e;
}

export function deleteEmpanelment(id: string): boolean {
  const i = empanelments.findIndex((e) => e.id === id);
  if (i < 0) return false;
  tombstone(empanelments[i].id);
  empanelments.splice(i, 1);
  flush();
  return true;
}

// ── Patient policy linking ──────────────────────────────────────
// One patient can carry multiple policies (corporate group + personal
// floater is common). At booking, the patient picks which one to use
// for the encounter; we capture that selection in the preauth row.

export interface PatientPolicy {
  id: string;
  userId: string;
  /** Optional dependent — kids on the parent's group plan etc. */
  dependentId?: string;
  tpaId: string;
  /** Member ID printed on the card. */
  memberId: string;
  /** Plan name as printed on the card. */
  planName?: string;
  /** Sum insured in INR rupees. */
  sumInsuredRupees?: number;
  /** Cumulative bonus / NCB %. */
  cumulativeBonusPct?: number;
  /** Coverage end date. */
  validUntil?: string;
  /** Group / corporate policy holder, when applicable. */
  groupHolder?: string;
  /** Photo of the card front + back; optional. We store URLs only —
   *  upload pipeline is separate. */
  cardFrontUrl?: string;
  cardBackUrl?: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

const policies: PatientPolicy[] = [];
const { hydrate: hydrPol, flush: flushPol, tombstone: tombPol } = bindPersistentArray<PatientPolicy>(
  "patient_policies",
  policies,
  () => []
);
await hydrPol();

export function listPoliciesForUser(userId: string): PatientPolicy[] {
  return policies
    .filter((p) => p.userId === userId)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

export function getPolicy(id: string, userId: string): PatientPolicy | null {
  const p = policies.find((x) => x.id === id);
  if (!p || p.userId !== userId) return null;
  return p;
}

export interface UpsertPolicyInput {
  userId: string;
  dependentId?: string;
  tpaId: string;
  memberId: string;
  planName?: string;
  sumInsuredRupees?: number;
  cumulativeBonusPct?: number;
  validUntil?: string;
  groupHolder?: string;
  cardFrontUrl?: string;
  cardBackUrl?: string;
  isPrimary?: boolean;
}

export function addPolicy(input: UpsertPolicyInput): PatientPolicy {
  if (!getTpa(input.tpaId)) throw new Error("unknown_tpa");
  const now = new Date().toISOString();
  // First policy auto-becomes primary; later policies inherit the
  // explicit flag (caller decides).
  const isPrimary = input.isPrimary ?? listPoliciesForUser(input.userId).length === 0;
  if (isPrimary) {
    // Demote any existing primary so we don't double-up.
    for (const p of policies) {
      if (p.userId === input.userId && p.isPrimary) p.isPrimary = false;
    }
  }
  const p: PatientPolicy = {
    id: `pol-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId: input.userId,
    dependentId: input.dependentId,
    tpaId: input.tpaId,
    memberId: input.memberId.trim(),
    planName: input.planName?.trim() || undefined,
    sumInsuredRupees: input.sumInsuredRupees,
    cumulativeBonusPct: input.cumulativeBonusPct,
    validUntil: input.validUntil,
    groupHolder: input.groupHolder?.trim() || undefined,
    cardFrontUrl: input.cardFrontUrl,
    cardBackUrl: input.cardBackUrl,
    isPrimary,
    createdAt: now,
    updatedAt: now,
  };
  policies.push(p);
  flushPol();
  return p;
}

export function updatePolicy(
  id: string,
  userId: string,
  patch: Partial<Omit<PatientPolicy, "id" | "userId" | "createdAt">>,
): PatientPolicy | null {
  const p = getPolicy(id, userId);
  if (!p) return null;
  if (patch.tpaId !== undefined && !getTpa(patch.tpaId)) throw new Error("unknown_tpa");
  Object.assign(p, patch);
  if (patch.isPrimary === true) {
    for (const x of policies) if (x.userId === userId && x.id !== id) x.isPrimary = false;
  }
  p.updatedAt = new Date().toISOString();
  flushPol();
  return p;
}

export function removePolicy(id: string, userId: string): boolean {
  const i = policies.findIndex((p) => p.id === id && p.userId === userId);
  if (i < 0) return false;
  tombPol(policies[i].id);
  policies.splice(i, 1);
  flushPol();
  return true;
}
