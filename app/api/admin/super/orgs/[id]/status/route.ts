// Super-admin: suspend or resume an org. Suspension doesn't delete data
// — it flips the org.status so `requireOrg()` returns normally but
// mutating routes can observe the flag. Resume restores to active.
//
// We also write to the org's own audit log so their users have a record
// of when support touched the account.

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getOrganizationById, updateOrganization } from "@/lib/organizations-store";
import { createEntry } from "@/lib/hospital/audit-log-store";
import { log } from "@/lib/log";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const StatusSchema = z.object({
  status: z.enum(["active", "suspended", "cancelled"]),
  reason: z.string().max(500).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = await parseJson(req, StatusSchema);
  if (parsed instanceof NextResponse) return parsed;

  const org = getOrganizationById(params.id);
  if (!org) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const previous = org.status;
  const updated = updateOrganization(org.id, { status: parsed.status });

  createEntry(org.id, {
    actorId: ctx.userId || undefined,
    actorName: ctx.email || "super-admin",
    actorRole: "super_admin",
    action: parsed.status === "suspended" || parsed.status === "cancelled" ? "void" : "other",
    entityType: "organization",
    entityId: org.id,
    entityLabel: org.name,
    severity: parsed.status === "active" ? "info" : "critical",
    module: "super_admin",
    reason: parsed.reason || `org_status_changed_${previous}_to_${parsed.status}`,
    before: previous,
    after: parsed.status,
  });

  log.warn("super_admin.org_status_change", { orgId: org.id, previous, next: parsed.status, by: ctx.email });

  return NextResponse.json({ ok: true, org: updated });
}
