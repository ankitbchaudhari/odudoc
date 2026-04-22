import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { listDocuments, createDocument, updateDocument, deleteDocument, computeStats, type DocCategory, type DocStatus } from "@/lib/hospital/documents-store";

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
    return NextResponse.json({
      documents: listDocuments({
        organizationId: orgId,
        category: (searchParams.get("category") as DocCategory) || undefined,
        status: (searchParams.get("status") as DocStatus) || undefined,
        patientId: searchParams.get("patientId") || undefined,
        department: searchParams.get("department") || undefined,
        search: searchParams.get("search") || undefined,
      }),
      stats: computeStats(orgId),
    });
  } catch (e) { return handleError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "documents", module: "documents" });
    const r = createDocument(orgId, await req.json());
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ document: r.record });
  } catch (e) { return handleError(e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "documents", module: "documents" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const r = updateDocument(String(body.id), orgId, body);
    if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ document: r });
  } catch (e) { return handleError(e); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "documents", module: "documents" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    return NextResponse.json({ ok: deleteDocument(String(body.id), orgId) });
  } catch (e) { return handleError(e); }
}
