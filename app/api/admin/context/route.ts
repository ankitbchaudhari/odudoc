// Returns the visibility-relevant slice of the tenant context for the
// admin sidebar. Used by app/admin/layout.tsx to decide which sections
// and modules the current admin sees.
//
// Super-admin → { isSuperAdmin: true, modules: null }   (sees everything)
// Tenant admin → { isSuperAdmin: false, modules: {...} } (filtered by org flags)
// Unauthenticated / no org → forbidden

import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  return NextResponse.json({
    isSuperAdmin: ctx.isSuperAdmin,
    role: ctx.role,
    organizationId: ctx.organization?.id ?? null,
    organizationName: ctx.organization?.name ?? null,
    // For super-admins with no active org selected, return null so the
    // sidebar falls back to "show everything". For tenant admins we
    // always return the org's module flags.
    modules: ctx.organization?.modules ?? null,
  });
}
