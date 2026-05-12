"use client";

import { useState, useEffect } from "react";
import type { Booking } from "@/lib/bookings-store";

type StatusFilter = "all" | "paid" | "pending" | "failed" | "refunded";

const statusConfig: Record<
  Booking["paymentStatus"],
  { label: string; bg: string; text: string }
> = {
  paid: { label: "Paid", bg: "bg-green-100", text: "text-green-700" },
  pending: { label: "Pending", bg: "bg-yellow-100", text: "text-yellow-700" },
  failed: { label: "Failed", bg: "bg-red-100", text: "text-red-700" },
  refunded: { label: "Refunded", bg: "bg-gray-100 dark:bg-slate-800", text: "text-gray-700 dark:text-slate-300" },
};

export default function PaymentsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch("/api/bookings");
        const data = await res.json();
        setBookings(data.bookings || []);
      } catch {
        console.error("Failed to fetch bookings");
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const filtered =
    filter === "all"
      ? bookings
      : bookings.filter((b) => b.paymentStatus === filter);

  const totalPaid = bookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((sum, b) => sum + b.fee, 0);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-slate-900 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
              Payment History
            </h1>
            <p className="mt-1 text-gray-500 dark:text-slate-400">
              {bookings.length} total transaction
              {bookings.length !== 1 ? "s" : ""} &middot; $
              {totalPaid.toFixed(2)} paid
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {(
            ["all", "paid", "pending", "failed", "refunded"] as StatusFilter[]
          ).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filter === s
                  ? "bg-primary-600 text-white"
                  : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:bg-slate-800"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              {s === "all" && ` (${bookings.length})`}
              {s !== "all" &&
                ` (${bookings.filter((b) => b.paymentStatus === s).length})`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl bg-white dark:bg-slate-900 py-16 text-center shadow-sm">
            <p className="text-4xl">&#128722;</p>
            <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-slate-100">
              No payments found
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              {filter === "all"
                ? "You haven't made any payments yet."
                : `No ${filter} payments.`}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-sm md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 dark:bg-slate-900">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      Doctor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((booking) => {
                    const cfg = statusConfig[booking.paymentStatus];
                    return (
                      <tr
                        key={booking.id}
                        className="transition-colors hover:bg-gray-50 dark:bg-slate-900"
                      >
                        <td className="px-6 py-4 text-sm font-mono font-medium text-primary-600">
                          {booking.id}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                            {booking.doctorName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {booking.timeSlot}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-slate-300">
                          {booking.patientName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                          {new Date(booking.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">
                          ${booking.fee.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text}`}
                          >
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-3 md:hidden">
              {filtered.map((booking) => {
                const cfg = statusConfig[booking.paymentStatus];
                return (
                  <div
                    key={booking.id}
                    className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-sm font-medium text-primary-600">
                          {booking.id}
                        </p>
                        <p className="mt-1 font-semibold text-gray-900 dark:text-slate-100">
                          {booking.doctorName}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-slate-400">
                        {booking.patientName} &middot; {booking.timeSlot}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-slate-100">
                        ${booking.fee.toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                      {new Date(booking.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
