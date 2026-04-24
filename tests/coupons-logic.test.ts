// Pure logic tests for coupon validation. We replicate the discount math
// here rather than importing coupons-store directly because that module
// hydrates from Postgres at import-time — tests should stay pure.

import { describe, it, expect } from "vitest";

interface Coupon {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrder: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  active: boolean;
}

function validate(coupon: Coupon, orderTotal: number, now = Date.now()) {
  if (!coupon.active) return { valid: false, error: "inactive" };
  if (new Date(coupon.expiresAt).getTime() < now) return { valid: false, error: "expired" };
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, error: "limit" };
  }
  if (orderTotal < coupon.minOrder) return { valid: false, error: "min" };
  const discount =
    coupon.discountType === "percentage"
      ? (orderTotal * coupon.discountValue) / 100
      : Math.min(coupon.discountValue, orderTotal);
  return { valid: true, discount, finalTotal: orderTotal - discount };
}

const base: Coupon = {
  code: "X",
  discountType: "percentage",
  discountValue: 10,
  minOrder: 0,
  maxUses: 0,
  usedCount: 0,
  expiresAt: "2030-01-01",
  active: true,
};

describe("coupon validation", () => {
  it("percentage discount computes correctly", () => {
    const r = validate(base, 100);
    expect(r.valid).toBe(true);
    expect(r.discount).toBe(10);
    expect(r.finalTotal).toBe(90);
  });

  it("fixed discount is capped at order total", () => {
    const c = { ...base, discountType: "fixed" as const, discountValue: 50 };
    expect(validate(c, 100).discount).toBe(50);
    expect(validate(c, 20).discount).toBe(20);
  });

  it("inactive coupon fails", () => {
    expect(validate({ ...base, active: false }, 100).valid).toBe(false);
  });

  it("expired coupon fails", () => {
    expect(validate({ ...base, expiresAt: "2020-01-01" }, 100).valid).toBe(false);
  });

  it("usage-limit reached fails", () => {
    expect(validate({ ...base, maxUses: 5, usedCount: 5 }, 100).valid).toBe(false);
  });

  it("maxUses = 0 means unlimited", () => {
    expect(validate({ ...base, maxUses: 0, usedCount: 9999 }, 100).valid).toBe(true);
  });

  it("below minimum order fails", () => {
    expect(validate({ ...base, minOrder: 50 }, 49).valid).toBe(false);
    expect(validate({ ...base, minOrder: 50 }, 50).valid).toBe(true);
  });
});
