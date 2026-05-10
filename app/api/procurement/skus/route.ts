// SKU catalogue — list, upsert, seed, delete.

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  listSkus,
  upsertSku,
  deleteSkuForOrg,
  seedDemoSkus,
  type SkuCategory,
  type StockUnit,
} from "@/lib/procurement/sku-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_CATEGORIES: SkuCategory[] = ["drug", "consumable", "device", "reagent", "linen", "office"];
const ALLOWED_UNITS: StockUnit[] = ["strip", "bottle", "vial", "pack", "box", "piece", "kg", "litre"];

export async function GET() {
  try {
    const { orgId } = await requireOrg();
    return NextResponse.json({ skus: listSkus(orgId) });
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
    if (body.action === "seed") {
      const r = seedDemoSkus(orgId);
      try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
      return NextResponse.json(r);
    }
    if (!ALLOWED_CATEGORIES.includes(body.category) || !ALLOWED_UNITS.includes(body.unit)) {
      return NextResponse.json({ error: "invalid_category_or_unit" }, { status: 400 });
    }
    const sku = upsertSku({ ...body, organizationId: orgId });
    try { await awaitAllFlushesStrict(); } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ sku });
  } catch (err) {
    if (err instanceof TenantError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireOrg();
    if (!ctx.isSuperAdmin && ctx.membership && !["owner", "admin"].includes(ctx.membership.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const ok = deleteSkuForOrg(id, orgId);
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try { await awaitAllFlushesStrict(); } catch {
      return NextResponse.json({ error: "deleted_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TenantError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
