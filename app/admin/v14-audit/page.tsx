"use client";

// V14 — AppPro audit dashboard. Renders the ownership manifest with
// search + filter, lists the SSE/WebSocket channels, and shows the
// pre-deploy audit-script command.

import { useEffect, useState } from "react";

interface Endpoint {
  path: string;
  audience: "patient" | "pro" | "shared" | "public";
  rls: string;
  purpose: string;
  methods: string[];
  governedBy?: string;
  notes?: string;
}

interface Channel {
  name: string;
  transport: "sse" | "websocket";
  subscriberRoles: string[];
  payload: string;
  rls: string;
  governedBy?: string;
}

interface Summary {
  total: number;
  byAudience: Record<string, number>;
  byRls: Record<string, number>;
  channels: number;
}

const AUDIENCE_PILL: Record<string, string> = {
  patient: "bg-emerald-100 text-emerald-800 border-emerald-300",
  pro: "bg-sky-100 text-sky-800 border-sky-300",
  shared: "bg-violet-100 text-violet-800 border-violet-300",
  public: "bg-gray-100 text-gray-700 border-gray-300",
};

const RLS_PILL: Record<string, string> = {
  self: "bg-emerald-50 text-emerald-700",
  tenant: "bg-sky-50 text-sky-700",
  tenant_admin: "bg-indigo-50 text-indigo-700",
  super_admin: "bg-rose-50 text-rose-700",
  role: "bg-amber-50 text-amber-800",
  public: "bg-gray-50 text-gray-600",
  token: "bg-fuchsia-50 text-fuchsia-700",
};

export default function V14AuditPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filter, setFilter] = useState({ audience: "", rls: "", search: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/v14-audit", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setEndpoints(d.endpoints || []);
        setChannels(d.channels || []);
        setSummary(d.summary || null);
      }
      setLoading(false);
    })();
  }, []);

  const rows = endpoints.filter((e) =>
    (!filter.audience || e.audience === filter.audience) &&
    (!filter.rls || e.rls === filter.rls) &&
    (!filter.search || e.path.toLowerCase().includes(filter.search.toLowerCase()) || e.purpose.toLowerCase().includes(filter.search.toLowerCase())),
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">V14 — AppPro audit</h1>
        <p className="mt-1 text-sm text-gray-600">
          Endpoint ownership manifest, RLS strategies, real-time channel rules,
          and the pre-deploy gate script. Source of truth: <code>lib/api-ownership.ts</code>.
        </p>
      </div>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-4">
          <StatTile label="Total endpoints governed" value={summary.total} />
          <StatTile label="Real-time channels" value={summary.channels} />
          <StatTile label="Pro audience" value={summary.byAudience.pro || 0} />
          <StatTile label="Patient audience" value={summary.byAudience.patient || 0} />
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900">Pre-deploy gate</h2>
        <p className="mt-1 text-xs text-gray-600">Add to your release pipeline. Fails the build if any sensitive endpoint is missing from the manifest.</p>
        <pre className="mt-3 rounded-lg bg-gray-900 px-4 py-3 font-mono text-xs text-emerald-300">npm run v14:audit</pre>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <input
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          placeholder="Search path or purpose…"
          className="flex-1 min-w-[240px] rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        />
        <select value={filter.audience} onChange={(e) => setFilter({ ...filter, audience: e.target.value })} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
          <option value="">All audiences</option>
          <option value="patient">Patient</option>
          <option value="pro">Pro</option>
          <option value="shared">Shared</option>
          <option value="public">Public</option>
        </select>
        <select value={filter.rls} onChange={(e) => setFilter({ ...filter, rls: e.target.value })} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
          <option value="">All RLS</option>
          <option value="self">self</option>
          <option value="tenant">tenant</option>
          <option value="tenant_admin">tenant_admin</option>
          <option value="super_admin">super_admin</option>
          <option value="role">role</option>
          <option value="token">token</option>
          <option value="public">public</option>
        </select>
      </div>

      {/* Endpoint table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-center text-sm text-gray-500">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">Path</th>
                <th className="px-4 py-2 text-left">Methods</th>
                <th className="px-4 py-2 text-left">Audience</th>
                <th className="px-4 py-2 text-left">RLS</th>
                <th className="px-4 py-2 text-left">Purpose</th>
                <th className="px-4 py-2 text-left">Spec</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No endpoints match the filters.</td></tr>
              ) : rows.map((e) => (
                <tr key={e.path}>
                  <td className="px-4 py-2 font-mono text-xs text-gray-800">{e.path}</td>
                  <td className="px-4 py-2 text-xs"><div className="flex gap-1">{e.methods.map((m) => <span key={m} className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-bold">{m}</span>)}</div></td>
                  <td className="px-4 py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${AUDIENCE_PILL[e.audience]}`}>{e.audience}</span></td>
                  <td className="px-4 py-2"><span className={`rounded px-2 py-0.5 text-[10px] font-bold ${RLS_PILL[e.rls]}`}>{e.rls}</span></td>
                  <td className="px-4 py-2 text-xs text-gray-700">{e.purpose}{e.notes && <div className="mt-0.5 text-[10px] italic text-amber-700">{e.notes}</div>}</td>
                  <td className="px-4 py-2 text-[11px] text-gray-500">{e.governedBy || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Channels */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-bold text-gray-900">Real-time channels (SSE / WebSocket)</h2>
          <p className="mt-0.5 text-xs text-gray-500">Every channel below carries the same auth rules as its REST counterpart.</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">Channel</th>
              <th className="px-4 py-2 text-left">Transport</th>
              <th className="px-4 py-2 text-left">Subscribers</th>
              <th className="px-4 py-2 text-left">RLS</th>
              <th className="px-4 py-2 text-left">Payload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {channels.map((c) => (
              <tr key={c.name}>
                <td className="px-4 py-2 font-mono text-xs text-gray-800">{c.name}</td>
                <td className="px-4 py-2 text-xs"><span className={`rounded px-2 py-0.5 text-[10px] font-bold ${c.transport === "sse" ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800"}`}>{c.transport.toUpperCase()}</span></td>
                <td className="px-4 py-2 text-xs">{c.subscriberRoles.join(", ")}</td>
                <td className="px-4 py-2"><span className={`rounded px-2 py-0.5 text-[10px] font-bold ${RLS_PILL[c.rls]}`}>{c.rls}</span></td>
                <td className="px-4 py-2 text-xs text-gray-700">{c.payload}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
        <h3 className="text-sm font-bold text-amber-900">Findings from this audit pass</h3>
        <ul className="mt-2 space-y-1 text-xs text-amber-900">
          <li>🔴 <strong>FIXED:</strong> <code>/api/admin/blog/generate</code> was anonymously callable. Added admin/support gate.</li>
          <li>🟡 Several pro routes use role-only gates without tenant scope — fine for single-tenant ops, must tighten before multi-tenant rollout (V12 §5.1 GUC adoption unblocks).</li>
          <li>🟡 <code>accountability:live</code> + <code>opd:queue</code> still polled (5-10s); SSE upgrades pending real load.</li>
          <li>🟡 Mobile-app routes use bearer JWT not NextAuth session — re-audit after mobile launch.</li>
        </ul>
        <p className="mt-3 text-xs text-amber-900">Full report: <code>lib/V14.md</code>.</p>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-[#0F6E56]">{value}</p>
    </div>
  );
}
