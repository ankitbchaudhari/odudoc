"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Booking } from "@/lib/bookings-store";

export default function DoctorAppointmentsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings");
      const data = await res.json();
      setBookings(data.bookings || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/doctor" className="rounded-lg p-2 text-gray-400 dark:text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:text-slate-300">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Appointments</h1>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">Upcoming and past consultations</p>
            </div>
          </div>
          <button onClick={load} className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-500 dark:text-slate-400">Loading…</div>
        ) : bookings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">No appointments scheduled</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">New bookings from patients will show up here automatically.</p>
            <Link href="/dashboard/doctor/consultations" className="mt-4 inline-block text-sm text-primary-600 hover:underline">
              View video consultations →
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-slate-400">{bookings.length} booking{bookings.length === 1 ? "" : "s"}</p>
              <Link href="/dashboard/doctor/consultations" className="text-sm text-primary-600 hover:underline">
                Video consultations →
              </Link>
            </div>
            <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900 text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Booking ID</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Doctor</th>
                    <th className="px-4 py-3">Slot</th>
                    <th className="px-4 py-3">Fee</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Booked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-slate-400">{b.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{b.patientName}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{b.patientPhone}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{b.doctorName}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{b.timeSlot}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">${b.fee}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.paymentStatus} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 dark:text-slate-500 dark:text-slate-400">
                        {new Date(b.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Booking["paymentStatus"] }) {
  const map: Record<Booking["paymentStatus"], string> = {
    paid: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",
    refunded: "bg-rose-100 text-rose-700",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] || "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300"}`}>{status}</span>;
}
