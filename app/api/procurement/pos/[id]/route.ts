// Per-PO state transition.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  getPo,
  transitionPo,
  type PoStatus,
} from "@/lib/procurement/po-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx { params: Promise<{ id: string }> }

const ALLOWED_TARGETS: PoStatus[] = ["submitted", "acknowledged", "received", "closed", "cancelled", "rejected"];

export async function GET(_req: NextRequest, ctxParam: RouteCtx) {
  const { id } = await ctxParam.params;
  const po = getPo(id);
  if (!po) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ po });
}

export async function PATCH(req: NextRequest, ctxParam: RouteCtx) {
  try {
    const { ctx, orgId } = await requireOrg();
    if (!ctx.isSuperAdmin && ctx.membership && !["owner", "admin", "pharmacist", "accountant"].includes(ctx.membership.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const session = await getServerSession(authOptions);
    const { id } = await ctxParam.params;
    const existing = getPo(id);
    if (!existing || existing.organizationId !== orgId) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const body = await req.json();
    const to = body.to as PoStatus;
    if (!ALLOWED_TARGETS.includes(to)) return NextResponse.json({ error: "invalid_target" }, { status: 400 });
    const updated = transitionPo({
      id,
      to,
      actorEmail: session?.user?.email || undefined,
      note: body.note,
      vendorReference: body.vendorReference,
      grnReference: body.grnReference,
      receivedQty: body.receivedQty,
    });
    if (!updated) return NextResponse.json({ error: "transition_failed" }, { status: 409 });
    try { await awaitAllFlushesStrict(); } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ po: updated });
  } catch (err) {
    if (err instanceof TenantError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
