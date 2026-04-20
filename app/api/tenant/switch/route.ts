import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setActiveOrgId, isSuperAdmin } from "@/lib/tenant";
import { getOrganizationById } from "@/lib/organizations-store";
import { getMembership } from "@/lib/memberships-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Switch the active organization for the current user.
// Super-admins can switch to any org. Normal users can only switch to
// orgs they have a membership in.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const orgId = body.orgId ? String(body.orgId) : null;

  if (!orgId) {
    await setActiveOrgId(null);
    return NextResponse.json({ ok: true, activeOrgId: null });
  }

  const org = getOrganizationById(orgId);
  if (!org) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!isSuperAdmin(session.user.email)) {
    const m = getMembership(session.user.id, orgId);
    if (!m) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await setActiveOrgId(orgId);
  return NextResponse.json({ ok: true, activeOrgId: orgId, organization: org });
}
