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
  /** ISO 3166-1 alpha-2 country code this insurer/TPA operates in.
   *  Drives the patient-side dropdown — show me carriers in my
   *  country first. Multi-country carriers (Cigna, Allianz, AXA)
   *  appear in each country list with the local entity name. */
  country: string;
  website?: string;
  notes?: string;
}

export const TPA_REGISTRY: TpaRegistryEntry[] = [
  // ── India ─────────────────────────────────────────────────────
  // Public insurers
  { id: "nia",        name: "New India Assurance",  shortCode: "NIA", kind: "insurer", preauthSlaHours: 24, country: "IN" },
  { id: "uiic",       name: "United India Insurance", shortCode: "UIIC", kind: "insurer", preauthSlaHours: 24, country: "IN" },
  { id: "oicl",       name: "Oriental Insurance",    shortCode: "OICL", kind: "insurer", preauthSlaHours: 24, country: "IN" },
  { id: "niacl",      name: "National Insurance",    shortCode: "NIC", kind: "insurer", preauthSlaHours: 24, country: "IN" },
  // Private insurers (also operate own claims functions)
  { id: "star",       name: "Star Health",            shortCode: "STAR", kind: "insurer", preauthSlaHours: 6, country: "IN" },
  { id: "hdfcergo",   name: "HDFC ERGO",              shortCode: "HE",  kind: "insurer", preauthSlaHours: 6, country: "IN" },
  { id: "bajaj",      name: "Bajaj Allianz",          shortCode: "BAJ", kind: "insurer", preauthSlaHours: 8, country: "IN" },
  { id: "icici-lomb", name: "ICICI Lombard",          shortCode: "ICL", kind: "insurer", preauthSlaHours: 8, country: "IN" },
  { id: "tata-aig",   name: "TATA AIG",               shortCode: "TAIG", kind: "insurer", preauthSlaHours: 8, country: "IN" },
  { id: "reliance",   name: "Reliance General",       shortCode: "RGI", kind: "insurer", preauthSlaHours: 12, country: "IN" },
  { id: "manipal",    name: "ManipalCigna",           shortCode: "MC",  kind: "insurer", preauthSlaHours: 6, country: "IN" },
  { id: "niva",       name: "Niva Bupa",              shortCode: "NB",  kind: "insurer", preauthSlaHours: 6, country: "IN" },
  { id: "aditya",     name: "Aditya Birla Health",    shortCode: "ABH", kind: "insurer", preauthSlaHours: 6, country: "IN" },
  { id: "care",       name: "Care Health",            shortCode: "CH",  kind: "insurer", preauthSlaHours: 8, country: "IN" },
  // TPAs (handle multiple insurers' books)
  { id: "mediassist", name: "MediAssist TPA",         shortCode: "MA",  kind: "tpa", preauthSlaHours: 8, country: "IN" },
  { id: "paramount",  name: "Paramount TPA",          shortCode: "PT",  kind: "tpa", preauthSlaHours: 12, country: "IN" },
  { id: "vidal",      name: "Vidal Health TPA",       shortCode: "VH",  kind: "tpa", preauthSlaHours: 12, country: "IN" },
  { id: "fhpl",       name: "Family Health Plan TPA", shortCode: "FHPL", kind: "tpa", preauthSlaHours: 12, country: "IN" },
  { id: "heritage",   name: "Heritage Health TPA",    shortCode: "HH",  kind: "tpa", preauthSlaHours: 12, country: "IN" },
  { id: "medivisor",  name: "Medivisor TPA",          shortCode: "MV",  kind: "tpa", preauthSlaHours: 12, country: "IN" },
  { id: "raksha",     name: "Raksha TPA",             shortCode: "RT",  kind: "tpa", preauthSlaHours: 12, country: "IN" },
  { id: "good-health",name: "Good Health TPA",        shortCode: "GH",  kind: "tpa", preauthSlaHours: 12, country: "IN" },
  // Govt schemes
  { id: "abpmjay",    name: "Ayushman Bharat (PM-JAY)", shortCode: "AB", kind: "insurer", preauthSlaHours: 24, country: "IN", notes: "Govt scheme; empanelment via NHA portal." },
  { id: "cghs",       name: "CGHS (Central Govt Health Scheme)", shortCode: "CGHS", kind: "insurer", preauthSlaHours: 48, country: "IN" },

  // ── United States ─────────────────────────────────────────────
  // Top private commercial payers + Medicare/Medicaid programs.
  { id: "us-uhc",          name: "UnitedHealthcare",        shortCode: "UHC", kind: "insurer", preauthSlaHours: 24, country: "US" },
  { id: "us-anthem",       name: "Anthem Blue Cross Blue Shield", shortCode: "ABCBS", kind: "insurer", preauthSlaHours: 24, country: "US" },
  { id: "us-aetna",        name: "Aetna (CVS Health)",      shortCode: "AET", kind: "insurer", preauthSlaHours: 24, country: "US" },
  { id: "us-cigna",        name: "Cigna",                   shortCode: "CIG", kind: "insurer", preauthSlaHours: 24, country: "US" },
  { id: "us-humana",       name: "Humana",                  shortCode: "HUM", kind: "insurer", preauthSlaHours: 24, country: "US" },
  { id: "us-kaiser",       name: "Kaiser Permanente",       shortCode: "KP",  kind: "insurer", preauthSlaHours: 24, country: "US" },
  { id: "us-bcbs",         name: "Blue Cross Blue Shield Association", shortCode: "BCBS", kind: "insurer", preauthSlaHours: 24, country: "US" },
  { id: "us-molina",       name: "Molina Healthcare",       shortCode: "MOL", kind: "insurer", preauthSlaHours: 24, country: "US" },
  { id: "us-centene",      name: "Centene",                 shortCode: "CEN", kind: "insurer", preauthSlaHours: 24, country: "US" },
  { id: "us-medicare",     name: "Medicare",                shortCode: "MCR", kind: "insurer", preauthSlaHours: 48, country: "US", notes: "Federal program for 65+ and qualifying disabilities." },
  { id: "us-medicaid",     name: "Medicaid",                shortCode: "MCD", kind: "insurer", preauthSlaHours: 48, country: "US", notes: "State-administered program for low-income individuals." },
  { id: "us-tricare",      name: "TRICARE",                 shortCode: "TRI", kind: "insurer", preauthSlaHours: 48, country: "US", notes: "Military health benefits." },

  // ── United Kingdom ────────────────────────────────────────────
  { id: "uk-bupa",         name: "Bupa UK",                 shortCode: "BUPA", kind: "insurer", preauthSlaHours: 24, country: "GB" },
  { id: "uk-axa",          name: "AXA Health",              shortCode: "AXA",  kind: "insurer", preauthSlaHours: 24, country: "GB" },
  { id: "uk-vitality",     name: "Vitality Health",         shortCode: "VIT",  kind: "insurer", preauthSlaHours: 24, country: "GB" },
  { id: "uk-aviva",        name: "Aviva Health",            shortCode: "AVI",  kind: "insurer", preauthSlaHours: 24, country: "GB" },
  { id: "uk-wpa",          name: "WPA Healthcare",          shortCode: "WPA",  kind: "insurer", preauthSlaHours: 24, country: "GB" },
  { id: "uk-nhs",          name: "NHS (National Health Service)", shortCode: "NHS", kind: "insurer", preauthSlaHours: 48, country: "GB", notes: "Public — free at point of use for residents." },

  // ── Canada ────────────────────────────────────────────────────
  { id: "ca-sunlife",      name: "Sun Life Financial",      shortCode: "SUN", kind: "insurer", preauthSlaHours: 24, country: "CA" },
  { id: "ca-manulife",     name: "Manulife",                shortCode: "MAN", kind: "insurer", preauthSlaHours: 24, country: "CA" },
  { id: "ca-canadalife",   name: "Canada Life",             shortCode: "CL",  kind: "insurer", preauthSlaHours: 24, country: "CA" },
  { id: "ca-bluecross",    name: "Blue Cross Canada",       shortCode: "BCC", kind: "insurer", preauthSlaHours: 24, country: "CA" },
  { id: "ca-greenshield",  name: "Green Shield Canada",     shortCode: "GSC", kind: "insurer", preauthSlaHours: 24, country: "CA" },
  { id: "ca-ohip",         name: "OHIP (Ontario)",          shortCode: "OHIP", kind: "insurer", preauthSlaHours: 48, country: "CA", notes: "Provincial public coverage." },

  // ── Australia ─────────────────────────────────────────────────
  { id: "au-medibank",     name: "Medibank Private",        shortCode: "MED", kind: "insurer", preauthSlaHours: 24, country: "AU" },
  { id: "au-bupa",         name: "Bupa Australia",          shortCode: "BUPA", kind: "insurer", preauthSlaHours: 24, country: "AU" },
  { id: "au-nib",          name: "nib Health",              shortCode: "NIB", kind: "insurer", preauthSlaHours: 24, country: "AU" },
  { id: "au-hcf",          name: "HCF",                     shortCode: "HCF", kind: "insurer", preauthSlaHours: 24, country: "AU" },
  { id: "au-ahm",          name: "ahm Health Insurance",    shortCode: "AHM", kind: "insurer", preauthSlaHours: 24, country: "AU" },
  { id: "au-medicare",     name: "Medicare Australia",      shortCode: "MCA", kind: "insurer", preauthSlaHours: 48, country: "AU", notes: "Federal universal coverage." },

  // ── UAE ───────────────────────────────────────────────────────
  { id: "ae-daman",        name: "Daman National Health",   shortCode: "DAMAN", kind: "insurer", preauthSlaHours: 24, country: "AE" },
  { id: "ae-adnic",        name: "Abu Dhabi National Insurance (ADNIC)", shortCode: "ADNIC", kind: "insurer", preauthSlaHours: 24, country: "AE" },
  { id: "ae-orient",       name: "Orient Insurance",        shortCode: "OI",   kind: "insurer", preauthSlaHours: 24, country: "AE" },
  { id: "ae-axa-gulf",     name: "AXA Gulf",                shortCode: "AXAG", kind: "insurer", preauthSlaHours: 24, country: "AE" },
  { id: "ae-oman",         name: "Oman Insurance",          shortCode: "OMAN", kind: "insurer", preauthSlaHours: 24, country: "AE" },
  { id: "ae-thiqa",        name: "Thiqa (Abu Dhabi)",       shortCode: "THIQ", kind: "insurer", preauthSlaHours: 48, country: "AE", notes: "Government-funded coverage for UAE nationals in Abu Dhabi." },

  // ── Singapore ─────────────────────────────────────────────────
  { id: "sg-medishield",   name: "MediShield Life",         shortCode: "MSL", kind: "insurer", preauthSlaHours: 48, country: "SG", notes: "National basic health insurance." },
  { id: "sg-great-eastern",name: "Great Eastern Life",      shortCode: "GE",  kind: "insurer", preauthSlaHours: 24, country: "SG" },
  { id: "sg-aia",          name: "AIA Singapore",           shortCode: "AIA", kind: "insurer", preauthSlaHours: 24, country: "SG" },
  { id: "sg-prudential",   name: "Prudential Singapore",    shortCode: "PRU", kind: "insurer", preauthSlaHours: 24, country: "SG" },
  { id: "sg-ntuc",         name: "NTUC Income",             shortCode: "NTUC", kind: "insurer", preauthSlaHours: 24, country: "SG" },

  // ── Germany ───────────────────────────────────────────────────
  { id: "de-tk",           name: "Techniker Krankenkasse",  shortCode: "TK",  kind: "insurer", preauthSlaHours: 48, country: "DE" },
  { id: "de-aok",          name: "AOK",                     shortCode: "AOK", kind: "insurer", preauthSlaHours: 48, country: "DE" },
  { id: "de-barmer",       name: "Barmer GEK",              shortCode: "BAR", kind: "insurer", preauthSlaHours: 48, country: "DE" },
  { id: "de-allianz",      name: "Allianz Health",          shortCode: "AL",  kind: "insurer", preauthSlaHours: 24, country: "DE" },

  // ── Saudi Arabia ──────────────────────────────────────────────
  { id: "sa-bupa",         name: "Bupa Arabia",             shortCode: "BUPA", kind: "insurer", preauthSlaHours: 24, country: "SA" },
  { id: "sa-tawuniya",     name: "Tawuniya",                shortCode: "TAW",  kind: "insurer", preauthSlaHours: 24, country: "SA" },
  { id: "sa-medgulf",      name: "MedGulf",                 shortCode: "MG",   kind: "insurer", preauthSlaHours: 24, country: "SA" },

  // ── New Zealand ───────────────────────────────────────────────
  { id: "nz-southerncross",name: "Southern Cross Health",   shortCode: "SCH", kind: "insurer", preauthSlaHours: 24, country: "NZ" },
  { id: "nz-nib",          name: "nib New Zealand",         shortCode: "NIB", kind: "insurer", preauthSlaHours: 24, country: "NZ" },
  { id: "nz-acc",          name: "ACC (Accident Compensation Corp)", shortCode: "ACC", kind: "insurer", preauthSlaHours: 48, country: "NZ", notes: "National no-fault accident coverage." },
];

/** Returns insurers/TPAs operating in the given country, falling
 *  back to ALL entries when no rows match (so a patient from an
 *  unsupported country still sees something useful — they can pick
 *  the closest international carrier or use the manual override on
 *  the policy form). */
export function listInsurersByCountry(country: string | null | undefined): TpaRegistryEntry[] {
  if (!country) return TPA_REGISTRY;
  const c = country.toUpperCase();
  const filtered = TPA_REGISTRY.filter((t) => t.country.toUpperCase() === c);
  return filtered.length > 0 ? filtered : TPA_REGISTRY;
}

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
