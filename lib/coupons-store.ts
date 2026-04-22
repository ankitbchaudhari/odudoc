import { bindPersistentArray } from "./persistent-array";

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

const coupons: Coupon[] = [];
const { hydrate, flush } = bindPersistentArray<Coupon>(
  "coupons",
  coupons,
  () => []
);
await hydrate();

// One-time cleanup: drop the demo coupons that shipped with the initial
// seed. Admin creates real coupons via /admin/coupons.
(function removeLegacySeedCoupons() {
  const legacyIds = new Set(["c1", "c2", "c3"]);
  let dirty = false;
  for (let i = coupons.length - 1; i >= 0; i--) {
    if (legacyIds.has(coupons[i].id)) {
      coupons.splice(i, 1);
      dirty = true;
    }
  }
  if (dirty) flush();
})();

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
  coupons.push(newCoupon);
  flush();
  return newCoupon;
}

export function updateCoupon(id: string, updates: Partial<Coupon>): void {
  const idx = coupons.findIndex((c) => c.id === id);
  if (idx < 0) return;
  coupons[idx] = { ...coupons[idx], ...updates };
  flush();
}

export function deleteCoupon(id: string): void {
  const idx = coupons.findIndex((c) => c.id === id);
  if (idx < 0) return;
  coupons.splice(idx, 1);
  flush();
}
