"use client";

import { useState } from "react";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/stripe";
import PricingBadge from "@/components/PricingBadge";

interface CheckoutItem {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
}

const defaultItem: CheckoutItem = {
  name: "Full Body Checkup",
  description: "Comprehensive health screening - 72 parameters",
  price: 79,
  originalPrice: 150,
};

function CheckoutFormInner({ item }: { item: CheckoutItem }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoAppliedCode, setPromoAppliedCode] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);

  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingZip, setBillingZip] = useState("");

  const finalPrice = Math.max(0, item.price - (promoApplied ? promoDiscount : 0));

  const handlePromo = async () => {
    const code = promoCode.trim();
    if (!code) return;
    setPromoBusy(true);
    setPromoError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal: item.price }),
      });
      const data = await res.json();
      if (data.ok) {
        setPromoApplied(true);
        setPromoDiscount(Number(data.discount) || 0);
        setPromoAppliedCode(data.coupon?.code || code.toUpperCase());
      } else {
        setPromoError(data.error || "Invalid code");
      }
    } catch {
      setPromoError("Could not validate code");
    } finally {
      setPromoBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      // Create payment intent
      const res = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: "checkout",
          doctorName: item.name,
          fee: finalPrice,
          patientName: billingName,
          patientPhone: "",
          timeSlot: "N/A",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to initiate payment");
        setProcessing(false);
        return;
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) return;

      const { error: stripeError, paymentIntent } =
        await stripe.confirmCardPayment(data.clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: billingName,
              email: billingEmail,
              address: {
                line1: billingAddress,
                city: billingCity,
                state: billingState,
                postal_code: billingZip,
              },
            },
          },
        });

      if (stripeError) {
        setError(stripeError.message || "Payment failed");
      } else if (paymentIntent?.status === "succeeded") {
        setSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>
        <p className="mt-2 text-gray-500">
          Your order for {item.name} has been confirmed.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <a href="/dashboard/payments" className="btn-primary">
            View Payments
          </a>
          <a
            href="/"
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Billing Address */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              Billing Details
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  required
                  type="text"
                  value={billingName}
                  onChange={(e) => setBillingName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="John Doe"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  required
                  type="email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="john@example.com"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Street Address
                </label>
                <input
                  required
                  type="text"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  required
                  type="text"
                  value={billingCity}
                  onChange={(e) => setBillingCity(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="New York"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    State
                  </label>
                  <input
                    required
                    type="text"
                    value={billingState}
                    onChange={(e) => setBillingState(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    placeholder="NY"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    ZIP
                  </label>
                  <input
                    required
                    type="text"
                    value={billingZip}
                    onChange={(e) => setBillingZip(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    placeholder="10001"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card Details */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              Payment Method
            </h2>
            <div className="rounded-lg border border-gray-300 px-4 py-3 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: "14px",
                      color: "#1f2937",
                      "::placeholder": { color: "#9ca3af" },
                      fontFamily: "Inter, system-ui, sans-serif",
                    },
                    invalid: { color: "#ef4444" },
                  },
                }}
              />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>256-bit SSL encryption</span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!stripe || processing}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </span>
            ) : (
              `Pay $${finalPrice.toFixed(2)}`
            )}
          </button>
        </div>

        {/* Right: Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              Order Summary
            </h2>

            <div className="border-b border-gray-100 pb-4">
              <h3 className="font-semibold text-gray-900">{item.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{item.description}</p>
              <div className="mt-2">
                <PricingBadge
                  price={item.price}
                  originalPrice={item.originalPrice}
                />
              </div>
            </div>

            {/* Promo Code */}
            <div className="border-b border-gray-100 py-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Promo Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  disabled={promoApplied}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 disabled:bg-gray-50"
                  placeholder="Enter code"
                />
                <button
                  type="button"
                  onClick={handlePromo}
                  disabled={promoApplied || !promoCode || promoBusy}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {promoApplied ? "Applied" : promoBusy ? "…" : "Apply"}
                </button>
              </div>
              {promoApplied && (
                <p className="mt-1 text-xs text-green-600">
                  {promoAppliedCode} applied — you saved ${promoDiscount.toFixed(2)}.
                </p>
              )}
              {promoError && (
                <p className="mt-1 text-xs text-red-600">{promoError}</p>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-2 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">${item.price.toFixed(2)}</span>
              </div>
              {promoApplied && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Promo ({promoAppliedCode})</span>
                  <span className="text-green-600">
                    -${promoDiscount.toFixed(2)}
                  </span>
                </div>
              )}
              {item.originalPrice && item.originalPrice > item.price && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Package savings</span>
                  <span className="text-green-600">
                    -${(item.originalPrice - item.price).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2">
                <div className="flex justify-between text-base font-bold">
                  <span className="text-gray-900">Total</span>
                  <span className="text-primary-600">
                    ${finalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

export default function CheckoutPage() {
  const stripePromise = getStripePromise();

  return (
    <div className="bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="mt-1 text-gray-500">
            Complete your payment securely
          </p>
        </div>

        <Elements
          stripe={stripePromise}
          options={{
            appearance: {
              theme: "stripe",
              variables: { colorPrimary: "#0E7490" },
            },
          }}
        >
          <CheckoutFormInner item={defaultItem} />
        </Elements>
      </div>
    </div>
  );
}
