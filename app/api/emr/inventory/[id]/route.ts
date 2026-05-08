// Inventory single-item PATCH (edit + stock adjust) + DELETE.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveClinic } from "@/lib/emr-store";
import {
  updateInventoryItem,
  adjustStock,
  deleteInventoryItem,
} from "@/lib/inventory-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";

interface RouteContext { params: Promise<{ id: string }>; }

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.adjustQty === "number") {
    const r = await adjustStock(id, ownerEmail, body.adjustQty);
    if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await awaitAllFlushesStrict().catch(() => {});
    return NextResponse.json({ item: r });
  }

  const patch: Record<string, unknown> = {};
  for (const k of ["sku", "name", "category", "unit", "unitCost", "unitCurrency", "qty", "reorderAt", "expiry", "supplierName", "notes", "medicineId"]) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  const r = await updateInventoryItem(id, ownerEmail, patch);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await awaitAllFlushesStrict().catch(() => {});
  return NextResponse.json({ item: r });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (clinic.role !== "owner" && clinic.role !== "admin") {
    return NextResponse.json({ error: "Only the clinic owner can delete." }, { status: 403 });
  }
  const { id } = await ctx.params;
  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const ok = await deleteInventoryItem(id, ownerEmail);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await awaitAllFlushesStrict().catch(() => {});
  return NextResponse.json({ ok: true });
}
