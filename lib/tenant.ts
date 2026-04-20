// Tenant context helpers.
//
// The "active organization" is selected by the user (via an org switcher
// in the admin UI) and persisted as an httpOnly cookie "odudoc_org".
// Server code reads it via getActiveOrgId(); store queries should scope
// by that id where the data is org-owned.
//
// Not every store is tenant-scoped yet — the ones built before this
// system exist as global, single-tenant data. Migration to org-scoped
// happens per-module as we ship the hospital-ERP features.

import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { getOrganizationById, type Organization } from "./organizations-store";
import {
  getMembership,
  getMembershipsForUser,
  type Membership,
  type OrgRole,
} from "./memberships-store";

export const ORG_COOKIE = "odudoc_org";

// Super-admins are the SaaS operators. They can see every org and manage
// organizations themselves. Everyone else is scoped to their memberships.
// Hard-coded for now; in production this would be a User.role === "super_admin"
// flag (distinct from the per-org "admin" role).
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  // The bootstrapped global admin from the legacy single-tenant setup is
  // always a super-admin until we migrate the role system.
  const e = email.toLowerCase();
  if (e === "admin@odudoc.com") return true;
  return SUPER_ADMIN_EMAILS.includes(e);
}

export async function getActiveOrgId(): Promise<string | null> {
  const c = cookies().get(ORG_COOKIE);
  return c?.value || null;
}

export async function setActiveOrgId(orgId: string | null) {
  const store = cookies();
  if (orgId) {
    store.set(ORG_COOKIE, orgId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  } else {
    store.delete(ORG_COOKIE);
  }
}

export interface TenantContext {
  userId: string | null;
  email: string | null;
  organization: Organization | null;
  membership: Membership | null;
  role: OrgRole | "super_admin" | null;
  isSuperAdmin: boolean;
}

export async function getTenantContext(): Promise<TenantContext> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const userId = session?.user?.id ?? null;
  const superAdmin = isSuperAdmin(email);

  const activeOrgId = await getActiveOrgId();
  let organization: Organization | null = null;
  let membership: Membership | null = null;
  let role: OrgRole | "super_admin" | null = superAdmin ? "super_admin" : null;

  if (activeOrgId) {
    organization = getOrganizationById(activeOrgId);
    if (organization && userId && !superAdmin) {
      membership = getMembership(userId, organization.id);
      if (membership) role = membership.role;
    }
  }

  return {
    userId,
    email,
    organization,
    membership,
    role,
    isSuperAdmin: superAdmin,
  };
}

// For a given user, return every org they belong to — used by the org
// switcher dropdown.
export async function listOrgsForCurrentUser(): Promise<Organization[]> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return [];
  if (isSuperAdmin(session?.user?.email)) {
    // Super-admins see everything — return [] to signal "no filter" to the
    // caller, which should list all orgs separately.
    return [];
  }
  const mems = getMembershipsForUser(userId);
  const orgs: Organization[] = [];
  for (const m of mems) {
    const o = getOrganizationById(m.organizationId);
    if (o) orgs.push(o);
  }
  return orgs;
}

// Assertion helpers for API routes.
export async function requireOrg(): Promise<{
  ctx: TenantContext;
  orgId: string;
}> {
  const ctx = await getTenantContext();
  if (!ctx.organization) {
    throw new TenantError("no_active_org", 400);
  }
  return { ctx, orgId: ctx.organization.id };
}

export async function requireOrgRole(allowed: OrgRole[]): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (ctx.isSuperAdmin) return ctx;
  if (!ctx.membership || !allowed.includes(ctx.membership.role)) {
    throw new TenantError("forbidden", 403);
  }
  return ctx;
}

export class TenantError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}
