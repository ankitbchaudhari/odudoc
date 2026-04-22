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
  modules: {
    patient: boolean;
    opd: boolean;
    ipd: boolean;
    lab: boolean;
    pharmacy: boolean;
    billing: boolean;
    surgery: boolean;
    inventory: boolean;
    radiology: boolean;
    telemedicine: boolean;
    aiVoice: boolean;
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
};

// Plan → modules the plan is entitled to. Anything not in this set is
// forcibly off when an org is on that plan, regardless of what a super-
// admin ticks in the UI. Source of truth for "what does $X/mo buy you".
// Trial matches starter so demos feel real; enterprise gets everything.
type ModuleKey = keyof Organization["modules"];
const ALL_MODULES: readonly ModuleKey[] = [
  "patient", "opd", "ipd", "lab", "pharmacy", "billing",
  "surgery", "inventory", "radiology", "telemedicine", "aiVoice",
];

export const PLAN_MODULE_ENTITLEMENTS: Record<OrgPlan, readonly ModuleKey[]> = {
  trial:      ["patient", "opd", "telemedicine"],
  starter:    ["patient", "opd", "telemedicine"],
  clinic:     ["patient", "opd", "lab", "pharmacy", "billing", "telemedicine"],
  hospital:   ["patient", "opd", "ipd", "lab", "pharmacy", "billing", "surgery", "inventory", "radiology", "telemedicine"],
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
const { hydrate, flush } = bindPersistentArray<Organization>(
  "organizations",
  orgs,
  () => []
);
await hydrate();

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
