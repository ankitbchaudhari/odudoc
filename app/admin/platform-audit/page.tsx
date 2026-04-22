"use client";

// Super-admin platform audit log viewer. Distinct from /admin/audit-log
// (which is the hospital-level clinical audit trail). This page tracks
// platform-operator actions: org CRUD, module flips, plan changes, demo
// seeding, staff repair, and tenant-side module requests.
//
// Diagnostic-only — Postgres is the source of truth; this UI is just a
// fast way to answer "who enabled pharmacy on this account?" without
// opening a shell.

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

type AuditAction =
  | "org.create" | "org.update" | "org.delete"
  | "org.plan_change" | "org.status_change" | "org.modules_change"
  | "demo.seed" | "demo.seed_for_lead" | "demo.repair_staff"
  | "user.create" | "user.update" | "user.ban" | "user.unban"
  | "user.reset_password" | "user.delete" | "user.role_change"
  | "module.request_submitted";

interface AuditEntry {
  id: string;
  at: string;
  actorEmail: string;
  action: AuditAction;
  orgId?: string;
  orgName?: string;
  targetUserId?: string;
  targetUserEmail?: string;
  summary: string;
  meta?: Record<string, unknown>;
}

const ACTION_LABELS: Record<AuditAction, string> = {
  "org.create": "Org created",
  "org.update": "Org edited",
  "org.delete": "Org deleted",
  "org.plan_change": "Plan changed",
  "org.status_change": "Status changed",
  "org.modules_change": "Modules changed",
  "demo.seed": "Demo seeded",
  "demo.seed_for_lead": "Demo seeded (lead)",
  "demo.repair_staff": "Staff repaired",
  "user.create": "User created",
  "user.update": "User edited",
  "user.ban": "User banned",
  "user.unban": "User unbanned",
  "user.reset_password": "Password reset",
  "user.delete": "User deleted",
  "user.role_change": "Role changed",
  "module.request_submitted": "Modules requested",
};

const ACTION_COLORS: Record<AuditAction, string> = {
  "org.create": "bg-emerald-100 text-emerald-700",
  "org.update": "bg-slate-100 text-slate-700",
  "org.delete": "bg-red-100 text-red-700",
  "org.plan_change": "bg-indigo-100 text-indigo-700",
  "org.status_change": "bg-amber-100 text-amber-700",
  "org.modules_change": "bg-sky-100 text-sky-700",
  "demo.seed": "bg-teal-100 text-teal-700",
  "demo.seed_for_lead": "bg-teal-100 text-teal-700",
  "demo.repair_staff": "bg-amber-100 text-amber-700",
  "user.create": "bg-emerald-100 text-emerald-700",
  "user.update": "bg-slate-100 text-slate-700",
  "user.ban": "bg-red-100 text-red-700",
  "user.unban": "bg-emerald-100 text-emerald-700",
  "user.reset_password": "bg-amber-100 text-amber-700",
  "user.delete": "bg-red-100 text-red-700",
  "user.role_change": "bg-indigo-100 text-indigo-700",
  "module.request_submitted": "bg-purple-100 text-purple-700",
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.floor((now - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AdminPlatformAudit() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<AuditAction | "">("");
  const [actorFilter, setActorFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set("action", actionFilter);
      if (actorFilter) params.set("actorEmail", actorFilter);
      if (orgFilter) params.set("orgId", orgFilter);
      params.set("limit", "300");
      const r = await fetch(`/api/admin/super/audit-log?${params.toString()}`, { cache: "no-store" });
      if (r.ok) {
        const data = await r.json();
        setEntries(data.entries || []);
      }
    } finally {
      setLoading(false);
    }
  }, [actionFilter, actorFilter, orgFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const uniqueActors = useMemo(() => {
    const set = new Set(entries.map((e) => e.actorEmail));
    return Array.from(set).sort();
  }, [entries]);

  const uniqueOrgs = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) {
      if (e.orgId) map.set(e.orgId, e.orgName || e.orgId);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [entries]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Platform audit log</h2>
          <p className="mt-1 text-sm text-gray-500">
            Super-admin &amp; tenant-admin actions affecting orgs, plans, modules, and seeding — last 500 events, newest first.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div className="mb-4 grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Action</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as AuditAction | "")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All actions</option>
            {(Object.keys(ACTION_LABELS) as AuditAction[]).map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Actor</label>
          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All actors</option>
            {uniqueActors.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Organization</label>
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All organizations</option>
            {uniqueOrgs.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Organization</th>
              <th className="px-4 py-3 font-medium">Summary</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const expanded = expandedId === e.id;
              const hasMeta = e.meta && Object.keys(e.meta).length > 0;
              return (
                <Fragment key={e.id}>
                  <tr
                    className={`border-b border-gray-50 ${hasMeta ? "cursor-pointer hover:bg-gray-50" : ""}`}
                    onClick={() => hasMeta && setExpandedId(expanded ? null : e.id)}
                  >
                    <td className="px-4 py-3 align-top">
                      <p className="text-gray-700">{relativeTime(e.at)}</p>
                      <p className="text-[10.5px] text-gray-400">{new Date(e.at).toLocaleString()}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${ACTION_COLORS[e.action] || "bg-gray-100 text-gray-700"}`}>
                        {ACTION_LABELS[e.action] || e.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-[12px] text-gray-600">{e.actorEmail}</td>
                    <td className="px-4 py-3 align-top text-[12px] text-gray-600">
                      {e.orgName || "—"}
                    </td>
                    <td className="px-4 py-3 align-top text-[12px] text-gray-700">
                      <span>{e.summary}</span>
                      {hasMeta && (
                        <span className="ml-2 text-[10.5px] text-gray-400">
                          {expanded ? "▾" : "▸"} details
                        </span>
                      )}
                    </td>
                  </tr>
                  {expanded && hasMeta && (
                    <tr className="border-b border-gray-50 bg-gray-50">
                      <td colSpan={5} className="px-4 py-3">
                        <pre className="overflow-auto rounded-md bg-white p-3 text-[11px] text-gray-700">
                          {JSON.stringify(e.meta, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {!loading && entries.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">
            No audit entries match your filters.
          </div>
        )}
        {loading && <div className="py-12 text-center text-sm text-gray-400">Loading…</div>}
      </div>
    </div>
  );
}

