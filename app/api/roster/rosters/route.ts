// Roster list + draft generation + publish.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  listRostersForOrg,
  saveDraftRoster,
  publishRoster,
  archiveRoster,
  listStaff,
  getCoveragePolicy,
  activeLeaveDates,
  fairnessLedger,
} from "@/lib/roster/store";
import { solveRoster } from "@/lib/roster/solver";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId } = await requireOrg();
    return NextResponse.json({ rosters: listRostersForOrg(orgId) });
  } catch (err) {
    if (err instanceof TenantError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireOrg();
    if (!ctx.isSuperAdmin && ctx.membership && !["owner", "admin"].includes(ctx.membership.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const action = String(body.action || "draft");

    if (action === "draft") {
      const fromDate = String(body.fromDate || "").trim();
      const toDate = String(body.toDate || "").trim();
      if (!fromDate || !toDate) return NextResponse.json({ error: "missing_dates" }, { status: 400 });
      const staff = listStaff(orgId);
      const policy = getCoveragePolicy(orgId);
      const leaveByStaff = new Map<string, Set<string>>();
      for (const s of staff) leaveByStaff.set(s.id, activeLeaveDates(s.id));
      const ledger = fairnessLedger(orgId);
      const result = solveRoster({
        organizationId: orgId,
        staff,
        requirements: policy.requirements,
        fromDate, toDate,
        leaveByStaff,
        fairnessLedger: ledger,
      });
      const r = saveDraftRoster({
        organizationId: orgId,
        fromDate, toDate,
        assignments: result.assignments,
        warnings: result.warnings,
        workloadSummary: result.workloadSummary,
      });
      try { await awaitAllFlushesStrict(); } catch {
        return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
      }
      return NextResponse.json({ roster: r });
    }
    if (action === "publish") {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
      const r = publishRoster(id, session?.user?.email || "system");
      if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
      try { await awaitAllFlushesStrict(); } catch {
        return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
      }
      return NextResponse.json({ roster: r });
    }
    if (action === "archive") {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
      const r = archiveRoster(id);
      if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
      try { await awaitAllFlushesStrict(); } catch {
        return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
      }
      return NextResponse.json({ roster: r });
    }
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  } catch (err) {
    if (err instanceof TenantError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
