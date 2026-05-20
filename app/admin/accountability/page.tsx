"use client";

// V13 §2 Live Accountability Feed — admin-facing.
//
// Streams the last N accountability events with category / severity /
// breach filters. Breaches show inline with an Acknowledge button that
// closes the V13 §4.3 loop.

import { useCallback, useEffect, useState } from "react";

type ActionCategory = "clinical" | "admin" | "financial" | "data_access" | "system";
type Severity = "info" | "low" | "medium" | "high" | "critical";

interface AccountabilityEvent {
  id: string;
  at: string;
  category: ActionCategory;
  action: string;
  severity: Severity;
  actorEmail: string;
  actorRole?: string;
  tenantId?: string;
  subjectKind?: string;
  subjectId?: string;
  location?: string;
  summary: string;
  breach?: {
    rule: string;
    detail: string;
    level: 1 | 2 | 3 | 4 | 5;
    acknowledgedBy?: string | null;
    acknowledgedAt?: string | null;
  };
}

const CATEGORY_LABEL: Record<ActionCategory, string> = {
  clinical: "Clinical",
  admin: "Admin",
  financial: "Financial",
  data_access: "Data access",
  system: "System",
};

const SEV_PILL: Record<Severity, string> = {
  info:     "bg-slate-200 text-slate-700",
  low:      "bg-emerald-100 text-emerald-800",
  medium:   "bg-amber-100 text-amber-800",
  high:     "bg-orange-100 text-orange-800",
  critical: "bg-rose-100 text-rose-800",
};

export default function AccountabilityFeedPage() {
  const [events, setEvents] = useState<AccountabilityEvent[]>([]);
  const [category, setCategory] = useState<"" | ActionCategory>("");
  const [severity, setSeverity] = useState<"" | Severity>("");
  const [breachOnly, setBreachOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState(true);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (category) qs.set("category", category);
    if (severity) qs.set("severity", severity);
    if (breachOnly) qs.set("breachOnly", "1");
    qs.set("limit", "200");
    try {
      const r = await fetch(`/api/accountability?${qs}`, { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setEvents(d.events || []);
      }
    } finally {
      setLoading(false);
    }
  }, [category, severity, breachOnly]);

  useEffect(() => { load(); }, [load]);
  // V13 §2.2: live feed auto-refreshes every 10s. Cheap because the
  // list endpoint is read-only against an in-memory store. Toggleable
  // because long-form review wants a stable view.
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [auto, load]);

  const acknowledge = async (eventId: string) => {
    const r = await fetch("/api/accountability/acknowledge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventId }),
    });
    if (r.ok) load();
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accountability feed</h1>
        <p className="mt-1 text-sm text-gray-600">
          V13 live feed of every clinical, admin, financial, data-access,
          and system event. Breaches escalate automatically; acknowledge
          here to close the loop.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="text-xs font-semibold text-gray-600">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as "" | ActionCategory)}
          className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
        >
          <option value="">All</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <label className="ml-3 text-xs font-semibold text-gray-600">Severity</label>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as "" | Severity)}
          className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
        >
          <option value="">All</option>
          {(["info", "low", "medium", "high", "critical"] as Severity[]).map((s) =>
            <option key={s} value={s}>{s}</option>,
          )}
        </select>

        <label className="ml-3 inline-flex items-center gap-1.5 text-sm text-gray-700">
          <input type="checkbox" checked={breachOnly} onChange={(e) => setBreachOnly(e.target.checked)} />
          Breaches only
        </label>

        <label className="ml-auto inline-flex items-center gap-1.5 text-sm text-gray-700">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          Live (10s)
        </label>

        <button
          onClick={load}
          className="rounded-lg bg-[#0F6E56] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0A5942]"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Action</th>
              <th className="px-3 py-2 text-left">Actor</th>
              <th className="px-3 py-2 text-left">Subject</th>
              <th className="px-3 py-2 text-left">Summary</th>
              <th className="px-3 py-2 text-left">Severity</th>
              <th className="px-3 py-2 text-left">Breach</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500">Loading…</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500">No events match the active filters.</td></tr>
            ) : (
              events.map((e) => (
                <tr key={e.id} className={e.breach && !e.breach.acknowledgedBy ? "bg-rose-50/60" : ""}>
                  <td className="px-3 py-2 align-top text-xs text-gray-500 font-mono">
                    {new Date(e.at).toLocaleTimeString()}<br />
                    {new Date(e.at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 align-top">{CATEGORY_LABEL[e.category]}</td>
                  <td className="px-3 py-2 align-top font-mono text-xs text-gray-800">{e.action}</td>
                  <td className="px-3 py-2 align-top">
                    <div className="font-medium text-gray-900">{e.actorEmail}</div>
                    {e.actorRole && <div className="text-xs text-gray-500">{e.actorRole}</div>}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-gray-700">
                    {e.subjectKind ? `${e.subjectKind} ${e.subjectId?.slice(-6) || ""}` : "—"}
                    {e.location && <div className="text-gray-500">{e.location}</div>}
                  </td>
                  <td className="px-3 py-2 align-top text-sm text-gray-800">{e.summary}</td>
                  <td className="px-3 py-2 align-top">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${SEV_PILL[e.severity]}`}>
                      {e.severity}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top text-xs">
                    {!e.breach ? (
                      <span className="text-gray-400">—</span>
                    ) : e.breach.acknowledgedBy ? (
                      <div>
                        <div className="font-semibold text-emerald-700">Acknowledged</div>
                        <div className="text-gray-500">
                          {e.breach.acknowledgedBy}<br />
                          {e.breach.acknowledgedAt && new Date(e.breach.acknowledgedAt).toLocaleTimeString()}
                        </div>
                        <div className="mt-1 text-gray-600">{e.breach.rule}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-semibold text-rose-700">L{e.breach.level} — {e.breach.rule}</div>
                        <div className="text-gray-600">{e.breach.detail}</div>
                        <button
                          onClick={() => acknowledge(e.id)}
                          className="mt-1 rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-rose-700"
                        >
                          Acknowledge
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
