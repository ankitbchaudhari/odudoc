import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listTheatres,
  createTheatre,
  updateTheatre,
  deleteTheatre,
  type OTType,
} from "@/lib/hospital/surgery-store";

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
      theatres: listTheatres({
        organizationId: orgId,
        type: (searchParams.get("type") as OTType) || undefined,
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "theatres", module: "theatres" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (!body.name || !body.type) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const t = createTheatre(orgId, {
      name: String(body.name),
      type: body.type,
      floor: body.floor,
      status: body.status,
      notes: body.notes,
    });
    return NextResponse.json({ theatre: t });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "theatres", module: "theatres" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const t = updateTheatre(String(body.id), orgId, body);
    if (!t) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ theatre: t });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "theatres", module: "theatres" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const ok = deleteTheatre(String(body.id), orgId);
    if (!ok) return NextResponse.json({ error: "has_active_bookings_or_not_found" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
