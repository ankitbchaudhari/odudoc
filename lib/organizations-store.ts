// Organizations = tenants. Foundation for multi-tenant B2B hospital-ERP mode.
//
// An organization owns its own users, doctors, patients, lab-tests, inventory,
// etc. This store is the anchor every other store will eventually scope by.
// Nothing is wired to it yet beyond the admin CRUD — this is deliberately
// scaffolding so the schema is committed before the big cross-cutting
// migration.

import { bindPersistentArray } from "./persistent-array";

export type OrgPlan = "trial" | "starter" | "clinic" | "hospital" | "enterprise";
export type OrgStatus = "active" | "suspended" | "cancelled";

export interface Organization {
  id: string;
  slug: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  country: string;
  plan: OrgPlan;
  status: OrgStatus;
  // Feature flags — let us sell modules à la carte without forking code paths.
  // Grouped here by use-case so the UI can render section headers; module
  // keys themselves stay flat for easy gating: orgCtx.modules.bedManagement.
  modules: {
    // ─── Core clinical ──────────────────────────────────────────────
    patient: boolean;            // Patient management (registration, demographics)
    opd: boolean;                // Outpatient department
    ipd: boolean;                // Inpatient department
    appointments: boolean;       // Appointment booking + calendar
    encounters: boolean;         // Visit / encounter notes
    hospitalRx: boolean;         // Hospital prescription pad (Rx)
    medicalRecords: boolean;     // EHR document store + timeline
    referrals: boolean;          // Inbound / outbound referrals
    consentForms: boolean;       // E-signed consent forms
    dischargeSummaries: boolean; // Discharge summary builder
    allergiesProblems: boolean;  // Allergy + problem list
    immunizations: boolean;      // Vaccination schedule + register
    vitalsEws: boolean;          // Vitals capture + early-warning scores
    lab: boolean;                // Laboratory orders + results
    pathology: boolean;          // Pathology / histopathology
    pharmacy: boolean;           // Dispensing + inventory link (legacy bundled)
    pharmacyDispense: boolean;   // Pharmacy dispense counter
    pharmacyInventory: boolean;  // Pharmacy stock + expiry tracking
    billing: boolean;            // Invoicing + payment capture (legacy)
    invoices: boolean;           // Itemised invoice builder
    surgery: boolean;            // Surgery / OT module (basic)
    inventory: boolean;          // SKU registry across stocks
    radiology: boolean;          // Imaging orders + DICOM viewer
    telemedicine: boolean;       // Online consultations
    aiVoice: boolean;            // AI voice scribe / dictation
    // ─── Inpatient & surgical ──────────────────────────────────────
    bedManagement: boolean;      // Wards, beds, occupancy, transfers
    otScheduling: boolean;       // OT calendar + room allocation
    preAnesthesia: boolean;      // Pre-anesthesia checklist + records
    icu: boolean;                // ICU charts + critical care
    laborDelivery: boolean;      // L&D partograph + delivery records
    woundCare: boolean;          // Wound care charts
    painManagement: boolean;     // Pain scores + analgesia plans
    oncology: boolean;           // Chemo protocols + cycle tracking
    cardiology: boolean;         // Cath-lab + ECG + echo workflows
    endoscopy: boolean;          // Endoscopy scheduling + reports
    bloodBank: boolean;          // Donor registry, cross-match, units
    ambulance: boolean;          // Ambulance dispatch + GPS tracking
    maternity: boolean;          // Antenatal / postnatal
    nicu: boolean;               // Neonatal ICU charts + ventilator logs
    dialysis: boolean;           // Dialysis sessions + machine logs
    physiotherapy: boolean;      // PT sessions + treatment plans
    diet: boolean;               // Patient diet plans + kitchen orders
    cssd: boolean;               // Central Sterile Supply Department
    // ─── Front-office & engagement ─────────────────────────────────
    opdQueue: boolean;           // Live OPD token queue + display board
    patientFeedback: boolean;    // CSAT / NPS surveys
    visitors: boolean;           // Visitor pass + attendant tracking
    // ─── Workforce ──────────────────────────────────────────────────
    hrPayroll: boolean;          // Employee records + attendance + payroll
    medicalStaff: boolean;       // Medical staff registry + privileges
    shiftRoster: boolean;        // Shift roster planning
    staffScheduling: boolean;    // Day-of staff scheduling
    dutyHandover: boolean;       // Duty handover notes
    // ─── Facilities & compliance ───────────────────────────────────
    procurement: boolean;        // Vendor management + purchase orders
    insurance: boolean;          // TPA / cashless / claim management
    assetManagement: boolean;    // Capital asset registry
    biomedical: boolean;         // Biomedical equipment tracking
    biomedicalWaste: boolean;    // Biomedical waste manifest
    housekeeping: boolean;       // Housekeeping ticket queue
    linenLaundry: boolean;       // Linen + laundry tracking
    infectionControl: boolean;   // HAI surveillance
    incidentReports: boolean;    // Patient safety incident reports
    emergencyCodes: boolean;     // Code blue / red drill log
    mortuary: boolean;           // Mortuary register
    multiBranch: boolean;        // Multi-location / branch consolidation
    analytics: boolean;          // Executive dashboards + custom reports
    audit: boolean;              // Compliance audit logs + e-signature
    // ─── Patient engagement ─────────────────────────────────────────
    patientPortal: boolean;      // Patient self-service portal
    whatsappEngagement: boolean; // WhatsApp + SMS broadcast / reminders
    // ─── Platform / White-label ─────────────────────────────────────
    apiAccess: boolean;          // REST + webhook API for integrations
    whiteLabel: boolean;         // Custom branding, domain, app icons
    // ─── New capabilities (Q3 2026 batch) ──────────────────────────
    // Each flag gates one of the modules shipped in the recent
    // feature run. Defaults are conservative — most are off so a
    // small clinic doesn't get a confusing UI; the super-admin
    // toggles per org based on their plan.
    orgBranding: boolean;        // /admin/branding logo + theme + footer
    miniWebsite: boolean;        // /admin/website + public /c/<slug>
    surgeryVideo: boolean;       // Cloudflare Stream / Mux OT streaming
    biometricEmergency: boolean; // WebAuthn + face capture kiosk
    antiCounterfeit: boolean;    // Pharma drug + partner verify + kiosk
    pharmaCatalogue: boolean;    // /admin/pharma/drugs (pharma orgs)
    pharmaPartners: boolean;     // /admin/pharma/partners
    pharmaPromo: boolean;        // /admin/pharma/promo
    orgVacancies: boolean;       // /admin/vacancies + /jobs feed
    educationPartner: boolean;   // /admin/education + courses + placements
    voiceBookingBot: boolean;    // Twilio / Exotel / Vonage IVR booking
    whatsappBookingBot: boolean; // Twilio WhatsApp + SMS multi-turn bot
    aiCreditPool: boolean;       // Per-org AI metered credits + auto-topup
    aiPricingOverride: boolean;  // /admin/ai-pricing per-feature override
    mlTrainingQueue: boolean;    // Opt-in (input,output,gt) sample collection
    carePlans: boolean;          // /dashboard/care-plan chronic-condition tracker
    symptomLog: boolean;         // /dashboard/symptoms patient symptom tracker
    vaccinations: boolean;       // /dashboard/vaccinations UIP schedule
    documentVault: boolean;      // /dashboard/documents watermarked viewer
    auditLog: boolean;           // /dashboard/audit + watermark + IP log
    emergencyProfile: boolean;   // /dashboard/emergency-profile
    vitalAlerts: boolean;        // Critical reading → assigned doctors push
    consumablesBilling: boolean; // PPE / syringe / IV supplies auto-bill
    countryTax: boolean;         // 19-country tax engine on invoices
    watermarkedReports: boolean; // Diagonal watermark on document/invoice viewers
    referralCommissions: boolean; // /api/referral-commissions ledger
    healthTimeline: boolean;     // /dashboard/timeline aggregator
    adherence: boolean;          // /dashboard/adherence today's meds
    shareTokens: boolean;        // /share/surgery/[token] public links
    triagePalette: boolean;      // <TriagePill /> on ward + OPD boards
  };
  // Ops metadata.
  trialEndsAt?: string;
  // Timestamp of when we last emailed the demo admin reminding them that
  // their trial is ending. Used by /api/cron/cleanup-demos to deduplicate
  // the 3-day-before reminder so we only nag once per demo org.
  demoReminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_MODULES: Organization["modules"] = {
  // Core clinical
  patient: true,
  opd: true,
  ipd: false,
  appointments: true,
  encounters: true,
  hospitalRx: false,
  medicalRecords: true,
  referrals: false,
  consentForms: false,
  dischargeSummaries: false,
  allergiesProblems: false,
  immunizations: false,
  vitalsEws: false,
  lab: false,
  pathology: false,
  pharmacy: false,
  pharmacyDispense: false,
  pharmacyInventory: false,
  billing: false,
  invoices: false,
  surgery: false,
  inventory: false,
  radiology: false,
  telemedicine: true,
  aiVoice: false,
  // Inpatient & surgical
  bedManagement: false,
  otScheduling: false,
  preAnesthesia: false,
  icu: false,
  laborDelivery: false,
  woundCare: false,
  painManagement: false,
  oncology: false,
  cardiology: false,
  endoscopy: false,
  bloodBank: false,
  ambulance: false,
  maternity: false,
  nicu: false,
  dialysis: false,
  physiotherapy: false,
  diet: false,
  cssd: false,
  // Front-office & engagement
  opdQueue: false,
  patientFeedback: false,
  visitors: false,
  // Workforce
  hrPayroll: false,
  medicalStaff: false,
  shiftRoster: false,
  staffScheduling: false,
  dutyHandover: false,
  // Facilities & compliance
  procurement: false,
  insurance: false,
  assetManagement: false,
  biomedical: false,
  biomedicalWaste: false,
  housekeeping: false,
  linenLaundry: false,
  infectionControl: false,
  incidentReports: false,
  emergencyCodes: false,
  mortuary: false,
  multiBranch: false,
  analytics: false,
  audit: false,
  // Patient engagement
  patientPortal: false,
  whatsappEngagement: false,
  // Platform
  apiAccess: false,
  whiteLabel: false,
  // New capabilities — defaults conservative; super-admin enables per plan.
  orgBranding: false,
  miniWebsite: false,
  surgeryVideo: false,
  biometricEmergency: false,
  antiCounterfeit: false,
  pharmaCatalogue: false,
  pharmaPartners: false,
  pharmaPromo: false,
  orgVacancies: false,
  educationPartner: false,
  voiceBookingBot: false,
  whatsappBookingBot: false,
  aiCreditPool: false,
  aiPricingOverride: false,
  mlTrainingQueue: false,
  carePlans: false,
  symptomLog: false,
  vaccinations: false,
  documentVault: false,
  auditLog: false,
  emergencyProfile: false,
  vitalAlerts: false,
  consumablesBilling: false,
  countryTax: true,           // safe default — invoices need tax always
  watermarkedReports: true,   // privacy-positive default — always on
  referralCommissions: false,
  healthTimeline: false,
  adherence: false,
  shareTokens: false,
  triagePalette: true,        // visual-only, safe default on
};

// Plan → modules the plan is entitled to. Anything not in this set is
// forcibly off when an org is on that plan, regardless of what a super-
// admin ticks in the UI. Source of truth for "what does $X/mo buy you".
// Trial matches starter so demos feel real; enterprise gets everything.
type ModuleKey = keyof Organization["modules"];
const ALL_MODULES: readonly ModuleKey[] = [
  // Core clinical
  "patient", "opd", "ipd", "appointments", "encounters", "hospitalRx",
  "medicalRecords", "referrals", "consentForms", "dischargeSummaries",
  "allergiesProblems", "immunizations", "vitalsEws",
  "lab", "pathology",
  "pharmacy", "pharmacyDispense", "pharmacyInventory",
  "billing", "invoices",
  "surgery", "inventory", "radiology", "telemedicine", "aiVoice",
  // Inpatient & surgical
  "bedManagement", "otScheduling", "preAnesthesia", "icu",
  "laborDelivery", "woundCare", "painManagement",
  "oncology", "cardiology", "endoscopy",
  "bloodBank", "ambulance", "maternity", "nicu",
  "dialysis", "physiotherapy", "diet", "cssd",
  // Front-office & engagement
  "opdQueue", "patientFeedback", "visitors",
  // Workforce
  "hrPayroll", "medicalStaff", "shiftRoster", "staffScheduling", "dutyHandover",
  // Facilities & compliance
  "procurement", "insurance", "assetManagement",
  "biomedical", "biomedicalWaste", "housekeeping", "linenLaundry",
  "infectionControl", "incidentReports", "emergencyCodes", "mortuary",
  "multiBranch", "analytics", "audit",
  // Patient engagement
  "patientPortal", "whatsappEngagement",
  // Platform
  "apiAccess", "whiteLabel",
  // New capabilities (Q3 2026)
  "orgBranding", "miniWebsite", "surgeryVideo", "biometricEmergency",
  "antiCounterfeit", "pharmaCatalogue", "pharmaPartners", "pharmaPromo",
  "orgVacancies", "educationPartner", "voiceBookingBot", "whatsappBookingBot",
  "aiCreditPool", "aiPricingOverride", "mlTrainingQueue",
  "carePlans", "symptomLog", "vaccinations", "documentVault", "auditLog",
  "emergencyProfile", "vitalAlerts", "consumablesBilling", "countryTax",
  "watermarkedReports", "referralCommissions", "healthTimeline",
  "adherence", "shareTokens", "triagePalette",
];

export const PLAN_MODULE_ENTITLEMENTS: Record<OrgPlan, readonly ModuleKey[]> = {
  trial: [
    "patient", "opd", "appointments", "encounters", "medicalRecords",
    "telemedicine",
  ],
  starter: [
    "patient", "opd", "appointments", "encounters", "medicalRecords",
    "hospitalRx", "vitalsEws", "allergiesProblems",
    "telemedicine", "whatsappEngagement",
    // New caps — patient-side wellness tools are starter-tier:
    "carePlans", "symptomLog", "vaccinations", "adherence",
    "documentVault", "healthTimeline", "auditLog", "emergencyProfile",
    "countryTax", "watermarkedReports", "triagePalette",
  ],
  // Single-clinic tier — billing + lab + pharmacy + patient portal,
  // but no inpatient sub-departments.
  clinic: [
    "patient", "opd", "appointments", "encounters", "hospitalRx",
    "medicalRecords", "referrals", "consentForms", "allergiesProblems",
    "immunizations", "vitalsEws",
    "lab", "pharmacy", "pharmacyDispense", "pharmacyInventory",
    "billing", "invoices",
    "telemedicine", "opdQueue", "patientFeedback",
    "patientPortal", "diet", "analytics", "whatsappEngagement",
    // Clinic-tier additions: branding, mini-site, vacancies, voice + WA
    // booking bots, share links — single-clinic operators get the
    // public-presence + booking-channel set.
    "orgBranding", "miniWebsite", "orgVacancies",
    "voiceBookingBot", "whatsappBookingBot", "shareTokens",
    "carePlans", "symptomLog", "vaccinations", "adherence",
    "documentVault", "healthTimeline", "auditLog", "emergencyProfile",
    "countryTax", "watermarkedReports", "referralCommissions",
    "triagePalette", "vitalAlerts",
  ],
  // Multi-bed hospital tier — inpatient + most sub-departments + the
  // back-office set. Misses platform tier (API / white-label / multi-branch).
  hospital: [
    "patient", "opd", "ipd", "appointments", "encounters", "hospitalRx",
    "medicalRecords", "referrals", "consentForms", "dischargeSummaries",
    "allergiesProblems", "immunizations", "vitalsEws",
    "lab", "pathology",
    "pharmacy", "pharmacyDispense", "pharmacyInventory",
    "billing", "invoices",
    "surgery", "inventory", "radiology", "telemedicine",
    "bedManagement", "otScheduling", "preAnesthesia", "icu",
    "laborDelivery", "woundCare", "painManagement",
    "oncology", "cardiology", "endoscopy",
    "bloodBank", "ambulance", "maternity", "nicu",
    "dialysis", "physiotherapy", "diet", "cssd",
    "opdQueue", "patientFeedback", "visitors",
    "hrPayroll", "medicalStaff", "shiftRoster", "staffScheduling", "dutyHandover",
    "procurement", "insurance", "assetManagement",
    "biomedical", "biomedicalWaste", "housekeeping", "linenLaundry",
    "infectionControl", "incidentReports", "emergencyCodes", "mortuary",
    "analytics", "audit",
    "patientPortal", "whatsappEngagement",
    // Hospital-tier: clinic set + surgery video + biometric emergency
    // + consumables billing + AI credit pool. Pharma + education are
    // org-type-specific so they sit in enterprise.
    "orgBranding", "miniWebsite", "orgVacancies",
    "voiceBookingBot", "whatsappBookingBot", "shareTokens",
    "carePlans", "symptomLog", "vaccinations", "adherence",
    "documentVault", "healthTimeline", "auditLog", "emergencyProfile",
    "countryTax", "watermarkedReports", "referralCommissions",
    "triagePalette", "vitalAlerts",
    "surgeryVideo", "biometricEmergency", "consumablesBilling",
    "aiCreditPool",
  ],
  // Enterprise = everything: hospital tier + AI voice + platform tier.
  enterprise: ALL_MODULES,
};

export function allowedModulesForPlan(plan: OrgPlan): Set<ModuleKey> {
  return new Set(PLAN_MODULE_ENTITLEMENTS[plan]);
}

// Clamp a module flag-set to the plan's entitlements. Any key the plan
// doesn't allow is force-disabled. Used on both create and update so a
// super-admin can't accidentally sell enterprise features on a starter
// plan. Super-admin UIs surface a warning when clamping changes anything.
export function clampModulesToPlan(
  plan: OrgPlan,
  modules: Partial<Organization["modules"]>
): Organization["modules"] {
  const allowed = allowedModulesForPlan(plan);
  const merged = { ...DEFAULT_MODULES, ...modules };
  const clamped = { ...merged };
  for (const key of ALL_MODULES) {
    if (!allowed.has(key)) clamped[key] = false;
  }
  return clamped;
}

const orgs: Organization[] = [];
const {
  hydrate,
  reload: reloadOrgsInternal,
  flush,
  // Tombstone marks an id as deliberately deleted so mergingSave()
  // doesn't immediately re-pull it from Postgres on the next flush.
  // Without this, deleteOrganization() splices in-memory + flushes,
  // but mergingSave reads back from DB, sees the row "missing", and
  // re-adds it. The delete then never persists. Bug we already
  // fixed in emr-store for patients/visits/etc.
  tombstone,
} = bindPersistentArray<Organization>(
  "organizations",
  orgs,
  () => []
);
await hydrate();

/** Force a re-read from Postgres so this Lambda picks up writes
 *  from sibling Lambdas. Call before any read that needs to be
 *  consistent with recent mutations elsewhere (admin orgs list
 *  after a delete on a different Lambda, for example). */
export async function reloadOrganizations() {
  await reloadOrgsInternal();
}

function genSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "org";
  let slug = base;
  let i = 2;
  while (orgs.some((o) => o.slug === slug)) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export function listOrganizations(): Organization[] {
  return [...orgs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getOrganizationById(id: string): Organization | null {
  return orgs.find((o) => o.id === id) || null;
}

export function getOrganizationBySlug(slug: string): Organization | null {
  return orgs.find((o) => o.slug === slug) || null;
}

export interface OrgInput {
  name: string;
  contactEmail: string;
  contactPhone?: string;
  country?: string;
  plan?: OrgPlan;
  trialDays?: number;
  modules?: Partial<Organization["modules"]>;
}

export function createOrganization(input: OrgInput): Organization {
  const now = new Date().toISOString();
  const plan: OrgPlan = input.plan ?? "trial";
  const trialEndsAt =
    plan === "trial"
      ? new Date(Date.now() + (input.trialDays ?? 14) * 24 * 60 * 60 * 1000).toISOString()
      : undefined;
  const org: Organization = {
    id: `org-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    slug: genSlug(input.name),
    name: input.name.trim(),
    contactEmail: input.contactEmail.trim().toLowerCase(),
    contactPhone: input.contactPhone?.trim() || undefined,
    country: (input.country || "").trim(),
    plan,
    status: "active",
    // Clamp requested modules to the plan's entitlements — starter plans
    // cannot have aiVoice etc. even if the UI ticks the box.
    modules: clampModulesToPlan(plan, input.modules || {}),
    trialEndsAt,
    createdAt: now,
    updatedAt: now,
  };
  orgs.unshift(org);
  flush();
  return org;
}

export function updateOrganization(
  id: string,
  patch: Partial<Omit<Organization, "id" | "createdAt" | "updatedAt" | "slug">>
): Organization | null {
  const o = orgs.find((x) => x.id === id);
  if (!o) return null;
  if (patch.name !== undefined) o.name = patch.name.trim();
  if (patch.contactEmail !== undefined) o.contactEmail = patch.contactEmail.trim().toLowerCase();
  if (patch.contactPhone !== undefined) o.contactPhone = patch.contactPhone?.trim() || undefined;
  if (patch.country !== undefined) o.country = patch.country.trim();
  if (patch.plan !== undefined) o.plan = patch.plan;
  if (patch.status !== undefined) o.status = patch.status;
  if (patch.modules !== undefined) o.modules = { ...o.modules, ...patch.modules };
  // Re-clamp against the (possibly newly-changed) plan so a plan downgrade
  // or a module bump-that-exceeds-the-plan can't slip through. This runs
  // even when only one of plan/modules was touched.
  o.modules = clampModulesToPlan(o.plan, o.modules);
  if (patch.trialEndsAt !== undefined) o.trialEndsAt = patch.trialEndsAt;
  if (patch.demoReminderSentAt !== undefined) o.demoReminderSentAt = patch.demoReminderSentAt;
  o.updatedAt = new Date().toISOString();
  flush();
  return o;
}

export function deleteOrganization(id: string): boolean {
  const i = orgs.findIndex((o) => o.id === id);
  if (i < 0) return false;
  orgs.splice(i, 1);
  // Mark as deleted BEFORE flushing so mergingSave's "rows in DB but
  // not in memory → re-add" loop knows to skip it. Without this the
  // row ping-pongs back into existence.
  tombstone(id);
  flush();
  return true;
}
