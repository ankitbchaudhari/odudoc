// Referral payout pipeline.
//
// POST   action=record_gross  → receiver records what they charged
// POST   action=mark_paid     → sender marks the kickback received
// POST   action=waive         → either party waives the payout

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  getTransferById,
  recordReferralGross,
  markReferralPaid,
  waiveReferralPayout,
} from "@/lib/inter-org-transfers-store";
import { recordAudit } from "@/lib/audit-log-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctxParam: RouteCtx) {
  try {
    const { ctx, orgId } = await requireOrg();
    if (
      !ctx.isSuperAdmin &&
      ctx.membership &&
      !["owner", "admin", "accountant"].includes(ctx.membership.role)
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { id } = await ctxParam.params;
    const body = await req.json();
    const action = String(body.action || "");
    const t = getTransferById(id);
    if (!t || !t.referral) {
      return NextResponse.json({ error: "no_referral_payout" }, { status: 404 });
    }
    // Authorisation: receiver records gross, sender marks paid.
    if (action === "record_gross") {
      if (t.toOrgId !== orgId && !ctx.isSuperAdmin) {
        return NextResponse.json({ error: "only_receiver" }, { status: 403 });
      }
      const gross = Math.max(0, parseInt(String(body.grossAmountMinor || 0), 10));
      const currency = String(body.currency || "INR").toUpperCase().slice(0, 3);
      if (!gross) return NextResponse.json({ error: "missing_gross" }, { status: 400 });
      const updated = recordReferralGross(id, gross, currency);
      auditPayout(orgId, t, updated, "referral.record_gross", `Recorded ${currency} ${(gross / 100).toFixed(2)} gross; payout ${(updated?.referral?.payoutAmountMinor || 0) / 100}`);
      try { await awaitAllFlushesStrict(); } catch {
        return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
      }
      return NextResponse.json({ transfer: updated });
    }
    if (action === "mark_paid") {
      if (t.fromOrgId !== orgId && !ctx.isSuperAdmin) {
        return NextResponse.json({ error: "only_sender" }, { status: 403 });
      }
      const updated = markReferralPaid(id);
      auditPayout(orgId, t, updated, "referral.mark_paid", "Marked referral kickback received");
      try { await awaitAllFlushesStrict(); } catch {
        return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
      }
      return NextResponse.json({ transfer: updated });
    }
    if (action === "waive") {
      const updated = waiveReferralPayout(id);
      auditPayout(orgId, t, updated, "referral.waive", "Waived referral kickback");
      try { await awaitAllFlushesStrict(); } catch {
        return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
      }
      return NextResponse.json({ transfer: updated });
    }
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

async function auditPayout(
  orgId: string,
  before: { id: string; type: string; patientName: string },
  after: { id: string } | null,
  _kind: string,
  summary: string,
) {
  if (!after) return;
  const session = await getServerSession(authOptions);
  recordAudit({
    actorEmail: session?.user?.email || "system",
    // Reuse transfer.complete category since AuditAction doesn't have a
    // dedicated payout enum; the meta field carries the precise kind.
    action: "transfer.complete",
    orgId,
    summary: `${summary} for ${before.patientName} (${before.type})`,
    meta: { transferId: before.id, payoutEvent: _kind },
  });
}
