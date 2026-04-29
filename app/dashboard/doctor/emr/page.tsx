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
              {(role === "owner" || role === "admin") && (
                <>
                  <Link
                    href="/dashboard/doctor/emr/staff"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-white hover:text-indigo-700"
                  >
                    Staff
                  </Link>
                  <Link
                    href="/dashboard/doctor/emr/audit"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-300 hover:bg-white hover:text-violet-700"
                  >
                    Audit log
                  </Link>
                </>
              )}
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
  const tone = quota.unlocked
    ? { bg: "from-emerald-50 to-cyan-50", ring: "border-emerald-200", text: "text-emerald-800", bar: "from-emerald-500 to-cyan-500" }
    : quota.blocked
      ? { bg: "from-rose-50 to-amber-50", ring: "border-rose-200", text: "text-rose-800", bar: "from-rose-500 to-amber-500" }
      : pct >= 80
        ? { bg: "from-amber-50 to-orange-50", ring: "border-amber-200", text: "text-amber-800", bar: "from-amber-500 to-orange-500" }
        : { bg: "from-emerald-50 to-cyan-50", ring: "border-emerald-200", text: "text-emerald-800", bar: "from-emerald-500 to-cyan-500" };
  return (
    <div className={`mb-6 overflow-hidden rounded-2xl border bg-gradient-to-r ${tone.bg} ${tone.ring} p-4 shadow-sm`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`text-xs font-bold uppercase tracking-wide ${tone.text}`}>
              {quota.unlocked
                ? "Unlimited this month"
                : quota.blocked
                  ? "Monthly limit reached"
                  : "Free tier usage"}
            </p>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
              {quota.month}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-700">
            {quota.unlocked ? (
              <>You've unlocked unlimited patients for this month. Cap resets next month.</>
            ) : quota.blocked ? (
              <>You've added <b>{quota.used}/{quota.limit}</b> patients this month. Add more by unlocking — <b>${quota.unlockAmount}</b> for the rest of {quota.month}.</>
            ) : (
              <><b>{quota.used}/{quota.limit}</b> patients added this month — <b>{quota.remaining}</b> remaining on the free plan.</>
            )}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/60">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${tone.bar} transition-all`}
              style={{ width: `${quota.unlocked ? 100 : pct}%` }}
            />
          </div>
        </div>
        {!quota.unlocked && isOwner && (
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
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
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
              <h3 className="text-lg font-bold text-slate-900">
                You've reached the free monthly limit
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {quota.used} of {quota.limit} patients added in <b>{quota.month}</b>.
                The cap resets on the 1st of next month.
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Unlimited unlock
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Lifts the cap for the rest of <b>{quota.month}</b>.
                </p>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                ${quota.unlockAmount}
                <span className="ml-0.5 text-sm font-normal text-slate-500">/mo</span>
              </p>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Unlimited new patients this calendar month</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>One-time payment via Stripe — no auto-renewal</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Visits, files, invoices, staff — always free</span>
              </li>
            </ul>
          </div>
          <div className="mt-5 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
            {isOwner ? (
              <button
                onClick={onUnlock}
                disabled={unlocking}
                className="rounded-xl bg-gradient-to-r from-rose-600 via-amber-600 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 disabled:opacity-50"
              >
                {unlocking ? "Opening Stripe…" : `Unlock for $${quota.unlockAmount}`}
              </button>
            ) : (
              <span className="text-xs text-slate-500">
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
