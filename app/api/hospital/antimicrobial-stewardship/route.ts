import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listAgents, createAgent, updateAgent, deleteAgent,
  listReviews, createReview, updateReview, deleteReview, computeStats,
  type AgentClass, type RestrictionTier, type ReviewStatus, type ReviewType,
} from "@/lib/hospital/antimicrobial-stewardship-store";

import { parseJson, z } from "@/lib/validate";
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
    const activeParam = searchParams.get("active");
    return NextResponse.json({
      agents: listAgents({
        organizationId: orgId,
        agentClass: (searchParams.get("agentClass") as AgentClass) || undefined,
        tier: (searchParams.get("tier") as RestrictionTier) || undefined,
        active: activeParam === null ? undefined : activeParam === "true",
      }),
      reviews: listReviews({
        organizationId: orgId,
        status: (searchParams.get("status") as ReviewStatus) || undefined,
        reviewType: (searchParams.get("reviewType") as ReviewType) || undefined,
        patientId: searchParams.get("patientId") || undefined,
      }),
      stats: computeStats(orgId),
    });
  } catch (e) { return handleError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "antimicrobial-stewardship", module: "antimicrobial-stewardship" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (body.kind === "review") {
      const r = createReview(orgId, body);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      return NextResponse.json({ review: r.record });
    }
    const r = createAgent(orgId, body);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ agent: r.record });
  } catch (e) { return handleError(e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "antimicrobial-stewardship", module: "antimicrobial-stewardship" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    if (body.kind === "review") {
      const r = updateReview(String(body.id), orgId, body);
      if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ review: r });
    }
    const r = updateAgent(String(body.id), orgId, body);
    if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ agent: r });
  } catch (e) { return handleError(e); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "antimicrobial-stewardship", module: "antimicrobial-stewardship" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    if (body.kind === "review") return NextResponse.json({ ok: deleteReview(String(body.id), orgId) });
    return NextResponse.json({ ok: deleteAgent(String(body.id), orgId) });
  } catch (e) { return handleError(e); }
}
