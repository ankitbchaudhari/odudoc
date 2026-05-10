// Returns the visibility-relevant slice of the tenant context for the
// admin sidebar. Used by app/admin/layout.tsx to decide which sections
// and modules the current admin sees.
//
// Super-admin → { isSuperAdmin: true, modules: null }   (sees everything)
// Tenant admin → { isSuperAdmin: false, modules: {...} } (filtered by org flags)
// Unauthenticated / no org → forbidden

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // The sidebar-scoping logic needs the next-auth session role (hr,
  // support, pharmacist, staff, vendor) which isn't an OrgRole. Prefer
  // the session role so non-admin roles collapse the sidebar to their
  // curated nav, and fall back to the membership role for tenant admins.
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { role?: string; name?: string; email?: string } | undefined;
  const sessionRole = sessionUser?.role ?? null;
  const effectiveRole = sessionRole && sessionRole !== "admin" && sessionRole !== "patient" && sessionRole !== "doctor"
    ? sessionRole
    : ctx.role;

  // Surface the org's plan as a free-text "kind" so the header chrome
  // can render "<Hospital> · hospital admin" vs "Super admin". Plan
  // is the closest proxy we have to org-type; replace with an explicit
  // OrgKind enum if the data model adds one.
  const planLabel = ctx.organization?.plan
    ? ctx.organization.plan.charAt(0).toUpperCase() + ctx.organization.plan.slice(1)
    : undefined;

  return NextResponse.json({
    isSuperAdmin: ctx.isSuperAdmin,
    role: effectiveRole,
    organizationId: ctx.organization?.id ?? null,
    organizationName: ctx.organization?.name ?? null,
    // Active-org echo for the layout's auto-select hook. For super
    // admins this is null when they haven't picked an org; for tenant
    // admins it always resolves to their primary membership.
    activeOrgId: ctx.organization?.id ?? null,
    activeOrgName: ctx.organization?.name ?? null,
    activeOrgKind: planLabel,
    // The signed-in user's display name + email for the sidebar footer
    // chip. Org admins should see their own email, not "admin@odudoc.com".
    userName: sessionUser?.name ?? null,
    userEmail: sessionUser?.email ?? ctx.email ?? null,
    // For super-admins with no active org selected, return null so the
    // sidebar falls back to "show everything". For tenant admins we
    // always return the org's module flags.
    modules: ctx.organization?.modules ?? null,
  });
}
