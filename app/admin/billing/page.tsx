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
  { id: "starter", name: "Starter", price: "$49 / mo", envKey: "NEXT_PUBLIC_STRIPE_PRICE_STARTER", desc: "Small clinic — up to 5 staff." },
  { id: "clinic", name: "Clinic", price: "$199 / mo", envKey: "NEXT_PUBLIC_STRIPE_PRICE_CLINIC", desc: "Multi-doctor clinic with pharmacy + lab." },
  { id: "hospital", name: "Hospital", price: "$799 / mo", envKey: "NEXT_PUBLIC_STRIPE_PRICE_HOSPITAL", desc: "Full hospital ERP — IPD, OR, ICU, billing." },
  { id: "enterprise", name: "Enterprise", price: "Custom", envKey: "NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE", desc: "Multi-facility, SSO, dedicated support." },
];

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
  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Billing</h1>

      {state?.blocked && (
        <div style={{ background: "#fee", border: "1px solid #f99", padding: 16, borderRadius: 8, marginBottom: 24 }}>
          <strong>Payment required.</strong> Your subscription is past due — please update your payment method to restore access.
        </div>
      )}

      {sub ? (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 20, borderRadius: 8, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600, textTransform: "capitalize" }}>{sub.planTier} plan</div>
              <div style={{ color: "#64748b", marginTop: 4, textTransform: "capitalize" }}>Status: {sub.status.replace(/_/g, " ")}</div>
              {sub.currentPeriodEnd && <div style={{ color: "#64748b", marginTop: 4 }}>Renews: {new Date(sub.currentPeriodEnd).toLocaleDateString()}</div>}
              {sub.cancelAtPeriodEnd && <div style={{ color: "#c2410c", marginTop: 4 }}>Cancels at period end</div>}
            </div>
            {sub.stripeCustomerId && (
              <button onClick={portal} disabled={busy} style={{ background: "#2563eb", color: "white", padding: "10px 20px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600 }}>
                Manage subscription
              </button>
            )}
          </div>
        </div>
      ) : (
        <p style={{ marginBottom: 24, color: "#64748b" }}>No subscription yet — choose a plan below to get started.</p>
      )}

      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Plans</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
        {PLANS.map((p) => (
          <div key={p.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 20, background: "white" }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</div>
            <div style={{ fontSize: 24, fontWeight: 700, margin: "8px 0" }}>{p.price}</div>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 16, minHeight: 40 }}>{p.desc}</div>
            <button onClick={() => checkout(p.envKey)} disabled={busy} style={{ width: "100%", background: "#0f172a", color: "white", padding: "10px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600 }}>
              {sub ? "Switch to this plan" : "Subscribe"}
            </button>
          </div>
        ))}
      </div>

      {err && <div style={{ marginTop: 16, color: "#dc2626" }}>{err}</div>}
    </div>
  );
}
