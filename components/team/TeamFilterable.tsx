"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import type { Doctor } from "@/lib/data";

const specialtyFilters = ["All", "General Physician", "Dermatologist", "Gynecologist", "Pediatrician", "Dentist", "Orthopedist", "Cardiologist", "Psychiatrist"];
const PER_PAGE = 12;

export default function TeamFilterable() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  useEffect(() => {
    fetch("/api/doctors", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.doctors)) setDoctors(d.doctors);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (activeFilter === "All") return doctors;
    return doctors.filter((d) => d.specialty === activeFilter);
  }, [activeFilter, doctors]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const handleFilter = (filter: string) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">
            Find Your Doctor
          </p>
          <h2 className="mt-2 text-4xl font-bold text-gray-900">Our Medical Specialists</h2>
        </div>

        {/* Filter + View Toggle Row */}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {specialtyFilters.map((f) => (
              <button
                key={f}
                onClick={() => handleFilter(f)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  activeFilter === f
                    ? "bg-primary-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 ${
                viewMode === "grid" ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-500"
              }`}
              aria-label="Grid view"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 ${
                viewMode === "list" ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-500"
              }`}
              aria-label="List view"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Results */}
        {paginated.length === 0 ? (
          <p className="mt-12 text-center text-gray-400">No doctors found in this specialty.</p>
        ) : viewMode === "grid" ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((doctor: Doctor) => (
              <div
                key={doctor.id}
                className="overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className={`flex h-48 items-center justify-center bg-gradient-to-br ${doctor.imageColor} to-transparent`}>
                  <span className="text-5xl font-bold text-white/80">{doctor.initials}</span>
                </div>
                <div className="p-5">
                  <Link href={`/doctors/${doctor.id}`}>
                    <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600">{doctor.name}</h3>
                  </Link>
                  <p className="text-sm text-primary-600">{doctor.specialty}</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                    <span>{doctor.experience} yrs exp</span>
                    <span>&middot;</span>
                    <span className="flex items-center gap-0.5">
                      <svg className="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {doctor.rating}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {paginated.map((doctor: Doctor) => (
              <div
                key={doctor.id}
                className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-300 hover:shadow-xl sm:flex-row"
              >
                <div className={`flex h-40 w-full items-center justify-center bg-gradient-to-br ${doctor.imageColor} to-transparent sm:h-auto sm:w-48`}>
                  <span className="text-5xl font-bold text-white/80">{doctor.initials}</span>
                </div>
                <div className="flex flex-1 items-center p-6">
                  <div className="flex-1">
                    <Link href={`/doctors/${doctor.id}`}>
                      <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600">{doctor.name}</h3>
                    </Link>
                    <p className="text-sm text-primary-600">{doctor.specialty}</p>
                    <p className="mt-1 text-sm text-gray-400">{doctor.qualifications}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-500">{doctor.about}</p>
                  </div>
                  <div className="ml-6 hidden flex-col items-end gap-2 sm:flex">
                    <p className="text-lg font-bold text-gray-900">${doctor.fee}</p>
                    <Link href={`/doctors/${doctor.id}`} className="btn-primary !px-5 !py-2 !text-xs">
                      Book Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-all duration-300 hover:bg-gray-50 disabled:opacity-40"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 ${
                  currentPage === page
                    ? "bg-primary-600 text-white shadow-md"
                    : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-all duration-300 hover:bg-gray-50 disabled:opacity-40"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
