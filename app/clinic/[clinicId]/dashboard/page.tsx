"use client";

// Clinic staff dashboard — landing page after sign-in. All roles
// (receptionist / assistant / manager) share this view; the
// manager-only widgets render based on session role.

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/ui/DashboardShell";
import GlassCard from "@/components/ui/GlassCard";

type Role = "receptionist" | "assistant" | "manager";

interface DashboardResp {
  clinic: { id: string; name: string; city: string; country: string };
  staff: { id: string; name: string; email: string; role: Role };
  staffList?: Array<{ id: string; name: string; email: string; role: Role; active: boolean; lastLoginAt?: string }>;
  bookingStats: { todayTotal: number; todayArrived: number; todayPending: number; todayPaid: number; upcoming: number };
  invoiceStats: { todayCount: number; todayInvoiced: number; todayCollected: number; todayTaxDue: number };
  emrTodayCount: number;
  pendingReferrals?: number;
  activity: Array<{ kind: "invoice" | "arrival" | "emr"; id: string; label: string; detail: string; at: string }>;
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
      if (!r.ok) setErr(d.error || "Failed to load");
      else { setData(d as DashboardResp); setErr(null); }
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
    return (
      <DashboardShell role="corporate" hideUserMenu>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-white/60">Loading…</div>
      </DashboardShell>
    );
  }
  if (!data) {
    return (
      <DashboardShell role="corporate" hideUserMenu>
        <GlassCard className="mx-auto max-w-md">
          <p className="text-sm text-rose-200">{err || "Couldn't load the dashboard."}</p>
          <Link href={`/clinic/${clinicId}/login`} className="mt-4 inline-block text-sm text-amber-300 hover:underline">
            ← Sign in
          </Link>
        </GlassCard>
      </DashboardShell>
    );
  }

  const { clinic, staff, bookingStats, invoiceStats, emrTodayCount, activity, staffList, pendingReferrals } = data;
  const isManager = staff.role === "manager";
  const isAssistant = staff.role === "assistant";
  const isReceptionist = staff.role === "receptionist";
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
    <DashboardShell role="corporate" hideUserMenu>
      {/* Hero */}
      <GlassCard glow className="mb-6 overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 opacity-30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 opacity-20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200/90">
              {clinic.name} · {clinic.city}
            </p>
            <h1 className="mt-1 text-2xl font-bold leading-tight md:text-3xl">
              {greet()},{" "}
              <span className="bg-gradient-to-r from-amber-300 via-orange-200 to-rose-300 bg-clip-text text-transparent">
                {firstName(staff.name)}
              </span>
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/85">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${roleBadge.tone}`}>
                <span>{roleBadge.emoji}</span> {roleBadge.label}
              </span>
              <span className="text-white/60">{staff.email}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/20"
          >
            Sign out
          </button>
        </div>
      </GlassCard>

      {/* Stats row */}
      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Today's bookings"
          value={bookingStats.todayTotal}
          sub={`${bookingStats.todayArrived} arrived · ${bookingStats.todayPending} pending`}
          gradient="from-sky-400 to-blue-600"
          icon="📋"
        />
        <StatTile
          label={isReceptionist ? "Upcoming bookings" : "EMR entries today"}
          value={isReceptionist ? bookingStats.upcoming : emrTodayCount}
          sub={isReceptionist ? "Scheduled, not yet arrived" : `${bookingStats.upcoming} upcoming bookings`}
          gradient="from-rose-400 to-pink-600"
          icon={isReceptionist ? "📅" : "🩺"}
        />
        {canBill && (
          <>
            <StatTile
              label="Invoices today"
              value={invoiceStats.todayCount}
              sub={`Issued ${fmtINR(invoiceStats.todayInvoiced)}`}
              gradient="from-emerald-400 to-teal-600"
              icon="🧾"
            />
            <StatTile
              label="Collected today"
              value={fmtINR(invoiceStats.todayCollected)}
              sub={`Tax due ${fmtINR(invoiceStats.todayTaxDue)}`}
              gradient="from-violet-400 to-fuchsia-600"
              icon="💰"
            />
          </>
        )}
        {!canBill && (
          <StatTile
            label="Paid at clinic today"
            value={bookingStats.todayPaid}
            sub={`${bookingStats.todayTotal - bookingStats.todayPaid} not yet`}
            gradient="from-emerald-400 to-teal-600"
            icon="💳"
          />
        )}
        {!canBill && (
          <StatTile
            label="Walk-up queue"
            value={bookingStats.todayPending}
            sub="Awaiting check-in"
            gradient="from-amber-400 to-orange-600"
            icon="⏳"
          />
        )}
      </section>

      {/* Quick actions */}
      <section className="mb-6">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ActionTile href={`/clinic/${clinicId}/reception`} icon="🔍" title="Look up booking"
            body="Scan QR or type booking ID to pull up patient details." accent="from-sky-400 to-blue-500" />
          <ActionTile href={`/clinic/${clinicId}/reception`} icon="✅" title="Mark arrival"
            body="Check patients in when they reach reception." accent="from-emerald-400 to-teal-500" />
          <ActionTile href={`/clinic/${clinicId}/referrals`} icon="↗️"
            title={pendingReferrals && pendingReferrals > 0 ? `Referrals · ${pendingReferrals} pending` : "Referrals"}
            body="Refer a patient to another clinic or hospital in the OduDoc network."
            accent="from-fuchsia-400 to-pink-500" />
          {canEmr && (
            <ActionTile href={`/clinic/${clinicId}/reception`} icon="🩺" title="Save EMR note"
              body="Record vitals, diagnosis, prescription, and notes for this visit."
              accent="from-violet-400 to-fuchsia-500" />
          )}
          {canBill && (
            <>
              <ActionTile href={`/clinic/${clinicId}/reception`} icon="🧾" title="Generate invoice"
                body="Issue a tax-compliant invoice for the visit's services." accent="from-amber-400 to-orange-500" />
              <ActionTile href="/dashboard/doctor/statements" icon="📊" title="Statements"
                body="Monthly / quarterly / yearly clinic revenue + tax." accent="from-indigo-400 to-violet-500" />
              <ActionTile href="/dashboard/doctor/clinic" icon="👥" title="Manage staff"
                body="See the full staff list and roles." accent="from-rose-400 to-pink-500" />
              <ActionTile href={`/clinic/${clinicId}/insurance`} icon="🛡️" title="TPA empanelment"
                body="Manage cashless insurance partners." accent="from-cyan-400 to-blue-500" />
            </>
          )}
        </div>
      </section>

      {/* Manager-only staff snapshot */}
      {isManager && staffList && staffList.length > 0 && (
        <GlassCard className="mb-6">
          <h2 className="text-sm font-bold text-white">Staff ({staffList.length})</h2>
          <p className="mt-1 text-xs text-white/60">Manage staff via the doctor&apos;s clinic page.</p>
          <ul className="mt-3 divide-y divide-white/5">
            {staffList.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <p className="font-semibold text-white">{s.name}</p>
                  <p className="text-xs text-white/60">{s.email} · {s.role}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    s.active ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-white/50"
                  }`}
                >
                  {s.active ? "Active" : "Disabled"}
                </span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      {/* Recent activity */}
      <GlassCard>
        <h2 className="text-sm font-bold text-white">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="mt-3 text-sm text-white/60">Nothing yet today.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/5">
            {activity.map((a, i) => (
              <li key={`${a.kind}-${a.id}-${i}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{iconFor(a.kind)} {a.label}</p>
                  <p className="text-xs text-white/60">{a.detail}</p>
                </div>
                <span className="text-xs text-white/40 whitespace-nowrap">
                  {new Date(a.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </DashboardShell>
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

function StatTile({
  label, value, sub, gradient, icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  gradient: string;
  icon: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
      <div className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${gradient} opacity-25 blur-2xl`} />
      <div className="relative flex items-start justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-lg shadow-md`}>
          {icon}
        </span>
      </div>
      <p className="relative mt-2 text-3xl font-bold text-white">{value}</p>
      <p className="relative mt-1 text-[11px] text-white/60">{sub}</p>
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
      className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.08]"
    >
      <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl transition-opacity group-hover:opacity-50`} />
      <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-lg shadow-md`}>
        {icon}
      </div>
      <div className="relative min-w-0">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="mt-0.5 text-xs text-white/60">{body}</p>
      </div>
    </Link>
  );
}
