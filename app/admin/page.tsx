"use client";

import Link from "next/link";

const stats = [
  { label: "Total Patients", value: "12,847", change: "+12%", color: "bg-blue-50 text-blue-600" },
  { label: "Total Doctors", value: "348", change: "+5%", color: "bg-green-50 text-green-600" },
  { label: "Appointments Today", value: "156", change: "+18%", color: "bg-purple-50 text-purple-600" },
  { label: "Revenue This Month", value: "$284,500", change: "+8%", color: "bg-orange-50 text-orange-600" },
];

const recentAppointments = [
  { patient: "John Smith", doctor: "Dr. Sarah Johnson", date: "Apr 13, 2026", time: "9:00 AM", status: "Confirmed" },
  { patient: "Emily Davis", doctor: "Dr. Michael Chen", date: "Apr 13, 2026", time: "10:30 AM", status: "Pending" },
  { patient: "Robert Wilson", doctor: "Dr. Priya Patel", date: "Apr 13, 2026", time: "11:00 AM", status: "Completed" },
  { patient: "Maria Garcia", doctor: "Dr. James Wilson", date: "Apr 13, 2026", time: "2:00 PM", status: "Confirmed" },
  { patient: "David Lee", doctor: "Dr. David Brown", date: "Apr 13, 2026", time: "3:30 PM", status: "Pending" },
];

const recentRegistrations = [
  { name: "Alice Turner", email: "alice@example.com", date: "Apr 13, 2026", type: "Patient" },
  { name: "Dr. Mark Evans", email: "mark.evans@med.com", date: "Apr 12, 2026", type: "Doctor" },
  { name: "Susan Clark", email: "susan.c@example.com", date: "Apr 12, 2026", type: "Patient" },
  { name: "James Brown", email: "j.brown@example.com", date: "Apr 11, 2026", type: "Patient" },
  { name: "Dr. Nina Roy", email: "nina.roy@med.com", date: "Apr 11, 2026", type: "Doctor" },
];

const chartBars = [65, 80, 55, 90, 70, 85, 60, 95, 75, 88, 72, 68];
const chartMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const statusColor: Record<string, string> = {
  Confirmed: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Completed: "bg-blue-100 text-blue-700",
  Cancelled: "bg-red-100 text-red-700",
};

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, Admin</h2>
        <p className="mt-1 text-sm text-gray-500">Here is what is happening with your platform today.</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">{s.label}</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.color}`}>
                {s.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bar chart placeholder */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Appointments Overview</h3>
          <div className="flex h-48 items-end gap-2">
            {chartBars.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-primary-500 transition-all hover:bg-primary-600"
                  style={{ height: `${h}%` }}
                />
                <span className="text-[10px] text-gray-400">{chartMonths[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Line chart placeholder */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Revenue Trend</h3>
          <div className="flex h-48 items-end gap-2">
            {[40, 55, 45, 60, 50, 70, 65, 80, 75, 90, 85, 95].map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-teal-400 transition-all hover:bg-teal-500"
                  style={{ height: `${h}%` }}
                />
                <span className="text-[10px] text-gray-400">{chartMonths[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Recent Appointments */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Recent Appointments</h3>
            <Link href="/admin/appointments" className="text-xs font-medium text-primary-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="pb-3 font-medium">Patient</th>
                  <th className="pb-3 font-medium">Doctor</th>
                  <th className="pb-3 font-medium">Time</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAppointments.map((a, i) => (
                  <tr key={i} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{a.patient}</td>
                    <td className="py-3 text-gray-600">{a.doctor}</td>
                    <td className="py-3 text-gray-600">{a.time}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor[a.status]}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Registrations */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Recent Registrations</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {recentRegistrations.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="py-3 text-gray-600">{r.email}</td>
                    <td className="py-3 text-gray-600">{r.date}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          r.type === "Doctor"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {r.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/doctors"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Doctor
          </Link>
          <Link
            href="/admin/blog"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            New Blog Post
          </Link>
          <Link
            href="/admin/appointments"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            View Appointments
          </Link>
        </div>
      </div>
    </div>
  );
}
