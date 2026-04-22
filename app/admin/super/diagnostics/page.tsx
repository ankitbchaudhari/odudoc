"use client";

import { useEffect, useState } from "react";

interface Diag {
  maintenanceMode?: boolean;
  providers: {
    postgres: { configured: boolean };
    email: { provider: string; configured: boolean; keyMask: string };
    sms: { provider: string; configured: boolean; accountSidMask: string; whatsappConfigured: boolean };
    blob: { provider: string; configured: boolean; tokenMask: string };
    stripe: {
      configured: boolean;
      keyMask: string;
      webhookSecret: boolean;
      prices: { starter: boolean; clinic: boolean; hospital: boolean; enterprise: boolean };
      priceMap: boolean;
    };
    sentry: { configured: boolean };
    rateLimit: { provider: string; configured: boolean };
  };
  deployment: { id: string | null; env: string; region: string | null; gitSha: string | null };
  runtime: { nodeVersion: string; timestamp: string };
}

function Dot({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: "inline-block", width: 10, height: 10, borderRadius: "50%",
      background: ok ? "#16a34a" : "#dc2626", marginRight: 8,
    }} />
  );
}

function Row({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
      <Dot ok={ok} />
      <span style={{ flex: 1, fontWeight: 500 }}>{label}</span>
      <span style={{ color: "#64748b", fontFamily: "monospace", fontSize: 13 }}>{detail || (ok ? "configured" : "missing")}</span>
    </div>
  );
}

export default function DiagnosticsPage() {
  const [d, setD] = useState<Diag | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [health, setHealth] = useState<{ status: string; latencyMs: number } | null>(null);
  const [probes, setProbes] = useState<Array<{ provider: string; configured: boolean; ok: boolean; latencyMs: number; detail?: string }> | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/diagnostics");
      if (!r.ok) { setErr((await r.json())?.error || "forbidden"); return; }
      setD(await r.json());
      const h = await fetch("/api/health"); setHealth(await h.json());
      const p = await fetch("/api/admin/super/provider-health");
      if (p.ok) { const j = await p.json(); setProbes(j.probes); }
    } catch (e) { setErr((e as Error).message); }
  }
  useEffect(() => { load(); }, []);

  if (err) return <div style={{ padding: 24, color: "#dc2626" }}>{err === "forbidden" ? "Super-admin only" : err}</div>;
  if (!d) return <div style={{ padding: 24 }}>Loading…</div>;

  const card: React.CSSProperties = { background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: 20, marginBottom: 16 };
  const h2: React.CSSProperties = { fontSize: 16, fontWeight: 600, marginBottom: 12 };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>System diagnostics</h1>
        {d.maintenanceMode && (
          <span style={{ background: "#fef3c7", color: "#92400e", padding: "4px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
            ⚠ Maintenance mode ON
          </span>
        )}
        <button onClick={load} style={{ background: "#0f172a", color: "white", padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600 }}>
          Refresh
        </button>
      </div>

      <div style={card}>
        <h2 style={h2}>Health</h2>
        <Row label="Postgres (Neon)" ok={d.providers.postgres.configured && health?.status === "ok"} detail={health ? `${health.status} · ${health.latencyMs}ms` : "—"} />
      </div>

      <div style={card}>
        <h2 style={h2}>Communications</h2>
        <Row label="Email (Resend)" ok={d.providers.email.configured} detail={d.providers.email.keyMask} />
        <Row label="SMS (Twilio)" ok={d.providers.sms.configured} detail={d.providers.sms.accountSidMask} />
        <Row label="WhatsApp (Twilio)" ok={d.providers.sms.whatsappConfigured} />
      </div>

      <div style={card}>
        <h2 style={h2}>Storage</h2>
        <Row label="Blob (Vercel)" ok={d.providers.blob.configured} detail={d.providers.blob.tokenMask} />
      </div>

      <div style={card}>
        <h2 style={h2}>Billing (Stripe)</h2>
        <Row label="Secret key" ok={d.providers.stripe.configured} detail={d.providers.stripe.keyMask} />
        <Row label="Webhook secret" ok={d.providers.stripe.webhookSecret} />
        <Row label="Price map" ok={d.providers.stripe.priceMap} />
        <Row label="Price: Starter" ok={d.providers.stripe.prices.starter} />
        <Row label="Price: Clinic" ok={d.providers.stripe.prices.clinic} />
        <Row label="Price: Hospital" ok={d.providers.stripe.prices.hospital} />
        <Row label="Price: Enterprise" ok={d.providers.stripe.prices.enterprise} />
      </div>

      <div style={card}>
        <h2 style={h2}>Observability</h2>
        <Row label="Sentry error capture" ok={d.providers.sentry.configured} />
        <Row label="Rate limiting (Upstash)" ok={d.providers.rateLimit.configured} />
      </div>

      <div style={card}>
        <h2 style={h2}>Provider live pings</h2>
        {!probes && <div style={{ color: "#64748b", fontSize: 13 }}>Running…</div>}
        {probes?.map((p) => (
          <Row
            key={p.provider}
            label={p.provider.charAt(0).toUpperCase() + p.provider.slice(1)}
            ok={p.configured && p.ok}
            detail={p.configured ? `${p.ok ? "ok" : "fail"} · ${p.latencyMs}ms · ${p.detail || ""}` : "not configured"}
          />
        ))}
      </div>

      <div style={card}>
        <h2 style={h2}>Deployment</h2>
        <Row label="Environment" ok={true} detail={d.deployment.env} />
        <Row label="Region" ok={true} detail={d.deployment.region || "—"} />
        <Row label="Deployment ID" ok={true} detail={d.deployment.id || "—"} />
        <Row label="Git SHA" ok={true} detail={d.deployment.gitSha || "—"} />
        <Row label="Node" ok={true} detail={d.runtime.nodeVersion} />
      </div>
    </div>
  );
}
