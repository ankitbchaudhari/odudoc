"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Consultation } from "@/lib/consultations-store";
import SharedBadge from "@/components/StatusBadge";
import type { PrescriptionRecord } from "@/lib/prescriptions-store";
import FamilySwitcher from "@/components/FamilySwitcher";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import QuickActionsRow from "@/components/QuickActionsRow";
import TempPasswordBanner from "@/components/TempPasswordBanner";
import DashboardShell from "@/components/ui/DashboardShell";
import GlassCard from "@/components/ui/GlassCard";
import StatTile from "@/components/ui/StatTile";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const role = session?.user?.role;
    if (role === "doctor") router.replace("/dashboard/doctor");
    else if (role === "admin") router.replace("/admin");
    else if (role === "staff") router.replace("/admin/products");
    else if (role === "pharmacist") router.replace("/dashboard/rx-fulfillment");
    else if (role === "vendor") router.replace("/admin/products");
    else if (role === "hr") router.replace("/admin/applications");
    else if (role === "support") router.replace("/admin/support");
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/consultations")
      .then((r) => r.json())
      .then((d) => setConsultations(d.consultations || []))
      .catch(() => {});
    fetch("/api/prescriptions")
      .then((r) => r.json())
      .then((d) => setPrescriptions(d.prescriptions || []))
      .catch(() => {});
  }, [status]);

  const historyItems = (() => {
    const seen = new Set<string>();
    const out: { complaint: string; date: string; doctor: string }[] = [];
    for (const c of consultations) {
      const complaint = (c.medicalHistory?.chiefComplaint || "").trim();
      if (!complaint) continue;
      const key = complaint.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        complaint,
        date: c.dateLabel || new Date(c.createdAt).toLocaleDateString(),
        doctor: c.doctorName,
      });
      if (out.length >= 5) break;
    }
    return out;
  })();

  const upcoming = consultations.filter((c) =>
    ["awaiting_doctor", "approved", "rescheduled", "in_progress"].includes(c.status)
  );
  const recent = consultations.filter(
    (c) => c.status === "completed" || c.status === "rejected" || c.status === "refunded"
  );
  const completedCount = consultations.filter((c) => c.status === "completed").length;

  if (status === "loading") {
    return (
      <DashboardShell role="patient">
        <div className="flex min-h-[60vh] items-center justify-center">
          <svg className="h-8 w-8 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </DashboardShell>
    );
  }

  const userName = session?.user?.name?.split(" ")[0] || "there";

  const stats = [
    {
      label: "Upcoming",
      value: upcoming.length,
      gradient: "from-sky-400 to-blue-600",
      iconPath: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      href: "/dashboard/consultations",
    },
    {
      label: "Completed",
      value: completedCount,
      gradient: "from-emerald-400 to-teal-600",
      iconPath: "M5 13l4 4L19 7",
      href: "/dashboard/consultations",
    },
    {
      label: "Prescriptions",
      value: prescriptions.length,
      gradient: "from-orange-400 to-rose-500",
      iconPath: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      href: "/dashboard/prescriptions",
    },
    {
      label: "Health Records",
      value: historyItems.length,
      gradient: "from-fuchsia-400 to-purple-600",
      iconPath: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
      href: "/dashboard/consultations",
    },
  ];

  // Quick-action grid — each tile becomes a glass square with a
  // gradient icon and a neon accent strip on hover. Order = priority.
  const actions = [
    { label: "Find Doctors", href: "/doctors", icon: "👨‍⚕️", grad: "from-sky-400 to-blue-600" },
    { label: "Health Timeline", href: "/dashboard/timeline", icon: "🗓️", grad: "from-violet-400 to-indigo-600" },
    { label: "My Vitals", href: "/dashboard/vitals", icon: "❤️", grad: "from-rose-400 to-pink-600" },
    { label: "Today's Meds", href: "/dashboard/adherence", icon: "💊", grad: "from-emerald-400 to-teal-600" },
    { label: "Vaccinations", href: "/dashboard/vaccinations", icon: "💉", grad: "from-cyan-400 to-sky-600" },
    { label: "Care Plans", href: "/dashboard/care-plan", icon: "📋", grad: "from-teal-400 to-cyan-600" },
    { label: "Symptom Log", href: "/dashboard/symptoms", icon: "🩺", grad: "from-rose-400 to-fuchsia-600" },
    { label: "Notifications", href: "/dashboard/notifications", icon: "🔔", grad: "from-fuchsia-400 to-purple-600" },
    { label: "Health Passport", href: "/dashboard/health-passport", icon: "🪪", grad: "from-emerald-400 to-teal-600" },
    { label: "Past visits", href: "/dashboard/visits", icon: "🏥", grad: "from-sky-400 to-blue-600" },
    { label: "My Family", href: "/dashboard/family", icon: "👨‍👩‍👧‍👦", grad: "from-pink-400 to-rose-600" },
    { label: "Refer & earn", href: "/dashboard/referrals", icon: "🎁", grad: "from-indigo-400 to-fuchsia-600" },
    { label: "Insurance", href: "/dashboard/insurance", icon: "🛡️", grad: "from-amber-400 to-yellow-600" },
    { label: "Order Meds", href: "/dashboard/rx-fulfillment", icon: "💊", grad: "from-rose-400 to-pink-600" },
    { label: "Book Labs", href: "/dashboard/labs", icon: "🧪", grad: "from-teal-400 to-emerald-600" },
    { label: "Wallet", href: "/dashboard/wallet", icon: "💰", grad: "from-indigo-400 to-purple-600" },
    { label: "Wearables", href: "/dashboard/wearables", icon: "⌚", grad: "from-cyan-400 to-sky-600" },
    { label: "Import Rx", href: "/dashboard/rx-import", icon: "📷", grad: "from-orange-400 to-amber-600" },
    { label: "ABHA / ABDM", href: "/dashboard/abha", icon: "🇮🇳", grad: "from-yellow-400 to-orange-600" },
    { label: "Profile", href: "/profile", icon: "⚙️", grad: "from-violet-400 to-fuchsia-600" },
  ];

  return (
    <DashboardShell role="patient">
      <TempPasswordBanner />

      {/* Hero — large glass card with role-themed aurora bleeding through */}
      <GlassCard glow className="mb-8 overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 opacity-30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gradient-to-br from-cyan-400 via-emerald-500 to-teal-500 opacity-20 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-300/90">{greeting()} 👋</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                {userName}
              </span>
            </h1>
            <p className="mt-2 max-w-lg text-sm text-white/70">
              Here&apos;s a snapshot of your health journey. Book a consult,
              review your prescriptions, or track your care history.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <FamilySwitcher />
              <LocaleSwitcher />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/doctors"
              className="rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/40 transition-all hover:-translate-y-0.5 hover:shadow-emerald-500/60"
            >
              Book Appointment
            </Link>
            <Link
              href="/consult"
              className="rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
            >
              Video Consult
            </Link>
          </div>
        </div>
      </GlassCard>

      {/* Quick re-engagement actions — keeps last-doctor / last-Rx /
          referral surfaced above the fold so retention loop kicks in. */}
      <QuickActionsRow consultations={consultations} prescriptions={prescriptions} />

      {/* Stat tiles */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <StatTile
            key={s.label}
            label={s.label}
            value={s.value}
            iconPath={s.iconPath}
            gradient={s.gradient}
            href={s.href}
          />
        ))}
      </div>

      {/* Quick-action grid — 20 glass tiles, each with a coloured icon
          and a glow on hover. */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.08]"
          >
            <div
              className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${a.grad} opacity-20 blur-2xl transition-opacity group-hover:opacity-50`}
            />
            <div className="relative flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${a.grad} text-xl shadow-md`}>
                {a.icon}
              </span>
              <span className="text-sm font-semibold text-white/90">{a.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Two-column main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Upcoming Appointments */}
          <GlassCard>
            <SectionHeader title="Upcoming Appointments" accent="from-sky-400 to-blue-500" right={
              <Link href="/doctors" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
                Book new →
              </Link>
            } />
            {upcoming.length === 0 ? (
              <EmptyState emoji="📅" label="No upcoming appointments" sub="Browse doctors to book your first consult." />
            ) : (
              <ul className="space-y-2">
                {upcoming.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/dashboard/consultations/${c.id}`}
                      className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition-all hover:border-emerald-400/40 hover:bg-emerald-500/10"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-sm font-bold text-white shadow-lg">
                        {c.doctorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{c.doctorName}</p>
                        <p className="truncate text-xs text-white/60">
                          {c.specialty} · {c.dateLabel} · {c.timeSlot}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>

          {/* Recent Consultations */}
          <GlassCard>
            <SectionHeader title="Recent Consultations" accent="from-emerald-400 to-teal-500" right={
              <Link href="/dashboard/consultations" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
                View all →
              </Link>
            } />
            {recent.length === 0 ? (
              <EmptyState emoji="🩺" label="No recent consultations" sub="Your past visits will show up here." />
            ) : (
              <ul className="divide-y divide-white/5">
                {recent.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/dashboard/consultations/${c.id}`}
                      className="flex items-center justify-between py-3 transition-colors hover:bg-white/[0.04]"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{c.doctorName}</p>
                        <p className="text-xs text-white/60">{c.dateLabel} · {c.timeSlot}</p>
                      </div>
                      <StatusPill status={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>

          {/* Recent Prescriptions */}
          <GlassCard>
            <SectionHeader title="Recent Prescriptions" accent="from-orange-400 to-rose-500" right={
              <Link href="/dashboard/prescriptions" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
                View all →
              </Link>
            } />
            {prescriptions.length === 0 ? (
              <EmptyState emoji="💊" label="No prescriptions yet" sub="Doctors will send prescriptions here after your consult." />
            ) : (
              <ul className="divide-y divide-white/5">
                {prescriptions.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <Link
                      href="/dashboard/prescriptions"
                      className="flex items-center justify-between py-3 transition-colors hover:bg-white/[0.04]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{p.data.diagnosis || "Prescription"}</p>
                        <p className="text-xs text-white/60">
                          by {p.data.doctorName || p.doctorEmail} · {new Date(p.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-gradient-to-r from-orange-500/20 to-rose-500/20 px-3 py-1 text-xs font-semibold text-orange-200">
                        {p.data.medications.length} med{p.data.medications.length === 1 ? "" : "s"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <GlassCard>
            <SectionHeader title="Medical History" accent="from-fuchsia-400 to-purple-500" right={
              <Link href="/dashboard/consultations" className="text-xs font-semibold text-emerald-300 hover:text-emerald-200">
                View all
              </Link>
            } />
            {historyItems.length === 0 ? (
              <EmptyState emoji="📋" label="No health records yet" sub="Records build up as you consult doctors." />
            ) : (
              <ul className="space-y-2">
                {historyItems.map((h, i) => (
                  <li
                    key={i}
                    className="rounded-2xl border border-fuchsia-400/15 bg-gradient-to-br from-fuchsia-500/10 to-purple-500/5 p-3"
                  >
                    <p className="line-clamp-2 text-sm font-medium text-white">{h.complaint}</p>
                    <p className="mt-1 text-xs text-white/60">{h.doctor} · {h.date}</p>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>

          {/* Daily health tip — solid coloured glass card. */}
          <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-cyan-500/10 p-6 backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
            <span className="text-3xl">💡</span>
            <h3 className="mt-2 text-lg font-bold text-white">Daily Health Tip</h3>
            <p className="mt-1 text-sm text-emerald-100/80">
              Drink 8 glasses of water today. Staying hydrated boosts energy,
              mood, and concentration.
            </p>
          </div>

          {/* Complete profile CTA */}
          <div className="relative overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/20 via-indigo-500/15 to-fuchsia-500/10 p-6 backdrop-blur-xl">
            <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />
            <h3 className="text-lg font-bold text-white">Complete Your Profile</h3>
            <p className="mt-1 text-sm text-white/70">
              Add your medical history and preferences for personalized care.
            </p>
            <Link
              href="/profile"
              className="mt-4 inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-violet-400 to-fuchsia-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-violet-500/40 transition-transform hover:-translate-y-0.5"
            >
              Update Profile →
            </Link>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function SectionHeader({
  title,
  right,
  accent,
}: {
  title: string;
  right?: React.ReactNode;
  accent: string;
}) {
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

function StatusPill({ status }: { status: string }) {
  const map: Record<string, import("@/lib/clinical-tones").ToneKey> = {
    completed: "completed",
    rejected: "rejected",
    refunded: "cancelled",
    approved: "in_progress",
    awaiting_doctor: "pending",
    in_progress: "in_progress",
    rescheduled: "scheduled",
  };
  const tone = map[status] || "neutral";
  return <SharedBadge status={tone} label={status.replace(/_/g, " ")} />;
}
