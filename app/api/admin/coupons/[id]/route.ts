// PATCH  /api/admin/coupons/[id] → { ok: true }
// DELETE /api/admin/coupons/[id] → { ok: true }
// Super-admin only.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateCoupon, deleteCoupon, type Coupon } from "@/lib/coupons-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: Partial<Coupon>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const patch: Partial<Coupon> = {};
  if (typeof body.code === "string") {
    const code = body.code.trim().toUpperCase();
    if (/^[A-Z0-9_-]{3,32}$/.test(code)) patch.code = code;
  }
  if (body.discountType === "fixed" || body.discountType === "percentage") {
    patch.discountType = body.discountType;
  }
  if (body.discountValue !== undefined) {
    const v = Number(body.discountValue);
    if (Number.isFinite(v) && v >= 0) patch.discountValue = v;
  }
  if (body.minOrder !== undefined) {
    patch.minOrder = Math.max(0, Number(body.minOrder));
  }
  if (body.maxUses !== undefined) {
    patch.maxUses = Math.max(0, Math.floor(Number(body.maxUses)));
  }
  if (typeof body.expiresAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.expiresAt.slice(0, 10))) {
    patch.expiresAt = body.expiresAt.slice(0, 10);
  }
  if (typeof body.active === "boolean") patch.active = body.active;

  updateCoupon(params.id, patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  deleteCoupon(params.id);
  return NextResponse.json({ ok: true });
}
