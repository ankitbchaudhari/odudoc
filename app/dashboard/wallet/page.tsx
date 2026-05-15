"use client";

// Patient wallet — top up + view balance + transaction history.

import { useCallback, useEffect, useState } from "react";

// Cashfree v3 SDK loader — uses the same CDN as components/
// CashfreeCheckout.tsx. The global window.Cashfree type is declared
// there; we just consume it here.
const CASHFREE_SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";

let sdkLoadPromise: Promise<void> | null = null;
function loadCashfreeSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Cashfree) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-cf-sdk="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Cashfree SDK")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = CASHFREE_SDK_URL;
    s.async = true;
    s.dataset.cfSdk = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
    document.head.appendChild(s);
  });
  return sdkLoadPromise;
}

/** Launch Cashfree's hosted checkout overlay. Production mode is
 *  hardcoded because the topup route only creates PROD sessions when
 *  CASHFREE_ENV=PROD on the server. Cashfree's webhook credits the
 *  wallet on payment.success — the user lands back on the wallet
 *  page via the returnUrl. */
async function launchCashfreeCheckout(paymentSessionId: string): Promise<void> {
  await loadCashfreeSdk();
  if (!window.Cashfree) {
    throw new Error("Cashfree SDK did not initialise");
  }
  const cashfree = window.Cashfree({ mode: "production" });
  await cashfree.checkout({ paymentSessionId, redirectTarget: "_self" });
}

// ─── Razorpay overlay for wallet top-ups ─────────────────────────────
// Mirrors components/RazorpayCheckout.tsx but inlined here because
// the wallet top-up has a different verify endpoint (credits the
// wallet instead of a booking). Reusing the same checkout.js loader
// pattern Cashfree uses above.

const RZP_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpayResp {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// Note: window.Razorpay is already declared globally in
// components/RazorpayCheckout.tsx. We don't redeclare it here to
// avoid TS2717 (subsequent declarations must match exactly). Use the
// same type indirectly through the global lookup.

interface RazorpayInstanceLike {
  open: () => void;
  on?: (event: string, cb: (e: unknown) => void) => void;
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.Razorpay) return resolve();
    const existing = document.querySelector(`script[src="${RZP_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("razorpay_js_failed")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = RZP_SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("razorpay_js_failed"));
    document.head.appendChild(s);
  });
}

async function launchRazorpayWalletCheckout(opts: {
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await loadRazorpayScript();
    if (!window.Razorpay) return { ok: false, error: "Razorpay SDK did not initialise" };
  } catch {
    return { ok: false, error: "Could not load Razorpay" };
  }

  return new Promise((resolve) => {
    // Cast through unknown because the global declaration in
    // RazorpayCheckout.tsx uses a stricter prop type than what we
    // need here (we only set a subset of options).
    const Ctor = window.Razorpay as unknown as new (opts: Record<string, unknown>) => RazorpayInstanceLike;
    const rz = new Ctor({
      key: opts.keyId,
      amount: opts.amountPaise,
      currency: opts.currency,
      order_id: opts.orderId,
      name: "OduDoc",
      description: "Wallet top-up",
      theme: { color: "#3D5CFF" },
      handler: async (resp: RazorpayResp) => {
        try {
          const v = await fetch("/api/wallet/razorpay-verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(resp),
          });
          const d = await v.json();
          if (!v.ok || !d.credited) {
            resolve({ ok: false, error: d.error || "Verification failed" });
            return;
          }
          resolve({ ok: true });
        } catch (e) {
          resolve({ ok: false, error: e instanceof Error ? e.message : "Verify network error" });
        }
      },
      modal: {
        ondismiss: () => {
          // User closed the modal without paying. Not an error;
          // surface a soft "cancelled" toast.
          resolve({ ok: false, error: "Cancelled — no money was charged." });
        },
      },
    });
    if (rz.on) {
      rz.on("payment.failed", (e: unknown) => {
        const eo = e as { error?: { description?: string; reason?: string } } | undefined;
        resolve({ ok: false, error: eo?.error?.description || eo?.error?.reason || "Payment failed" });
      });
    }
    rz.open();
  });
}

interface Wallet {
  userId: string; balanceRupees: number; bonusBalanceRupees: number;
  lifetimeToppedUp: number; lifetimeSpent: number;
  updatedAt: string; createdAt: string;
}
interface Tx {
  id: string; kind: string; amountRupees: number; bonusAppliedRupees?: number;
  balanceAfter: number; bonusBalanceAfter: number;
  category?: string; reference?: string; note?: string;
  providerSid?: string; createdAt: string;
}

const KIND_TONE: Record<string, string> = {
  topup: "bg-emerald-100 text-emerald-800",
  bonus: "bg-amber-100 text-amber-800",
  spend: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  refund: "bg-sky-100 text-sky-800",
  adjustment: "bg-violet-100 text-violet-800",
  expiry: "bg-rose-100 text-rose-800",
};
const KIND_LABEL: Record<string, string> = {
  topup: "Top-up", bonus: "Bonus", spend: "Spent", refund: "Refund",
  adjustment: "Adjustment", expiry: "Expired",
};

const TOPUP_PRESETS = [200, 500, 1000, 2500, 5000, 10000];

function fmtINR(n: number): string { return `₹${Math.round(n).toLocaleString("en-IN")}`; }

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [showTopup, setShowTopup] = useState(false);
  const [amount, setAmount] = useState<number>(500);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  /** Orders we kicked off via Cashfree/Stripe that may or may not
   *  have credited. Read from localStorage on mount; cleared per
   *  order as each is verified. */
  const [pendingOrders, setPendingOrders] = useState<
    Array<{ orderId: string; amount: number; gateway: string; startedAt: number }>
  >([]);
  const [verifyingOrder, setVerifyingOrder] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/wallet", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setWallet(d.wallet);
      setTxs(d.transactions || []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Read any in-flight topup orders from localStorage on mount. Each
  // entry was written right before we redirected to Cashfree, so they
  // represent payments the user initiated. If any haven't been
  // confirmed (no matching tx in wallet history), we'll offer a
  // one-click recovery button.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("odudoc:pending-topups");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Array<{ orderId: string; amount: number; gateway: string; startedAt: number }>;
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      setPendingOrders(parsed.filter((p) => p.startedAt > cutoff));
    } catch { /* ignore parse errors */ }
  }, []);

  // Clear pending orders aggressively. Three independent rules drop
  // an entry from the banner; any hit clears it.
  //
  //  1. ProviderSid match — webhook-fired wallet credit carries the
  //     same orderId as providerSid. Trivially exact.
  //  2. Amount + time match — Stripe top-ups store a different
  //     provider id (pi_*) than the orderId we stashed in
  //     localStorage. So we also clear when a topup tx with the
  //     same rupee amount landed within 10 minutes of startedAt.
  //  3. Stripe entries get cleared regardless after 2 minutes —
  //     /verify only knows how to read Cashfree orders. The Stripe
  //     webhook is the authoritative path for those, and it usually
  //     fires within seconds. Past 2 minutes without a matching
  //     tx, the entry is stale.
  useEffect(() => {
    if (pendingOrders.length === 0) return;
    const confirmedSids = new Set(
      txs.filter((t) => t.kind === "topup" && t.providerSid).map((t) => t.providerSid),
    );
    const now = Date.now();
    const stillPending = pendingOrders.filter((p) => {
      if (confirmedSids.has(p.orderId)) return false;
      // Amount + time proximity fallback.
      const matchByAmount = txs.some((t) => {
        if (t.kind !== "topup") return false;
        if (t.amountRupees !== p.amount) return false;
        const dt = Math.abs(new Date(t.createdAt).getTime() - p.startedAt);
        return dt <= 10 * 60 * 1000;
      });
      if (matchByAmount) return false;
      // Stripe stale-entry sweep — webhook is the source of truth
      // and we have no verify endpoint to retry from the client.
      if (p.gateway === "stripe" && now - p.startedAt > 2 * 60 * 1000) return false;
      return true;
    });
    if (stillPending.length !== pendingOrders.length) {
      setPendingOrders(stillPending);
      try {
        localStorage.setItem("odudoc:pending-topups", JSON.stringify(stillPending));
      } catch { /* ignore */ }
    }
  }, [pendingOrders, txs]);

  // Hide the banner during the first ~3 minutes of every Cashfree
  // top-up's life — the webhook usually fires within seconds, so
  // surfacing "may not have credited" immediately is noisy and wrong.
  // Past 3 minutes without a match, the warning is legitimate.
  // After 30 minutes, the warning is no longer useful — Cashfree's
  // webhook either fired by now or it never will. Silently drop
  // anything older than the abandon-window so the banner doesn't
  // turn into a permanent clutter of yesterday's failed attempts.
  // (Razorpay entries are filtered separately — they complete inline
  // so they never belong in this banner regardless of age.)
  const STUCK_GRACE_MS = 3 * 60 * 1000;          // 3 min — show banner after this
  const ABANDON_AFTER_MS = 30 * 60 * 1000;       // 30 min — auto-drop after this

  // Self-cleaning: every render, sweep entries older than the
  // abandon window out of state + localStorage. Keeps the cleanup
  // automatic without forcing the user to click "Dismiss" on
  // anything ancient.
  useEffect(() => {
    const stale = pendingOrders.filter(
      (p) => Date.now() - p.startedAt > ABANDON_AFTER_MS || p.gateway === "razorpay",
    );
    if (stale.length === 0) return;
    const fresh = pendingOrders.filter((p) => !stale.includes(p));
    setPendingOrders(fresh);
    try {
      localStorage.setItem("odudoc:pending-topups", JSON.stringify(fresh));
    } catch { /* ignore */ }
    // Run once on mount; the deps reference primitives so this won't
    // infinite-loop. Subsequent visits naturally re-trigger via the
    // page mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visiblePendingOrders = pendingOrders.filter(
    (p) =>
      p.gateway !== "razorpay" &&
      Date.now() - p.startedAt > STUCK_GRACE_MS &&
      Date.now() - p.startedAt <= ABANDON_AFTER_MS,
  );

  // Dismiss every stuck entry at once — useful when many Razorpay
  // attempts piled up before the fix above shipped.
  const dismissAllPending = useCallback(() => {
    setPendingOrders([]);
    try {
      localStorage.setItem("odudoc:pending-topups", "[]");
    } catch { /* ignore */ }
  }, []);

  const verifyPending = useCallback(async (orderId: string) => {
    setVerifyingOrder(orderId);
    try {
      const r = await fetch(`/api/payments/cashfree/verify?orderId=${encodeURIComponent(orderId)}`, {
        cache: "no-store",
      });
      const d = await r.json();
      if (d.paid) {
        setToast({ kind: "ok", text: `Recovered — ₹${d.amount} credited to your wallet.` });
        // Drop this orderId from pending and persist.
        const next = pendingOrders.filter((p) => p.orderId !== orderId);
        setPendingOrders(next);
        try {
          localStorage.setItem("odudoc:pending-topups", JSON.stringify(next));
        } catch { /* ignore */ }
        await load();
      } else if (d.orderStatus === "ACTIVE") {
        setToast({ kind: "err", text: "Payment is still being confirmed. Try again in 30 seconds." });
      } else {
        setToast({
          kind: "err",
          text: `Cashfree status: ${d.orderStatus || "unknown"}. If money was debited, contact support with order ${orderId}.`,
        });
      }
    } catch (err) {
      setToast({ kind: "err", text: `Verify failed. Try again or contact support with order ${orderId}.` });
      console.error("[wallet] verify failed", err);
    } finally {
      setVerifyingOrder(null);
    }
  }, [load, pendingOrders]);

  const dismissPending = useCallback((orderId: string) => {
    const next = pendingOrders.filter((p) => p.orderId !== orderId);
    setPendingOrders(next);
    try {
      localStorage.setItem("odudoc:pending-topups", JSON.stringify(next));
    } catch { /* ignore */ }
  }, [pendingOrders]);

  // If we just came back from Cashfree's hosted checkout, the URL
  // carries ?topup=<orderId>. Hit the verify endpoint to:
  //   1. Confirm the order is PAID with Cashfree (source of truth)
  //   2. Credit the wallet if the webhook hasn't yet (idempotent)
  //   3. Reload the wallet so the new balance shows
  // This closes the "real money debited but wallet shows nothing"
  // failure mode when Cashfree's webhook delivery is slow or blocked.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const topupOrder = params.get("topup");
    if (!topupOrder) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/payments/cashfree/verify?orderId=${encodeURIComponent(topupOrder)}`, {
          cache: "no-store",
        });
        const d = await r.json();
        if (cancelled) return;
        if (d.paid) {
          setToast({ kind: "ok", text: `Payment confirmed — ₹${d.amount} credited.` });
          await load();
        } else if (d.orderStatus === "ACTIVE") {
          setToast({ kind: "err", text: "Payment is still being confirmed by Cashfree. Refresh in 30 seconds." });
        } else {
          setToast({ kind: "err", text: `Payment status: ${d.orderStatus}. If money was debited, contact support with order ${topupOrder}.` });
        }
      } catch (err) {
        if (!cancelled) {
          setToast({
            kind: "err",
            text: `Couldn't verify payment. If money was debited, contact support with order ${topupOrder}.`,
          });
          console.error("[wallet] verify failed", err);
        }
      } finally {
        // Strip the ?topup= query so a refresh doesn't re-verify.
        const url = new URL(window.location.href);
        url.searchParams.delete("topup");
        url.searchParams.delete("topup_cancelled");
        window.history.replaceState({}, "", url.toString());
      }
    })();
    return () => { cancelled = true; };
  }, [load]);

  const topup = async (gateway?: "cashfree" | "stripe" | "razorpay") => {
    setBusy(true);
    try {
      // Pass the user-selected gateway through to the route. Falls
      // back to country-based auto-pick on the server when no
      // explicit choice is sent.
      const r = await fetch("/api/wallet/topup-create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountRupees: amount, gateway }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.mode === "live") {
          // Stripe / legacy Cashfree returns a paymentLink → simple
          // redirect. Cashfree v3 returns a paymentSessionId → we
          // load their JS SDK at runtime and call .checkout().
          //
          // Before redirecting, persist the orderId to localStorage
          // so the wallet page can offer "Recover stuck payment" if
          // the webhook fails AND the redirect somehow loses the
          // ?topup= query string. 24-hour TTL.
          if (d.orderId) {
            try {
              const pending = JSON.parse(localStorage.getItem("odudoc:pending-topups") || "[]");
              pending.push({ orderId: d.orderId, amount, gateway: d.gateway, startedAt: Date.now() });
              // Keep only last 10 attempts within the last 24h.
              const cutoff = Date.now() - 24 * 60 * 60 * 1000;
              const trimmed = pending.filter((p: { startedAt: number }) => p.startedAt > cutoff).slice(-10);
              localStorage.setItem("odudoc:pending-topups", JSON.stringify(trimmed));
            } catch { /* localStorage full / blocked — non-fatal */ }
          }
          if (d.gateway === "razorpay" && d.razorpayOrderId) {
            // Razorpay path — load checkout.js, open the modal, then
            // verify via /api/wallet/razorpay-verify on success. The
            // server-side verify is what actually credits the wallet
            // (idempotent on payment id) so a refresh after success
            // doesn't double-credit.
            const ok = await launchRazorpayWalletCheckout({
              orderId: d.razorpayOrderId,
              amountPaise: d.amountPaise,
              currency: d.currency || "INR",
              keyId: d.keyId,
            });
            // Razorpay completes inline (success / cancel / fail are
            // all known by the time launchRazorpayWalletCheckout
            // resolves). The async-recovery banner is meaningless for
            // Razorpay — drop the pending entry regardless of outcome
            // so it doesn't pile up across abandoned modals.
            try {
              const remaining = JSON.parse(localStorage.getItem("odudoc:pending-topups") || "[]");
              const next = remaining.filter((p: { orderId: string }) => p.orderId !== d.orderId);
              localStorage.setItem("odudoc:pending-topups", JSON.stringify(next));
              setPendingOrders(next);
            } catch { /* localStorage blocked — non-fatal */ }
            if (ok.ok) {
              setToast({ kind: "ok", text: `Wallet credited ₹${amount} (+ 5% bonus).` });
              setShowTopup(false);
              await load();
            } else {
              setToast({ kind: "err", text: ok.error });
            }
            return;
          }
          if (d.paymentLink) {
            window.location.href = d.paymentLink;
            return;
          }
          if (d.gateway === "cashfree" && d.paymentSessionId) {
            await launchCashfreeCheckout(d.paymentSessionId);
            return;
          }
          setToast({ kind: "err", text: "Payment session created but no checkout target. Contact support." });
          console.error("[wallet topup] live response missing paymentLink/paymentSessionId", d);
          return;
        }
        // sandbox path — wallet credited inline
        setToast({ kind: "ok", text: `Topped up ₹${amount} (sandbox).` });
        setShowTopup(false);
        await load();
      } else {
        const body = await r.json().catch(() => ({} as Record<string, unknown>));
        // Tell the user exactly WHICH gateway choked + nudge them to
        // try a different one. Earlier we showed a generic "Payment
        // gateway is unreachable" toast which gave no clue whether
        // the issue was with the gateway they clicked or the whole
        // payment system, so they retried the same broken option.
        const gatewayLabel = gateway === "razorpay" ? "Razorpay"
          : gateway === "cashfree" ? "Cashfree"
          : gateway === "stripe" ? "Stripe"
          : "the payment gateway";
        const alternatives = ["cashfree", "razorpay", "stripe"]
          .filter((g) => g !== gateway)
          .map((g) => g === "cashfree" ? "Cashfree" : g === "razorpay" ? "Razorpay" : "Stripe");
        const altSuggestion = alternatives.length > 0
          ? ` Try ${alternatives.join(" or ")} instead.`
          : "";

        const statusFallback =
          r.status === 502 ? `${gatewayLabel} is unreachable right now.${altSuggestion}`
          : r.status === 504 ? `${gatewayLabel} took too long to respond.${altSuggestion}`
          : r.status === 429 ? "Too many top-up attempts. Please wait a minute and try again."
          : r.status >= 500 ? `${gatewayLabel} had a server error.${altSuggestion}`
          : null;
        const userMsg = (body.message as string | undefined)
          || (body.error === "payment_gateway_auth_failed" ? `${gatewayLabel} rejected our credentials — they may need rotation.${altSuggestion}` : null)
          || (body.error === "payment_gateway_timeout" ? `${gatewayLabel} is slow right now.${altSuggestion}` : null)
          || (body.error === "payment_gateway_unreachable" ? `Couldn't reach ${gatewayLabel}.${altSuggestion}` : null)
          || (body.error === "invalid_amount" ? "Top-up must be between ₹100 and ₹50,000." : null)
          || statusFallback
          || `Top-up via ${gatewayLabel} failed (${(body.error as string | undefined) || r.status}).${altSuggestion}`;
        setToast({ kind: "err", text: userMsg });
        // Operator diagnostic — only logged client-side, not shown.
        if (body.diagnostic) console.warn("[wallet topup]", body.diagnostic);
      }
    } finally { setBusy(false); }
  };

  // Self-serve cleanup for the bogus sandbox credits the earlier
  // auto-fallback minted on every Cashfree 401. Wipes the patient's
  // own wallet only (server checks the session). Rebuilds a fresh
  // ₹0 account so the UI re-renders without a second fetch.
  const resetWallet = async () => {
    if (!confirm("Reset wallet to ₹0? This clears any sandbox / test credits that were added without a real payment. This can't be undone.")) {
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/wallet/reset", { method: "POST" });
      if (r.ok) {
        setToast({ kind: "ok", text: "Wallet reset to zero." });
        await load();
      } else {
        const body = await r.json().catch(() => ({}));
        setToast({ kind: "err", text: (body as { message?: string }).message || "Couldn't reset the wallet." });
      }
    } finally { setBusy(false); }
  };

  if (!wallet) return <div className="mx-auto max-w-3xl p-6"><p className="text-sm text-slate-400">Loading…</p></div>;

  const totalSpendable = wallet.balanceRupees + wallet.bonusBalanceRupees;
  const bonusOnAmount = Math.round((amount * 5) / 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
    <div className="mx-auto max-w-3xl px-4 py-8">
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-8 flex items-start gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white p-3 rounded-2xl shadow-lg shadow-indigo-500/30 text-2xl">💳</div>
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-300 dark:to-purple-300 bg-clip-text text-transparent">OduDoc Wallet</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Top up once, pay across consults / pharmacy / lab tests. Get <strong>5% bonus</strong> on every top-up.
          </p>
        </div>
      </div>

      {/* Pending topup recovery — surfaces orders started in the last
          24h that haven't yet appeared in the transaction history.
          Most often these are Cashfree payments where the patient
          completed checkout but the webhook hasn't fired (or fired
          but failed signature verification). One click hits /verify
          which is idempotent and credits the wallet if Cashfree
          confirms the order is PAID. */}
      {visiblePendingOrders.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <span className="text-xl" aria-hidden>⚠️</span>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  {visiblePendingOrders.length === 1 ? "1 payment may not have credited" : `${visiblePendingOrders.length} payments may not have credited`}
                </p>
                {visiblePendingOrders.length > 1 && (
                  <button
                    onClick={dismissAllPending}
                    className="rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300 ring-1 ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Dismiss all
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                You started these top-ups more than 3 minutes ago and they haven't shown up in your transaction history yet. If you completed the payment, click <strong>Verify</strong>. If you cancelled, click <strong>Dismiss</strong>.
              </p>
              <ul className="mt-3 space-y-2">
                {visiblePendingOrders.map((p) => (
                  <li
                    key={p.orderId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white dark:bg-slate-900 p-3 ring-1 ring-amber-200 dark:ring-amber-900/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        ₹{p.amount.toLocaleString()} via {p.gateway === "cashfree" ? "Cashfree" : p.gateway === "stripe" ? "Stripe" : p.gateway}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[10.5px] text-slate-500 dark:text-slate-400">
                        {p.orderId} · {new Date(p.startedAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => verifyPending(p.orderId)}
                        disabled={verifyingOrder === p.orderId}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {verifyingOrder === p.orderId ? "Checking…" : "Verify & credit"}
                      </button>
                      <button
                        onClick={() => dismissPending(p.orderId)}
                        className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300 ring-1 ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        Dismiss
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Balance card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-700 to-fuchsia-700 p-6 text-white shadow-2xl shadow-indigo-500/30">
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-fuchsia-400/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-indigo-300/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute top-10 right-1/3 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-wider opacity-80">Available balance</p>
          <p className="mt-2 text-5xl font-extrabold drop-shadow-md">{fmtINR(totalSpendable)}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-white/15 p-3 backdrop-blur ring-1 ring-white/20">
              <p className="opacity-80">Primary balance</p>
              <p className="mt-0.5 text-lg font-bold">{fmtINR(wallet.balanceRupees)}</p>
            </div>
            <div className="rounded-xl bg-white/15 p-3 backdrop-blur ring-1 ring-white/20">
              <p className="opacity-80">Bonus credits</p>
              <p className="mt-0.5 text-lg font-bold">{fmtINR(wallet.bonusBalanceRupees)}</p>
            </div>
          </div>
          <button onClick={() => setShowTopup(true)} className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-indigo-700 shadow-lg hover:shadow-xl hover:bg-indigo-50 transition">
            + Add money
          </button>
          {totalSpendable > 0 && (
            <button
              onClick={resetWallet}
              disabled={busy}
              className="mt-2 w-full rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-[12px] font-semibold text-white/90 backdrop-blur transition-colors hover:bg-white/20 disabled:opacity-60"
              title="Wipe sandbox / test credits that were added without a real payment"
            >
              Reset wallet (clear sandbox credits)
            </button>
          )}
        </div>
      </div>

      {/* Lifetime stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-4 ring-1 ring-emerald-100 dark:ring-emerald-900/40 shadow-sm hover:shadow-md transition">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Lifetime added</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700 dark:text-emerald-200 tabular-nums">{fmtINR(wallet.lifetimeToppedUp)}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/30 p-4 ring-1 ring-rose-100 dark:ring-rose-900/40 shadow-sm hover:shadow-md transition">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Lifetime spent</p>
          <p className="mt-1 text-2xl font-extrabold text-rose-700 dark:text-rose-200 tabular-nums">{fmtINR(wallet.lifetimeSpent)}</p>
        </div>
      </div>

      {/* Transaction history */}
      <section className="mt-8 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition ring-1 ring-slate-200 dark:ring-slate-800">
        <p className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">Recent activity</p>
        {txs.length === 0 ? (
          <p className="rounded-lg bg-slate-50 dark:bg-slate-900 p-4 text-sm text-slate-500 dark:text-slate-400">No transactions yet. Top up to get started.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {txs.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${KIND_TONE[t.kind]}`}>{KIND_LABEL[t.kind]}</span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {t.kind === "spend" ? `−${fmtINR(t.amountRupees)}` :
                       t.kind === "refund" ? `+${fmtINR(t.amountRupees)}` :
                       `${t.kind === "topup" || t.kind === "bonus" ? "+" : ""}${fmtINR(t.amountRupees)}`}
                    </p>
                  </div>
                  {t.note && <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{t.note}</p>}
                  {t.bonusAppliedRupees !== undefined && t.bonusAppliedRupees > 0 && (
                    <p className="text-[10px] text-amber-700">{fmtINR(t.bonusAppliedRupees)} from bonus</p>
                  )}
                  {t.category && <p className="text-[10px] text-slate-400">→ {t.category.replace("_", " ")}</p>}
                </div>
                <p className="text-[10px] text-slate-400">{new Date(t.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Top-up dialog */}
      {showTopup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setShowTopup(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Add money</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Get a <strong className="text-amber-700">5% bonus</strong> on every top-up.</p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {TOPUP_PRESETS.map((p) => (
                <button key={p} onClick={() => setAmount(p)} className={`rounded-lg border-2 p-2 text-sm font-bold ${amount === p ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"}`}>
                  ₹{p.toLocaleString("en-IN")}
                </button>
              ))}
            </div>
            <input type="number" min={100} max={50000} value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-2xl font-bold" />

            <div className="mt-4 rounded-md bg-slate-50 dark:bg-slate-900 p-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">Top-up</span><span className="font-mono">{fmtINR(amount)}</span></div>
              <div className="flex justify-between text-amber-700"><span>+ 5% bonus</span><span className="font-mono">+{fmtINR(bonusOnAmount)}</span></div>
              <div className="mt-1 flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1 text-base font-bold">
                <span>You get</span>
                <span className="font-mono">{fmtINR(amount + bonusOnAmount)}</span>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
              Choose your payment method. UPI / cards / netbanking on Razorpay or Cashfree (best for India). International cards and Apple Pay / Google Pay work via Stripe.
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <button
                onClick={() => topup("razorpay")}
                disabled={busy || amount < 100 || amount > 50000}
                className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-r from-[#072654] via-[#1f3e8c] to-[#3D5CFF] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl disabled:opacity-50 disabled:shadow-none"
              >
                <span className="text-[11px] font-medium uppercase tracking-wider opacity-80">Pay with</span>
                <span className="text-base">🇮🇳 Razorpay</span>
                <span className="mt-0.5 text-[10px] opacity-75">UPI · Cards · Netbanking</span>
              </button>
              <button
                onClick={() => topup("cashfree")}
                disabled={busy || amount < 100 || amount > 50000}
                className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-700 hover:via-sky-700 hover:to-cyan-700 hover:shadow-xl disabled:opacity-50 disabled:shadow-none"
              >
                <span className="text-[11px] font-medium uppercase tracking-wider opacity-80">Pay with</span>
                <span className="text-base">💳 Cashfree</span>
                <span className="mt-0.5 text-[10px] opacity-75">UPI · RuPay · Indian cards</span>
              </button>
              <button
                onClick={() => topup("stripe")}
                disabled={busy || amount < 100 || amount > 50000}
                className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/30 transition hover:from-purple-700 hover:via-violet-700 hover:to-fuchsia-700 hover:shadow-xl disabled:opacity-50 disabled:shadow-none"
              >
                <span className="text-[11px] font-medium uppercase tracking-wider opacity-80">Pay with</span>
                <span className="text-base">💎 Stripe</span>
                <span className="mt-0.5 text-[10px] opacity-75">Intl cards · Apple Pay · GPay</span>
              </button>
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={() => setShowTopup(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 dark:border-slate-700">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
