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
  const trialEndsAt =
    input.plan === "trial" || !input.plan
      ? new Date(Date.now() + (input.trialDays ?? 14) * 24 * 60 * 60 * 1000).toISOString()
      : undefined;
  const org: Organization = {
    id: `org-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    slug: genSlug(input.name),
    name: input.name.trim(),
    contactEmail: input.contactEmail.trim().toLowerCase(),
    contactPhone: input.contactPhone?.trim() || undefined,
    country: (input.country || "").trim(),
    plan: input.plan ?? "trial",
    status: "active",
    modules: { ...DEFAULT_MODULES, ...(input.modules || {}) },
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
  if (patch.trialEndsAt !== undefined) o.trialEndsAt = patch.trialEndsAt;
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
