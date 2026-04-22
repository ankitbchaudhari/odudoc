import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  issueItem,
  type BatchStatus,
  type Method,
} from "@/lib/hospital/cssd-store";

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
      batches: listBatches({
        organizationId: orgId,
        status: (searchParams.get("status") as BatchStatus) || undefined,
        method: (searchParams.get("method") as Method) || undefined,
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "cssd", module: "cssd" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    return NextResponse.json({ batch: createBatch(orgId, body) });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "cssd", module: "cssd" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    if (body.action === "issue") {
      if (!body.setId || !body.issuedTo) {
        return NextResponse.json({ error: "missing_fields" }, { status: 400 });
      }
      const b = issueItem(String(body.id), String(body.setId), String(body.issuedTo), orgId);
      if (!b) return NextResponse.json({ error: "cannot_issue" }, { status: 400 });
      return NextResponse.json({ batch: b });
    }
    const b = updateBatch(String(body.id), orgId, body);
    if (!b) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ batch: b });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "cssd", module: "cssd" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    return NextResponse.json({ ok: deleteBatch(String(body.id), orgId) });
  } catch (e) {
    return handleError(e);
  }
}
