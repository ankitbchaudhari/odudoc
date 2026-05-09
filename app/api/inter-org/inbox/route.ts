// Records inbox — unread count + mark-read.
//
// GET    → { unread: number, items: Transfer[] }  (last N unread)
// POST   → mark a single transfer read by id
// DELETE → mark every transfer for the active org as read

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  countUnreadForOrg,
  listTransfers,
  markTransferRead,
  markAllTransfersReadForOrg,
  reloadTransfers,
} from "@/lib/inter-org-transfers-store";
import { getOrganizationById } from "@/lib/organizations-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId } = await requireOrg();
    await reloadTransfers();
    const all = listTransfers({ orgId });
    const unread = all.filter((t) => !t.readByOrgIds.includes(orgId));
    const items = unread.slice(0, 20).map((t) => {
      const isOutbound = t.fromOrgId === orgId;
      const partnerId = isOutbound ? t.toOrgId : t.fromOrgId;
      const partner = getOrganizationById(partnerId);
      return {
        id: t.id,
        direction: isOutbound ? "outbound" as const : "inbound" as const,
        partnerName: partner?.name || "(unknown)",
        partnerId,
        patientName: t.patientName,
        type: t.type,
        urgency: t.urgency,
        status: t.status,
        requestedAt: t.requestedAt,
        reason: t.reason,
        breakGlass: t.patientConsent.method === "break_glass",
      };
    });
    return NextResponse.json({
      unread: countUnreadForOrg(orgId),
      items,
    });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const updated = markTransferRead(id, orgId);
    if (!updated) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    try {
      await awaitAllFlushesStrict();
    } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function DELETE() {
  try {
    const { orgId } = await requireOrg();
    const n = markAllTransfersReadForOrg(orgId);
    try {
      await awaitAllFlushesStrict();
    } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, marked: n });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
