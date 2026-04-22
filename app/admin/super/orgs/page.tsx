"use client";

import { useEffect, useState } from "react";

interface OrgRow {
  id: string;
  slug: string;
  name: string;
  country: string;
  plan: string;
  status: string;
  createdAt: string;
  memberCount: number;
  isDemo: boolean;
  trialEndsAt?: string;
  subscription: null | {
    planTier: string;
    status: string;
    currentPeriodEnd?: string;
    trialEnd?: string;
    lastInvoicePaidAt?: string;
    cancelAtPeriodEnd?: boolean;
  };
  lastActivity: string | null;
}

interface Resp {
  orgs: OrgRow[];
  totals: {
    orgs: number;
    active: number;
    trial: number;
    paying: number;
    pastDue: number;
    suspended: number;
  };
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

function statusColor(s: string): string {
  if (s === "active") return "#16a34a";
  if (s === "past_due" || s === "unpaid") return "#dc2626";
  if (s === "trialing") return "#2563eb";
  if (s === "canceled" || s === "suspended") return "#94a3b8";
  return "#64748b";
}

export default function SuperAdminOrgsPage() {
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [seeding, setSeeding] = useState(false);

  async function load() {
    try {
      const r = await fetch("/api/admin/super/orgs");
      if (!r.ok) { setErr((await r.json())?.error || "failed_to_load"); return; }
      setData(await r.json());
    } catch (e) { setErr((e as Error).message); }
  }

  async function seedDemo() {
    if (seeding) return;
    const name = prompt("Demo hospital name (leave blank for auto-generated):", "");
    setSeeding(true);
    try {
      const r = await fetch("/api/admin/super/seed-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(name ? { name } : {}),
      });
      const j = await r.json();
      if (!r.ok) { alert(j?.error || "seed_failed"); return; }
      const creds = j.login
        ? `\n\n— Demo admin login —\nURL: ${window.location.origin}${j.login.url}\nEmail: ${j.login.email}\nPassword: ${j.login.password}\n\n(Copied to clipboard.)`
        : "";
      if (j.login) {
        try {
          await navigator.clipboard.writeText(
            `URL: ${window.location.origin}${j.login.url}\nEmail: ${j.login.email}\nPassword: ${j.login.password}`,
          );
        } catch { /* clipboard may be blocked */ }
      }
      alert(
        `Seeded ${j.org.name}: ${j.counts.patients} patients, ${j.counts.appointments} appointments, ${j.counts.notifications} notifications.${creds}`,
      );
      await load();
    } finally { setSeeding(false); }
  }

  useEffect(() => { load(); }, []);

  if (err) return <div style={{ padding: 24, color: "#dc2626" }}>{err === "forbidden" ? "Super-admin only" : err}</div>;
  if (!data) return <div style={{ padding: 24 }}>Loading…</div>;

  const filtered = data.orgs.filter((o) =>
    q ? `${o.name} ${o.slug} ${o.country} ${o.id}`.toLowerCase().includes(q.toLowerCase()) : true,
  );

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>Organizations</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={async () => {
              if (!confirm("Suspend all demo orgs whose trial has expired?")) return;
              const r = await fetch("/api/admin/super/cleanup-demos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "suspend" }) });
              const j = await r.json();
              if (!r.ok) { alert(j?.error || "failed"); return; }
              alert(`Suspended ${j.affected} expired demo org${j.affected === 1 ? "" : "s"}.`);
              await load();
            }}
            style={{ background: "white", color: "#334155", border: "1px solid #cbd5e1", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
          >
            Cleanup expired demos
          </button>
          <button
            onClick={seedDemo}
            disabled={seeding}
            style={{ background: seeding ? "#94a3b8" : "#0f172a", color: "white", padding: "8px 16px", borderRadius: 6, border: "none", cursor: seeding ? "wait" : "pointer", fontWeight: 600 }}
          >
            {seeding ? "Seeding…" : "+ Seed demo org"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          ["Total", data.totals.orgs],
          ["Active", data.totals.active],
          ["Trial", data.totals.trial],
          ["Paying", data.totals.paying],
          ["Past due", data.totals.pastDue],
          ["Suspended", data.totals.suspended],
        ].map(([label, n]) => (
          <div key={label as string} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{n as number}</div>
          </div>
        ))}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter by name, slug, country, id…"
        style={{ width: "100%", padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 16, fontSize: 14 }}
      />

      <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead style={{ background: "#f8fafc", textAlign: "left" }}>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Country</th>
              <th style={th}>Plan</th>
              <th style={th}>Sub status</th>
              <th style={th}>Members</th>
              <th style={th}>Renews</th>
              <th style={th}>Last activity</th>
              <th style={th}>Created</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>
                    {o.name}
                    {o.isDemo && (
                      <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: "#7c3aed", background: "#ede9fe", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Demo
                      </span>
                    )}
                    {o.isDemo && o.trialEndsAt && new Date(o.trialEndsAt).getTime() < Date.now() && (
                      <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#b91c1c", background: "#fee2e2", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Expired
                      </span>
                    )}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>{o.slug} · {o.id}</div>
                </td>
                <td style={td}>{o.country}</td>
                <td style={td}>
                  <span style={{ textTransform: "capitalize" }}>{o.subscription?.planTier || o.plan}</span>
                </td>
                <td style={td}>
                  {o.subscription ? (
                    <span style={{ color: statusColor(o.subscription.status), fontWeight: 600, textTransform: "capitalize" }}>
                      {o.subscription.status.replace(/_/g, " ")}
                      {o.subscription.cancelAtPeriodEnd && <span style={{ color: "#c2410c", marginLeft: 6 }}>(cancelling)</span>}
                    </span>
                  ) : (
                    <span style={{ color: statusColor(o.status), fontWeight: 600, textTransform: "capitalize" }}>{o.status}</span>
                  )}
                </td>
                <td style={td}>{o.memberCount}</td>
                <td style={td}>{fmtDate(o.subscription?.currentPeriodEnd || o.trialEndsAt)}</td>
                <td style={td}>{fmtDate(o.lastActivity)}</td>
                <td style={td}>{fmtDate(o.createdAt)}</td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <button
                    onClick={async () => {
                      if (!confirm(`Impersonate ${o.name}? This is logged in their audit trail.`)) return;
                      const r = await fetch("/api/admin/super/impersonate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId: o.id }) });
                      if (r.ok) window.location.href = "/admin";
                      else alert((await r.json())?.error || "failed");
                    }}
                    style={{ background: "white", border: "1px solid #e2e8f0", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, marginRight: 4 }}
                  >Impersonate</button>
                  <button
                    onClick={async () => {
                      const next = o.status === "active" ? "suspended" : "active";
                      const reason = prompt(`Set ${o.name} to "${next}". Reason?`);
                      if (reason === null) return;
                      const r = await fetch(`/api/admin/super/orgs/${o.id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next, reason }) });
                      if (r.ok) window.location.reload();
                      else alert((await r.json())?.error || "failed");
                    }}
                    style={{ background: o.status === "active" ? "#fef2f2" : "#f0fdf4", color: o.status === "active" ? "#dc2626" : "#16a34a", border: "1px solid " + (o.status === "active" ? "#fecaca" : "#bbf7d0"), padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                  >{o.status === "active" ? "Suspend" : "Resume"}</button>
                  {o.isDemo && (
                    <button
                      onClick={async () => {
                        if (!confirm(`Permanently delete demo org "${o.name}"? This removes the org and all member logins. Seeded patient data stays in the DB as orphans.`)) return;
                        const r = await fetch(`/api/admin/super/orgs/${o.id}`, { method: "DELETE" });
                        if (r.ok) { await load(); }
                        else alert((await r.json())?.error || "failed");
                      }}
                      style={{ background: "#1e293b", color: "white", border: "1px solid #1e293b", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, marginLeft: 4 }}
                    >Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 32 }}>
                  No organizations match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "10px 14px", fontWeight: 600, fontSize: 12, color: "#475569", textTransform: "uppercase" };
const td: React.CSSProperties = { padding: "12px 14px", verticalAlign: "top" };
