// TPA registry + per-org empanelment.
//
// GET → registry + (when called within an org tenant) the org's
//        empanelment rows so the staff console can show "you're
//        signed up with X / Y / Z; here's the discount on each".
// POST → create / update an empanelment row for the active org.

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  TPA_REGISTRY,
  listEmpanelmentsForOrg,
  upsertEmpanelment,
  deleteEmpanelment,
} from "@/lib/insurance/tpa-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId } = await requireOrg();
    return NextResponse.json({
      registry: TPA_REGISTRY,
      empanelments: listEmpanelmentsForOrg(orgId),
    });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireOrg();
    if (
      !ctx.isSuperAdmin &&
      ctx.membership &&
      !["owner", "admin", "accountant"].includes(ctx.membership.role)
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const tpaId = String(body.tpaId || "").trim();
    if (!tpaId) return NextResponse.json({ error: "missing_tpa" }, { status: 400 });
    const e = upsertEmpanelment({
      organizationId: orgId,
      tpaId,
      discountPct: typeof body.discountPct === "number" ? body.discountPct : 0,
      portalUrl: body.portalUrl,
      contactPerson: body.contactPerson,
      contactPhone: body.contactPhone,
      contactEmail: body.contactEmail,
      validUntil: body.validUntil,
      notes: body.notes,
    });
    try { await awaitAllFlushesStrict(); } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ empanelment: e });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx } = await requireOrg();
    if (!ctx.isSuperAdmin && ctx.membership && !["owner", "admin"].includes(ctx.membership.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const ok = deleteEmpanelment(id);
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try { await awaitAllFlushesStrict(); } catch {
      return NextResponse.json({ error: "deleted_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
