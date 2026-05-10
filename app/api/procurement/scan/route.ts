// Scanner — runs the auto-reorder check + drafts POs.
//
// POST { dryRun?: boolean } — drafts POs by default; pass dryRun:true
// to preview without firing.

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import { runScanner } from "@/lib/procurement/scanner";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireOrg();
    if (!ctx.isSuperAdmin && ctx.membership && !["owner", "admin", "pharmacist", "accountant"].includes(ctx.membership.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const dryRun = Boolean(body.dryRun);
    const report = runScanner({ organizationId: orgId, dryRun });
    if (!dryRun) {
      try { await awaitAllFlushesStrict(); } catch {
        return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
      }
    }
    return NextResponse.json(report);
  } catch (err) {
    if (err instanceof TenantError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
