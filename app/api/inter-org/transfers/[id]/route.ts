// Per-transfer state transitions: accept / decline / complete / cancel.
//
// PATCH body: { action: "accept" | "decline" | "complete" | "cancel",
//               reason?: string,
//               mergeAsLocalPatientId?: string,
//               completionNotes?: string }
//
// Authorisation matrix:
//   - accept / decline → only the receiving org (toOrgId)
//   - cancel           → only the sending org (fromOrgId)
//   - complete         → either side once the transfer is in "accepted"

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  getTransferById,
  acceptTransfer,
  declineTransfer,
  completeTransfer,
  cancelTransfer,
} from "@/lib/inter-org-transfers-store";
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
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;
    if (!userId || !userEmail) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const { id } = await ctxParam.params;
    const body = await req.json();
    const action = String(body.action || "");

    const t = getTransferById(id);
    if (!t) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (t.fromOrgId !== orgId && t.toOrgId !== orgId && !ctx.isSuperAdmin) {
      return NextResponse.json({ error: "not_party_to_transfer" }, { status: 403 });
    }

    let updated;
    let auditAction: AuditAction;
    let summary = "";

    if (action === "accept") {
      if (t.toOrgId !== orgId && !ctx.isSuperAdmin) {
        return NextResponse.json({ error: "only_receiver_can_accept" }, { status: 403 });
      }
      const merge = body.mergeAsLocalPatientId
        ? String(body.mergeAsLocalPatientId)
        : undefined;
      updated = acceptTransfer(id, userId, merge);
      auditAction = "transfer.accept";
      summary = `Accepted ${t.type} for ${t.patientName}`;
    } else if (action === "decline") {
      if (t.toOrgId !== orgId && !ctx.isSuperAdmin) {
        return NextResponse.json({ error: "only_receiver_can_decline" }, { status: 403 });
      }
      const reason = String(body.reason || "").trim();
      if (!reason) return NextResponse.json({ error: "reason_required" }, { status: 400 });
      updated = declineTransfer(id, reason);
      auditAction = "transfer.decline";
      summary = `Declined ${t.type} for ${t.patientName}: ${reason}`;
    } else if (action === "cancel") {
      if (t.fromOrgId !== orgId && !ctx.isSuperAdmin) {
        return NextResponse.json({ error: "only_sender_can_cancel" }, { status: 403 });
      }
      const reason = String(body.reason || "").trim() || "cancelled by sender";
      updated = cancelTransfer(id, reason);
      auditAction = "transfer.cancel";
      summary = `Cancelled ${t.type} for ${t.patientName}: ${reason}`;
    } else if (action === "complete") {
      const notes = body.completionNotes
        ? String(body.completionNotes).slice(0, 2000)
        : undefined;
      updated = completeTransfer(id, notes);
      auditAction = "transfer.complete";
      summary = `Completed ${t.type} for ${t.patientName}`;
    } else {
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
    }

    if (!updated) {
      return NextResponse.json({ error: "invalid_state" }, { status: 409 });
    }

    const partnerId = updated.fromOrgId === orgId ? updated.toOrgId : updated.fromOrgId;
    recordAudit({
      actorEmail: userEmail,
      action: auditAction,
      orgId,
      orgName: getOrganizationById(orgId)?.name,
      summary: `${summary} ↔ "${getOrganizationById(partnerId)?.name || partnerId}"`,
      meta: {
        transferId: updated.id,
        partnerId,
        type: updated.type,
        urgency: updated.urgency,
      },
    });

    try {
      await awaitAllFlushesStrict();
    } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ transfer: updated });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
