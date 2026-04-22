import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listTokens,
  issueToken,
  updateToken,
  deleteToken,
  callNext,
  type TokenStatus,
} from "@/lib/hospital/queue-store";

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
      tokens: listTokens({
        organizationId: orgId,
        counterId: searchParams.get("counterId") || undefined,
        status: (searchParams.get("status") as TokenStatus) || undefined,
        date: searchParams.get("date") || undefined,
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "queue", module: "queue" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (body.action === "callNext") {
      if (!body.counterId) return NextResponse.json({ error: "missing_counter" }, { status: 400 });
      const t = callNext(String(body.counterId), orgId);
      return NextResponse.json({ token: t });
    }
    if (!body.counterId) return NextResponse.json({ error: "missing_counter" }, { status: 400 });
    if (!body.patientName) return NextResponse.json({ error: "missing_patient" }, { status: 400 });
    const t = issueToken(orgId, body);
    if (!t) return NextResponse.json({ error: "counter_not_found" }, { status: 404 });
    return NextResponse.json({ token: t });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "queue", module: "queue" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const t = updateToken(String(body.id), orgId, body);
    if (!t) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ token: t });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "queue", module: "queue" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    return NextResponse.json({ ok: deleteToken(String(body.id), orgId) });
  } catch (e) {
    return handleError(e);
  }
}
