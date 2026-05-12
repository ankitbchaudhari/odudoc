"use client";

import { useMemo, useState } from "react";
import { doctors } from "@/lib/data";
import { createReferral } from "@/lib/referrals-store";

interface ReferralModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  patientEmail: string;
  patientName: string;
  patientPhone?: string;
  fromDoctorId: string;
  fromDoctorName: string;
  fromDoctorEmail: string;
  fromSpecialty: string;
  sourceConsultationId?: string;
  defaultNotes?: string;
}

export default function ReferralModal({
  open,
  onClose,
  onCreated,
  patientEmail,
  patientName,
  patientPhone,
  fromDoctorId,
  fromDoctorName,
  fromDoctorEmail,
  fromSpecialty,
  sourceConsultationId,
  defaultNotes = "",
}: ReferralModalProps) {
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState(defaultNotes);
  const [urgency, setUrgency] = useState<"routine" | "urgent" | "emergency">("routine");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const specialties = useMemo(() => {
    const set = new Set(doctors.map((d) => d.specialty));
    return ["all", ...Array.from(set).sort()];
  }, []);

  const candidates = useMemo(() => {
    return doctors
      .filter((d) => d.id !== fromDoctorId)
      .filter((d) => specialtyFilter === "all" || d.specialty === specialtyFilter)
      .filter((d) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          d.city.toLowerCase().includes(q)
        );
      })
      .slice(0, 50);
  }, [search, specialtyFilter, fromDoctorId]);

  const selected = doctors.find((d) => d.id === selectedId);

  if (!open) return null;

  const submit = () => {
    setError("");
    if (!selected) {
      setError("Please choose a doctor to refer to.");
      return;
    }
    if (!reason.trim()) {
      setError("Please add a short reason for the referral.");
      return;
    }
    setSubmitting(true);
    try {
      createReferral({
        patientEmail,
        patientName,
        patientPhone,
        fromDoctorId,
        fromDoctorName,
        fromDoctorEmail,
        fromSpecialty,
        toDoctorId: selected.id,
        toDoctorName: selected.name,
        toSpecialty: selected.specialty,
        reason: reason.trim(),
        clinicalNotes: clinicalNotes.trim(),
        urgency,
        sourceConsultationId,
      });
      // Fire notification emails — don't block the UI on failures
      fetch("/api/referrals/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientEmail,
          patientName,
          fromDoctorName,
          fromDoctorEmail,
          fromSpecialty,
          toDoctorId: selected.id,
          toDoctorName: selected.name,
          toSpecialty: selected.specialty,
          reason: reason.trim(),
          clinicalNotes: clinicalNotes.trim(),
          urgency,
        }),
      }).catch(() => {});
      onCreated?.();
      onClose();
      // reset
      setSelectedId(null);
      setReason("");
      setClinicalNotes(defaultNotes);
      setUrgency("routine");
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Refer patient to another doctor</h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
              Referring <span className="font-medium text-gray-700 dark:text-slate-300">{patientName}</span> — they&apos;ll be notified.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:text-slate-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Step 1 — pick doctor */}
          <div className="mb-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              1 · Choose a doctor
            </label>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, specialty, or city…"
                className="w-full rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm outline-none focus:border-primary-500"
              >
                {specialties.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All specialties" : s}
                  </option>
                ))}
              </select>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-800">
              {candidates.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-500 dark:text-slate-400">No doctors match your filters.</p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                  {candidates.map((d) => {
                    const isSelected = d.id === selectedId;
                    return (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(d.id)}
                          className={`flex w-full items-center gap-3 p-3 text-left transition-colors ${
                            isSelected ? "bg-primary-50" : "hover:bg-gray-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${d.imageColor}`}
                          >
                            {d.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">{d.name}</p>
                            <p className="truncate text-xs text-gray-500 dark:text-slate-400">
                              {d.specialty} · {d.city} · {d.experience}y exp
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isSelected ? "bg-primary-600 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300"
                            }`}
                          >
                            {isSelected ? "Selected" : "Select"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {selected && (
              <p className="mt-2 text-xs text-primary-700">
                Referring to <span className="font-semibold">{selected.name}</span> ({selected.specialty})
              </p>
            )}
          </div>

          {/* Step 2 — details */}
          <div className="mb-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              2 · Reason & notes
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for referral (e.g. specialist opinion on ECG abnormality)"
              className="mb-3 w-full rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
            <textarea
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              rows={4}
              placeholder="Clinical summary, relevant history, medications, investigations (visible to the receiving doctor)"
              className="w-full rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          {/* Step 3 — urgency */}
          <div className="mb-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              3 · Urgency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["routine", "urgent", "emergency"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUrgency(u)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-all ${
                    urgency === u
                      ? u === "emergency"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : u === "urgent"
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 dark:bg-slate-900 p-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || !selected || !reason.trim()}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send referral"}
          </button>
        </div>
      </div>
    </div>
  );
}
