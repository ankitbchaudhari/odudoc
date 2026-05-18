"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Consultation } from "@/lib/consultations-store";
import type { PrescriptionRecord } from "@/lib/prescriptions-store";
import DoctorComplianceTile from "@/components/DoctorComplianceTile";
import BaaReacceptancePrompt from "@/components/BaaReacceptancePrompt";
import DoctorGuideBanner from "@/components/DoctorGuideBanner";
import { useDoctorMoney } from "@/components/useDoctorMoney";
import DashboardShell from "@/components/ui/DashboardShell";
import GlassCard from "@/components/ui/GlassCard";
import StatTile from "@/components/ui/StatTile";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DoctorDashboardPage() {
  const { data: session, status } = useSession();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [instant, setInstant] = useState<{ available: boolean; until: string | null }>({ available: false, until: null });
  const [instantBusy, setInstantBusy] = useState(false);
  const money = useDoctorMoney();

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/consultations").then((r) => r.json()).then((d) => setConsultations(d.consultations || [])).catch(() => {});
    fetch("/api/prescriptions").then((r) => r.json()).then((d) => setPrescriptions(d.prescriptions || [])).catch(() => {});
    fetch("/api/doctor/instant").then((r) => r.json()).then((d) => setInstant({ available: !!d.available, until: d.until || null })).catch(() => {});
  }, [status]);

  const toggleInstant = async () => {
    setInstantBusy(true);
    try {
      const next = !instant.available;
      const r = await fetch("/api/doctor/instant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ minutes: next ? 15 : 0 }),
      });
      const j = await r.json();
      if (r.ok) setInstant({ available: !!j.available, until: j.until || null });
    } finally {
      setInstantBusy(false);
    }
  };

  if (status === "loading") {
    return (
      <DashboardShell role="doctor">
        <div className="flex min-h-[60vh] items-center justify-center">
          <svg className="h-8 w-8 animate-spin text-violet-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </DashboardShell>
    );
  }

  const doctorName = session?.user?.name || "Doctor";
  const firstName = doctorName.replace(/^Dr\.?\s+/i, "").split(" ")[0];

  const today = new Date().toDateString();
  const todayAppointments = consultations.filter(
    (c) => c.dateLabel === today && ["awaiting_doctor", "approved", "in_progress"].includes(c.status)
  );
  const awaiting = consultations.filter((c) => c.status === "awaiting_doctor");
  const completedThisMonth = consultations.filter((c) => {
    if (c.status !== "completed") return false;
    const d = new Date(c.updatedAt);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  });
  const earningsMonth = completedThisMonth.reduce((sum, c) => sum + (c.fee || 0), 0);
  const earningsToday = consultations
    .filter((c) => c.status === "completed" && c.dateLabel === today)
    .reduce((sum, c) => sum + (c.fee || 0), 0);
  const uniquePatients = new Set(consultations.map((c) => c.patientEmail)).size;

  const stats = [
    {
      label: "Awaiting You",
      value: awaiting.length,
      sub: awaiting.length ? "Tap to review" : "All caught up ✨",
      gradient: "from-amber-400 to-orange-500",
      iconPath: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      href: "/dashboard/doctor/consultations",
    },
    {
      label: "Today's Appts",
      value: todayAppointments.length,
      sub: todayAppointments.length ? "Scheduled today" : "Nothing today",
      gradient: "from-emerald-400 to-teal-600",
      iconPath: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      href: "/dashboard/doctor/consultations",
    },
    {
      label: "This Month",
      value: money.format(earningsMonth),
      sub: `${completedThisMonth.length} completed`,
      gradient: "from-fuchsia-500 to-purple-600",
      iconPath: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      href: "/dashboard/doctor/earnings",
    },
    {
      label: "Total Patients",
      value: uniquePatients,
      sub: "Unique patients seen",
      gradient: "from-sky-400 to-indigo-600",
      iconPath: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
      href: "/dashboard/doctor/patients",
    },
  ];

  const quickActions = [
    { label: "Consultations", href: "/dashboard/doctor/consultations", icon: "📋", grad: "from-sky-400 to-blue-600" },
    { label: "Clinic EMR", href: "/dashboard/doctor/emr", icon: "🩺", grad: "from-emerald-400 to-cyan-600" },
    { label: "My Clinics", href: "/dashboard/doctor/clinic", icon: "🏥", grad: "from-rose-400 to-pink-600" },
    { label: "Statements", href: "/dashboard/doctor/statements", icon: "🧾", grad: "from-cyan-400 to-blue-600" },
    { label: "Dictionary", href: "/dashboard/doctor/dictionary", icon: "📖", grad: "from-violet-400 to-indigo-600" },
    { label: "AI Usage", href: "/dashboard/doctor/ai-usage", icon: "📊", grad: "from-amber-400 to-orange-600" },
    { label: "Bookings", href: "/dashboard/doctor/appointments", icon: "📅", grad: "from-emerald-400 to-teal-600" },
    { label: "Referrals", href: "/dashboard/doctor/referrals", icon: "↗️", grad: "from-violet-400 to-fuchsia-600" },
    { label: "Refer & earn", href: "/dashboard/referrals", icon: "🎁", grad: "from-indigo-400 to-fuchsia-600" },
    { label: "ID card", href: "/dashboard/doctor/id-card", icon: "🪪", grad: "from-cyan-400 to-blue-600" },
  ];

  return (
    <DashboardShell role="doctor">
      {/* Hero */}
      <GlassCard glow className="mb-8 overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 opacity-30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 opacity-20 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-violet-300/90">{greeting()}, Doctor 🩺</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
              <span className="bg-gradient-to-r from-violet-300 via-fuchsia-200 to-indigo-300 bg-clip-text text-transparent">
                {firstName ? `Dr. ${firstName}` : doctorName}
              </span>
            </h1>
            <p className="mt-2 max-w-lg text-sm text-white/70">
              Your clinic dashboard — review appointments, write prescriptions,
              and track earnings in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={toggleInstant}
              disabled={instantBusy}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-60 ${
                instant.available
                  ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-emerald-500/40"
                  : "border border-white/15 bg-white/10 text-white backdrop-blur-sm hover:bg-white/15"
              }`}
              title={instant.until ? `Active until ${new Date(instant.until).toLocaleTimeString()}` : undefined}
            >
              <span className={`h-2 w-2 rounded-full ${instant.available ? "bg-emerald-900 animate-pulse" : "bg-white/60"}`} />
              {instant.available ? "Available now" : "Go available now"}
            </button>
            <Link
              href="/dashboard/doctor/consultations"
              className="rounded-xl bg-gradient-to-r from-violet-400 to-fuchsia-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-violet-500/40 transition-transform hover:-translate-y-0.5"
            >
              Consultations
            </Link>
            <Link
              href="/dashboard/doctor/emr"
              className="rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
            >
              Clinic EMR
            </Link>
            <Link
              href="/dashboard/doctor/profile"
              className="rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
            >
              My profile
            </Link>
            <Link
              href="/dashboard/doctor/clinic"
              className="rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
            >
              🏥 My clinics
            </Link>
          </div>
        </div>
      </GlassCard>

      {/* Awaiting alert */}
      {awaiting.length > 0 && (
        <Link
          href="/dashboard/doctor/consultations"
          className="mb-6 flex items-center justify-between rounded-3xl border border-amber-400/30 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-rose-500/10 p-4 backdrop-blur-xl transition-transform hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
              <span className="text-lg font-bold">!</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-100">
                {awaiting.length} consultation{awaiting.length === 1 ? "" : "s"} awaiting your response
              </p>
              <p className="text-xs text-amber-200/70">
                Approve, reschedule, or reject — refunds are automatic.
              </p>
            </div>
          </div>
          <span className="text-sm font-semibold text-amber-100">Review →</span>
        </Link>
      )}

      {/* Stat tiles */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <StatTile
            key={s.label}
            label={s.label}
            value={s.value}
            sub={s.sub}
            iconPath={s.iconPath}
            gradient={s.gradient}
            href={s.href}
          />
        ))}
      </div>

      {/* Compliance + payouts strip */}
      <div className="mb-6 space-y-4">
        <BaaReacceptancePrompt />
        <DoctorComplianceTile />
        <DoctorGuideBanner />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Today's Appointments */}
          <GlassCard>
            <SectionHeader title="Today's Appointments" accent="from-emerald-400 to-teal-500" right={
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                {todayAppointments.length} total
              </span>
            } />
            {todayAppointments.length === 0 ? (
              <EmptyState emoji="🗓️" label="No appointments today" sub="Enjoy the breather — new bookings will land here." />
            ) : (
              <div className="space-y-2">
                {todayAppointments.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/doctor/consultations/${c.id}`}
                    className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition-all hover:border-violet-400/40 hover:bg-violet-500/10"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600 text-sm font-bold text-white shadow-lg">
                      {c.patientName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">{c.patientName}</p>
                      <p className="truncate text-sm text-white/60">
                        {c.medicalHistory.chiefComplaint || c.specialty}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{c.timeSlot}</p>
                      <span className="text-xs text-emerald-300">
                        {c.mode === "video" ? "📹 Video" : "💬 Chat"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Recent Consultations */}
          <GlassCard>
            <SectionHeader title="Recent Consultations" accent="from-sky-400 to-indigo-500" right={
              <Link href="/dashboard/doctor/consultations" className="text-sm font-semibold text-violet-300 hover:text-violet-200">
                View all →
              </Link>
            } />
            {(() => {
              const visible = consultations.filter((c) => c.status !== "pending_payment");
              if (visible.length === 0) {
                return <EmptyState emoji="🩺" label="No consultations yet" sub="Patients will appear here once they book." />;
              }
              return (
                <ul className="divide-y divide-white/5">
                  {visible.slice(0, 5).map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/dashboard/doctor/consultations/${c.id}`}
                        className="flex items-center justify-between py-3 transition-colors hover:bg-white/[0.04]"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{c.patientName}</p>
                          <p className="text-xs text-white/60">{c.dateLabel} · {c.timeSlot}</p>
                        </div>
                        <StatusPill status={c.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </GlassCard>

          {/* Recent Prescriptions */}
          <GlassCard>
            <SectionHeader title="Recent Prescriptions" accent="from-orange-400 to-rose-500" />
            {prescriptions.length === 0 ? (
              <EmptyState
                emoji="💊"
                label="No prescriptions yet"
                sub="Write prescriptions inside a video consultation or from a Clinic EMR patient record."
              />
            ) : (
              <ul className="divide-y divide-white/5">
                {prescriptions.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {p.data.patientName || p.patientEmail}
                      </p>
                      <p className="truncate text-xs text-white/60">
                        {p.data.diagnosis || "—"} · {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-gradient-to-r from-orange-500/20 to-rose-500/20 px-3 py-1 text-xs font-semibold text-orange-200">
                      {p.data.medications.length} med{p.data.medications.length === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Earnings */}
          <div className="relative overflow-hidden rounded-3xl border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/20 via-purple-500/15 to-indigo-500/10 p-6 backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-fuchsia-400/30 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Earnings</h2>
              <Link href="/dashboard/doctor/earnings" className="text-xs font-semibold text-violet-200 hover:text-white">
                View all →
              </Link>
            </div>
            <div className="relative mt-4 space-y-2">
              <EarnRow label="Today" value={money.format(earningsToday)} />
              <EarnRow label="This Month" value={money.format(earningsMonth)} />
              <EarnRow label="Completed" value={`${completedThisMonth.length}`} />
            </div>
          </div>

          {/* Quick Actions */}
          <GlassCard>
            <SectionHeader title="Quick Actions" accent="from-violet-400 to-indigo-500" />
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="group relative flex flex-col items-center gap-1 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center transition-all hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.08]"
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${a.grad} text-lg shadow-md`}>
                    {a.icon}
                  </span>
                  <span className="text-[11px] font-semibold text-white/90">{a.label}</span>
                </Link>
              ))}
            </div>
          </GlassCard>

          {/* Motivational */}
          <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-cyan-500/10 p-6 backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
            <span className="text-3xl">🌟</span>
            <h3 className="mt-2 text-lg font-bold text-white">Great work today!</h3>
            <p className="mt-1 text-sm text-emerald-100/80">
              You&apos;ve helped {uniquePatients} patient{uniquePatients === 1 ? "" : "s"} on OduDoc. Keep it up!
            </p>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function SectionHeader({ title, right, accent }: { title: string; right?: React.ReactNode; accent: string }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className={`h-7 w-1.5 rounded-full bg-gradient-to-b ${accent}`} />
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      {right}
    </div>
  );
}

function EmptyState({ emoji, label, sub }: { emoji: string; label: string; sub?: string }) {
  return (
    <div className="py-10 text-center">
      <div className="text-4xl opacity-80">{emoji}</div>
      <p className="mt-2 text-sm font-medium text-white/70">{label}</p>
      {sub && <p className="mt-1 text-xs text-white/50">{sub}</p>}
    </div>
  );
}

function EarnRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 backdrop-blur-sm">
      <span className="text-sm text-white/70">{label}</span>
      <span className="font-bold text-white">{value}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-500/20 text-emerald-200",
    rejected: "bg-rose-500/20 text-rose-200",
    refunded: "bg-amber-500/20 text-amber-200",
    approved: "bg-sky-500/20 text-sky-200",
    awaiting_doctor: "bg-indigo-500/20 text-indigo-200",
    in_progress: "bg-purple-500/20 text-purple-200",
    rescheduled: "bg-orange-500/20 text-orange-200",
  };
  const cls = map[status] || "bg-white/10 text-white/80";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
