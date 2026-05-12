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
  pendingInvoices?: number;
  pendingInvoicesAmount?: number;
}

interface Quota {
  month: string;
  used: number;
  limit: number;
  unlocked: boolean;
  blocked: boolean;
  remaining: number;
  unlockAmount: number;
  unlockCurrency: string;
}

export default function EmrLandingPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [role, setRole] = useState<string>("owner");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockToast, setUnlockToast] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const refresh = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const [statsRes, patientsRes, visitsRes, quotaRes] = await Promise.all([
        fetch("/api/emr/stats"),
        fetch(`/api/emr/patients${q ? `?query=${encodeURIComponent(q)}` : ""}`),
        fetch("/api/emr/visits?recent=1"),
        fetch("/api/emr/quota"),
      ]);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats || null);
        if (data.role) setRole(data.role);
      }
      if (patientsRes.ok) {
        const data = await patientsRes.json();
        setPatients(data.patients || []);
      }
      if (visitsRes.ok) {
        const data = await visitsRes.json();
        setRecentVisits(data.visits || []);
      }
      if (quotaRes.ok) {
        const data = await quotaRes.json();
        setQuota(data.quota || null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Handle Stripe success/cancel redirects landing back here.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const unlocked = params.get("unlocked");
    const canceled = params.get("canceled");
    if (unlocked === "1" && sessionId) {
      (async () => {
        try {
          const res = await fetch(
            `/api/emr/quota/confirm?session_id=${encodeURIComponent(sessionId)}`
          );
          if (res.ok) {
            setUnlockToast("Unlock confirmed — unlimited patients this month.");
            refresh();
          } else {
            const data = await res.json().catch(() => ({}));
            setUnlockToast(data.error || "Unlock pending — refresh in a moment.");
          }
        } catch {
          setUnlockToast("Unlock pending — refresh in a moment.");
        } finally {
          // Clean URL.
          window.history.replaceState({}, "", "/dashboard/doctor/emr");
        }
      })();
    } else if (canceled === "1") {
      setUnlockToast("Unlock canceled. You can buy it later when you need it.");
      window.history.replaceState({}, "", "/dashboard/doctor/emr");
    }
  }, [refresh]);

  async function startUnlock() {
    setUnlocking(true);
    try {
      const res = await fetch("/api/emr/quota/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setUnlockToast(err instanceof Error ? err.message : "Checkout failed");
      setUnlocking(false);
    }
  }

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
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 py-10">
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
                <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-300">
                  Manage patients, log visits with SOAP notes, and keep a
                  searchable history — no extra software, no monthly fee.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/doctor"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition hover:border-emerald-300 hover:bg-white dark:bg-slate-900 hover:text-emerald-700"
              >
                ← Dashboard
              </Link>
              {(role === "owner" || role === "admin") && (
                <>
                  <Link
                    href="/dashboard/doctor/emr/staff"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition hover:border-indigo-300 hover:bg-white dark:bg-slate-900 hover:text-indigo-700"
                  >
                    Staff
                  </Link>
                  <Link
                    href="/dashboard/doctor/emr/audit"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition hover:border-violet-300 hover:bg-white dark:bg-slate-900 hover:text-violet-700"
                  >
                    Audit log
                  </Link>
                </>
              )}
              <button
                onClick={() => setShowImport(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition hover:border-emerald-300 hover:bg-white dark:bg-slate-900 hover:text-emerald-700"
                title="Bulk-import existing patients from a CSV — doesn't count toward the monthly cap"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                Import CSV
              </button>
              <button
                onClick={() => {
                  if (quota?.blocked) {
                    setPaywall(true);
                  } else {
                    setShowNew(true);
                  }
                }}
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

        {unlockToast && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm">
            <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-5 w-5 text-emerald-600">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">{unlockToast}</div>
            <button
              onClick={() => setUnlockToast(null)}
              className="text-emerald-500 hover:text-emerald-800"
            >
              ✕
            </button>
          </div>
        )}

        {/* Quota banner — only visible to owner/staff (admin sees no quota) */}
        {quota && role !== "admin" && (
          <QuotaBanner
            quota={quota}
            isOwner={role === "owner"}
            onUnlock={() => setPaywall(true)}
          />
        )}

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
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Patients
                  </h2>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
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
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                  />
                </div>
              </div>

              {loading && patients.length === 0 ? (
                <div className="p-6 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800 p-4 h-16" />
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
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {query ? "No patients match your search" : "No patients yet"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {query
                      ? "Try a different name or phone number."
                      : "Click \"Add patient\" to start your clinic record."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
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
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {p.firstName} {p.lastName}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
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
                <div className="border-t border-slate-100 px-5 py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                  Showing 20 of {patients.length} — refine search to find others.
                </div>
              )}
            </div>
          </div>

          {/* Recent visits (1/3) */}
          <div className="lg:col-span-1">
            <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Recent visits
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Last 15 SOAP notes you logged
                </p>
              </div>
              {recentVisits.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  No visits yet — open a patient and add a SOAP note.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentVisits.map((v) => (
                    <li key={v.id}>
                      <Link
                        href={`/dashboard/doctor/emr/patients/${v.patientId}`}
                        className="block px-5 py-3 transition hover:bg-cyan-50/40"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">
                          {v.visitDate}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {patientNameById(v.patientId)}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-medium text-slate-700 dark:text-slate-300">CC:</span>{" "}
                          {v.chiefComplaint}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
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
          onQuotaBlocked={() => {
            setShowNew(false);
            setPaywall(true);
          }}
        />
      )}

      {paywall && quota && (
        <PaywallModal
          quota={quota}
          isOwner={role === "owner"}
          unlocking={unlocking}
          onClose={() => setPaywall(false)}
          onUnlock={startUnlock}
        />
      )}

      {showImport && (
        <ImportPatientsModal
          onClose={() => setShowImport(false)}
          onDone={() => {
            setShowImport(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function ImportPatientsModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: Array<{ row: number; reason: string }>;
    totalRows: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file) {
      setError("Pick a CSV file first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/emr/patients/import", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult({
        imported: data.imported || 0,
        skipped: data.skipped || 0,
        errors: data.errors || [],
        totalRows: data.totalRows || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl"
      >
        <div className="bg-gradient-to-br from-emerald-50 via-cyan-50 to-indigo-50 px-6 py-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            Bulk import · CSV
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
            Import your existing patients
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Migrating from another EMR or a spreadsheet? Upload a CSV and we&apos;ll
            create the records in one go. <b>Imported patients don&apos;t count
            toward the monthly cap</b> — only net-new patients you add via
            OduDoc do.
          </p>
        </div>
        <div className="px-6 py-5">
          {!result ? (
            <>
              <a
                href="/api/emr/patients/import"
                className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download sample CSV template
              </a>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  CSV file (max 5 MB · 10,000 rows)
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-emerald-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-700 hover:file:bg-emerald-200"
                />
              </label>

              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 dark:bg-slate-900 p-3 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-bold text-slate-800 dark:text-slate-200">Required columns:</p>
                <p>
                  <code className="font-mono">firstName</code>{" "}
                  · <code className="font-mono">lastName</code>{" "}
                  · <code className="font-mono">phone</code>
                </p>
                <p className="mt-1 font-bold text-slate-800 dark:text-slate-200">Optional columns:</p>
                <p>
                  age · sex · email · address · bloodGroup · allergies ·
                  chronicConditions · notes
                </p>
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Headers are matched case-insensitively. &quot;First Name&quot;,
                  &quot;Mobile&quot;, &quot;Medical history&quot; etc. work too.
                </p>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {error}
                </div>
              )}

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={submitting || !file}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                >
                  {submitting ? "Importing…" : "Import patients"}
                </button>
              </div>
            </>
          ) : (
            <div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <p className="font-bold">
                  Imported {result.imported} of {result.totalRows} rows.
                </p>
                {result.skipped > 0 && (
                  <p className="mt-0.5 text-xs">
                    {result.skipped} row{result.skipped === 1 ? "" : "s"} skipped — see details below.
                  </p>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="mt-3 max-h-48 overflow-y-auto rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                  <p className="mb-1 font-bold uppercase tracking-wide">
                    Skipped rows
                  </p>
                  <ul className="space-y-0.5">
                    {result.errors.map((e, i) => (
                      <li key={i}>
                        Row {e.row}: {e.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setResult(null);
                    setFile(null);
                  }}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900"
                >
                  Import another file
                </button>
                <button
                  onClick={onDone}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuotaBanner({
  quota,
  isOwner,
  onUnlock,
}: {
  quota: Quota;
  isOwner: boolean;
  onUnlock: () => void;
}) {
  const pct = Math.min(100, Math.round((quota.used / quota.limit) * 100));
  // Three visual states: under-quota (green), >=80% (amber), at-cap (rose).
  const tone =
    quota.blocked
      ? { bg: "from-rose-50 to-amber-50", ring: "border-rose-200", text: "text-rose-800", bar: "from-rose-500 to-amber-500" }
      : pct >= 80
        ? { bg: "from-amber-50 to-orange-50", ring: "border-amber-200", text: "text-amber-800", bar: "from-amber-500 to-orange-500" }
        : { bg: "from-emerald-50 to-cyan-50", ring: "border-emerald-200", text: "text-emerald-800", bar: "from-emerald-500 to-cyan-500" };
  const planLabel = quota.unlocked ? "Practice unlock" : "Free plan";
  // Hard cap for unlocked clinics is /corporate; for free it's the $50 unlock.
  const showUnlockBtn = !quota.unlocked && isOwner;
  return (
    <div className={`mb-6 overflow-hidden rounded-2xl border bg-gradient-to-r ${tone.bg} ${tone.ring} p-4 shadow-sm`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`text-xs font-bold uppercase tracking-wide ${tone.text}`}>
              {planLabel} · {quota.blocked ? "monthly limit reached" : `${quota.month} usage`}
            </p>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              {quota.month}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            {quota.blocked ? (
              quota.unlocked ? (
                <>
                  You&apos;ve hit <b>{quota.used}/{quota.limit}</b> patients on the
                  Practice unlock — the highest paid tier. For more, switch to{" "}
                  <a href="/corporate" className="font-bold text-indigo-700 underline">OduDoc Corporate</a>.
                </>
              ) : (
                <>
                  You&apos;ve added <b>{quota.used}/{quota.limit}</b> patients this
                  month. Buy the <b>${quota.unlockAmount}</b> Practice unlock to
                  raise the cap to <b>{250}</b>.
                </>
              )
            ) : (
              <>
                <b>{quota.used}/{quota.limit}</b> patients this month —
                <b> {quota.remaining}</b> remaining on the {planLabel.toLowerCase()}.
              </>
            )}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/60">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${tone.bar} transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {showUnlockBtn && (
          <button
            onClick={onUnlock}
            className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition ${
              quota.blocked
                ? "bg-gradient-to-r from-rose-600 to-amber-600 shadow-rose-500/30 hover:shadow-xl"
                : "bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 shadow-indigo-500/30 hover:shadow-xl"
            }`}
          >
            {quota.blocked ? `Unlock for $${quota.unlockAmount}` : `Buy unlock — $${quota.unlockAmount}`}
          </button>
        )}
        {quota.unlocked && quota.blocked && (
          <a
            href="/corporate"
            className="shrink-0 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-indigo-600"
          >
            Visit /corporate
          </a>
        )}
      </div>
    </div>
  );
}

function PaywallModal({
  quota,
  isOwner,
  unlocking,
  onClose,
  onUnlock,
}: {
  quota: Quota;
  isOwner: boolean;
  unlocking: boolean;
  onClose: () => void;
  onUnlock: () => void;
}) {
  // Two distinct copy paths:
  // - free → block at 50: pitch the $50 Practice unlock (raises cap to 250)
  // - unlocked → block at 250: pitch /corporate (no third paid tier)
  const atTopTier = quota.unlocked;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl"
      >
        <div className="bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-md">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {atTopTier
                  ? "You've reached the Practice unlock cap"
                  : "You've reached the free monthly limit"}
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {quota.used} of {quota.limit} patients added in <b>{quota.month}</b>.
                {atTopTier
                  ? " The Practice unlock is the highest self-serve tier — bigger volume needs OduDoc Corporate."
                  : " The cap resets on the 1st of next month, or upgrade now."}
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 py-5">
          {atTopTier ? (
            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-fuchsia-50 p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                    OduDoc Corporate
                  </p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    Multi-clinic, hospital-grade tier. Custom volume, BAA / DPA
                    available, dedicated support.
                  </p>
                </div>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">Talk to us</p>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  <span>Unlimited patients per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  <span>Unlimited staff &amp; multiple clinics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  <span>Hospital-grade compliance + SLA</span>
                </li>
              </ul>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Practice unlock
                  </p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    Lifts the cap for the rest of <b>{quota.month}</b>.
                  </p>
                </div>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  ${quota.unlockAmount}
                  <span className="ml-0.5 text-sm font-normal text-slate-500 dark:text-slate-400">/mo</span>
                </p>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Up to <b>250 patients</b> this calendar month</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>3 nurses + 3 front desk + 3 staff doctors</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>One-time Stripe payment — no auto-renew</span>
                </li>
              </ul>
            </div>
          )}
          <div className="mt-5 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900"
            >
              Close
            </button>
            {atTopTier ? (
              <a
                href="/corporate"
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-lg hover:bg-indigo-600"
              >
                Visit /corporate →
              </a>
            ) : isOwner ? (
              <button
                onClick={onUnlock}
                disabled={unlocking}
                className="rounded-xl bg-gradient-to-r from-rose-600 via-amber-600 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 disabled:opacity-50"
              >
                {unlocking ? "Opening Stripe…" : `Unlock for $${quota.unlockAmount}`}
              </button>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Only the clinic owner can purchase the unlock.
              </span>
            )}
          </div>
        </div>
      </div>
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
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
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
  onQuotaBlocked,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
  onQuotaBlocked?: () => void;
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
      if (res.status === 402 && onQuotaBlocked) {
        onQuotaBlocked();
        return;
      }
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-900/5"
      >
        {/* Header with gradient + icon */}
        <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-cyan-50 to-indigo-50 px-7 py-5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-md shadow-emerald-500/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 11h-6M19 8v6" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  New patient · Clinic record
                </p>
                <h3 className="mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100">
                  Add a patient to your clinic
                </h3>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  Required fields are marked <span className="font-bold text-rose-500">*</span>. Everything else is optional and editable later.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 -mt-1 shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-white/70 hover:text-slate-700 dark:text-slate-300"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/40 px-7 py-6">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm">
              <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-rose-500">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Section: Identity */}
          <Section
            title="Identity"
            description="Patient's name, age and biological sex."
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="First name" required value={form.firstName} onChange={(v) => set("firstName", v)} placeholder="e.g. Maria" />
              <Input label="Last name" required value={form.lastName} onChange={(v) => set("lastName", v)} placeholder="e.g. González" />
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
            </div>
          </Section>

          {/* Section: Contact */}
          <Section
            title="Contact"
            description="How to reach the patient. Phone is required so they receive appointment reminders."
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
              </svg>
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Phone"
                required
                value={form.phone}
                onChange={(v) => set("phone", v)}
                placeholder="+1 555 123 4567"
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(v) => set("email", v)}
                placeholder="patient@example.com"
              />
              <Input
                label="Address"
                wide
                value={form.address}
                onChange={(v) => set("address", v)}
                placeholder="Street, city, country"
              />
            </div>
          </Section>

          {/* Section: Clinical */}
          <Section
            title="Clinical"
            description="Quick-glance medical context — surfaced on every visit."
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Blood group"
                value={form.bloodGroup}
                onChange={(v) => set("bloodGroup", v)}
                placeholder="e.g. O+"
              />
              <Input
                label="Allergies"
                value={form.allergies}
                onChange={(v) => set("allergies", v)}
                placeholder="e.g. Penicillin, peanuts"
              />
              <Input
                label="Chronic conditions"
                wide
                value={form.chronicConditions}
                onChange={(v) => set("chronicConditions", v)}
                placeholder="e.g. Type 2 diabetes, hypertension"
              />
              <Textarea
                label="Notes"
                wide
                value={form.notes}
                onChange={(v) => set("notes", v)}
                placeholder="Private clinical notes, preferences, anything you want to remember."
              />
            </div>
          </Section>

          <p className="mt-2 flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-3.5 w-3.5 shrink-0">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Patient data lives in your clinic only — separate from other clinics on OduDoc. You can export or delete the record at any time.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-white dark:bg-slate-900 px-7 py-4">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Tip:</span> have lots of patients already? Use the <span className="font-semibold">Import CSV</span> button instead.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:shadow-xl hover:shadow-emerald-500/40 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                    <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  Save patient
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3">
        {icon && (
          <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {title}
          </p>
          {description && (
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
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
      <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
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
      <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
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
      <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
      />
    </label>
  );
}
