"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

const stats = [
  { label: "Today's Patients", value: "12", change: "+3 from yesterday", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", color: "bg-blue-50 text-blue-600" },
  { label: "Appointments", value: "8", change: "2 video, 6 in-person", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", color: "bg-green-50 text-green-600" },
  { label: "This Month", value: "$4,280", change: "+12% from last month", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "bg-purple-50 text-purple-600" },
  { label: "Rating", value: "4.8", change: "Based on 342 reviews", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z", color: "bg-yellow-50 text-yellow-600" },
];

const todayAppointments = [
  { id: 1, patient: "Jennifer Martinez", time: "9:00 AM", type: "Video Consult", reason: "Follow-up: Diabetes", status: "Upcoming" },
  { id: 2, patient: "Rajesh Gupta", time: "9:30 AM", type: "In-Person", reason: "New: Chest pain", status: "Upcoming" },
  { id: 3, patient: "Amanda Thompson", time: "10:00 AM", type: "Video Consult", reason: "Follow-up: Thyroid", status: "Upcoming" },
  { id: 4, patient: "Kevin O'Brien", time: "10:30 AM", type: "In-Person", reason: "New: Annual checkup", status: "Upcoming" },
  { id: 5, patient: "Sophia Lee", time: "11:00 AM", type: "Video Consult", reason: "Follow-up: Hypertension", status: "Upcoming" },
];

const patientQueue = [
  { id: 1, name: "Jennifer Martinez", waitTime: "In progress", status: "active" },
  { id: 2, name: "Rajesh Gupta", waitTime: "~15 min", status: "waiting" },
  { id: 3, name: "Amanda Thompson", waitTime: "~30 min", status: "waiting" },
];

export default function DoctorDashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-primary-600" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
      </div>
    );
  }

  const doctorName = session?.user?.name || "Doctor";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
              Good morning, {doctorName}
            </h1>
            <p className="mt-1 text-gray-500">
              You have <span className="font-semibold text-primary-600">8 appointments</span> today
            </p>
          </div>
          <div className="flex gap-3">
            <button className="btn-outline !py-2 !text-sm">View Schedule</button>
            <button className="btn-primary !py-2 !text-sm">Start Consultation</button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} /></svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400">{stat.change}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Today's Appointments */}
          <div className="lg:col-span-2">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Today&apos;s Appointments
                </h2>
                <span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
                  {todayAppointments.length} total
                </span>
              </div>

              <div className="space-y-3">
                {todayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center gap-4 rounded-lg border border-gray-100 p-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                      {apt.patient.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{apt.patient}</p>
                      <p className="text-sm text-gray-500">{apt.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{apt.time}</p>
                      <span className={`text-xs ${apt.type === "Video Consult" ? "text-green-600" : "text-blue-600"}`}>
                        {apt.type}
                      </span>
                    </div>
                    <button className="rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100">
                      Start
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Patient Queue */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Patient Queue
              </h2>
              <div className="space-y-3">
                {patientQueue.map((p, i) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 rounded-lg p-3 ${p.status === "active" ? "bg-primary-50 border border-primary-200" : "border border-gray-100"}`}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.waitTime}</p>
                    </div>
                    {p.status === "active" && (
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Earnings */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Earnings Overview
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <span className="text-sm text-gray-600">Today</span>
                  <span className="font-semibold text-gray-900">$480</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <span className="text-sm text-gray-600">This Week</span>
                  <span className="font-semibold text-gray-900">$2,140</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <span className="text-sm text-gray-600">This Month</span>
                  <span className="font-semibold text-gray-900">$4,280</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 p-6 text-white shadow-sm">
              <h3 className="font-semibold">Quick Actions</h3>
              <div className="mt-3 space-y-2">
                <Link href="#" className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/20">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Start Video Call
                </Link>
                <Link href="/dashboard/doctor/prescriptions" className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/20">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  Write Prescription
                </Link>
                <Link href="/profile" className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/20">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Settings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
