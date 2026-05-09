// Org-to-org partner connections.
//
// GET  → list every connection touching the active org, with the
//        partner org metadata expanded so the UI can render names.
// POST → request a new connection to another org by id (or email/slug
//        lookup later).

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  listConnectionsForOrg,
  requestConnection,
  reloadConnections,
} from "@/lib/inter-org-network-store";
import { getOrganizationById, listOrganizations } from "@/lib/organizations-store";
import { recordAudit } from "@/lib/audit-log-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    await reloadConnections();
    const conns = listConnectionsForOrg(orgId);
    const expanded = conns.map((c) => {
      const partnerId = c.orgAId === orgId ? c.orgBId : c.orgAId;
      const partner = getOrganizationById(partnerId);
      return {
        ...c,
        partner: partner
          ? {
              id: partner.id,
              name: partner.name,
              slug: partner.slug,
              country: partner.country,
              plan: partner.plan,
            }
          : { id: partnerId, name: "(unknown)", slug: "", country: "", plan: "trial" as const },
        isInbound: c.requestedByOrgId !== orgId,
      };
    });

    // Optional: directory of orgs the active org could potentially
    // connect to. We surface only orgs that aren't already connected
    // and aren't the active org itself, so the "Send connection
    // request" picker doesn't need a separate roundtrip.
    const partnerIds = new Set(expanded.map((e) => e.partner.id));
    partnerIds.add(orgId);
    const directory = listOrganizations()
      .filter((o) => !partnerIds.has(o.id) && o.status === "active")
      .map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        country: o.country,
        plan: o.plan,
      }));

    // Suppress unused param warning — req kept for parity with sibling routes.
    void req;
    return NextResponse.json({ connections: expanded, directory });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireOrg();
    // Only owners + admins may request partnerships — clinical staff
    // can create transfers but shouldn't be opening trust relationships.
    if (!ctx.isSuperAdmin && ctx.membership && !["owner", "admin"].includes(ctx.membership.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const toOrgId = String(body.toOrgId || "").trim();
    if (!toOrgId) return NextResponse.json({ error: "missing_to_org" }, { status: 400 });
    const target = getOrganizationById(toOrgId);
    if (!target) return NextResponse.json({ error: "org_not_found" }, { status: 404 });
    if (target.status !== "active") {
      return NextResponse.json({ error: "target_org_inactive" }, { status: 400 });
    }
    const note = body.note ? String(body.note).slice(0, 500) : undefined;
    const conn = requestConnection({
      fromOrgId: orgId,
      toOrgId,
      note,
    });

    const session = await getServerSession(authOptions);
    recordAudit({
      actorEmail: session?.user?.email || "system",
      action: "network.connect_request",
      orgId,
      orgName: getOrganizationById(orgId)?.name,
      summary: `Requested partner connection with "${target.name}"`,
      meta: { connectionId: conn.id, partnerId: target.id, note },
    });

    try {
      await awaitAllFlushesStrict();
    } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ connection: conn });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
