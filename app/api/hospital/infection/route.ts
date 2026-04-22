import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  type HAIStatus,
  type HAIType,
  type HAIOrganism,
} from "@/lib/hospital/infection-store";

import { parseJson, z } from "@/lib/validate";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handleError(e: unknown) {
  if (e instanceof TenantError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  return NextResponse.json({ error: "internal" }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const { searchParams } = new URL(req.url);
    return NextResponse.json({
      events: listEvents({
        organizationId: orgId,
        status: (searchParams.get("status") as HAIStatus) || undefined,
        type: (searchParams.get("type") as HAIType) || undefined,
        organism: (searchParams.get("organism") as HAIOrganism) || undefined,
        location: searchParams.get("location") || undefined,
        from: searchParams.get("from") || undefined,
        to: searchParams.get("to") || undefined,
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "infection", module: "infection" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (!body.location) return NextResponse.json({ error: "missing_location" }, { status: 400 });
    return NextResponse.json({ event: createEvent(orgId, body) });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "infection", module: "infection" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const e = updateEvent(String(body.id), orgId, body);
    if (!e) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ event: e });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "infection", module: "infection" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    return NextResponse.json({ ok: deleteEvent(String(body.id), orgId) });
  } catch (e) {
    return handleError(e);
  }
}
