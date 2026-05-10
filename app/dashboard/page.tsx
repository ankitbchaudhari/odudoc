"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Consultation } from "@/lib/consultations-store";
import SharedBadge from "@/components/StatusBadge";
import type { PrescriptionRecord } from "@/lib/prescriptions-store";
import FamilySwitcher from "@/components/FamilySwitcher";

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
    // Role-based landing — keep this list as the canonical map.
    // Each non-patient role lands on its own console; patients fall
    // through to the rest of this page.
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-primary-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const userName = session?.user?.name?.split(" ")[0] || "there";

  const stats = [
    {
      label: "Upcoming",
      value: String(upcoming.length),
      gradient: "from-sky-400 to-blue-600",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      href: "/dashboard/consultations",
    },
    {
      label: "Completed",
      value: String(completedCount),
      gradient: "from-emerald-400 to-teal-600",
      icon: "M5 13l4 4L19 7",
      href: "/dashboard/consultations",
    },
    {
      label: "Prescriptions",
      value: String(prescriptions.length),
      gradient: "from-orange-400 to-rose-500",
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      href: "/dashboard/prescriptions",
    },
    {
      label: "Health Records",
      value: String(historyItems.length),
      gradient: "from-fuchsia-400 to-purple-600",
      icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
      href: "/dashboard/consultations",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-fuchsia-50/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Welcome */}
        <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-fuchsia-300/20 blur-2xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">{greeting()} 👋</p>
              <h1 className="mt-1 text-3xl font-bold md:text-4xl">
                Welcome back, {userName}!
              </h1>
              <p className="mt-2 max-w-lg text-white/80">
                Here&apos;s a snapshot of your health journey. Book a consult,
                review your prescriptions, or track your care history.
              </p>
              <div className="mt-3"><FamilySwitcher /></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/doctors"
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg"
              >
                Book Appointment
              </Link>
              <Link
                href="/consult"
                className="rounded-xl bg-white/15 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
              >
                Video Consult
              </Link>
            </div>
          </div>
        </div>

        {/* Colourful stat cards */}
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
            </Link>
          ))}
        </div>

        {/* Quick Actions - colourful tiles */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Find Doctors", href: "/doctors", icon: "👨‍⚕️", bg: "from-sky-100 to-blue-100", ring: "ring-sky-200" },
            { label: "Health Timeline", href: "/dashboard/timeline", icon: "🗓️", bg: "from-violet-100 to-indigo-100", ring: "ring-violet-200" },
            { label: "My Vitals", href: "/dashboard/vitals", icon: "❤️", bg: "from-rose-100 to-pink-100", ring: "ring-rose-200" },
            { label: "Today's Meds", href: "/dashboard/adherence", icon: "💊", bg: "from-emerald-100 to-teal-100", ring: "ring-emerald-200" },
            { label: "Documents", href: "/dashboard/documents", icon: "📁", bg: "from-amber-100 to-orange-100", ring: "ring-amber-200" },
            { label: "Vaccinations", href: "/dashboard/vaccinations", icon: "💉", bg: "from-cyan-100 to-blue-100", ring: "ring-cyan-200" },
            { label: "Care Plans", href: "/dashboard/care-plan", icon: "📋", bg: "from-teal-100 to-cyan-100", ring: "ring-teal-200" },
            { label: "Symptom Log", href: "/dashboard/symptoms", icon: "🩺", bg: "from-rose-100 to-fuchsia-100", ring: "ring-rose-200" },
            { label: "Access log", href: "/dashboard/audit", icon: "🛡️", bg: "from-slate-100 to-zinc-100", ring: "ring-slate-200" },
            { label: "Emergency Profile", href: "/dashboard/emergency-profile", icon: "🚨", bg: "from-red-100 to-rose-100", ring: "ring-red-200" },
            { label: "AI Credits", href: "/dashboard/ai-credit", icon: "🤖", bg: "from-purple-100 to-violet-100", ring: "ring-purple-200" },
            { label: "Jobs Board", href: "/jobs", icon: "💼", bg: "from-blue-100 to-indigo-100", ring: "ring-blue-200" },
            { label: "Find Courses", href: "/education", icon: "🎓", bg: "from-yellow-100 to-amber-100", ring: "ring-yellow-200" },
            { label: "My Surgery Videos", href: "/dashboard/surgery-video", icon: "🎥", bg: "from-purple-100 to-pink-100", ring: "ring-purple-200" },
            { label: "Notifications", href: "/dashboard/notifications", icon: "🔔", bg: "from-fuchsia-100 to-purple-100", ring: "ring-fuchsia-200" },
            { label: "Health Passport", href: "/dashboard/health-passport", icon: "🪪", bg: "from-emerald-100 to-teal-100", ring: "ring-emerald-200" },
            { label: "My Family", href: "/dashboard/family", icon: "👨‍👩‍👧‍👦", bg: "from-pink-100 to-rose-100", ring: "ring-pink-200" },
            { label: "Shop Medicines", href: "/shop", icon: "💊", bg: "from-rose-100 to-orange-100", ring: "ring-rose-200" },
            { label: "Refer & earn", href: "/dashboard/referrals", icon: "🎁", bg: "from-indigo-100 to-fuchsia-100", ring: "ring-indigo-200" },
            { label: "Messages", href: "/dashboard/messages", icon: "💬", bg: "from-emerald-100 to-lime-100", ring: "ring-emerald-200" },
            { label: "Insurance & Cashless", href: "/dashboard/insurance", icon: "🛡️", bg: "from-amber-100 to-yellow-100", ring: "ring-amber-200" },
            { label: "Order Medicines", href: "/dashboard/rx-fulfillment", icon: "💊", bg: "from-rose-100 to-pink-100", ring: "ring-rose-200" },
            { label: "Book Lab Tests", href: "/dashboard/labs", icon: "🧪", bg: "from-teal-100 to-emerald-100", ring: "ring-teal-200" },
            { label: "Wallet", href: "/dashboard/wallet", icon: "💰", bg: "from-indigo-100 to-purple-100", ring: "ring-indigo-200" },
            { label: "Wearables", href: "/dashboard/wearables", icon: "⌚", bg: "from-cyan-100 to-sky-100", ring: "ring-cyan-200" },
            { label: "Import old Rx", href: "/dashboard/rx-import", icon: "📷", bg: "from-orange-100 to-amber-100", ring: "ring-orange-200" },
            { label: "ABHA / ABDM", href: "/dashboard/abha", icon: "🇮🇳", bg: "from-yellow-100 to-orange-100", ring: "ring-yellow-200" },
            { label: "Privacy & Consent", href: "/dashboard/privacy", icon: "🔐", bg: "from-slate-100 to-zinc-100", ring: "ring-slate-200" },
            { label: "My Profile", href: "/profile", icon: "⚙️", bg: "from-violet-100 to-fuchsia-100", ring: "ring-violet-200" },
            { label: "Get Started", href: "/dashboard/onboarding", icon: "🚀", bg: "from-lime-100 to-green-100", ring: "ring-lime-200" },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className={`flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br ${a.bg} p-5 shadow-sm ring-1 ${a.ring} transition-transform hover:-translate-y-0.5`}
            >
              <span className="text-3xl">{a.icon}</span>
              <span className="text-sm font-semibold text-gray-800">{a.label}</span>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Upcoming Appointments */}
            <Card>
              <CardHeader
                title="Upcoming Appointments"
                accent="bg-gradient-to-r from-sky-500 to-blue-600"
                right={
                  <Link href="/doctors" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                    Book new →
                  </Link>
                }
              />
              {upcoming.length === 0 ? (
                <EmptyState emoji="📅" label="No upcoming appointments" sub="Browse doctors to book your first consult." />
              ) : (
                <ul className="space-y-3">
                  {upcoming.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/dashboard/consultations/${c.id}`}
                        className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 transition-all hover:border-primary-200 hover:bg-primary-50/30"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-sm font-bold text-white shadow">
                          {c.doctorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">{c.doctorName}</p>
                          <p className="truncate text-xs text-gray-500">
                            {c.specialty} · {c.dateLabel} · {c.timeSlot}
                          </p>
                        </div>
                        <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
                          {c.status.replace(/_/g, " ")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Recent Consultations */}
            <Card>
              <CardHeader
                title="Recent Consultations"
                accent="bg-gradient-to-r from-emerald-500 to-teal-600"
                right={
                  <Link href="/dashboard/consultations" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                    View all →
                  </Link>
                }
              />
              {recent.length === 0 ? (
                <EmptyState emoji="🩺" label="No recent consultations" sub="Your past visits will show up here." />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {recent.slice(0, 5).map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/dashboard/consultations/${c.id}`}
                        className="flex items-center justify-between py-3 transition-colors hover:bg-gray-50"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.doctorName}</p>
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
                  <Link href="/dashboard/prescriptions" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                    View all →
                  </Link>
                }
              />
              {prescriptions.length === 0 ? (
                <EmptyState emoji="💊" label="No prescriptions yet" sub="Doctors will send prescriptions here after your consult." />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {prescriptions.slice(0, 5).map((p) => (
                    <li key={p.id}>
                      <Link
                        href="/dashboard/prescriptions"
                        className="flex items-center justify-between py-3 transition-colors hover:bg-gray-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {p.data.diagnosis || "Prescription"}
                          </p>
                          <p className="text-xs text-gray-500">
                            by {p.data.doctorName || p.doctorEmail} ·{" "}
                            {new Date(p.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-gradient-to-r from-orange-100 to-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                          {p.data.medications.length} med{p.data.medications.length === 1 ? "" : "s"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Medical History */}
            <Card>
              <CardHeader
                title="Medical History"
                accent="bg-gradient-to-r from-fuchsia-500 to-purple-600"
                right={
                  <Link href="/dashboard/consultations" className="text-xs font-semibold text-primary-600 hover:text-primary-700">
                    View all
                  </Link>
                }
              />
              {historyItems.length === 0 ? (
                <EmptyState emoji="📋" label="No health records yet" sub="Records build up as you consult doctors." />
              ) : (
                <ul className="space-y-3">
                  {historyItems.map((h, i) => (
                    <li
                      key={i}
                      className="rounded-xl bg-gradient-to-br from-fuchsia-50 to-purple-50 p-3 ring-1 ring-fuchsia-100"
                    >
                      <p className="line-clamp-2 text-sm font-medium text-gray-900">{h.complaint}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {h.doctor} · {h.date}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Health Tip */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-500 to-green-500 p-6 text-white shadow-lg">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <span className="text-3xl">💡</span>
              <h3 className="mt-2 text-lg font-bold">Daily Health Tip</h3>
              <p className="mt-1 text-sm text-emerald-50">
                Drink 8 glasses of water today. Staying hydrated boosts energy,
                mood, and concentration.
              </p>
            </div>

            {/* Complete Profile CTA */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-primary-600 to-purple-600 p-6 text-white shadow-lg">
              <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <h3 className="text-lg font-bold">Complete Your Profile</h3>
              <p className="mt-1 text-sm text-primary-100">
                Add your medical history and preferences for personalized care.
              </p>
              <Link
                href="/profile"
                className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary-700 shadow transition-transform hover:-translate-y-0.5"
              >
                Update Profile
              </Link>
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

// Maps the patient-facing consultation lifecycle to canonical
// clinical-tones keys so this dashboard's status pills match every
// other surface (reception, lab, vendor, …).
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
