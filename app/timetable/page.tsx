"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { timetableEntries } from "@/lib/data";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_SLOTS = [
  { key: "morning" as const, label: "Morning", time: "8:00 AM - 12:00 PM" },
  { key: "afternoon" as const, label: "Afternoon", time: "12:00 PM - 4:00 PM" },
  { key: "evening" as const, label: "Evening", time: "4:00 PM - 8:00 PM" },
];

const DEPT_COLORS: Record<string, string> = {
  "Cardiology": "bg-red-100 text-red-700 border-red-200",
  "General Physician": "bg-teal-100 text-teal-700 border-teal-200",
  "Pediatrics": "bg-green-100 text-green-700 border-green-200",
  "Psychiatry": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Dermatology": "bg-pink-100 text-pink-700 border-pink-200",
  "Gynecology": "bg-rose-100 text-rose-700 border-rose-200",
  "Orthopedics": "bg-orange-100 text-orange-700 border-orange-200",
  "Dentistry": "bg-blue-100 text-blue-700 border-blue-200",
};

export default function TimetablePage() {
  const [filterDept, setFilterDept] = useState("");

  const allDepartments = useMemo(
    () => Array.from(new Set(timetableEntries.map((e) => e.department))).sort(),
    []
  );

  const filtered = useMemo(
    () =>
      filterDept
        ? timetableEntries.filter((e) => e.department === filterDept)
        : timetableEntries,
    [filterDept]
  );

  const getEntries = (day: string, slot: string) =>
    filtered.filter((e) => e.day === day && e.timeSlot === slot);

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-primary-600 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Timetable</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-teal-50 py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold text-gray-900 md:text-4xl">
            Doctor Schedule & <span className="text-primary-600">Timetable</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-gray-500">
            View our weekly doctor schedule to plan your visit. Filter by department
            to find the right specialist at a convenient time.
          </p>
        </div>
      </section>

      {/* Filter */}
      <section className="border-b border-gray-100 bg-white py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Filter by Department:</label>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 outline-none focus:border-primary-500"
              >
                <option value="">All Departments</option>
                {allDepartments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            {filterDept && (
              <button
                onClick={() => setFilterDept("")}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Desktop Table */}
      <section className="py-8 hidden lg:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border-b border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Time Slot
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day}
                      className="border-b border-r border-gray-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 last:border-r-0"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot) => (
                  <tr key={slot.key} className="border-b border-gray-100 last:border-b-0">
                    <td className="border-r border-gray-200 px-4 py-4 align-top">
                      <p className="text-sm font-semibold text-gray-900">{slot.label}</p>
                      <p className="text-xs text-gray-500">{slot.time}</p>
                    </td>
                    {DAYS.map((day) => {
                      const entries = getEntries(day, slot.key);
                      return (
                        <td
                          key={day}
                          className="border-r border-gray-200 px-2 py-2 align-top last:border-r-0"
                        >
                          <div className="space-y-2">
                            {entries.map((entry) => (
                              <div
                                key={entry.id}
                                className={`rounded-lg border p-2.5 text-xs ${entry.color}`}
                              >
                                <p className="font-semibold">{entry.doctorName}</p>
                                <p className="mt-0.5 opacity-80">{entry.department}</p>
                              </div>
                            ))}
                            {entries.length === 0 && (
                              <div className="rounded-lg bg-gray-50 p-2.5 text-center text-xs text-gray-400">
                                --
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Mobile List View */}
      <section className="py-8 lg:hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="space-y-6">
            {DAYS.map((day) => {
              const dayEntries = filtered.filter((e) => e.day === day);
              return (
                <div key={day} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="bg-primary-600 px-4 py-3">
                    <h3 className="text-sm font-bold text-white">{day}</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {TIME_SLOTS.map((slot) => {
                      const entries = dayEntries.filter((e) => e.timeSlot === slot.key);
                      return (
                        <div key={slot.key} className="p-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                            {slot.label} ({slot.time})
                          </p>
                          {entries.length > 0 ? (
                            <div className="space-y-2">
                              {entries.map((entry) => (
                                <div
                                  key={entry.id}
                                  className={`rounded-lg border p-3 text-sm ${entry.color}`}
                                >
                                  <p className="font-semibold">{entry.doctorName}</p>
                                  <p className="text-xs opacity-80 mt-0.5">{entry.department}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">No appointments scheduled</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Legend */}
      <section className="border-t border-gray-100 bg-gray-50 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Department Color Legend</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(DEPT_COLORS).map(([dept, color]) => (
              <div
                key={dept}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${color}`}
              >
                <span className={`h-2 w-2 rounded-full ${color.split(" ")[0].replace("100", "500")}`} />
                {dept}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900">Ready to Book Your Appointment?</h2>
          <p className="mt-2 text-sm text-gray-500">
            Find a convenient time and book your consultation with our expert doctors.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/doctors" className="btn-primary">
              Find a Doctor
            </Link>
            <Link href="/consult" className="btn-outline">
              Book Video Consult
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
