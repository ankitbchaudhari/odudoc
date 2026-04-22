import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listClients, getClient, createClient, updateClient, deleteClient,
  listPreauths, createPreauth, updatePreauth, deletePreauth,
  computeStats,
  type ClientStatus, type ClientType, type PreauthStatus,
} from "@/lib/hospital/corporate-empanelment-store";

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
    const id = searchParams.get("id");
    if (id) {
      const c = getClient(id, orgId);
      if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ client: c });
    }
    return NextResponse.json({
      clients: listClients({
        organizationId: orgId,
        status: (searchParams.get("status") as ClientStatus) || undefined,
        clientType: (searchParams.get("clientType") as ClientType) || undefined,
      }),
      preauths: listPreauths({
        organizationId: orgId,
        status: (searchParams.get("preauthStatus") as PreauthStatus) || undefined,
        clientId: searchParams.get("clientId") || undefined,
        patientId: searchParams.get("patientId") || undefined,
      }),
      stats: computeStats(orgId),
    });
  } catch (e) { return handleError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "corporate-empanelment", module: "corporate-empanelment" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (body.kind === "preauth") {
      const r = createPreauth(orgId, body);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      return NextResponse.json({ preauth: r.record });
    }
    const r = createClient(orgId, body);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ client: r.record });
  } catch (e) { return handleError(e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "corporate-empanelment", module: "corporate-empanelment" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    if (body.kind === "preauth") {
      const r = updatePreauth(String(body.id), orgId, body);
      if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ preauth: r });
    }
    const r = updateClient(String(body.id), orgId, body);
    if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ client: r });
  } catch (e) { return handleError(e); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "corporate-empanelment", module: "corporate-empanelment" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    if (body.kind === "preauth") {
      return NextResponse.json({ ok: deletePreauth(String(body.id), orgId) });
    }
    return NextResponse.json({ ok: deleteClient(String(body.id), orgId) });
  } catch (e) { return handleError(e); }
}
