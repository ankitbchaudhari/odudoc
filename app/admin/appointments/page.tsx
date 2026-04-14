"use client";

import { useState } from "react";

const appointmentsData = [
  { id: 1, patient: "John Smith", doctor: "Dr. Sarah Johnson", date: "Apr 13, 2026", time: "9:00 AM", status: "Confirmed" },
  { id: 2, patient: "Emily Davis", doctor: "Dr. Michael Chen", date: "Apr 13, 2026", time: "10:30 AM", status: "Pending" },
  { id: 3, patient: "Robert Wilson", doctor: "Dr. Priya Patel", date: "Apr 13, 2026", time: "11:00 AM", status: "Completed" },
  { id: 4, patient: "Maria Garcia", doctor: "Dr. James Wilson", date: "Apr 13, 2026", time: "2:00 PM", status: "Confirmed" },
  { id: 5, patient: "David Lee", doctor: "Dr. David Brown", date: "Apr 13, 2026", time: "3:30 PM", status: "Pending" },
  { id: 6, patient: "Susan Clark", doctor: "Dr. Emily Zhang", date: "Apr 12, 2026", time: "10:00 AM", status: "Completed" },
  { id: 7, patient: "James Brown", doctor: "Dr. Robert Kumar", date: "Apr 12, 2026", time: "11:30 AM", status: "Cancelled" },
  { id: 8, patient: "Linda Martinez", doctor: "Dr. Sarah Johnson", date: "Apr 12, 2026", time: "2:30 PM", status: "Completed" },
  { id: 9, patient: "Michael Taylor", doctor: "Dr. Anita Sharma", date: "Apr 11, 2026", time: "9:30 AM", status: "Completed" },
  { id: 10, patient: "Jennifer Anderson", doctor: "Dr. Michael Chen", date: "Apr 11, 2026", time: "4:00 PM", status: "Cancelled" },
];

const statusFilters = ["All", "Pending", "Confirmed", "Completed", "Cancelled"];

const statusColor: Record<string, string> = {
  Confirmed: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Completed: "bg-blue-100 text-blue-700",
  Cancelled: "bg-red-100 text-red-700",
};

export default function AdminAppointments() {
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = appointmentsData.filter(
    (a) => statusFilter === "All" || a.status === statusFilter
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Appointments Management</h2>
        <p className="mt-1 text-sm text-gray-500">{appointmentsData.length} total appointments</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === s
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="sm:ml-auto">
          <input
            type="date"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-6 py-4 font-medium">Patient</th>
                <th className="px-6 py-4 font-medium">Doctor</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Time</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{a.patient}</td>
                  <td className="px-6 py-4 text-gray-600">{a.doctor}</td>
                  <td className="px-6 py-4 text-gray-600">{a.date}</td>
                  <td className="px-6 py-4 text-gray-600">{a.time}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor[a.status]}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
