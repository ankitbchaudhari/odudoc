import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { listNotifications, createNotification, updateNotification, deleteNotification, computeStats, type Channel, type NotificationStatus, type Category } from "@/lib/hospital/notifications-store";

import { parseJson, z } from "@/lib/validate";
import { notificationCreateSchema, idBodySchema } from "@/lib/hospital/schemas";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handleError(e: unknown) {
  if (e instanceof TenantError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: "internal" }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const { searchParams } = new URL(req.url);
    return NextResponse.json({
      notifications: listNotifications({ organizationId: orgId, channel: (searchParams.get("channel") as Channel) || undefined, status: (searchParams.get("status") as NotificationStatus) || undefined, category: (searchParams.get("category") as Category) || undefined, patientId: searchParams.get("patientId") || undefined }),
      stats: computeStats(orgId),
    });
  } catch (e) { return handleError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "notifications", module: "notifications" });
    const __parsed_1 = await parseJson(req, notificationCreateSchema);
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const r = createNotification(orgId, __parsed_1);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ notification: r.record });
  } catch (e) { return handleError(e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "notifications", module: "notifications" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const r = updateNotification(String(body.id), orgId, body);
    if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ notification: r });
  } catch (e) { return handleError(e); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "notifications", module: "notifications" });
    const __parsed_2 = await parseJson(req, idBodySchema);
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    return NextResponse.json({ ok: deleteNotification(__parsed_2.id, orgId) });
  } catch (e) { return handleError(e); }
}
