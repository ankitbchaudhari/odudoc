"use client";

// Per-staff audit log viewer — owner / admin only. Lists every
// mutating EMR action with timestamp, actor (which staff member did
// it), resource, and a small metadata snippet. Searchable + filterable
// by actor / resource / date range.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface AuditEntry {
  id: string;
  ownerEmail: string;
  actorEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  meta?: Record<string, string | number | boolean | null | undefined>;
  createdAt: string;
}

const ACTION_TONE: Record<string, { dot: string; text: string; bg: string }> = {
  "patient.create": { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  "patient.update": { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  "patient.delete": { dot: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50" },
  "visit.create": { dot: "bg-cyan-500", text: "text-cyan-700", bg: "bg-cyan-50" },
  "visit.delete": { dot: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50" },
  "file.upload": { dot: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-50" },
  "file.delete": { dot: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50" },
  "invoice.create": { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  "invoice.update": { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  "invoice.delete": { dot: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50" },
  "invoice.paid_online": { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  "staff.add": { dot: "bg-indigo-500", text: "text-indigo-700", bg: "bg-indigo-50" },
  "staff.remove": { dot: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50" },
  "quota.unlock": { dot: "bg-fuchsia-500", text: "text-fuchsia-700", bg: "bg-fuchsia-50" },
};

const RESOURCE_OPTIONS = [
  { value: "", label: "All resources" },
  { value: "patient", label: "Patients" },
  { value: "visit", label: "Visits" },
  { value: "file", label: "Files" },
  { value: "invoice", label: "Invoices" },
  { value: "staff", label: "Staff" },
  { value: "quota", label: "Quota" },
];

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return iso.slice(0, 10);
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterActor, setFilterActor] = useState("");
  const [filterResource, setFilterResource] = useState("");
  const [filterSince, setFilterSince] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterActor.trim()) params.set("actor", filterActor.trim().toLowerCase());
      if (filterResource) params.set("resource", filterResource);
      if (filterSince) params.set("since", filterSince);
      const res = await fetch(`/api/emr/audit?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not load audit log");
      }
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [filterActor, filterResource, filterSince]);

  useEffect(() => {
    load();
  }, [load]);

  const actorTotals = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => map.set(e.actorEmail, (map.get(e.actorEmail) || 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [entries]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 py-10">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-200/40 via-violet-200/40 to-cyan-200/40 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4">
        <div className="mb-5 flex items-center justify-between">
          <Link
            href="/dashboard/doctor/emr"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
          >
            ← Clinic records
          </Link>
        </div>

        <div className="mb-6 overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                Audit log · clinic-scoped
              </p>
              <h1 className="mt-1 bg-gradient-to-r from-slate-900 via-indigo-900 to-violet-900 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
                Who did what
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Every patient, visit, file, invoice, staff change and quota
                unlock — timestamped and attributed.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {actorTotals.map(([actor, count]) => (
                <span
                  key={actor}
                  className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700"
                >
                  {actor.split("@")[0]} · {count}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-white/60 bg-white/70 p-3 backdrop-blur">
          <input
            value={filterActor}
            onChange={(e) => setFilterActor(e.target.value)}
            placeholder="Filter by actor email"
            className="min-w-[200px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
          />
          <select
            value={filterResource}
            onChange={(e) => setFilterResource(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
          >
            {RESOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filterSince}
            onChange={(e) => setFilterSince(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
          />
          <button
            onClick={() => {
              setFilterActor("");
              setFilterResource("");
              setFilterSince("");
            }}
            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Clear
          </button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl">
          {error && (
            <div className="m-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}
          {loading ? (
            <div className="space-y-2 p-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-semibold text-slate-700">
                No audit entries match these filters
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Patient, visit, invoice and staff actions show up here as soon as they happen.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {entries.map((e) => {
                const tone = ACTION_TONE[e.action] || {
                  dot: "bg-slate-400",
                  text: "text-slate-700",
                  bg: "bg-slate-50",
                };
                const metaPairs = e.meta
                  ? Object.entries(e.meta).filter(([, v]) => v !== undefined && v !== null && v !== "")
                  : [];
                const isPatientPayment = e.actorEmail.startsWith("patient:");
                return (
                  <li key={e.id} className="flex items-start gap-4 px-5 py-3">
                    <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone.bg} ${tone.text}`}
                        >
                          {e.action}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {isPatientPayment ? "🌐 Patient (web)" : e.actorEmail || "system"}
                        </span>
                        <span className="text-[11px] text-slate-400">{timeAgo(e.createdAt)}</span>
                      </div>
                      {metaPairs.length > 0 && (
                        <p className="mt-0.5 truncate text-xs text-slate-600">
                          {metaPairs
                            .map(([k, v]) => `${k}: ${String(v)}`)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                    <span className="hidden text-[11px] tabular-nums text-slate-400 sm:inline">
                      {e.createdAt.replace("T", " ").slice(0, 19)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
