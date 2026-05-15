"use client";

// Razorpay Standard Web Checkout button.
//
// Flow:
//   1. User clicks → POST /api/payments/razorpay/create-order with
//      amount + receipt → response: { orderId, amount, currency, keyId }
//   2. Load https://checkout.razorpay.com/v1/checkout.js (cached after
//      first checkout opens)
//   3. Instantiate `window.Razorpay({...})` with our orderId + keyId
//      and call .open() — Razorpay's iframe modal renders.
//   4. On success handler: POST /api/payments/razorpay/verify with the
//      three Razorpay-supplied ids. Only after the server returns
//      `verified: true` do we report success up to the parent (e.g.
//      BookingModal advancing to the OTP step).

import { useCallback, useState } from "react";

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// Minimal shape of the global the checkout.js script attaches.
interface RazorpayCtorOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler?: (resp: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayInstance {
  open: () => void;
  on?: (event: string, cb: (e: unknown) => void) => void;
}
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCtorOptions) => RazorpayInstance;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckoutScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.Razorpay) return resolve();
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("checkout_js_failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("checkout_js_failed"));
    document.head.appendChild(s);
  });
}

export interface RazorpayCheckoutProps {
  /** Amount in INR (rupees). We convert to paise on the wire. */
  amountInr: number;
  /** Currency code — defaults to INR. Razorpay supports many; for v1
   *  we expose only INR through the UI. */
  currency?: "INR";
  receipt?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
  /** Booking id — threaded through to the verify endpoint so the
   *  signature-verified payment can mark the right booking paid. */
  bookingId?: string;
  /** Free-form notes surfaced in the Razorpay dashboard. */
  notes?: Record<string, string>;
  onSuccess: (info: { orderId: string; paymentId: string }) => void;
  onError: (message: string) => void;
}

export default function RazorpayCheckout({
  amountInr,
  currency = "INR",
  receipt,
  customerName,
  customerEmail,
  customerPhone,
  description,
  bookingId,
  notes,
  onSuccess,
  onError,
}: RazorpayCheckoutProps) {
  const [status, setStatus] = useState<"idle" | "creating" | "launching" | "verifying">("idle");

  const launch = useCallback(async () => {
    setStatus("creating");
    try {
      const amountPaise = Math.round(amountInr * 100);
      const r = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPaise,
          currency,
          receipt: receipt || `od_${Date.now()}`,
          notes,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        onError(data.error || "Failed to create order");
        setStatus("idle");
        return;
      }

      await loadCheckoutScript();
      if (!window.Razorpay) {
        onError("Razorpay SDK failed to load");
        setStatus("idle");
        return;
      }

      setStatus("launching");
      const rz = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "OduDoc",
        description: description || "Consultation",
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        notes,
        theme: { color: "#3D5CFF" },
        handler: async (resp: RazorpayResponse) => {
          setStatus("verifying");
          try {
            const v = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
                bookingId,
              }),
            });
            const vData = await v.json();
            if (!v.ok || !vData.verified) {
              onError(vData.error || "Payment verification failed");
              setStatus("idle");
              return;
            }
            onSuccess({ orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id });
          } catch (e) {
            onError(e instanceof Error ? e.message : "Network error during verification");
          } finally {
            setStatus("idle");
          }
        },
        modal: {
          ondismiss: () => {
            // Patient closed the modal without paying. Not an error —
            // just reset our local state so they can retry.
            setStatus("idle");
          },
        },
      });
      // Surface payment.failed events from the Razorpay iframe so we
      // can show a real error instead of the silent dismiss.
      if (rz.on) {
        rz.on("payment.failed", (e: unknown) => {
          const eo = e as { error?: { description?: string; reason?: string } } | undefined;
          onError(eo?.error?.description || eo?.error?.reason || "Payment failed");
          setStatus("idle");
        });
      }
      rz.open();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not start Razorpay");
      setStatus("idle");
    }
  }, [
    amountInr, currency, receipt, customerName, customerEmail, customerPhone,
    description, bookingId, notes, onSuccess, onError,
  ]);

  const label =
    status === "creating" ? "Preparing order…"
    : status === "launching" ? "Opening Razorpay…"
    : status === "verifying" ? "Verifying payment…"
    : `Pay ₹${amountInr.toFixed(2)} via UPI / cards / netbanking`;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={launch}
        disabled={status !== "idle"}
        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#072654] via-[#1f3e8c] to-[#3D5CFF] px-5 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        />
        <span className="relative">🇮🇳</span>
        <span className="relative">{label}</span>
      </button>
      <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
        Powered by{" "}
        <span className="font-semibold text-[#3D5CFF]">Razorpay</span>
        {" "}· Secure · 256-bit TLS · India&apos;s most trusted payments gateway
      </p>
      <p className="text-center text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
        By paying you agree to Razorpay&apos;s{" "}
        <a href="https://razorpay.com/terms" target="_blank" rel="noreferrer" className="underline hover:text-slate-700 dark:hover:text-slate-200">Terms</a>
        {" "}and{" "}
        <a href="https://razorpay.com/privacy" target="_blank" rel="noreferrer" className="underline hover:text-slate-700 dark:hover:text-slate-200">Privacy Policy</a>.
        OduDoc does not store your card details.
      </p>
    </div>
  );
}
