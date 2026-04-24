"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Consultation, ConsultationStatus } from "@/lib/consultations-store";
import PatientPresenceBadge, { PatientPresenceDot } from "@/components/PatientPresenceBadge";

const STATUS_LABELS: Record<ConsultationStatus, { label: string; color: string }> = {
  pending_payment: { label: "Pending payment", color: "bg-gray-100 text-gray-600" },
  awaiting_doctor: { label: "Awaiting you", color: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
  rescheduled: { label: "Rescheduled", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In progress", color: "bg-indigo-100 text-indigo-700" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500" },
  refunded: { label: "Refunded", color: "bg-rose-100 text-rose-700" },
};

export default function DoctorConsultationsPage() {
  const [list, setList] = useState<Consultation[]>([]);
  const [filter, setFilter] = useState<ConsultationStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/consultations", { cache: "no-store" });
    const data = await res.json();
    setList(data.consultations || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Poll every 30s so the specialty pool updates without reloading —
    // a new patient booking any-available should light up the queue on
    // every matching doctor's dashboard in well under a minute.
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  // "Unclaimed" = fan-out record where no doctor has accepted yet.
  // Surfaced separately from the main list so doctors see "Open
  // requests" as a distinct call-to-action, not buried in status tabs.
  const pool = list.filter((c) => !c.doctorId);
  const owned = list.filter((c) => c.doctorId);

  const filtered = filter === "all" ? owned : owned.filter((c) => c.status === filter);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Consultations</h1>
            <p className="text-sm text-gray-500">Approve, reject, reschedule, or prescribe.</p>
          </div>
          <button onClick={load} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Refresh
          </button>
        </div>

        {/* Specialty pool — patients who asked for any available doctor
            in this specialty. First doctor to click Accept gets it. */}
        {pool.length > 0 && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <h2 className="text-sm font-semibold text-emerald-900">
                Open requests in your specialty ({pool.length})
              </h2>
              <span className="text-xs text-emerald-700/70">
                Any available — first to accept wins
              </span>
            </div>
            <div className="space-y-2">
              {pool.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-emerald-100"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                    {c.patientName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {c.patientName}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {c.medicalHistory.chiefComplaint || c.specialty}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {c.dateLabel} · {c.timeSlot}
                    </p>
                  </div>
                  <button
                    onClick={() => claim(c.id)}
                    disabled={claiming === c.id}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {claiming === c.id ? "Accepting…" : "Accept"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} count={list.length} />
          <FilterChip label="Awaiting you" active={filter === "awaiting_doctor"} onClick={() => setFilter("awaiting_doctor")} count={counts.awaiting_doctor || 0} />
          <FilterChip label="Approved" active={filter === "approved"} onClick={() => setFilter("approved")} count={counts.approved || 0} />
          <FilterChip label="Completed" active={filter === "completed"} onClick={() => setFilter("completed")} count={counts.completed || 0} />
          <FilterChip label="Rejected" active={filter === "rejected"} onClick={() => setFilter("rejected")} count={counts.rejected || 0} />
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl">📋</div>
            <p className="text-sm text-gray-500">No consultations in this view yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const meta = STATUS_LABELS[c.status];
              return (
                <Link key={c.id} href={`/dashboard/doctor/consultations/${c.id}`}
                  className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 hover:ring-primary-200">
                  <div className="relative">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                      {c.patientName.slice(0, 2).toUpperCase()}
                    </div>
                    <PatientPresenceDot patientKey={c.patientEmail} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">{c.patientName}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>{meta.label}</span>
                      <PatientPresenceBadge patientKey={c.patientEmail} />
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                      {c.medicalHistory.chiefComplaint || "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {c.dateLabel} · {c.timeSlot} · {c.specialty}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">${c.fee}</p>
                    <p className="text-xs text-gray-400">View →</p>
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

function FilterChip({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count: number }) {
  return (
    <button onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
        active ? "bg-primary-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
      }`}>
      {label} <span className="ml-1 opacity-70">({count})</span>
    </button>
  );
}
