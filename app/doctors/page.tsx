"use client";

import { useState, useMemo, useEffect } from "react";
import DoctorListRow from "@/components/DoctorListRow";
import { specialties as fallbackSpecialties, type Doctor } from "@/lib/data";
import { getDoctorPresence } from "@/lib/doctor-presence";

// Shape returned by /api/public/departments (matches DisplayDepartment in
// lib/specialty-display.ts). Only the fields this page uses are declared.
interface PublicSpecialty {
  id: string;
  name: string;
  emoji: string;
}

/** Specialty matcher that bridges the noun/practitioner distinction.
 *  Doctors are stored with practitioner names ("Psychiatrist",
 *  "Cardiologist") while specialty cards use the discipline name
 *  ("Psychiatry", "Cardiology"). A naive === comparison filters out
 *  every match. We normalize by lowercasing and stripping common
 *  noun/agent suffixes, then check substring overlap. */
function specialtyMatches(doctorSpecialty: string, filter: string): boolean {
  const root = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/\s*&\s*.*$/, "") // "Gynecology & Obstetrics" → "gynecology"
      .replace(/(ologist|iatrist|atrician|ician|ologist|ology|iatry|atrics|ics|ical|ist|y)$/u, "");
  const a = root(doctorSpecialty);
  const b = root(filter);
  if (!a || !b) return doctorSpecialty.toLowerCase() === filter.toLowerCase();
  // Either root is a prefix of the other — covers "psychiat" vs
  // "psychiat", "cardiolog" vs "cardiolog", "general" vs "general".
  return a === b || a.startsWith(b) || b.startsWith(a);
}

export default function DoctorsPage() {
  // Doctors come exclusively from the admin-managed API. No static fallback —
  // if the admin hasn't added any, the list is empty.
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoaded, setDoctorsLoaded] = useState(false);
  useEffect(() => {
    fetch("/api/doctors", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.doctors)) setDoctors(d.doctors);
      })
      .catch(() => {})
      .finally(() => setDoctorsLoaded(true));
  }, []);

  // Admin-managed specialty list (falls back to the bundled static list
  // while the request is in flight, so the grid never flashes empty).
  const [liveSpecialties, setLiveSpecialties] = useState<PublicSpecialty[]>(
    () => fallbackSpecialties.map((s) => ({ id: s.id, name: s.name, emoji: s.icon }))
  );
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/departments", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        if (d && Array.isArray(d.departments) && d.departments.length > 0) {
          setLiveSpecialties(
            d.departments.map((x: { id: string; name: string; emoji: string }) => ({
              id: x.id,
              name: x.name,
              emoji: x.emoji,
            }))
          );
        }
      })
      .catch(() => {
        // Leave the fallback list in place.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [gender, setGender] = useState("");
  const [sortBy, setSortBy] = useState("online");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [minExperience, setMinExperience] = useState(0);
  const [maxFee, setMaxFee] = useState(0); // 0 = no cap
  const [minRating, setMinRating] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Presence is computed client-side; recompute every 30s so the list refreshes.
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    setNowTick(Date.now());
    const t = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const onlineCount = useMemo(() => {
    if (!nowTick) return 0;
    return doctors.filter((d) => getDoctorPresence(d.id, nowTick).online).length;
  }, [nowTick]);

  const filtered = useMemo(() => {
    let list = [...doctors];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          d.city.toLowerCase().includes(q)
      );
    }

    if (specialty) list = list.filter((d) => specialtyMatches(d.specialty, specialty));
    if (gender) list = list.filter((d) => d.gender === gender);
    if (minExperience > 0) list = list.filter((d) => d.experience >= minExperience);
    if (maxFee > 0) list = list.filter((d) => d.fee <= maxFee);
    if (minRating > 0) list = list.filter((d) => d.rating >= minRating);

    if (onlineOnly && nowTick) {
      list = list.filter((d) => getDoctorPresence(d.id, nowTick).online);
    }

    if (sortBy === "rating") list.sort((a, b) => b.rating - a.rating);
    if (sortBy === "experience") list.sort((a, b) => b.experience - a.experience);
    if (sortBy === "fee-low") list.sort((a, b) => a.fee - b.fee);
    if (sortBy === "fee-high") list.sort((a, b) => b.fee - a.fee);
    if (sortBy === "online" && nowTick) {
      list.sort((a, b) => {
        const pa = getDoctorPresence(a.id, nowTick);
        const pb = getDoctorPresence(b.id, nowTick);
        if (pa.online !== pb.online) return pa.online ? -1 : 1;
        if (pa.online && pb.online) {
          if (pa.inCall !== pb.inCall) return pa.inCall ? 1 : -1;
          return b.rating - a.rating;
        }
        return pa.lastSeenMinutesAgo - pb.lastSeenMinutesAgo;
      });
    }

    return list;
  }, [search, specialty, gender, sortBy, onlineOnly, minExperience, maxFee, minRating, nowTick]);

  const uniqueSpecialties = Array.from(new Set(doctors.map((d) => d.specialty)));

  function clearFilters() {
    setSearch("");
    setSpecialty("");
    setGender("");
    setSortBy("online");
    setOnlineOnly(false);
    setMinExperience(0);
    setMaxFee(0);
    setMinRating(0);
  }

  const activeFilterCount =
    (specialty ? 1 : 0) +
    (gender ? 1 : 0) +
    (onlineOnly ? 1 : 0) +
    (minExperience ? 1 : 0) +
    (maxFee ? 1 : 0) +
    (minRating ? 1 : 0);

  const FiltersPanel = (
    <div className="space-y-6">
      {/* Gender */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Gender</h4>
        <div className="space-y-1.5">
          {[
            { v: "", label: "Any" },
            { v: "Male", label: "Male" },
            { v: "Female", label: "Female" },
          ].map((opt) => (
            <label key={opt.v} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
              <input
                type="radio"
                name="gender"
                checked={gender === opt.v}
                onChange={() => setGender(opt.v)}
                className="h-4 w-4 accent-primary-600"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Experience */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Experience</h4>
        <div className="space-y-1.5">
          {[
            { v: 0, label: "Any" },
            { v: 5, label: "5+ years" },
            { v: 10, label: "10+ years" },
            { v: 15, label: "15+ years" },
            { v: 20, label: "20+ years" },
          ].map((opt) => (
            <label key={opt.v} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
              <input
                type="radio"
                name="exp"
                checked={minExperience === opt.v}
                onChange={() => setMinExperience(opt.v)}
                className="h-4 w-4 accent-primary-600"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Consultation Fee */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Fees</h4>
        <div className="space-y-1.5">
          {[
            { v: 0, label: "Any" },
            { v: 50, label: "Under $50" },
            { v: 100, label: "Under $100" },
            { v: 200, label: "Under $200" },
          ].map((opt) => (
            <label key={opt.v} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
              <input
                type="radio"
                name="fee"
                checked={maxFee === opt.v}
                onChange={() => setMaxFee(opt.v)}
                className="h-4 w-4 accent-primary-600"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Rating</h4>
        <div className="space-y-1.5">
          {[
            { v: 0, label: "Any" },
            { v: 4, label: "4.0+" },
            { v: 4.5, label: "4.5+" },
            { v: 4.8, label: "4.8+" },
          ].map((opt) => (
            <label key={opt.v} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
              <input
                type="radio"
                name="rating"
                checked={minRating === opt.v}
                onChange={() => setMinRating(opt.v)}
                className="h-4 w-4 accent-primary-600"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Availability</h4>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={onlineOnly}
            onChange={(e) => setOnlineOnly(e.target.checked)}
            className="h-4 w-4 accent-green-600"
          />
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          Online now
        </label>
      </div>

      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          className="w-full rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-teal-600 text-3xl shadow-lg shadow-sky-500/30">
              🩺
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100">Find Doctors</h1>
              <p className="mt-1 text-gray-600 dark:text-slate-400">
                Book appointments with verified, experienced doctors
              </p>
            </div>
          </div>
          {nowTick > 0 && (
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 ring-1 ring-emerald-200 dark:ring-emerald-900 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-sm">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              {onlineCount} doctor{onlineCount === 1 ? "" : "s"} online now
            </div>
          )}
        </div>

        {/* Search bar + specialty + sort */}
        <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition ring-1 ring-slate-200 dark:ring-slate-800 sm:grid-cols-12">
          <div className="sm:col-span-6">
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search doctors, specialties, clinics"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-800 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-500"
              />
            </div>
          </div>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2.5 text-sm text-gray-600 dark:text-slate-300 outline-none focus:border-primary-500 sm:col-span-3"
          >
            <option value="">All Specialties</option>
            {uniqueSpecialties.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2.5 text-sm text-gray-600 dark:text-slate-300 outline-none focus:border-primary-500 sm:col-span-3"
          >
            <option value="online">🟢 Online First</option>
            <option value="rating">Relevance (Rating)</option>
            <option value="experience">Most Experience</option>
            <option value="fee-low">Fee: Low to High</option>
            <option value="fee-high">Fee: High to Low</option>
          </select>
        </div>

        {/* Mobile filter toggle */}
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {filtered.length} doctor{filtered.length !== 1 ? "s" : ""} found
          </p>
          <button
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Main: sidebar + results */}
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar (desktop) */}
          <aside className="hidden w-64 flex-shrink-0 lg:block">
            <div className="sticky top-6 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Filters</h3>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-medium text-primary-600 hover:text-primary-700"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {FiltersPanel}
            </div>
          </aside>

          {/* Mobile sidebar drawer */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <div
                className="flex-1 bg-black/40"
                onClick={() => setMobileFiltersOpen(false)}
              />
              <div className="h-full w-80 max-w-[90vw] overflow-y-auto bg-white dark:bg-slate-900 p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Filters</h3>
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300"
                    aria-label="Close filters"
                  >
                    ✕
                  </button>
                </div>
                {FiltersPanel}
              </div>
            </div>
          )}

          {/* Results */}
          <div className="min-w-0 flex-1">
            <p className="mb-3 hidden text-sm text-gray-600 dark:text-slate-300 lg:block">
              {doctorsLoaded ? (
                <>
                  <span className="font-semibold text-gray-900 dark:text-slate-100">{filtered.length}</span>{" "}
                  doctor{filtered.length !== 1 ? "s" : ""} found
                </>
              ) : (
                <span className="text-gray-400 dark:text-slate-500">Loading doctors…</span>
              )}
            </p>

            <div className="flex flex-col gap-4">
              {!doctorsLoaded ? (
                // Skeleton while the initial /api/doctors fetch is in
                // flight — don't flash "No doctors found" before the
                // request even resolves.
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm"
                  >
                    <div className="flex gap-4">
                      <div className="h-16 w-16 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-2/3 rounded bg-gray-200" />
                        <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-slate-800" />
                        <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-slate-800" />
                      </div>
                    </div>
                  </div>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((d) => <DoctorListRow key={d.id} doctor={d} />)
              ) : (
                <div className="rounded-2xl bg-white dark:bg-slate-900 py-16 px-6 text-center shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                  <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 via-cyan-100 to-teal-100 dark:from-sky-950/40 dark:via-cyan-950/40 dark:to-teal-950/40 text-6xl shadow-inner">
                    🔍
                  </div>
                  <p className="mt-5 text-xl font-bold text-gray-900 dark:text-slate-100">
                    {doctors.length === 0 ? "No doctors yet" : "No doctors match your filters"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                    {doctors.length === 0
                      ? "We're onboarding clinicians right now — check back soon."
                      : "Try clearing one of the filters to widen your search."}
                  </p>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="mt-5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/30 transition"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Specialty Browse */}
            <div className="mt-14">
              <h2 className="mb-6 text-xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100">Browse by Specialty</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {liveSpecialties.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSpecialty(s.name)}
                    className="rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm hover:shadow-md hover:ring-sky-300 dark:hover:ring-sky-700 transition flex flex-col items-center py-5 text-center"
                  >
                    <span className="text-3xl">{s.emoji}</span>
                    <span className="mt-2 text-xs font-semibold text-gray-700 dark:text-slate-300">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
