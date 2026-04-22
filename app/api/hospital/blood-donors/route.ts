import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listDonors,
  createDonor,
  updateDonor,
  deleteDonor,
  type BloodGroup,
  type DonorEligibility,
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
      donors: listDonors({
        organizationId: orgId,
        bloodGroup: (searchParams.get("bloodGroup") as BloodGroup) || undefined,
        eligibility:
          (searchParams.get("eligibility") as DonorEligibility) || undefined,
        search: searchParams.get("search") || undefined,
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "blood-donors", module: "blood-donors" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (!body.firstName || !body.lastName || !body.bloodGroup) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    return NextResponse.json({ donor: createDonor(orgId, body) });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "blood-donors", module: "blood-donors" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const d = updateDonor(String(body.id), orgId, body);
    if (!d) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ donor: d });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "blood-donors", module: "blood-donors" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    return NextResponse.json({ ok: deleteDonor(String(body.id), orgId) });
  } catch (e) {
    return handleError(e);
  }
}
