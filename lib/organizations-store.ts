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
    lab: boolean;                // Laboratory orders + results
    pharmacy: boolean;           // Dispensing + inventory link
    billing: boolean;            // Invoicing + payment capture
    surgery: boolean;            // Surgery / OT module (basic)
    inventory: boolean;          // SKU registry across stocks
    radiology: boolean;          // Imaging orders + DICOM viewer
    telemedicine: boolean;       // Online consultations
    aiVoice: boolean;            // AI voice scribe / dictation
    // ─── Hospital sub-departments (corporate) ───────────────────────
    bedManagement: boolean;      // Wards, beds, occupancy, transfers
    otScheduling: boolean;       // OT calendar + room allocation
    bloodBank: boolean;          // Donor registry, cross-match, units
    ambulance: boolean;          // Ambulance dispatch + GPS tracking
    maternity: boolean;          // Antenatal / delivery / postnatal
    nicu: boolean;               // Neonatal ICU charts + ventilator logs
    dialysis: boolean;           // Dialysis sessions + machine logs
    physiotherapy: boolean;      // PT sessions + treatment plans
    diet: boolean;               // Patient diet plans + kitchen orders
    cssd: boolean;               // Central Sterile Supply Department
    // ─── Back-office / Corporate ────────────────────────────────────
    hrPayroll: boolean;          // Employee records + attendance + payroll
    procurement: boolean;        // Vendor management + purchase orders
    insurance: boolean;          // TPA / cashless / claim management
    assetManagement: boolean;    // Capital asset registry (separate from inventory)
    multiBranch: boolean;        // Multi-location / branch consolidation
    analytics: boolean;          // Executive dashboards + custom reports
    audit: boolean;              // Compliance audit logs + e-signature
    // ─── Patient engagement ─────────────────────────────────────────
    patientPortal: boolean;      // Patient self-service portal
    whatsappEngagement: boolean; // WhatsApp + SMS broadcast / reminders
    // ─── Platform / White-label ─────────────────────────────────────
    apiAccess: boolean;          // REST + webhook API for integrations
    whiteLabel: boolean;         // Custom branding, domain, app icons
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
  lab: false,
  pharmacy: false,
  billing: false,
  surgery: false,
  inventory: false,
  radiology: false,
  telemedicine: true,
  aiVoice: false,
  // Hospital sub-departments
  bedManagement: false,
  otScheduling: false,
  bloodBank: false,
  ambulance: false,
  maternity: false,
  nicu: false,
  dialysis: false,
  physiotherapy: false,
  diet: false,
  cssd: false,
  // Back-office
  hrPayroll: false,
  procurement: false,
  insurance: false,
  assetManagement: false,
  multiBranch: false,
  analytics: false,
  audit: false,
  // Patient engagement
  patientPortal: false,
  whatsappEngagement: false,
  // Platform
  apiAccess: false,
  whiteLabel: false,
};

// Plan → modules the plan is entitled to. Anything not in this set is
// forcibly off when an org is on that plan, regardless of what a super-
// admin ticks in the UI. Source of truth for "what does $X/mo buy you".
// Trial matches starter so demos feel real; enterprise gets everything.
type ModuleKey = keyof Organization["modules"];
const ALL_MODULES: readonly ModuleKey[] = [
  // Core clinical
  "patient", "opd", "ipd", "lab", "pharmacy", "billing",
  "surgery", "inventory", "radiology", "telemedicine", "aiVoice",
  // Hospital sub-departments
  "bedManagement", "otScheduling", "bloodBank", "ambulance",
  "maternity", "nicu", "dialysis", "physiotherapy", "diet", "cssd",
  // Back-office
  "hrPayroll", "procurement", "insurance", "assetManagement",
  "multiBranch", "analytics", "audit",
  // Patient engagement
  "patientPortal", "whatsappEngagement",
  // Platform
  "apiAccess", "whiteLabel",
];

export const PLAN_MODULE_ENTITLEMENTS: Record<OrgPlan, readonly ModuleKey[]> = {
  trial:      ["patient", "opd", "telemedicine"],
  starter:    ["patient", "opd", "telemedicine", "whatsappEngagement"],
  // Single-clinic tier — billing + lab + pharmacy + patient portal,
  // but no inpatient sub-departments.
  clinic: [
    "patient", "opd", "lab", "pharmacy", "billing", "telemedicine",
    "patientPortal", "diet", "analytics", "whatsappEngagement",
  ],
  // Multi-bed hospital tier — inpatient + most sub-departments + the
  // back-office set. Misses platform tier (API / white-label / multi-branch).
  hospital: [
    "patient", "opd", "ipd", "lab", "pharmacy", "billing", "surgery",
    "inventory", "radiology", "telemedicine",
    "bedManagement", "otScheduling", "bloodBank", "ambulance",
    "maternity", "nicu", "dialysis", "physiotherapy", "diet", "cssd",
    "hrPayroll", "procurement", "insurance", "assetManagement",
    "analytics", "audit",
    "patientPortal", "whatsappEngagement",
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
  flush();
  return true;
}
