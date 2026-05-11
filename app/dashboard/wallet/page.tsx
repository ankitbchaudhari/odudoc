"use client";

// Patient wallet — top up + view balance + transaction history.

import { useCallback, useEffect, useState } from "react";

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
  spend: "bg-slate-100 text-slate-700",
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

  const load = useCallback(async () => {
    const r = await fetch("/api/wallet", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setWallet(d.wallet);
      setTxs(d.transactions || []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const topup = async () => {
    setBusy(true);
    try {
      // Try the gateway-aware endpoint first; falls back to demo credit
      // when Cashfree creds aren't configured.
      const r = await fetch("/api/wallet/topup-create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountRupees: amount }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.mode === "live" && d.paymentLink) {
          // Hand off to Cashfree's hosted checkout. The webhook
          // credits the wallet on payment.success.
          window.location.href = d.paymentLink;
          return;
        }
        // sandbox path — wallet credited inline
        setToast({ kind: "ok", text: `Topped up ₹${amount} (sandbox).` });
        setShowTopup(false);
        await load();
      } else {
        const body = await r.json().catch(() => ({} as Record<string, unknown>));
        // Surface the user-friendly message when the API provides one;
        // suppress raw Cashfree internals from the patient's view.
        // When the response wasn't JSON (Vercel edge 502 / 504) we
        // synthesise a plain-English fallback for the common HTTP
        // statuses so the toast never shows just "(502)".
        const statusFallback =
          r.status === 502 ? "Payment gateway is unreachable right now. Please try again in a moment."
          : r.status === 504 ? "Payment gateway took too long to respond. Please try again."
          : r.status === 429 ? "Too many top-up attempts. Please wait a minute and try again."
          : r.status >= 500 ? "Something went wrong on our side. Please try again in a moment."
          : null;
        const userMsg = (body.message as string | undefined)
          || (body.error === "payment_gateway_auth_failed" ? "Payment gateway temporarily unavailable. Please try again shortly." : null)
          || (body.error === "payment_gateway_timeout" ? "Payment gateway is slow right now. Please try again in a moment." : null)
          || (body.error === "payment_gateway_unreachable" ? "Couldn't reach the payment gateway. Please try again." : null)
          || (body.error === "invalid_amount" ? "Top-up must be between ₹100 and ₹50,000." : null)
          || statusFallback
          || `Top-up failed (${(body.error as string | undefined) || r.status}).`;
        setToast({ kind: "err", text: userMsg });
        // Operator diagnostic — only logged client-side, not shown.
        if (body.diagnostic) console.warn("[wallet topup]", body.diagnostic);
      }
    } finally { setBusy(false); }
  };

  if (!wallet) return <div className="mx-auto max-w-3xl p-6"><p className="text-sm text-slate-400">Loading…</p></div>;

  const totalSpendable = wallet.balanceRupees + wallet.bonusBalanceRupees;
  const bonusOnAmount = Math.round((amount * 5) / 100);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">OduDoc Wallet</h1>
        <p className="mt-1 text-sm text-slate-500">
          Top up once, pay across consults / pharmacy / lab tests. Get <strong>5% bonus</strong> on every top-up.
        </p>
      </div>

      {/* Balance card */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-700 to-fuchsia-700 p-6 text-white shadow-xl">
        <p className="text-xs font-bold uppercase tracking-wider opacity-80">Available balance</p>
        <p className="mt-2 text-5xl font-extrabold">{fmtINR(totalSpendable)}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg bg-white/15 p-3 backdrop-blur">
            <p className="opacity-80">Primary balance</p>
            <p className="mt-0.5 text-lg font-bold">{fmtINR(wallet.balanceRupees)}</p>
          </div>
          <div className="rounded-lg bg-white/15 p-3 backdrop-blur">
            <p className="opacity-80">Bonus credits</p>
            <p className="mt-0.5 text-lg font-bold">{fmtINR(wallet.bonusBalanceRupees)}</p>
          </div>
        </div>
        <button onClick={() => setShowTopup(true)} className="mt-4 w-full rounded-lg bg-white px-4 py-3 text-sm font-bold text-indigo-700 shadow-md">
          + Add money
        </button>
      </div>

      {/* Lifetime stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Lifetime added</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{fmtINR(wallet.lifetimeToppedUp)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Lifetime spent</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{fmtINR(wallet.lifetimeSpent)}</p>
        </div>
      </div>

      {/* Transaction history */}
      <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm font-bold text-slate-900">Recent activity</p>
        {txs.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No transactions yet. Top up to get started.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {txs.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${KIND_TONE[t.kind]}`}>{KIND_LABEL[t.kind]}</span>
                    <p className="text-sm font-semibold text-slate-900">
                      {t.kind === "spend" ? `−${fmtINR(t.amountRupees)}` :
                       t.kind === "refund" ? `+${fmtINR(t.amountRupees)}` :
                       `${t.kind === "topup" || t.kind === "bonus" ? "+" : ""}${fmtINR(t.amountRupees)}`}
                    </p>
                  </div>
                  {t.note && <p className="mt-0.5 text-xs text-slate-600">{t.note}</p>}
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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Add money</h3>
            <p className="mt-1 text-xs text-slate-500">Get a <strong className="text-amber-700">5% bonus</strong> on every top-up.</p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {TOPUP_PRESETS.map((p) => (
                <button key={p} onClick={() => setAmount(p)} className={`rounded-lg border-2 p-2 text-sm font-bold ${amount === p ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-700"}`}>
                  ₹{p.toLocaleString("en-IN")}
                </button>
              ))}
            </div>
            <input type="number" min={100} max={50000} value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-2xl font-bold" />

            <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">Top-up</span><span className="font-mono">{fmtINR(amount)}</span></div>
              <div className="flex justify-between text-amber-700"><span>+ 5% bonus</span><span className="font-mono">+{fmtINR(bonusOnAmount)}</span></div>
              <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 text-base font-bold">
                <span>You get</span>
                <span className="font-mono">{fmtINR(amount + bonusOnAmount)}</span>
              </div>
            </div>

            <p className="mt-3 text-[10px] text-slate-500">In production this would route through Cashfree / Stripe. Demo credits the wallet directly.</p>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowTopup(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button onClick={topup} disabled={busy || amount < 100 || amount > 50000} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {busy ? "Adding…" : `Pay ${fmtINR(amount)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
