import { NextRequest, NextResponse } from "next/server";
import { requireActiveBilling, TenantError } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { retryNotification } from "@/lib/hospital/notifications-store";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RetrySchema = z.object({ id: nonEmptyString });

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    const parsed = await parseJson(req, RetrySchema);
    if (parsed instanceof NextResponse) return parsed;
    const n = await retryNotification(parsed.id, orgId);
    if (!n) return NextResponse.json({ error: "not_found" }, { status: 404 });
    audit(ctx, { action: "other", entityType: "notification", entityId: parsed.id, module: "notifications", reason: "retry" });
    return NextResponse.json({ notification: n });
  } catch (e) {
    if (e instanceof TenantError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
