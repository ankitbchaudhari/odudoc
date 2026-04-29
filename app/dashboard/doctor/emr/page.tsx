"use client";

// EMR landing — quick stats, recent patients/visits, "Add patient" + search.
// Acts as the doctor's home base for their small clinic. The patient
// detail page is where actual SOAP work happens.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  age: string;
  sex: string;
  phone: string;
  chronicConditions?: string;
  allergies?: string;
  updatedAt: string;
}

interface Visit {
  id: string;
  patientId: string;
  visitDate: string;
  chiefComplaint: string;
  assessment: string;
  createdAt: string;
}

interface Stats {
  totalPatients: number;
  totalVisits: number;
  visitsToday: number;
  visitsThisMonth: number;
  newPatientsThisMonth: number;
}

export default function EmrLandingPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);

  const refresh = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const [statsRes, patientsRes, visitsRes] = await Promise.all([
        fetch("/api/emr/stats"),
        fetch(`/api/emr/patients${q ? `?query=${encodeURIComponent(q)}` : ""}`),
        fetch("/api/emr/visits?recent=1"),
      ]);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats || null);
      }
      if (patientsRes.ok) {
        const data = await patientsRes.json();
        setPatients(data.patients || []);
      }
      if (visitsRes.ok) {
        const data = await visitsRes.json();
        setRecentVisits(data.visits || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => refresh(query), 250);
    return () => clearTimeout(t);
  }, [query, refresh]);

  const patientNameById = (id: string) => {
    const p = patients.find((x) => x.id === id);
    return p ? `${p.firstName} ${p.lastName}` : "Patient";
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 py-10">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-200/40 via-cyan-200/40 to-indigo-200/40 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-6 overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-emerald-500/5 backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30 sm:h-14 sm:w-14">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 sm:h-7 sm:w-7">
                  <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l7-3 7 3z" />
                  <path d="M9 7h6M9 11h6M9 15h4" />
                </svg>
              </div>
              <div>
                <p className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                  Free EMR · Your clinic
                </p>
                <h1 className="bg-gradient-to-r from-slate-900 via-emerald-900 to-cyan-900 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
                  Clinic Records
                </h1>
                <p className="mt-1 max-w-xl text-sm text-slate-600">
                  Manage patients, log visits with SOAP notes, and keep a
                  searchable history — no extra software, no monthly fee.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/doctor"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-white hover:text-emerald-700"
              >
                ← Dashboard
              </Link>
              <button
                onClick={() => setShowNew(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:shadow-xl hover:shadow-emerald-500/40"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add patient
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard
            label="Total patients"
            value={stats?.totalPatients}
            accent="emerald"
          />
          <StatCard
            label="Visits today"
            value={stats?.visitsToday}
            accent="cyan"
          />
          <StatCard
            label="Visits this month"
            value={stats?.visitsThisMonth}
            accent="violet"
          />
          <StatCard
            label="New patients (mo.)"
            value={stats?.newPatientsThisMonth}
            accent="amber"
          />
          <StatCard
            label="Total visits"
            value={stats?.totalVisits}
            accent="rose"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Patient list (2/3) */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Patients
                  </h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {patients.length}
                  </span>
                </div>
                <div className="relative w-full sm:w-72">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, phone, condition…"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                  />
                </div>
              </div>

              {loading && patients.length === 0 ? (
                <div className="p-6 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse rounded-xl bg-slate-100 p-4 h-16" />
                  ))}
                </div>
              ) : patients.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-emerald-600">
                      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 11h-6M19 8v6" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    {query ? "No patients match your search" : "No patients yet"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {query
                      ? "Try a different name or phone number."
                      : "Click \"Add patient\" to start your clinic record."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {patients.slice(0, 20).map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/dashboard/doctor/emr/patients/${p.id}`}
                        className="group flex items-center gap-4 px-5 py-3.5 transition hover:bg-emerald-50/40"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-cyan-100 text-sm font-bold text-emerald-700 ring-2 ring-white">
                          {(p.firstName[0] || "?").toUpperCase()}
                          {(p.lastName[0] || "").toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {p.firstName} {p.lastName}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {p.age && <>{p.age} yrs · </>}
                            {p.sex && <>{p.sex} · </>}
                            {p.phone}
                            {p.chronicConditions && (
                              <> · {p.chronicConditions}</>
                            )}
                          </p>
                        </div>
                        <span className="hidden text-xs text-slate-400 sm:inline">
                          {timeAgo(p.updatedAt)}
                        </span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {patients.length > 20 && (
                <div className="border-t border-slate-100 px-5 py-3 text-center text-xs text-slate-500">
                  Showing 20 of {patients.length} — refine search to find others.
                </div>
              )}
            </div>
          </div>

          {/* Recent visits (1/3) */}
          <div className="lg:col-span-1">
            <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-bold text-slate-900">
                  Recent visits
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Last 15 SOAP notes you logged
                </p>
              </div>
              {recentVisits.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No visits yet — open a patient and add a SOAP note.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recentVisits.map((v) => (
                    <li key={v.id}>
                      <Link
                        href={`/dashboard/doctor/emr/patients/${v.patientId}`}
                        className="block px-5 py-3 transition hover:bg-cyan-50/40"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">
                          {v.visitDate}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                          {patientNameById(v.patientId)}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                          <span className="font-medium text-slate-700">CC:</span>{" "}
                          {v.chiefComplaint}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                          {v.assessment}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {showNew && (
        <NewPatientModal
          onClose={() => setShowNew(false)}
          onCreated={(newId) => {
            setShowNew(false);
            refresh();
            // Navigate straight into the new patient's profile.
            window.location.href = `/dashboard/doctor/emr/patients/${newId}`;
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | undefined;
  accent: "emerald" | "cyan" | "violet" | "amber" | "rose";
}) {
  const accents: Record<string, { bg: string; text: string; ring: string }> = {
    emerald: { bg: "from-emerald-50 to-emerald-100/30", text: "text-emerald-700", ring: "ring-emerald-100" },
    cyan: { bg: "from-cyan-50 to-cyan-100/30", text: "text-cyan-700", ring: "ring-cyan-100" },
    violet: { bg: "from-violet-50 to-violet-100/30", text: "text-violet-700", ring: "ring-violet-100" },
    amber: { bg: "from-amber-50 to-amber-100/30", text: "text-amber-700", ring: "ring-amber-100" },
    rose: { bg: "from-rose-50 to-rose-100/30", text: "text-rose-700", ring: "ring-rose-100" },
  };
  const a = accents[accent];
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${a.bg} p-4 ring-1 ${a.ring} backdrop-blur`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${a.text}`}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
        {value === undefined ? "—" : value}
      </p>
    </div>
  );
}

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

function NewPatientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    age: "",
    sex: "" as "" | "Male" | "Female" | "Other",
    phone: "",
    email: "",
    address: "",
    bloodGroup: "",
    allergies: "",
    chronicConditions: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()) {
      setError("First name, last name, and phone are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/emr/patients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onCreated(data.patient.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">Add patient</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="First name" required value={form.firstName} onChange={(v) => set("firstName", v)} />
            <Input label="Last name" required value={form.lastName} onChange={(v) => set("lastName", v)} />
            <Input label="Age" value={form.age} onChange={(v) => set("age", v)} placeholder="e.g. 42" />
            <Select
              label="Sex"
              value={form.sex}
              onChange={(v) => set("sex", v as "" | "Male" | "Female" | "Other")}
              options={[
                { value: "", label: "Select…" },
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
                { value: "Other", label: "Other" },
              ]}
            />
            <Input label="Phone" required value={form.phone} onChange={(v) => set("phone", v)} placeholder="+91 98765 43210" />
            <Input label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} />
            <Input label="Address" wide value={form.address} onChange={(v) => set("address", v)} />
            <Input label="Blood group" value={form.bloodGroup} onChange={(v) => set("bloodGroup", v)} placeholder="e.g. O+" />
            <Input label="Allergies" value={form.allergies} onChange={(v) => set("allergies", v)} placeholder="Penicillin, peanuts…" />
            <Input
              label="Chronic conditions"
              wide
              value={form.chronicConditions}
              onChange={(v) => set("chronicConditions", v)}
              placeholder="Diabetes, hypertension…"
            />
            <Textarea
              label="Notes"
              wide
              value={form.notes}
              onChange={(v) => set("notes", v)}
              placeholder="Anything you want to remember about this patient."
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:shadow-xl disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save patient"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* Reusable form atoms */
function Input({
  label,
  value,
  onChange,
  wide,
  required,
  placeholder,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  wide?: boolean;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-semibold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
      />
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function Textarea({
  label,
  value,
  onChange,
  wide,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  wide?: boolean;
  placeholder?: string;
}) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-semibold text-slate-700">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
      />
    </label>
  );
}
