import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listSummaries,
  createSummary,
  updateSummary,
  amendSummary,
  deleteSummary,
  type DischargeStatus,
  type DischargeDisposition,
} from "@/lib/hospital/discharge-store";

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
      summaries: listSummaries({
        organizationId: orgId,
        patientId: searchParams.get("patientId") || undefined,
        admissionId: searchParams.get("admissionId") || undefined,
        status: (searchParams.get("status") as DischargeStatus) || undefined,
        disposition:
          (searchParams.get("disposition") as DischargeDisposition) || undefined,
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "discharge", module: "discharge" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (!body.patientId) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    return NextResponse.json({ summary: createSummary(orgId, body) });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "discharge", module: "discharge" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

    if (body.action === "amend") {
      const s = amendSummary(String(body.id), orgId, body);
      if (!s) return NextResponse.json({ error: "cannot_amend" }, { status: 400 });
      return NextResponse.json({ summary: s });
    }

    const s = updateSummary(String(body.id), orgId, body);
    if (!s) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ summary: s });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "discharge", module: "discharge" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    return NextResponse.json({ ok: deleteSummary(String(body.id), orgId) });
  } catch (e) {
    return handleError(e);
  }
}
