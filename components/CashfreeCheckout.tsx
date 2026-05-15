"use client";

// Cashfree hosted-checkout launcher.
//
// Flow:
//   1. POST /api/payments/cashfree/create with order details
//   2. Server creates the Cashfree order, returns payment_session_id
//   3. We lazy-load https://sdk.cashfree.com/js/v3/cashfree.js
//   4. cashfree.checkout({ paymentSessionId, redirectTarget: "_modal" })
//      opens Cashfree's hosted UI in a modal overlay
//   5. After the patient pays (or aborts), Cashfree redirects them back
//      to our return_url with ?order_id=...
//   6. On return, we hit /api/payments/cashfree/verify?orderId=... so
//      the consultation is marked paid even if the webhook is slow.
//
// Defence-in-depth: the webhook is the source of truth for state
// changes, but the verify-on-return path lets the patient see an
// immediate confirmation rather than a "Pending" loop.

import { useEffect, useState } from "react";

const CDN = "https://sdk.cashfree.com/js/v3/cashfree.js";

type CheckoutOpts = {
  paymentSessionId: string;
  redirectTarget?: "_self" | "_blank" | "_top" | "_parent" | "_modal";
};
type CashfreeInstance = { checkout: (opts: CheckoutOpts) => Promise<unknown> };

declare global {
  interface Window {
    Cashfree?: (cfg: { mode: "production" | "sandbox" }) => CashfreeInstance;
  }
}

function loadCashfreeSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.Cashfree) return resolve();
    if (document.querySelector(`script[data-cf-sdk]`)) {
      // Already in flight from a previous mount — wait for it.
      const tick = () => {
        if (window.Cashfree) resolve();
        else setTimeout(tick, 100);
      };
      return tick();
    }
    const s = document.createElement("script");
    s.src = CDN;
    s.async = true;
    s.dataset.cfSdk = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load Cashfree SDK from ${CDN}`));
    document.head.appendChild(s);
  });
}

export interface CashfreeCheckoutProps {
  /** Booking id we already minted for this consultation. Used as
   *  the Cashfree order_id so the webhook can join back to it. */
  orderId: string;
  /** Amount in INR (or USD if you've enabled cross-border on the
   *  Cashfree account — but UPI requires INR). */
  amount: number;
  currency?: "INR" | "USD" | "EUR" | "GBP" | "SGD";
  /** Patient details — required by Cashfree's order creation API. */
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  /** Optional stable customer id — falls back to a hash of email. */
  customerId?: string;
  /** Description shown on the receipt + dashboards. */
  description: string;
  /** Identifies the booking type for the webhook handler. */
  type?: "consultation" | "clinic_subscription";
  /** Doctor id — needed for the 30 % commission split on consultations. */
  doctorId?: string;
  /** Called when the patient successfully pays (verified server-side). */
  onSuccess: () => void;
  /** Called on any failure — wrong card, dropped, gateway error. */
  onError: (msg: string) => void;
  /** Sandbox vs production. Defaults to "production" since that's
   *  what real bookings need; tests can override. */
  mode?: "production" | "sandbox";
}

/** Renders a Cashfree-branded "Pay" button. Clicking it creates the
 *  order on our server, opens Cashfree's checkout modal, and
 *  verifies the result when the patient returns. */
export default function CashfreeCheckout({
  orderId,
  amount,
  currency = "INR",
  customerName,
  customerEmail,
  customerPhone,
  customerId,
  description,
  type = "consultation",
  doctorId,
  onSuccess,
  onError,
  mode = "production",
}: CashfreeCheckoutProps) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "creating" | "launching" | "verifying">("idle");

  // If we landed back from a Cashfree return_url with ?order_id=...,
  // verify and short-circuit. The query lives one level up so the
  // BookingModal can also see it; we only react if it matches OUR
  // order id (prevents stale return URLs from triggering false
  // success).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const returnedOrder = sp.get("order_id");
    const provider = sp.get("provider");
    if (provider !== "cashfree" || returnedOrder !== orderId) return;

    setStatus("verifying");
    fetch(`/api/payments/cashfree/verify?orderId=${encodeURIComponent(orderId)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((j) => {
        if (j?.paid) onSuccess();
        else onError(`Payment not completed (status: ${j?.orderStatus || "unknown"}).`);
      })
      .catch((err) => onError((err as Error).message || "Verification failed"))
      .finally(() => setStatus("idle"));
    // We intentionally don't depend on onSuccess/onError to avoid
    // re-running on parent re-render. If the orderId changes we do
    // re-run, which is the right behaviour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const launch = async () => {
    setBusy(true);
    setStatus("creating");
    try {
      // 1. Create the order server-side. The server holds the
      //    secret key — we never send it from the browser.
      const createRes = await fetch("/api/payments/cashfree/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount,
          currency,
          orderId,
          customerName,
          customerEmail,
          customerPhone,
          customerId,
          description,
          doctorId,
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok || !created.paymentSessionId) {
        throw new Error(created.error || `Order creation failed (${createRes.status})`);
      }

      // 2. Lazy-load Cashfree's JS SDK. ~30 KB gzip, only fetched
      //    when an Indian patient actually clicks "Pay with Cashfree".
      setStatus("launching");
      await loadCashfreeSdk();
      const Cashfree = window.Cashfree;
      if (!Cashfree) throw new Error("Cashfree SDK failed to initialize");

      // 3. Launch hosted checkout. _modal opens an overlay rather
      //    than redirecting away from our booking flow.
      const cf = Cashfree({ mode });
      await cf.checkout({
        paymentSessionId: created.paymentSessionId,
        redirectTarget: "_modal",
      });

      // 4. After the modal closes (regardless of paid / cancelled),
      //    verify server-side. This is the second of two paths that
      //    can mark the consultation paid (the other is the webhook,
      //    which is the source of truth).
      setStatus("verifying");
      const verifyRes = await fetch(
        `/api/payments/cashfree/verify?orderId=${encodeURIComponent(orderId)}`,
        { cache: "no-store" },
      );
      const verified = await verifyRes.json();
      if (verified?.paid) {
        onSuccess();
      } else {
        onError(
          verified?.orderStatus === "ACTIVE"
            ? "You closed the payment window before completing it."
            : `Payment was not successful (status: ${verified?.orderStatus || "unknown"}).`,
        );
      }
    } catch (err) {
      onError((err as Error).message || "Cashfree checkout failed");
    } finally {
      setBusy(false);
      setStatus("idle");
    }
  };

  const label =
    status === "creating" ? "Preparing order…"
    : status === "launching" ? "Opening Cashfree…"
    : status === "verifying" ? "Verifying payment…"
    : `Pay ${currency === "INR" ? "₹" : currency + " "}${amount.toFixed(2)} via UPI / cards / netbanking`;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={launch}
        disabled={busy}
        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#6933FF] via-[#5b25e8] to-[#0e2a72] px-5 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
      >
        {/* Subtle shine sweep */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        />
        <span className="relative">🇮🇳</span>
        <span className="relative">{label}</span>
      </button>
      <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
        Powered by{" "}
        <span className="font-semibold text-[#6933FF]">Cashfree Payments</span>
        {" "}· Secure · 256-bit TLS · India&apos;s most trusted UPI gateway
      </p>
      <p className="text-center text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
        By paying you agree to Cashfree&apos;s{" "}
        <a href="https://www.cashfree.com/policies/terms-and-conditions" target="_blank" rel="noreferrer" className="underline hover:text-slate-700 dark:hover:text-slate-200">Terms</a>
        {" "}and{" "}
        <a href="https://www.cashfree.com/policies/privacy-policy" target="_blank" rel="noreferrer" className="underline hover:text-slate-700 dark:hover:text-slate-200">Privacy Policy</a>.
        OduDoc does not store your card details.
      </p>
    </div>
  );
}
