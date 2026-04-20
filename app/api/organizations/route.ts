import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/tenant";
import {
  listOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  type OrgPlan,
  type OrgStatus,
} from "@/lib/organizations-store";
import { deleteMembershipsForOrg } from "@/lib/memberships-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard(): Promise<NextResponse | null> {
  const s = await getServerSession(authOptions);
  if (!s?.user?.email || !isSuperAdmin(s.user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const g = await guard();
  if (g) return g;
  return NextResponse.json({ organizations: listOrganizations() });
}

export async function POST(req: NextRequest) {
  const g = await guard();
  if (g) return g;
  const body = await req.json();
  if (!body.name || !body.contactEmail) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const org = createOrganization({
    name: String(body.name),
    contactEmail: String(body.contactEmail),
    contactPhone: body.contactPhone ? String(body.contactPhone) : undefined,
    country: body.country ? String(body.country) : undefined,
    plan: body.plan as OrgPlan | undefined,
    trialDays: body.trialDays ? Number(body.trialDays) : undefined,
    modules: body.modules,
  });
  return NextResponse.json({ organization: org });
}

export async function PATCH(req: NextRequest) {
  const g = await guard();
  if (g) return g;
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const updated = updateOrganization(String(body.id), {
    name: body.name,
    contactEmail: body.contactEmail,
    contactPhone: body.contactPhone,
    country: body.country,
    plan: body.plan as OrgPlan | undefined,
    status: body.status as OrgStatus | undefined,
    modules: body.modules,
    trialEndsAt: body.trialEndsAt,
  });
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ organization: updated });
}

export async function DELETE(req: NextRequest) {
  const g = await guard();
  if (g) return g;
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const ok = deleteOrganization(String(body.id));
  if (ok) deleteMembershipsForOrg(String(body.id));
  return NextResponse.json({ ok });
}
