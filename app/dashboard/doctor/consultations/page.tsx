"use client";

// Doctor's consultation queue. Replaces the older flat list with a
// glanceable layout: hero with live counts, segmented filter pills
// with badge counts, an "open requests" pool that pulses at the top
// when fan-out bookings are waiting, and richer per-row cards with
// status badges, presence indicators, time-of-day, fee, and a clean
// hover state.

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Consultation, ConsultationStatus } from "@/lib/consultations-store";
import PatientPresenceBadge, { PatientPresenceDot } from "@/components/PatientPresenceBadge";

const STATUS_LABELS: Record<
  ConsultationStatus,
  { label: string; cls: string; ringDot: string }
> = {
  pending_payment: { label: "Pending payment", cls: "bg-slate-100 text-slate-600",   ringDot: "bg-slate-400" },
  awaiting_doctor: { label: "Awaiting you",    cls: "bg-amber-100 text-amber-800",   ringDot: "bg-amber-500" },
  approved:        { label: "Approved",        cls: "bg-emerald-100 text-emerald-800", ringDot: "bg-emerald-500" },
  rejected:        { label: "Rejected",        cls: "bg-rose-100 text-rose-700",     ringDot: "bg-rose-500" },
  rescheduled:     { label: "Rescheduled",     cls: "bg-sky-100 text-sky-800",       ringDot: "bg-sky-500" },
  in_progress:     { label: "In progress",     cls: "bg-indigo-100 text-indigo-800", ringDot: "bg-indigo-500" },
  completed:       { label: "Completed",       cls: "bg-teal-100 text-teal-800",     ringDot: "bg-teal-500" },
  cancelled:       { label: "Cancelled",       cls: "bg-slate-100 text-slate-500",   ringDot: "bg-slate-400" },
  refunded:        { label: "Refunded",        cls: "bg-fuchsia-100 text-fuchsia-800", ringDot: "bg-fuchsia-500" },
};

function avatarColour(seed: string): string {
  // Deterministic hue per patient name so the same person keeps the
  // same avatar across visits without us tracking it.
  const palette = [
    "from-violet-500 to-indigo-500",
    "from-cyan-500 to-sky-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-rose-500 to-pink-500",
    "from-fuchsia-500 to-purple-500",
    "from-blue-500 to-indigo-600",
    "from-teal-500 to-cyan-600",
  ];
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

export default function DoctorConsultationsPage() {
  const [list, setList] = useState<Consultation[]>([]);
  const [filter, setFilter] = useState<ConsultationStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/consultations", { cache: "no-store" });
      const data = await res.json();
      setList(Array.isArray(data.consultations) ? data.consultations : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const pool = list.filter((c) => !c.doctorId);
  const owned = list.filter((c) => c.doctorId);

  const filtered = (filter === "all" ? owned : owned.filter((c) => c.status === filter)).filter((c) =>
    !search.trim()
      ? true
      : c.patientName.toLowerCase().includes(search.trim().toLowerCase()) ||
        (c.medicalHistory?.chiefComplaint || "").toLowerCase().includes(search.trim().toLowerCase()),
  );

  const counts = owned.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  const claim = async (id: string) => {
    setClaiming(id);
    try {
      const r = await fetch(`/api/consultations/${id}/claim`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        alert(j.error || "Could not accept. It may have been taken by another doctor.");
      }
      await load();
    } finally {
      setClaiming(null);
    }
  };

  const total = owned.length;
  const awaiting = counts.awaiting_doctor || 0;
  const completed = counts.completed || 0;
  const inProgress = counts.in_progress || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero with live stats */}
        <div className="mb-6 overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 p-6 text-white shadow-xl shadow-violet-500/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                </span>
                Live · auto-refreshing every 30s
              </span>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
                Consultations
              </h1>
              <p className="mt-1 text-sm text-white/80">
                Approve, reject, reschedule, prescribe — everything in one place.
              </p>
            </div>
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total" value={total} />
            <Stat label="Awaiting you" value={awaiting} accent="bg-amber-300" />
            <Stat label="In progress" value={inProgress} accent="bg-emerald-300" />
            <Stat label="Completed" value={completed} accent="bg-teal-300" />
          </div>
        </div>

        {/* Specialty pool — patients who asked for any available doctor
            in this specialty. First doctor to click Accept gets it. */}
        {pool.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 shadow-md shadow-emerald-500/10">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
                </span>
                <h2 className="text-sm font-bold text-emerald-900">
                  Open requests in your specialty
                </h2>
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {pool.length}
                </span>
              </div>
              <span className="text-[11px] text-emerald-800/70">
                Any-available pool · first to accept wins
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {pool.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-emerald-100 transition hover:ring-emerald-300"
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarColour(c.patientName || "")} text-sm font-bold text-white shadow-md`}>
                    {(c.patientName || "??").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {c.patientName}
                    </p>
                    <p className="truncate text-xs text-slate-600">
                      {c.medicalHistory?.chiefComplaint || c.specialty}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {c.dateLabel} · {c.timeSlot}
                    </p>
                  </div>
                  <button
                    onClick={() => claim(c.id)}
                    disabled={claiming === c.id}
                    className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/30 transition hover:scale-105 disabled:opacity-60"
                  >
                    {claiming === c.id ? "Accepting…" : "Accept"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter pills + search */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} count={total} />
            <FilterChip label="Awaiting you" active={filter === "awaiting_doctor"} onClick={() => setFilter("awaiting_doctor")} count={awaiting} accent="amber" />
            <FilterChip label="Approved" active={filter === "approved"} onClick={() => setFilter("approved")} count={counts.approved || 0} accent="emerald" />
            <FilterChip label="In progress" active={filter === "in_progress"} onClick={() => setFilter("in_progress")} count={inProgress} accent="indigo" />
            <FilterChip label="Completed" active={filter === "completed"} onClick={() => setFilter("completed")} count={completed} accent="teal" />
            <FilterChip label="Rejected" active={filter === "rejected"} onClick={() => setFilter("rejected")} count={counts.rejected || 0} accent="rose" />
          </div>
          <div className="relative w-full sm:w-72">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient or complaint"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 text-2xl">
              📋
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {search.trim()
                ? "No consultations match your search."
                : filter === "all"
                  ? "No consultations yet."
                  : `No ${STATUS_LABELS[filter as ConsultationStatus]?.label.toLowerCase() || filter} consultations.`}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              New bookings appear here within 30 seconds.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const meta = STATUS_LABELS[c.status];
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/doctor/consultations/${c.id}`}
                  className="group flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-500/10"
                >
                  <div className="relative">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarColour(c.patientName || "")} text-sm font-bold text-white shadow-md`}>
                      {(c.patientName || "??").slice(0, 2).toUpperCase()}
                    </div>
                    <PatientPresenceDot patientKey={c.patientEmail} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">{c.patientName}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.cls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.ringDot}`} />
                        {meta.label}
                      </span>
                      <PatientPresenceBadge patientKey={c.patientEmail} />
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-slate-600">
                      {c.medicalHistory?.chiefComplaint || (
                        <span className="italic text-slate-400">No chief complaint provided</span>
                      )}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
                      <span>📅 {c.dateLabel}</span>
                      <span>·</span>
                      <span>🕒 {c.timeSlot}</span>
                      <span>·</span>
                      <span>{c.specialty}</span>
                      {c.prescriptionId && (
                        <>
                          <span>·</span>
                          <span className="font-semibold text-emerald-600">💊 Prescribed</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <p className="text-base font-bold text-slate-900">
                      {c.fee != null ? `${c.currency || "$"}${c.fee}` : "—"}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 transition group-hover:gap-2">
                      View
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent = "bg-white/40" }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${accent}`} />
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-extrabold leading-none">{value}</p>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  count,
  accent = "violet",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
  accent?: "violet" | "amber" | "emerald" | "indigo" | "teal" | "rose";
}) {
  const activeBg: Record<string, string> = {
    violet:  "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/30",
    amber:   "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30",
    emerald: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/30",
    indigo:  "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/30",
    teal:    "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-500/30",
    rose:    "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-500/30",
  };
  return (
    <button
      onClick={onClick}
      className={`group inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
        active
          ? activeBg[accent]
          : "border border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
          active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-violet-100 group-hover:text-violet-700"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
