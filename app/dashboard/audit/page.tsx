"use client";

// Patient-facing audit log.
//
// "Who has looked at my records?" — surfaces every view, print,
// download, share, or modify event recorded for this user, with
// actor email, role, IP, and resource. Filterable by action.

import { useCallback, useEffect, useMemo, useState } from "react";

interface AuditEvent {
  id: string;
  actorUserId: string;
  actorRole?: string;
  actorEmail?: string;
  subjectUserId: string;
  resource: string;
  resourceId: string;
  action: string;
  ip?: string;
  userAgent?: string;
  reason?: string;
  organizationId?: string;
  at: string;
}

const ACTION_TONE: Record<string, string> = {
  view: "bg-sky-100 text-sky-800",
  print: "bg-indigo-100 text-indigo-800",
  download: "bg-amber-100 text-amber-800",
  share: "bg-fuchsia-100 text-fuchsia-800",
  export: "bg-amber-100 text-amber-800",
  modify: "bg-emerald-100 text-emerald-800",
  delete: "bg-rose-100 text-rose-800",
};
const ACTION_EMOJI: Record<string, string> = {
  view: "👁", print: "🖨", download: "⬇", share: "↗", export: "📤", modify: "✏️", delete: "🗑",
};
const RESOURCE_LABEL: Record<string, string> = {
  document: "Document", prescription: "Prescription", lab_report: "Lab report",
  vital: "Vital", consultation: "Consultation", appointment: "Appointment",
  preauth: "Preauth", wallet: "Wallet", consent: "Consent", abha: "ABHA",
};

function shortUA(ua?: string): string {
  if (!ua) return "—";
  const m = ua.match(/(Chrome|Safari|Firefox|Edg)\/[\d.]+/i);
  const os = ua.match(/\((Windows|Mac|Linux|Android|iPhone|iPad)[^)]*\)/i);
  return [os?.[1], m?.[0]].filter(Boolean).join(" · ") || ua.slice(0, 40);
}

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | string>("all");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/audit", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setEvents(d.events || []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: events.length };
    for (const e of events) c[e.action] = (c[e.action] || 0) + 1;
    return c;
  }, [events]);

  const filtered = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => e.action === filter);
  }, [events, filter]);

  // Group events by date for legibility.
  const grouped = useMemo(() => {
    const groups: Array<{ label: string; items: AuditEvent[] }> = [];
    for (const e of filtered) {
      const day = new Date(e.at).toLocaleDateString();
      const last = groups[groups.length - 1];
      if (last && last.label === day) last.items.push(e);
      else groups.push({ label: day, items: [e] });
    }
    return groups;
  }, [filtered]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Access log</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every view, print, download, share, or change of your records — who, when, from what IP. Spot anything you didn&apos;t do? Tap to flag it.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "view", "print", "download", "share", "modify", "delete"] as const).map((k) => {
          const c = counts[k] || 0;
          if (k !== "all" && c === 0) return null;
          const active = filter === k;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${active ? "bg-indigo-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}
            >
              {k === "all" ? "All" : `${ACTION_EMOJI[k] || ""} ${k}`}
              <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}>{c}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-3xl">🛡️</p>
          <p className="mt-2 text-base font-bold text-slate-700">No access events yet</p>
          <p className="mt-1 text-sm text-slate-500">Every time you or someone you authorize opens your records, an event will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <section key={g.label}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{g.label}</p>
              <ul className="space-y-2">
                {g.items.map((e) => (
                  <li key={e.id} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ACTION_TONE[e.action] || "bg-slate-100 text-slate-700"}`}>
                            {ACTION_EMOJI[e.action] || ""} {e.action}
                          </span>
                          <p className="text-sm font-bold text-slate-900">{RESOURCE_LABEL[e.resource] || e.resource}</p>
                          {e.actorUserId !== e.subjectUserId && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 ring-1 ring-amber-200">
                              third-party access
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {e.actorEmail || e.actorUserId}
                          {e.actorRole && <span className="ml-1 text-[10px] uppercase tracking-wide text-slate-400">· {e.actorRole}</span>}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {new Date(e.at).toLocaleTimeString()} · IP {e.ip || "unknown"}{e.userAgent ? ` · ${shortUA(e.userAgent)}` : ""}
                        </p>
                        {e.reason && <p className="mt-1 text-[11px] italic text-slate-500">Reason: {e.reason}</p>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
