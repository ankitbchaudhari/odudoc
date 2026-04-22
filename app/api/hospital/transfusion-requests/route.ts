import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listRequests,
  createRequest,
  reserveForRequest,
  issueRequest,
  transfuseRequest,
  cancelRequest,
  deleteRequest,
  type RequestStatus,
  type RequestPriority,
} from "@/lib/hospital/bloodbank-store";

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
      requests: listRequests({
        organizationId: orgId,
        patientId: searchParams.get("patientId") || undefined,
        status: (searchParams.get("status") as RequestStatus) || undefined,
        priority:
          (searchParams.get("priority") as RequestPriority) || undefined,
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "transfusion-requests", module: "transfusion-requests" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (
      !body.patientId ||
      !body.patientBloodGroup ||
      !body.component ||
      !body.unitsRequested
    ) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    return NextResponse.json({ request: createRequest(orgId, body) });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "transfusion-requests", module: "transfusion-requests" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

    if (body.action === "reserve") {
      const res = reserveForRequest(String(body.id), orgId);
      if (!res.ok)
        return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({
        request: res.request,
        newlyReserved: res.newlyReserved,
      });
    }
    if (body.action === "issue") {
      const r = issueRequest(String(body.id), orgId);
      if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ request: r });
    }
    if (body.action === "transfuse") {
      const r = transfuseRequest(String(body.id), orgId);
      if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ request: r });
    }
    if (body.action === "cancel") {
      const r = cancelRequest(String(body.id), orgId);
      if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ request: r });
    }
    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "transfusion-requests", module: "transfusion-requests" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    return NextResponse.json({ ok: deleteRequest(String(body.id), orgId) });
  } catch (e) {
    return handleError(e);
  }
}
