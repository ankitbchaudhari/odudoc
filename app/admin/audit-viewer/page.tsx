"use client";

// Unified Audit Log viewer.
//
// Reads from /api/admin/super/audit (existing endpoint). Adds
// filter chips, full-text search, action-grouping, and a colour-
// coded timeline. Useful to demo the platform's compliance posture
// in front of NABH / DPDP auditors.

import { useCallback, useEffect, useMemo, useState } from "react";

interface AuditEntry {
  id: string; at: string; actorEmail: string; action: string;
  orgId?: string; orgName?: string; targetId?: string; targetType?: string;
  summary: string; meta?: Record<string, unknown>;
}

const ACTION_GROUPS: Record<string, { label: string; tone: string; pattern: RegExp }> = {
  org: { label: "Organisation", tone: "bg-indigo-100 text-indigo-800", pattern: /^org\./ },
  user: { label: "User admin", tone: "bg-violet-100 text-violet-800", pattern: /^user\./ },
  network: { label: "Inter-org network", tone: "bg-sky-100 text-sky-800", pattern: /^network\./ },
  transfer: { label: "Patient/records transfer", tone: "bg-emerald-100 text-emerald-800", pattern: /^transfer\./ },
  module: { label: "Module request", tone: "bg-amber-100 text-amber-800", pattern: /^module\./ },
  demo: { label: "Demo / seed", tone: "bg-slate-100 text-slate-700", pattern: /^demo\./ },
};

function groupOf(action: string): { label: string; tone: string } {
  for (const g of Object.values(ACTION_GROUPS)) {
    if (g.pattern.test(action)) return g;
  }
  return { label: "Other", tone: "bg-slate-100 text-slate-700" };
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AuditViewerPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState<{ q: string; group: string; orgId: string }>({ q: "", group: "all", orgId: "" });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: "300" });
      if (filter.orgId) qs.set("orgId", filter.orgId);
      const r = await fetch(`/api/admin/super/audit?${qs}`, { cache: "no-store" });
      if (r.ok) setEntries((await r.json()).entries || []);
    } finally { setLoading(false); }
  }, [filter.orgId]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = filter.q.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter.group !== "all") {
        const g = groupOf(e.action);
        if (g.label !== filter.group) return false;
      }
      if (q) {
        const hay = `${e.action} ${e.actorEmail} ${e.summary} ${e.orgName || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, filter]);

  const groupCounts: Record<string, number> = {};
  for (const e of entries) {
    const g = groupOf(e.action).label;
    groupCounts[g] = (groupCounts[g] || 0) + 1;
  }

  const exportCsv = () => {
    const header = "at,actor,action,orgName,summary";
    const rows = filtered.map((e) =>
      [e.at, e.actorEmail, e.action, e.orgName || "", `"${e.summary.replace(/"/g, '""')}"`].join(","),
    );
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit log viewer</h2>
          <p className="mt-1 text-sm text-gray-500">
            Every action across the platform — organisation lifecycle, user admin, network transfers, module requests. CSV export for NABH / DPDP audits.
          </p>
        </div>
        <button onClick={exportCsv} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Export CSV</button>
      </div>

      {/* Filters */}
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Search action / actor / summary" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
        <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={filter.group} onChange={(e) => setFilter({ ...filter, group: e.target.value })}>
          <option value="all">All groups</option>
          {Object.values(ACTION_GROUPS).map((g) => <option key={g.label} value={g.label}>{g.label}{groupCounts[g.label] ? ` (${groupCounts[g.label]})` : ""}</option>)}
          <option value="Other">Other{groupCounts["Other"] ? ` (${groupCounts["Other"]})` : ""}</option>
        </select>
        <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono" placeholder="Filter by org id (optional)" value={filter.orgId} onChange={(e) => setFilter({ ...filter, orgId: e.target.value })} />
      </div>

      {/* Group strip */}
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.values(ACTION_GROUPS).map((g) => (
          <button key={g.label} onClick={() => setFilter({ ...filter, group: filter.group === g.label ? "all" : g.label })} className={`rounded-full px-3 py-1 text-xs font-semibold ${g.tone} ${filter.group === g.label ? "ring-2 ring-offset-1 ring-indigo-400" : ""}`}>
            {g.label} {groupCounts[g.label] || 0}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm">No entries match.</p>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-left">Group</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Actor</th>
                <th className="px-3 py-2 text-left">Org</th>
                <th className="px-3 py-2 text-left">Summary</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const g = groupOf(e.action);
                return (
                  <tr key={e.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2 text-[11px] text-slate-500">
                      <p className="font-mono">{timeAgo(e.at)}</p>
                      <p className="text-[10px] text-slate-400">{new Date(e.at).toLocaleString()}</p>
                    </td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${g.tone}`}>{g.label}</span></td>
                    <td className="px-3 py-2 font-mono text-xs">{e.action}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">{e.actorEmail}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{e.orgName || "—"}</td>
                    <td className="px-3 py-2 text-xs text-slate-800">{e.summary}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-center text-[10px] text-slate-400">{filtered.length} of {entries.length} entries shown</p>
    </div>
  );
}
