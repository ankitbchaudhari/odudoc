// Accept / decline / revoke a partner connection.
//
// PATCH body { action: "accept" | "decline" | "revoke" }
//
// Only the org on the *other* side of the request may accept/decline
// the initial handshake. Either side may revoke an established link.

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  acceptConnection,
  declineConnection,
  revokeConnection,
  findConnection,
} from "@/lib/inter-org-network-store";
import { getOrganizationById } from "@/lib/organizations-store";
import { recordAudit, type AuditAction } from "@/lib/audit-log-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctxParam: RouteCtx) {
  try {
    const { ctx, orgId } = await requireOrg();
    if (!ctx.isSuperAdmin && ctx.membership && !["owner", "admin"].includes(ctx.membership.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { id } = await ctxParam.params;
    const body = await req.json();
    const action = String(body.action || "");

    let updated;
    let auditAction: AuditAction;
    let summary = "";
    if (action === "accept") {
      updated = acceptConnection(id, orgId);
      auditAction = "network.connect_accept";
      summary = "Accepted partner connection";
    } else if (action === "decline") {
      updated = declineConnection(id, orgId);
      auditAction = "network.connect_decline";
      summary = "Declined partner connection";
    } else if (action === "revoke") {
      updated = revokeConnection(id, orgId);
      auditAction = "network.disconnect";
      summary = "Revoked partner connection";
    } else {
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
    }

    if (!updated) {
      // Distinguish "not found" from "wrong actor". findConnection by
      // the partner pair would help, but the id alone is enough for
      // a generic 404/403 response.
      const conn = findConnection(orgId, orgId); // sentinel — will be null
      void conn;
      return NextResponse.json({ error: "not_found_or_forbidden" }, { status: 404 });
    }

    const partnerId = updated.orgAId === orgId ? updated.orgBId : updated.orgAId;
    const session = await getServerSession(authOptions);
    recordAudit({
      actorEmail: session?.user?.email || "system",
      action: auditAction,
      orgId,
      orgName: getOrganizationById(orgId)?.name,
      summary: `${summary} with "${getOrganizationById(partnerId)?.name || partnerId}"`,
      meta: { connectionId: updated.id, partnerId },
    });

    try {
      await awaitAllFlushesStrict();
    } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ connection: updated });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
