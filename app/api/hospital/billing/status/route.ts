// Return the current subscription state for the active org.
import { NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import { getSubscriptionForOrg, isOrgBillingBlocked } from "@/lib/hospital/subscription-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId } = await requireOrg();
    const sub = getSubscriptionForOrg(orgId);
    return NextResponse.json({ subscription: sub, blocked: isOrgBillingBlocked(orgId) });
  } catch (e) {
    if (e instanceof TenantError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "status_failed" }, { status: 500 });
  }
}
