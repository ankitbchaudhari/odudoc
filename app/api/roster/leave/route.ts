// Leave requests.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireOrg, TenantError } from "@/lib/tenant";
import { listLeaveForOrg, fileLeave, reviewLeave, getStaff } from "@/lib/roster/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId } = await requireOrg();
    return NextResponse.json({ requests: listLeaveForOrg(orgId) });
  } catch (err) {
    if (err instanceof TenantError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const body = await req.json();
    const staffId = String(body.staffId || "");
    const fromDate = String(body.fromDate || "");
    const toDate = String(body.toDate || "");
    if (!staffId || !fromDate || !toDate) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const staff = getStaff(staffId);
    if (!staff || staff.organizationId !== orgId) {
      return NextResponse.json({ error: "staff_not_found" }, { status: 404 });
    }
    const r = fileLeave({
      organizationId: orgId,
      staffId,
      staffName: staff.name,
      fromDate, toDate,
      reason: body.reason,
    });
    try { await awaitAllFlushesStrict(); } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ request: r });
  } catch (err) {
    if (err instanceof TenantError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx } = await requireOrg();
    const session = await getServerSession(authOptions);
    if (!ctx.isSuperAdmin && ctx.membership && !["owner", "admin"].includes(ctx.membership.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const id = String(body.id || "");
    const decision = body.decision === "approved" ? "approved" : body.decision === "rejected" ? "rejected" : null;
    if (!id || !decision) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const r = reviewLeave(id, decision, session?.user?.email || "system");
    if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try { await awaitAllFlushesStrict(); } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ request: r });
  } catch (err) {
    if (err instanceof TenantError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
