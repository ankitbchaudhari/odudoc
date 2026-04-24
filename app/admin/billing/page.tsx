"use client";

import { useEffect, useState } from "react";

interface Sub {
  planTier: string;
  status: string;
  currentPeriodEnd?: string;
  trialEnd?: string;
  cancelAtPeriodEnd?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  lastInvoiceAmount?: number;
  lastInvoicePaidAt?: string;
}

interface StatusResp {
  subscription: Sub | null;
  blocked: boolean;
}

const PLANS = [
  { id: "starter", name: "Starter", price: "$49 / mo", envKey: "NEXT_PUBLIC_STRIPE_PRICE_STARTER", desc: "Small clinic — up to 5 staff.", emoji: "🌱" },
  { id: "clinic", name: "Clinic", price: "$199 / mo", envKey: "NEXT_PUBLIC_STRIPE_PRICE_CLINIC", desc: "Multi-doctor clinic with pharmacy + lab.", emoji: "🏥" },
  { id: "hospital", name: "Hospital", price: "$799 / mo", envKey: "NEXT_PUBLIC_STRIPE_PRICE_HOSPITAL", desc: "Full hospital ERP — IPD, OR, ICU, billing.", emoji: "🏨" },
  { id: "enterprise", name: "Enterprise", price: "Custom", envKey: "NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE", desc: "Multi-facility, SSO, dedicated support.", emoji: "✨" },
];

const STATUS_THEME: Record<string, { pill: string; dot: string }> = {
  active: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  trialing: { pill: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
  past_due: { pill: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  canceled: { pill: "bg-slate-50 text-slate-700 ring-slate-200", dot: "bg-slate-400" },
  incomplete: { pill: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
};

export default function BillingPage() {
  const [state, setState] = useState<StatusResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/hospital/billing/status");
    if (r.ok) setState(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function checkout(priceEnv: string) {
    setBusy(true); setErr(null);
    const priceId = (process.env as Record<string, string | undefined>)[priceEnv];
    if (!priceId) {
      setErr(`Price not configured (${priceEnv}). Contact support to subscribe to this plan.`);
      setBusy(false); return;
    }
    const r = await fetch("/api/hospital/billing/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    });
    const data = await r.json();
    if (data.url) window.location.href = data.url; else { setErr(data.error || "checkout_failed"); setBusy(false); }
  }

  async function portal() {
    setBusy(true); setErr(null);
    const r = await fetch("/api/hospital/billing/portal", { method: "POST" });
    const data = await r.json();
    if (data.url) window.location.href = data.url; else { setErr(data.error || "portal_failed"); setBusy(false); }
  }

  const sub = state?.subscription;
  const statusKey = sub?.status || "";
  const theme = STATUS_THEME[statusKey] || STATUS_THEME.canceled;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-accent-300/20 blur-3xl" />
        <div className="relative">
          {sub && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold capitalize backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              {sub.planTier} · {sub.status.replace(/_/g, " ")}
            </div>
          )}
          {!sub && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              No active subscription
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="mt-1 text-sm text-white/80">Manage your subscription, plan tier & invoices via Stripe.</p>
        </div>
      </div>

      {state?.blocked && (
        <div className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-rose-100">
          <div className="h-1 bg-gradient-to-r from-rose-500 via-red-500 to-pink-500" />
          <div className="flex items-start gap-4 bg-gradient-to-r from-rose-50 via-red-50 to-pink-50 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xl">⚠️</div>
            <div>
              <div className="font-bold text-rose-800">Payment required</div>
              <div className="mt-0.5 text-sm text-rose-700">Your subscription is past due — please update your payment method to restore access.</div>
            </div>
          </div>
        </div>
      )}

      {sub && (
        <div className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold capitalize text-gray-900">{sub.planTier} plan</div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${theme.pill}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
                  {sub.status.replace(/_/g, " ")}
                </span>
              </div>
              {sub.currentPeriodEnd && <div className="mt-1 text-sm text-gray-600">Renews: {new Date(sub.currentPeriodEnd).toLocaleDateString()}</div>}
              {sub.cancelAtPeriodEnd && <div className="mt-1 text-sm font-semibold text-orange-600">Cancels at period end</div>}
              {sub.lastInvoiceAmount != null && <div className="mt-1 text-xs text-gray-500">Last invoice: ${sub.lastInvoiceAmount.toFixed(2)}{sub.lastInvoicePaidAt ? ` · paid ${new Date(sub.lastInvoicePaidAt).toLocaleDateString()}` : ""}</div>}
            </div>
            {sub.stripeCustomerId && (
              <button onClick={portal} disabled={busy} className="rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50">
                ⚙️ Manage subscription
              </button>
            )}
          </div>
        </div>
      )}

      {!sub && (
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5 text-sm text-violet-800 ring-1 ring-violet-200">
          No subscription yet — choose a plan below to get started.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
        <div className="p-5">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Plans</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => {
              const isCurrent = sub?.planTier === p.id;
              return (
                <div key={p.id} className={`relative flex flex-col overflow-hidden rounded-xl p-5 ring-1 transition hover:-translate-y-1 hover:shadow-md ${isCurrent ? "bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 ring-violet-300" : "bg-white ring-gray-200"}`}>
                  {isCurrent && <div className="absolute right-3 top-3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Current</div>}
                  <div className="text-2xl">{p.emoji}</div>
                  <div className="mt-1 text-lg font-bold text-gray-900">{p.name}</div>
                  <div className="my-2 text-2xl font-bold text-gray-900">{p.price}</div>
                  <div className="mb-4 min-h-[44px] text-xs text-gray-600">{p.desc}</div>
                  <button onClick={() => checkout(p.envKey)} disabled={busy} className="mt-auto w-full rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50">
                    {sub ? (isCurrent ? "✓ Current plan" : "✨ Switch plan") : "🚀 Subscribe"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {err && (
        <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
          {err}
        </div>
      )}
    </div>
  );
}
