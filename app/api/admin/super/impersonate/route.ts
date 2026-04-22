// Super-admin-only org impersonation. Sets the active-org cookie to the
// target org and writes an audit entry in BOTH the target org (so tenants
// see "support accessed our data") and a global super-admin log.
//
// POST { orgId } → switch
// DELETE         → clear (back to super-admin global view)
// GET            → current impersonation state

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, setActiveOrgId, getActiveOrgId } from "@/lib/tenant";
import { getOrganizationById } from "@/lib/organizations-store";
import { createEntry } from "@/lib/hospital/audit-log-store";
import { log } from "@/lib/log";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ImpersonateSchema = z.object({ orgId: nonEmptyString });

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const orgId = await getActiveOrgId();
  const org = orgId ? getOrganizationById(orgId) : null;
  return NextResponse.json({
    impersonating: Boolean(org),
    org: org ? { id: org.id, name: org.name, slug: org.slug } : null,
  });
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = await parseJson(req, ImpersonateSchema);
  if (parsed instanceof NextResponse) return parsed;

  const org = getOrganizationById(parsed.orgId);
  if (!org) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await setActiveOrgId(org.id);

  // Visible audit trail inside the target tenant.
  createEntry(org.id, {
    actorId: ctx.userId || undefined,
    actorName: ctx.email || "super-admin",
    actorRole: "super_admin",
    action: "other",
    entityType: "organization",
    entityId: org.id,
    entityLabel: org.name,
    severity: "warning",
    module: "super_admin",
    reason: "super_admin_impersonation_started",
  });

  log.warn("super_admin.impersonation.start", { by: ctx.email, orgId: org.id, orgName: org.name });

  return NextResponse.json({ ok: true, org: { id: org.id, name: org.name, slug: org.slug } });
}

export async function DELETE() {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const orgId = await getActiveOrgId();
  if (orgId) {
    const org = getOrganizationById(orgId);
    if (org) {
      createEntry(org.id, {
        actorId: ctx.userId || undefined,
        actorName: ctx.email || "super-admin",
        actorRole: "super_admin",
        action: "other",
        entityType: "organization",
        entityId: org.id,
        entityLabel: org.name,
        severity: "info",
        module: "super_admin",
        reason: "super_admin_impersonation_ended",
      });
      log.info("super_admin.impersonation.end", { by: ctx.email, orgId: org.id });
    }
  }

  await setActiveOrgId(null);
  return NextResponse.json({ ok: true });
}
