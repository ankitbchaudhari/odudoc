"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const upcomingAppointments = [
  {
    id: 1,
    doctor: "Dr. Sarah Johnson",
    specialty: "General Physician",
    date: "Apr 15, 2026",
    time: "10:00 AM",
    type: "Video Consult",
    initials: "SJ",
    color: "bg-teal-500",
  },
  {
    id: 2,
    doctor: "Dr. Michael Chen",
    specialty: "Dermatologist",
    date: "Apr 18, 2026",
    time: "2:30 PM",
    type: "In-Person",
    initials: "MC",
    color: "bg-blue-500",
  },
];

const recentConsultations = [
  {
    id: 1,
    doctor: "Dr. Emily Zhang",
    specialty: "Psychiatrist",
    date: "Apr 5, 2026",
    status: "Completed",
    summary: "Follow-up consultation. New prescription provided.",
  },
  {
    id: 2,
    doctor: "Dr. James Wilson",
    specialty: "Pediatrician",
    date: "Mar 28, 2026",
    status: "Completed",
    summary: "Routine checkup for child. All vitals normal.",
  },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "doctor") {
      router.replace("/dashboard/doctor");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-primary-600" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
      </div>
    );
  }

  const userName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Welcome back, {userName}!
          </h1>
          <p className="mt-1 text-gray-500">
            Here&apos;s an overview of your health journey
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Book Appointment", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", href: "/doctors", color: "bg-primary-50 text-primary-600" },
            { label: "Video Consult", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z", href: "/consult", color: "bg-green-50 text-green-600" },
            { label: "Lab Tests", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z", href: "/tests", color: "bg-purple-50 text-purple-600" },
            { label: "Health Records", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", href: "#", color: "bg-orange-50 text-orange-600" },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-3 rounded-xl bg-white p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${action.color}`}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} /></svg>
              </div>
              <span className="text-sm font-medium text-gray-700">{action.label}</span>
            </Link>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Upcoming Appointments */}
          <div className="lg:col-span-2">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Upcoming Appointments
                </h2>
                <Link href="/doctors" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                  Book new
                </Link>
              </div>

              {upcomingAppointments.length === 0 ? (
                <p className="py-8 text-center text-gray-400">
                  No upcoming appointments
                </p>
              ) : (
                <div className="space-y-4">
                  {upcomingAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center gap-4 rounded-lg border border-gray-100 p-4 transition-colors hover:bg-gray-50"
                    >
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${apt.color} text-sm font-bold text-white`}>
                        {apt.initials}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{apt.doctor}</p>
                        <p className="text-sm text-gray-500">{apt.specialty}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{apt.date}</p>
                        <p className="text-sm text-gray-500">{apt.time}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${apt.type === "Video Consult" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                        {apt.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Consultations */}
            <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-semibold text-gray-900">
                Recent Consultations
              </h2>
              <div className="space-y-4">
                {recentConsultations.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-gray-100 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{c.doctor}</p>
                        <p className="text-sm text-gray-500">{c.specialty}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          {c.status}
                        </span>
                        <p className="mt-1 text-sm text-gray-400">{c.date}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">{c.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Health Records Card */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Health Records
              </h2>
              <div className="space-y-3">
                {["Blood Test - Mar 2026", "X-Ray Report - Feb 2026", "Prescription - Jan 2026"].map((record) => (
                  <div
                    key={record}
                    className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 text-sm transition-colors hover:bg-gray-50"
                  >
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span className="text-gray-700">{record}</span>
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50">
                View all records
              </button>
            </div>

            {/* Profile Card */}
            <div className="rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 p-6 text-white shadow-sm">
              <h3 className="font-semibold">Complete Your Profile</h3>
              <p className="mt-1 text-sm text-primary-100">
                Add your medical history and preferences for personalized care.
              </p>
              <Link
                href="/profile"
                className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50"
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
