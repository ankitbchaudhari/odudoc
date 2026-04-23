"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Consultation } from "@/lib/consultations-store";
import type { PrescriptionRecord } from "@/lib/prescriptions-store";

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

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-primary-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
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
      value: String(awaiting.length),
      sub: awaiting.length ? "Tap to review" : "All caught up ✨",
      gradient: "from-amber-400 to-orange-500",
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      href: "/dashboard/doctor/consultations",
    },
    {
      label: "Today's Appts",
      value: String(todayAppointments.length),
      sub: todayAppointments.length ? "Scheduled today" : "Nothing today",
      gradient: "from-emerald-400 to-teal-600",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      href: "/dashboard/doctor/consultations",
    },
    {
      label: "This Month",
      value: `$${earningsMonth}`,
      sub: `${completedThisMonth.length} completed`,
      gradient: "from-fuchsia-500 to-purple-600",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      href: "/dashboard/doctor/earnings",
    },
    {
      label: "Total Patients",
      value: String(uniquePatients),
      sub: "Unique patients seen",
      gradient: "from-sky-400 to-indigo-600",
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
      href: "/dashboard/doctor/patients",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-emerald-50/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-primary-600 to-indigo-700 p-8 text-white shadow-xl">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-emerald-300/20 blur-2xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">{greeting()}, Doctor 🩺</p>
              <h1 className="mt-1 text-3xl font-bold md:text-4xl">
                {firstName ? `Dr. ${firstName}` : doctorName}
              </h1>
              <p className="mt-2 max-w-lg text-white/80">
                Your clinic dashboard — review appointments, write
                prescriptions, and track your earnings in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/doctor/prescriptions"
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg"
              >
                Write Prescription
              </Link>
              <Link
                href="/dashboard/doctor/consultations"
                className="rounded-xl bg-white/15 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
              >
                Consultations
              </Link>
            </div>
          </div>
        </div>

        {/* Awaiting alert */}
        {awaiting.length > 0 && (
          <Link
            href="/dashboard/doctor/consultations"
            className="mb-6 flex items-center justify-between rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 p-4 shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow">
                <span className="text-lg font-bold">!</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {awaiting.length} consultation{awaiting.length === 1 ? "" : "s"} awaiting your response
                </p>
                <p className="text-xs text-amber-700">
                  Approve, reschedule, or reject — refunds are automatic.
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold text-amber-900">Review →</span>
          </Link>
        )}

        {/* Stat cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div
                className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${s.gradient} opacity-20 blur-xl transition-opacity group-hover:opacity-40`}
              />
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.gradient} text-white shadow-lg`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                </svg>
              </div>
              <p className="mt-4 text-3xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="mt-1 text-xs text-gray-400">{s.sub}</p>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Today's Appointments */}
            <Card>
              <CardHeader
                title="Today's Appointments"
                accent="bg-gradient-to-r from-emerald-500 to-teal-600"
                right={
                  <span className="rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {todayAppointments.length} total
                  </span>
                }
              />
              {todayAppointments.length === 0 ? (
                <EmptyState emoji="🗓️" label="No appointments today" sub="Enjoy the breather — new bookings will land here." />
              ) : (
                <div className="space-y-3">
                  {todayAppointments.map((c) => (
                    <Link
                      key={c.id}
                      href={`/dashboard/doctor/consultations/${c.id}`}
                      className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition-all hover:border-primary-200 hover:bg-primary-50/30"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-indigo-600 text-sm font-bold text-white shadow">
                        {c.patientName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-900">{c.patientName}</p>
                        <p className="truncate text-sm text-gray-500">
                          {c.medicalHistory.chiefComplaint || c.specialty}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{c.timeSlot}</p>
                        <span className="text-xs text-emerald-600">
                          {c.mode === "video" ? "📹 Video" : "💬 Chat"}
                        </span>
                      </div>
                      <span className="hidden rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 sm:inline">
                        Open →
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Consultations */}
            <Card>
              <CardHeader
                title="Recent Consultations"
                accent="bg-gradient-to-r from-sky-500 to-indigo-600"
                right={
                  <Link href="/dashboard/doctor/consultations" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                    View all →
                  </Link>
                }
              />
              {consultations.length === 0 ? (
                <EmptyState emoji="🩺" label="No consultations yet" sub="Patients will appear here once they book." />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {consultations.slice(0, 5).map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/dashboard/doctor/consultations/${c.id}`}
                        className="flex items-center justify-between py-3 transition-colors hover:bg-gray-50"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.patientName}</p>
                          <p className="text-xs text-gray-500">
                            {c.dateLabel} · {c.timeSlot}
                          </p>
                        </div>
                        <StatusPill status={c.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Recent Prescriptions */}
            <Card>
              <CardHeader
                title="Recent Prescriptions"
                accent="bg-gradient-to-r from-orange-500 to-rose-500"
                right={
                  <Link href="/dashboard/doctor/prescriptions" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                    Write new →
                  </Link>
                }
              />
              {prescriptions.length === 0 ? (
                <EmptyState emoji="💊" label="No prescriptions yet" sub="Prescriptions you write will appear here." />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {prescriptions.slice(0, 5).map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {p.data.patientName || p.patientEmail}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {p.data.diagnosis || "—"} ·{" "}
                          {new Date(p.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-gradient-to-r from-orange-100 to-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                        {p.data.medications.length} med{p.data.medications.length === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Earnings */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-700 p-6 text-white shadow-lg">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Earnings</h2>
                <Link href="/dashboard/doctor/earnings" className="text-xs font-semibold text-white/80 hover:text-white">
                  View all →
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                <EarnRow label="Today" value={`$${earningsToday}`} />
                <EarnRow label="This Month" value={`$${earningsMonth}`} />
                <EarnRow label="Completed" value={`${completedThisMonth.length}`} />
              </div>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader title="Quick Actions" accent="bg-gradient-to-r from-primary-500 to-indigo-600" />
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Consultations", href: "/dashboard/doctor/consultations", icon: "📋", bg: "from-sky-100 to-blue-100" },
                  { label: "Prescriptions", href: "/dashboard/doctor/prescriptions", icon: "💊", bg: "from-rose-100 to-orange-100" },
                  { label: "AI Prescription", href: "/dashboard/doctor/ai-prescription", icon: "🤖", bg: "from-indigo-100 to-purple-100" },
                  { label: "Voice Prescription", href: "/dashboard/doctor/voice-prescription", icon: "🎤", bg: "from-rose-100 to-pink-100" },
                  { label: "Bookings", href: "/dashboard/doctor/appointments", icon: "📅", bg: "from-emerald-100 to-teal-100" },
                  { label: "Referrals", href: "/dashboard/doctor/referrals", icon: "↗️", bg: "from-violet-100 to-fuchsia-100" },
                ].map((a) => (
                  <Link
                    key={a.label}
                    href={a.href}
                    className={`flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br ${a.bg} p-4 text-center transition-transform hover:-translate-y-0.5`}
                  >
                    <span className="text-2xl">{a.icon}</span>
                    <span className="text-xs font-semibold text-gray-800">{a.label}</span>
                  </Link>
                ))}
              </div>
            </Card>

            {/* Motivational */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 text-white shadow-lg">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <span className="text-3xl">🌟</span>
              <h3 className="mt-2 text-lg font-bold">Great work today!</h3>
              <p className="mt-1 text-sm text-emerald-50">
                You&apos;ve helped {uniquePatients} patient{uniquePatients === 1 ? "" : "s"} on OduDoc. Keep it up!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">{children}</div>;
}

function CardHeader({
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
        <span className={`h-7 w-1.5 rounded-full ${accent}`} />
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>
      {right}
    </div>
  );
}

function EmptyState({ emoji, label, sub }: { emoji: string; label: string; sub?: string }) {
  return (
    <div className="py-10 text-center">
      <div className="text-4xl">{emoji}</div>
      <p className="mt-2 text-sm font-medium text-gray-500">{label}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function EarnRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm">
      <span className="text-sm text-white/80">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
    refunded: "bg-amber-100 text-amber-700",
    approved: "bg-sky-100 text-sky-700",
    awaiting_doctor: "bg-indigo-100 text-indigo-700",
    in_progress: "bg-purple-100 text-purple-700",
    rescheduled: "bg-orange-100 text-orange-700",
  };
  const cls = map[status] || "bg-gray-100 text-gray-700";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
