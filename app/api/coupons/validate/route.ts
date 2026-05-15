// POST /api/coupons/validate
//   body: { code: string, subtotal: number }
//   → { ok: true, discount, finalTotal, coupon: { code, discountType, discountValue } }
//   → { ok: false, error }
//
// Public endpoint used by the cart/checkout promo field. Does NOT increment
// usage — redeem happens server-side once payment succeeds.

import { NextRequest, NextResponse } from "next/server";
import { applyCoupon, validateCoupon, reloadCoupons } from "@/lib/coupons-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { code?: string; subtotal?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const subtotal = Number(body.subtotal);
  if (!code) {
    return NextResponse.json({ ok: false, error: "Code is required" }, { status: 400 });
  }
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    return NextResponse.json({ ok: false, error: "Invalid subtotal" }, { status: 400 });
  }
  // Reload so a coupon admin just published on a sibling Lambda
  // validates correctly here.
  await reloadCoupons();
  const check = validateCoupon(code, subtotal);
  if (!check.valid || !check.coupon) {
    return NextResponse.json({ ok: false, error: check.error || "Invalid code" }, { status: 200 });
  }
  const { discount, finalTotal } = applyCoupon(code, subtotal);
  return NextResponse.json({
    ok: true,
    discount: Math.round(discount * 100) / 100,
    finalTotal: Math.round(finalTotal * 100) / 100,
    coupon: {
      code: check.coupon.code,
      discountType: check.coupon.discountType,
      discountValue: check.coupon.discountValue,
    },
  });
}
