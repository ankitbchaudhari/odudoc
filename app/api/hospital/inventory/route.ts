import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  receiveStock,
  issueStock,
  adjustStock,
  listMovements,
  type ItemCategory,
} from "@/lib/hospital/inventory-store";

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
    if (searchParams.get("movements") === "1") {
      return NextResponse.json({
        movements: listMovements({
          organizationId: orgId,
          itemId: searchParams.get("itemId") || undefined,
          limit: Number(searchParams.get("limit")) || 100,
        }),
      });
    }
    return NextResponse.json({
      items: listItems({
        organizationId: orgId,
        search: searchParams.get("search") || undefined,
        category: (searchParams.get("category") as ItemCategory) || undefined,
        lowStockOnly: searchParams.get("lowStockOnly") === "1",
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "inventory", module: "inventory" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (!body.name || !body.category || !body.unit) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const it = createItem(orgId, {
      name: String(body.name),
      genericName: body.genericName,
      category: body.category,
      unit: String(body.unit),
      manufacturer: body.manufacturer,
      hsnCode: body.hsnCode,
      taxPercent: body.taxPercent,
      reorderLevel: body.reorderLevel,
      active: body.active,
      notes: body.notes,
    });
    return NextResponse.json({ item: it });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "inventory", module: "inventory" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

    if (body.receive) {
      const res = receiveStock(orgId, { itemId: String(body.id), ...body.receive });
      if (!res) return NextResponse.json({ error: "not_found_or_invalid" }, { status: 400 });
      return NextResponse.json(res);
    }
    if (body.issue) {
      const res = issueStock(orgId, { itemId: String(body.id), ...body.issue });
      if (!res) return NextResponse.json({ error: "insufficient_or_not_found" }, { status: 400 });
      return NextResponse.json(res);
    }
    if (body.adjust) {
      const res = adjustStock(orgId, { itemId: String(body.id), ...body.adjust });
      if (!res) return NextResponse.json({ error: "invalid_adjustment" }, { status: 400 });
      return NextResponse.json(res);
    }

    const updated = updateItem(String(body.id), orgId, body);
    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ item: updated });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "inventory", module: "inventory" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const ok = deleteItem(String(body.id), orgId);
    return NextResponse.json({ ok });
  } catch (e) {
    return handleError(e);
  }
}
