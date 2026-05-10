// Demo wizard endpoint. Requires an active org context — seeds
// staff, procurement SKUs, pharmacy stock, TPA empanelments, and
// tele-ICU beds in one shot.

import { NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import { runDemoWizard } from "@/lib/demo-wizard";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { ctx, orgId } = await requireOrg();
    if (!ctx.isSuperAdmin && ctx.membership && !["owner", "admin"].includes(ctx.membership.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const report = runDemoWizard(orgId);
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof TenantError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
