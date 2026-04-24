// GET  /api/admin/coupons → { coupons }
// POST /api/admin/coupons → { coupon }   body: Omit<Coupon,"id"|"usedCount">
// Super-admin only.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getCoupons,
  addCoupon,
  type Coupon,
} from "@/lib/coupons-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ coupons: getCoupons() });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: Partial<Coupon>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    return NextResponse.json(
      { error: "Code must be 3–32 chars: A–Z, 0–9, - or _" },
      { status: 400 },
    );
  }
  if (getCoupons().some((c) => c.code.toUpperCase() === code)) {
    return NextResponse.json({ error: "Code already exists" }, { status: 409 });
  }
  const discountType = body.discountType === "fixed" ? "fixed" : "percentage";
  const discountValue = Number(body.discountValue);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return NextResponse.json({ error: "discountValue must be > 0" }, { status: 400 });
  }
  if (discountType === "percentage" && discountValue > 100) {
    return NextResponse.json({ error: "Percentage cannot exceed 100" }, { status: 400 });
  }
  const expiresAt = typeof body.expiresAt === "string" ? body.expiresAt.slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
    return NextResponse.json({ error: "expiresAt must be YYYY-MM-DD" }, { status: 400 });
  }

  try {
    const coupon = addCoupon({
      code,
      discountType,
      discountValue,
      minOrder: Math.max(0, Number(body.minOrder ?? 0)),
      maxUses: Math.max(0, Math.floor(Number(body.maxUses ?? 0))),
      usedCount: 0,
      expiresAt,
      active: body.active !== false,
    });
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (err) {
    log.error("admin.coupons.create_failed", err);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}
