export interface Coupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrder: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  active: boolean;
}

let coupons: Coupon[] = [
  {
    id: "c1",
    code: "HEALTH10",
    discountType: "percentage",
    discountValue: 10,
    minOrder: 0,
    maxUses: 1000,
    usedCount: 342,
    expiresAt: "2026-12-31",
    active: true,
  },
  {
    id: "c2",
    code: "WELCOME20",
    discountType: "percentage",
    discountValue: 20,
    minOrder: 0,
    maxUses: 500,
    usedCount: 128,
    expiresAt: "2026-06-30",
    active: true,
  },
  {
    id: "c3",
    code: "FLAT50",
    discountType: "fixed",
    discountValue: 50,
    minOrder: 200,
    maxUses: 200,
    usedCount: 45,
    expiresAt: "2026-09-30",
    active: true,
  },
];

export function getCoupons(): Coupon[] {
  return [...coupons];
}

export function validateCoupon(
  code: string,
  orderTotal: number
): { valid: boolean; error?: string; coupon?: Coupon } {
  const coupon = coupons.find(
    (c) => c.code.toUpperCase() === code.toUpperCase()
  );
  if (!coupon) return { valid: false, error: "Coupon code not found" };
  if (!coupon.active) return { valid: false, error: "Coupon is no longer active" };
  if (new Date(coupon.expiresAt) < new Date())
    return { valid: false, error: "Coupon has expired" };
  if (coupon.usedCount >= coupon.maxUses)
    return { valid: false, error: "Coupon usage limit reached" };
  if (orderTotal < coupon.minOrder)
    return {
      valid: false,
      error: `Minimum order of $${coupon.minOrder} required`,
    };
  return { valid: true, coupon };
}

export function applyCoupon(
  code: string,
  orderTotal: number
): { discount: number; finalTotal: number; error?: string } {
  const result = validateCoupon(code, orderTotal);
  if (!result.valid || !result.coupon) {
    return { discount: 0, finalTotal: orderTotal, error: result.error };
  }
  const coupon = result.coupon;
  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = (orderTotal * coupon.discountValue) / 100;
  } else {
    discount = Math.min(coupon.discountValue, orderTotal);
  }
  return { discount, finalTotal: orderTotal - discount };
}

export function addCoupon(coupon: Omit<Coupon, "id">): Coupon {
  const newCoupon = { ...coupon, id: `c${Date.now()}` };
  coupons = [...coupons, newCoupon];
  return newCoupon;
}

export function updateCoupon(id: string, updates: Partial<Coupon>): void {
  coupons = coupons.map((c) => (c.id === id ? { ...c, ...updates } : c));
}

export function deleteCoupon(id: string): void {
  coupons = coupons.filter((c) => c.id !== id);
}
