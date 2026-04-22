import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantContext, isSuperAdmin, listOrgsForCurrentUser } from "@/lib/tenant";
import { listOrganizations } from "@/lib/organizations-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns the current tenant context + the list of orgs the user can switch
// to. Used by the admin top-bar org switcher.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ctx = await getTenantContext();
  const superAdmin = isSuperAdmin(session.user.email);
  const orgs = superAdmin ? listOrganizations() : await listOrgsForCurrentUser();
  return NextResponse.json({
    activeOrg: ctx.organization,
    role: ctx.role,
    isSuperAdmin: superAdmin,
    orgs: orgs.map((o) => ({ id: o.id, name: o.name, slug: o.slug, plan: o.plan })),
  });
}
