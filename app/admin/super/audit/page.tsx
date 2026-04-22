"use client";

import { useEffect, useState } from "react";

interface Entry {
  id: string;
  organizationId: string;
  occurredAt: string;
  actorName: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  severity: string;
  module?: string;
  reason?: string;
}

function severityColor(s: string): string {
  if (s === "critical") return "#dc2626";
  if (s === "warning") return "#f59e0b";
  return "#64748b";
}

export default function SuperAuditPage() {
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [orgId, setOrgId] = useState("");
  const [action, setAction] = useState("");
  const [module_, setModule] = useState("");
  const [severity, setSeverity] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (orgId) params.set("orgId", orgId);
    if (action) params.set("action", action);
    if (module_) params.set("module", module_);
    if (severity) params.set("severity", severity);
    try {
      const r = await fetch(`/api/admin/super/audit?${params.toString()}`);
      if (!r.ok) { setErr((await r.json())?.error || "failed"); return; }
      const j = await r.json();
      setRows(j.entries);
    } catch (e) { setErr((e as Error).message); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  if (err) return <div style={{ padding: 24, color: "#dc2626" }}>{err === "forbidden" ? "Super-admin only" : err}</div>;

  const inp: React.CSSProperties = { border: "1px solid #e2e8f0", padding: "6px 10px", borderRadius: 6, fontSize: 13 };
  const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: "2px solid #e2e8f0", fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase" };
  const td: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid #f1f5f9", fontSize: 13, verticalAlign: "top" };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 1400, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 16 }}>Audit log (all tenants)</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input style={inp} placeholder="Org ID" value={orgId} onChange={(e) => setOrgId(e.target.value)} />
        <select style={inp} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {["create", "read", "update", "delete", "login", "logout", "export", "print", "approve", "reject", "void", "reverse", "other"].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <input style={inp} placeholder="Module" value={module_} onChange={(e) => setModule(e.target.value)} />
        <select style={inp} value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">All severities</option>
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="critical">critical</option>
        </select>
        <button onClick={load} style={{ background: "#0f172a", color: "white", padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600 }}>Apply</button>
      </div>

      {!rows && <div>Loading…</div>}
      {rows && (
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", background: "#f8fafc", fontSize: 13, color: "#64748b" }}>{rows.length} entries</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>When</th>
                <th style={th}>Org</th>
                <th style={th}>Actor</th>
                <th style={th}>Action</th>
                <th style={th}>Entity</th>
                <th style={th}>Module</th>
                <th style={th}>Severity</th>
                <th style={th}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{new Date(r.occurredAt).toLocaleString()}</td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{r.organizationId.slice(0, 12)}…</td>
                  <td style={td}>{r.actorName} {r.actorRole ? <span style={{ color: "#94a3b8" }}>({r.actorRole})</span> : null}</td>
                  <td style={td}>{r.action}</td>
                  <td style={td}>{r.entityType}{r.entityLabel ? ` · ${r.entityLabel}` : r.entityId ? ` · ${r.entityId}` : ""}</td>
                  <td style={td}>{r.module || "—"}</td>
                  <td style={{ ...td, color: severityColor(r.severity), fontWeight: 600 }}>{r.severity}</td>
                  <td style={{ ...td, color: "#64748b" }}>{r.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
