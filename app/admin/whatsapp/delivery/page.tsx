"use client";

// Admin WhatsApp delivery dashboard.
//
// Shows the recent send log + aggregate stats from
// /api/admin/whatsapp. Server-rendered shells live elsewhere — this
// page is client-rendered so the Refresh button can re-fetch without
// a full reload.

import { useCallback, useEffect, useState } from "react";

interface WaEntry {
  id: string;
  ts: string;
  template: string;
  channel: string;
  to: string;
  success: boolean;
  error?: string;
  messageId?: string;
}

interface Stats {
  totalToday: number;
  successToday: number;
  failedToday: number;
  successRateToday: number;
  topTemplate?: { template: string; count: number };
  topFailureReason?: { error: string; count: number };
}

interface ApiResp {
  logs: WaEntry[];
  stats: Stats;
  templates: string[];
}

type FilterKind = "all" | "success" | "failed";

function timeShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WaDeliveryDashboard() {
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKind>("all");
  const [template, setTemplate] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      qs.set("filter", filter);
      if (template) qs.set("template", template);
      qs.set("limit", "100");
      const r = await fetch(`/api/admin/whatsapp?${qs.toString()}`, { cache: "no-store" });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${r.status}`);
      }
      const d: ApiResp = await r.json();
      setData(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [filter, template]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = data?.stats;
  const logs = data?.logs || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white shadow-lg dark:from-emerald-700 dark:via-teal-700 dark:to-cyan-700">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-100">
              Patient Engagement
            </p>
            <h1 className="mt-1 text-2xl font-bold">WhatsApp delivery</h1>
            <p className="mt-1 text-sm text-emerald-50">
              Outbound template sends — success rate, top templates, recent failures.
              Phone numbers are masked; full E.164 is never persisted here.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {err}
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Sent (24h)"
          value={stats?.totalToday ?? 0}
          tone="emerald"
        />
        <StatTile
          label="Success rate (24h)"
          value={stats ? `${stats.successRateToday}%` : "—"}
          tone="sky"
          subtitle={stats ? `${stats.successToday} ok · ${stats.failedToday} failed` : undefined}
        />
        <StatTile
          label="Top template"
          value={stats?.topTemplate?.template || "—"}
          subtitle={stats?.topTemplate ? `${stats.topTemplate.count} sends` : undefined}
          tone="violet"
          mono
        />
        <StatTile
          label="Top failure reason"
          value={stats?.topFailureReason?.error || "—"}
          subtitle={stats?.topFailureReason ? `${stats.topFailureReason.count}×` : undefined}
          tone="rose"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "success", "failed"] as FilterKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider transition ${
              filter === k
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {k}
          </button>
        ))}
        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="ml-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="">All templates</option>
          {(data?.templates || []).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Log table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Template</th>
              <th className="px-4 py-2">To</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Error</th>
              <th className="px-4 py-2">Provider ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {logs.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">
                  No sends recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">{timeShort(l.ts)}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-800 dark:text-slate-200">{l.template}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-600 dark:text-slate-300">{l.to}</td>
                  <td className="px-4 py-2">
                    {l.success ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        ok
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        fail
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-rose-700 dark:text-rose-300">{l.error || ""}</td>
                  <td className="px-4 py-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {l.messageId || ""}
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

function StatTile({
  label,
  value,
  subtitle,
  tone,
  mono,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  tone: "emerald" | "sky" | "violet" | "rose";
  mono?: boolean;
}) {
  const toneClasses: Record<string, string> = {
    emerald: "from-emerald-50 to-emerald-100 text-emerald-900 dark:from-emerald-950/40 dark:to-emerald-900/40 dark:text-emerald-100",
    sky: "from-sky-50 to-sky-100 text-sky-900 dark:from-sky-950/40 dark:to-sky-900/40 dark:text-sky-100",
    violet: "from-violet-50 to-violet-100 text-violet-900 dark:from-violet-950/40 dark:to-violet-900/40 dark:text-violet-100",
    rose: "from-rose-50 to-rose-100 text-rose-900 dark:from-rose-950/40 dark:to-rose-900/40 dark:text-rose-100",
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${toneClasses[tone]} p-4 shadow-sm`}>
      <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className={`mt-1 truncate text-2xl font-bold ${mono ? "font-mono" : ""}`}>{value}</p>
      {subtitle && <p className="mt-0.5 text-xs opacity-80">{subtitle}</p>}
    </div>
  );
}
