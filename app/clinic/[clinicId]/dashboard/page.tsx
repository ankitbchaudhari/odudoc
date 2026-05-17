"use client";

// Clinic staff dashboard — landing page after sign-in. Used by all
// roles (receptionist / assistant / manager). Receptionists see the
// same operational view as everyone; manager-only widgets (staff
// list, etc.) are gated client-side based on the session role.
//
// Navigation here:
//   - 📋 Bookings → /clinic/<id>/reception (existing lookup + EMR page)
//   - 🧾 Invoices → /clinic/<id>/invoices (TBD — falls through to
//     dashboard for now)
//   - 👥 Staff → /clinic/<id>/staff (manager-only, TBD)
//
// One unauthenticated request /api/clinic/dashboard gets every stat
// + activity in one shot.

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Role = "receptionist" | "assistant" | "manager";

interface DashboardResp {
  clinic: { id: string; name: string; city: string; country: string };
  staff: { id: string; name: string; email: string; role: Role };
  staffList?: Array<{ id: string; name: string; email: string; role: Role; active: boolean; lastLoginAt?: string }>;
  bookingStats: {
    todayTotal: number;
    todayArrived: number;
    todayPending: number;
    todayPaid: number;
    upcoming: number;
  };
  invoiceStats: {
    todayCount: number;
    todayInvoiced: number;
    todayCollected: number;
    todayTaxDue: number;
  };
  emrTodayCount: number;
  pendingReferrals?: number;
  activity: Array<{
    kind: "invoice" | "arrival" | "emr";
    id: string;
    label: string;
    detail: string;
    at: string;
  }>;
}

export default function ClinicDashboardPage() {
  const params = useParams<{ clinicId: string }>();
  const router = useRouter();
  const clinicId = params.clinicId;
  const [data, setData] = useState<DashboardResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/clinic/dashboard", { cache: "no-store" });
      if (r.status === 401) {
        router.replace(`/clinic/${clinicId}/login`);
        return;
      }
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error || "Failed to load");
      } else {
        setData(d as DashboardResp);
        setErr(null);
      }
    } finally {
      setLoading(false);
    }
  }, [clinicId, router]);

  useEffect(() => { load(); }, [load]);

  const logout = async () => {
    await fetch("/api/clinic/auth", { method: "DELETE" });
    router.replace(`/clinic/${clinicId}/login`);
  };

  if (loading && !data) {
    return <main className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">Loading…</main>;
  }
  if (!data) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <p className="rounded-lg bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {err || "Couldn't load the dashboard."}
        </p>
        <Link href={`/clinic/${clinicId}/login`} className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          ← Sign in
        </Link>
      </main>
    );
  }

  const { clinic, staff, bookingStats, invoiceStats, emrTodayCount, activity, staffList, pendingReferrals } = data;
  const isManager = staff.role === "manager";
  const isAssistant = staff.role === "assistant";
  const isReceptionist = staff.role === "receptionist";
  // Role capability table — drives which stats / tiles / sections render.
  // Receptionist: patient flow only (lookup + arrival).
  // Assistant:    + save EMR notes / vitals.
  // Manager:      + invoices, statements, staff snapshot.
  const canBill = isManager;
  const canEmr = isManager || isAssistant;
  const fmtINR = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

  const ROLE_BADGE: Record<Role, { label: string; emoji: string; tone: string }> = {
    receptionist: { label: "Receptionist", emoji: "👋", tone: "bg-sky-500/20 text-sky-100 ring-sky-300/30" },
    assistant:    { label: "Assistant",    emoji: "🩺", tone: "bg-violet-500/20 text-violet-100 ring-violet-300/30" },
    manager:      { label: "Manager",      emoji: "🏷️", tone: "bg-amber-500/20 text-amber-100 ring-amber-300/30" },
  };
  const roleBadge = ROLE_BADGE[staff.role];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {/* Hero header */}
      <header className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-5 text-white shadow-xl">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-12 -left-10 h-48 w-48 rounded-full bg-fuchsia-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
              {clinic.name} · {clinic.city}
            </p>
            <h1 className="mt-1 text-2xl font-bold leading-tight">
              {greet()}, {firstName(staff.name)}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/85">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${roleBadge.tone}`}>
                <span>{roleBadge.emoji}</span> {roleBadge.label}
              </span>
              <span className="text-white/70">{staff.email}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="rounded-xl bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/25"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Stats row — role-aware. Receptionist sees only the patient-
          flow stats; assistant adds EMR count; manager sees money. */}
      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's bookings"
          value={bookingStats.todayTotal}
          sub={`${bookingStats.todayArrived} arrived · ${bookingStats.todayPending} pending`}
          tone="from-sky-900/40 to-sky-950/60 text-sky-200 border-sky-900/60"
          icon="📋"
        />
        <StatCard
          label={isReceptionist ? "Upcoming bookings" : "EMR entries today"}
          value={isReceptionist ? bookingStats.upcoming : emrTodayCount}
          sub={isReceptionist ? "Scheduled, not yet arrived" : `${bookingStats.upcoming} upcoming bookings`}
          tone="from-rose-900/40 to-rose-950/60 text-rose-200 border-rose-900/60"
          icon={isReceptionist ? "📅" : "🩺"}
        />
        {canBill && (
          <>
            <StatCard
              label="Invoices today"
              value={invoiceStats.todayCount}
              sub={`Issued ${fmtINR(invoiceStats.todayInvoiced)}`}
              tone="from-emerald-900/40 to-emerald-950/60 text-emerald-200 border-emerald-900/60"
              icon="🧾"
            />
            <StatCard
              label="Collected today"
              value={fmtINR(invoiceStats.todayCollected)}
              sub={`Tax due ${fmtINR(invoiceStats.todayTaxDue)}`}
              tone="from-violet-900/40 to-violet-950/60 text-violet-200 border-violet-900/60"
              icon="💰"
            />
          </>
        )}
        {/* Receptionist + Assistant still get a 4-col row by padding
            with a paid-today tile that's visible to anyone. */}
        {!canBill && (
          <StatCard
            label="Paid at clinic today"
            value={bookingStats.todayPaid}
            sub={`${bookingStats.todayTotal - bookingStats.todayPaid} not yet`}
            tone="from-emerald-900/40 to-emerald-950/60 text-emerald-200 border-emerald-900/60"
            icon="💳"
          />
        )}
        {!canBill && (
          <StatCard
            label="Walk-up queue"
            value={bookingStats.todayPending}
            sub="Awaiting check-in"
            tone="from-amber-900/40 to-amber-950/60 text-amber-200 border-amber-900/60"
            icon="⏳"
          />
        )}
      </section>

      {/* Quick actions — strictly limited to what this role can do.
          Showing a "Generate invoice" tile to a receptionist would just
          lead to a 403, so we hide it instead. */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ActionTile
            href={`/clinic/${clinicId}/reception`}
            icon="🔍"
            title="Look up booking"
            body="Scan QR or type booking ID to pull up patient details."
            accent="from-sky-500 to-blue-500"
          />
          <ActionTile
            href={`/clinic/${clinicId}/reception`}
            icon="✅"
            title="Mark arrival"
            body="Check patients in when they reach reception."
            accent="from-emerald-500 to-teal-500"
          />
          <ActionTile
            href={`/clinic/${clinicId}/referrals`}
            icon="↗️"
            title={pendingReferrals && pendingReferrals > 0 ? `Referrals · ${pendingReferrals} pending` : "Referrals"}
            body="Refer a patient to another clinic or hospital in the OduDoc network — or act on inbound referrals."
            accent="from-fuchsia-500 to-pink-500"
          />
          {canEmr && (
            <ActionTile
              href={`/clinic/${clinicId}/reception`}
              icon="🩺"
              title="Save EMR note"
              body="Record vitals, diagnosis, prescription, and notes for this visit."
              accent="from-violet-500 to-fuchsia-500"
            />
          )}
          {canBill && (
            <>
              <ActionTile
                href={`/clinic/${clinicId}/reception`}
                icon="🧾"
                title="Generate invoice"
                body="Issue a tax-compliant invoice for the visit's services."
                accent="from-amber-500 to-orange-500"
              />
              <ActionTile
                href="/dashboard/doctor/statements"
                icon="📊"
                title="Statements"
                body="Monthly / quarterly / yearly clinic revenue + tax."
                accent="from-indigo-500 to-violet-500"
              />
              <ActionTile
                href="/dashboard/doctor/clinic"
                icon="👥"
                title="Manage staff"
                body="See the full staff list and roles."
                accent="from-rose-500 to-pink-500"
              />
            </>
          )}
        </div>
      </section>

      {/* Manager-only staff snapshot */}
      {isManager && staffList && staffList.length > 0 && (
        <section className="mb-6 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">Staff ({staffList.length})</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Manage staff via the doctor&apos;s clinic page.</p>
          <ul className="mt-3 divide-y divide-gray-100 dark:divide-slate-800">
            {staffList.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-slate-100">{s.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{s.email} · {s.role}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    s.active
                      ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                  }`}
                >
                  {s.active ? "Active" : "Disabled"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recent activity */}
      <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">Nothing yet today.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100 dark:divide-slate-800">
            {activity.map((a, i) => (
              <li key={`${a.kind}-${a.id}-${i}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-slate-100 truncate">
                    {iconFor(a.kind)} {a.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{a.detail}</p>
                </div>
                <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
                  {new Date(a.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function greet(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(full: string): string {
  return full.split(/\s+/)[0] || full;
}

function iconFor(kind: "invoice" | "arrival" | "emr"): string {
  return kind === "invoice" ? "🧾" : kind === "arrival" ? "✅" : "🩺";
}

function StatCard({
  label, value, sub, tone, icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  tone: string;
  icon: string;
}) {
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${tone} p-5`}>
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">{label}</p>
        <span className="text-xl opacity-80" aria-hidden>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
      <p className="mt-1 text-[11px] opacity-70">{sub}</p>
    </div>
  );
}

function ActionTile({
  href, icon, title, body, accent,
}: {
  href: string;
  icon: string;
  title: string;
  body: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-lg shadow-md`}>
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">{title}</h3>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{body}</p>
      </div>
    </Link>
  );
}
