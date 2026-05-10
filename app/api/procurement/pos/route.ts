// PO list + manual create.

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  listPosForOrg,
  createPo,
  type PoLine,
} from "@/lib/procurement/po-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId } = await requireOrg();
    return NextResponse.json({ pos: listPosForOrg(orgId) });
  } catch (err) {
    if (err instanceof TenantError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireOrg();
    if (!ctx.isSuperAdmin && ctx.membership && !["owner", "admin", "pharmacist", "accountant"].includes(ctx.membership.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const lines: PoLine[] = Array.isArray(body.lines) ? body.lines : [];
    if (lines.length === 0) return NextResponse.json({ error: "no_lines" }, { status: 400 });
    const vendorName = String(body.vendorName || "").trim();
    if (!vendorName) return NextResponse.json({ error: "missing_vendor" }, { status: 400 });
    const po = createPo({
      organizationId: orgId,
      vendorId: body.vendorId,
      vendorName,
      source: "manual",
      lines,
      notes: body.notes,
      expectedAt: body.expectedAt,
    });
    try { await awaitAllFlushesStrict(); } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ po });
  } catch (err) {
    if (err instanceof TenantError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
