"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import PrescriptionUploader from "@/components/PrescriptionUploader";

interface UploadedRx {
  filename: string;
  previewUrl?: string | null;
  originalName: string;
}

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, subtotal, totalItems, clearCart } = useCart();
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoAppliedCode, setPromoAppliedCode] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [rxUploads, setRxUploads] = useState<Record<string, UploadedRx>>({});

  const setRx = (productId: string, rx: UploadedRx | null) => {
    setRxUploads((prev) => {
      const next = { ...prev };
      if (rx) next[productId] = rx;
      else delete next[productId];
      return next;
    });
  };

  const rxItems = items.filter(({ product }) => product.prescriptionRequired);
  const missingRx = rxItems.filter(({ product }) => !rxUploads[product.id]);
  const canCheckout = missingRx.length === 0;

  const shipping = subtotal > 50 ? 0 : 5.99;
  const tax = subtotal * 0.08;
  const discount = promoApplied ? promoDiscount : 0;
  const total = Math.max(0, subtotal + shipping + tax - discount);

  const handleApplyPromo = async () => {
    const code = promoCode.trim();
    if (!code) return;
    setPromoBusy(true);
    setPromoError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = await res.json();
      if (data.ok) {
        setPromoApplied(true);
        setPromoDiscount(Number(data.discount) || 0);
        setPromoAppliedCode(data.coupon?.code || code.toUpperCase());
        setPromoError("");
      } else {
        setPromoApplied(false);
        setPromoDiscount(0);
        setPromoAppliedCode("");
        setPromoError(data.error || "Invalid code");
      }
    } catch {
      setPromoError("Could not validate code. Please try again.");
    } finally {
      setPromoBusy(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoApplied(false);
    setPromoDiscount(0);
    setPromoAppliedCode("");
    setPromoCode("");
    setPromoError("");
  };

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
        <div className="text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
            <svg className="h-12 w-12 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-slate-100">Your cart is empty</h2>
          <p className="mt-2 text-gray-500 dark:text-slate-400">Looks like you have not added any products yet.</p>
          <Link href="/shop" className="btn-primary mt-6 inline-block">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 md:text-3xl">
            Shopping Cart
            <span className="ml-2 text-base font-normal text-gray-500 dark:text-slate-400">({totalItems} item{totalItems !== 1 ? "s" : ""})</span>
          </h1>
          <button
            onClick={clearCart}
            className="text-sm font-medium text-red-500 hover:text-red-600"
          >
            Clear Cart
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {items.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex gap-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5"
                >
                  {/* Product image */}
                  <Link href={`/shop/${product.id}`}>
                    <div className={`h-20 w-20 shrink-0 rounded-lg bg-gradient-to-br ${product.color} flex items-center justify-center sm:h-24 sm:w-24`}>
                      <span className="text-2xl font-bold text-white/30">{product.name.charAt(0)}</span>
                    </div>
                  </Link>

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex justify-between">
                      <div>
                        <Link href={`/shop/${product.id}`} className="font-semibold text-gray-900 dark:text-slate-100 hover:text-primary-600">
                          {product.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">{product.category}</p>
                        {product.prescriptionRequired && (
                          <>
                            <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                              Rx Required
                            </span>
                            <PrescriptionUploader
                              productId={product.id}
                              productName={product.name}
                              value={rxUploads[product.id] || null}
                              onChange={setRx}
                            />
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(product.id)}
                        className="h-8 w-8 shrink-0 rounded-lg text-gray-400 dark:text-slate-500 transition-colors hover:bg-red-50 hover:text-red-500"
                        aria-label="Remove item"
                      >
                        <svg className="h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      {/* Quantity */}
                      <div className="flex items-center rounded-lg border border-gray-200 dark:border-slate-800">
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="px-2.5 py-1.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          className="px-2.5 py-1.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-slate-100">${(product.price * quantity).toFixed(2)}</p>
                        {quantity > 1 && (
                          <p className="text-xs text-gray-400 dark:text-slate-500">${product.price.toFixed(2)} each</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/shop"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Continue Shopping
            </Link>
          </div>

          {/* Order Summary */}
          <div>
            <div className="sticky top-24 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Order Summary</h2>

              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-slate-400">Subtotal</span>
                  <span className="font-medium text-gray-900 dark:text-slate-100">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-slate-400">Shipping</span>
                  <span className={`font-medium ${shipping === 0 ? "text-green-600" : "text-gray-900 dark:text-slate-100"}`}>
                    {shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    Free shipping on orders above $50 (add ${(50 - subtotal).toFixed(2)} more)
                  </p>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-slate-400">Tax (8%)</span>
                  <span className="font-medium text-gray-900 dark:text-slate-100">${tax.toFixed(2)}</span>
                </div>
                {promoApplied && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Promo ({promoAppliedCode})</span>
                    <span className="font-medium text-green-600">-${discount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Promo code */}
              <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Promo code"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value);
                      if (promoError) setPromoError("");
                    }}
                    disabled={promoApplied}
                    className="flex-1 rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm placeholder:text-gray-400 dark:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-50 dark:bg-slate-900"
                  />
                  {promoApplied ? (
                    <button
                      onClick={handleRemovePromo}
                      className="rounded-lg bg-gray-100 dark:bg-slate-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 transition-colors hover:bg-gray-200"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={handleApplyPromo}
                      disabled={promoBusy || !promoCode.trim()}
                      className="rounded-lg bg-gray-100 dark:bg-slate-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 transition-colors hover:bg-gray-200 disabled:opacity-50"
                    >
                      {promoBusy ? "…" : "Apply"}
                    </button>
                  )}
                </div>
                {promoApplied && (
                  <p className="mt-2 text-xs text-green-600">
                    Promo code {promoAppliedCode} applied — you saved ${discount.toFixed(2)}.
                  </p>
                )}
                {promoError && (
                  <p className="mt-2 text-xs text-red-600">{promoError}</p>
                )}
              </div>

              {/* Total */}
              <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="flex justify-between">
                  <span className="text-base font-bold text-gray-900 dark:text-slate-100">Total</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-slate-100">${total.toFixed(2)}</span>
                </div>
              </div>

              {!canCheckout && (
                <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Upload a prescription for {missingRx.length} item{missingRx.length === 1 ? "" : "s"} before checkout.
                </p>
              )}
              <button
                disabled={!canCheckout}
                className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                Proceed to Checkout
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-slate-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Secure checkout with SSL encryption
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
