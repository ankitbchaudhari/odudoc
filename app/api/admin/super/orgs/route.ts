// Super-admin overview of every organization. Returns orgs with membership
// counts, subscription state, and last audit activity.

import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { listOrganizations } from "@/lib/organizations-store";
import { getMembershipsForOrg } from "@/lib/memberships-store";
import { getSubscriptionForOrg } from "@/lib/hospital/subscription-store";
import { listEntries } from "@/lib/hospital/audit-log-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const orgs = listOrganizations();
  const rows = orgs.map((o) => {
    let memberships: ReturnType<typeof getMembershipsForOrg> = [];
    try { memberships = getMembershipsForOrg(o.id); } catch { memberships = []; }
    const sub = getSubscriptionForOrg(o.id);
    const recentAudit = listEntries({ organizationId: o.id }).slice(0, 1)[0] || null;
    return {
      id: o.id,
      slug: o.slug,
      name: o.name,
      country: o.country,
      plan: o.plan,
      status: o.status,
      trialEndsAt: o.trialEndsAt,
      createdAt: o.createdAt,
      modules: o.modules,
      memberCount: memberships.length,
      // Demo orgs are identified by the sentinel contact email written by
      // seed-demo. Exposed so the super-admin UI can show Delete only here.
      isDemo: o.contactEmail.endsWith("@odudoc.example"),
      subscription: sub ? {
        planTier: sub.planTier,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
        trialEnd: sub.trialEnd,
        lastInvoicePaidAt: sub.lastInvoicePaidAt,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      } : null,
      lastActivity: recentAudit?.occurredAt || null,
    };
  }).sort((a, b) => (b.lastActivity || b.createdAt).localeCompare(a.lastActivity || a.createdAt));

  return NextResponse.json({
    orgs: rows,
    totals: {
      orgs: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      trial: rows.filter((r) => r.plan === "trial").length,
      paying: rows.filter((r) => r.subscription?.status === "active").length,
      pastDue: rows.filter((r) => r.subscription?.status === "past_due").length,
      suspended: rows.filter((r) => r.status === "suspended").length,
    },
  });
}
