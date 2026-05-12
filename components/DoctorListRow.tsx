"use client";

// Practo-style horizontal row for the /doctors listing page.
//
// Photo on the left, full info block in the middle, booking actions and fee
// pinned to the right — the layout scales from a tight two-row stack on
// mobile to the full wide row on desktop.

import Link from "next/link";
import type { Doctor } from "@/lib/data";
import DoctorPresenceBadge from "@/components/DoctorPresenceBadge";
import { pickDoctorPhoto } from "@/lib/doctor-photos";

export default function DoctorListRow({ doctor }: { doctor: Doctor }) {
  const photo = pickDoctorPhoto({
    id: doctor.id,
    gender: doctor.gender,
    explicit: doctor.photoUrl,
  });

  // Practo-style thumb-up recommendation % — derived from rating so it's
  // deterministic per doctor (4.9 → 98%, 4.5 → 90%).
  const recommendPct = Math.min(99, Math.round(doctor.rating * 20));

  return (
    <article className="group rounded-xl border border-gray-100 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all hover:border-primary-200 hover:shadow-md">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {/* Photo */}
        <Link href={`/doctors/${doctor.id}`} className="flex-shrink-0">
          <div className={`relative h-32 w-32 overflow-hidden rounded-full ring-4 ring-gray-50 ${doctor.imageColor} sm:h-36 sm:w-36`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt={doctor.name}
              loading="lazy"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center text-3xl font-bold text-white/90">
              {doctor.initials}
            </div>
          </div>
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/doctors/${doctor.id}`}>
                <h3 className="text-lg font-semibold text-primary-700 transition-colors hover:text-primary-800 sm:text-xl">
                  {doctor.name}
                </h3>
              </Link>
              <p className="mt-0.5 text-sm text-gray-600 dark:text-slate-300">{doctor.specialty}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                <span className="font-medium text-gray-700 dark:text-slate-300">{doctor.experience} years</span> experience overall
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 line-clamp-1">{doctor.qualifications}</p>
            </div>
            {/* Verified badge (desktop only) */}
            <div className="hidden flex-shrink-0 items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 sm:inline-flex">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified
            </div>
          </div>

          {/* Location + clinic */}
          <div className="mt-3 flex items-start gap-1.5 text-sm text-gray-600 dark:text-slate-300">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0L6.343 16.657A8 8 0 1117.657 16.657z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <span className="font-medium text-gray-700 dark:text-slate-300">{doctor.city}</span>
              {doctor.location && (
                <span className="text-gray-500 dark:text-slate-400"> · {doctor.location}</span>
              )}
            </div>
          </div>

          {/* Fee pill */}
          <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-600 dark:text-slate-300">
            <svg className="h-4 w-4 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold text-gray-900 dark:text-slate-100">${doctor.fee}</span>
            <span className="text-xs text-gray-500 dark:text-slate-400">Consultation fee</span>
          </div>

          {/* Bottom row: rating + presence */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5 rounded-md bg-green-50 px-2 py-1 text-green-700">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.733a4 4 0 00-.8 2.6z" />
              </svg>
              <span className="font-semibold">{recommendPct}%</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500 dark:text-slate-400">
              <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="font-medium text-gray-700 dark:text-slate-300">{doctor.rating}</span>
              <span className="text-gray-400 dark:text-slate-500">· {doctor.reviewCount} Patient Stories</span>
            </div>
            <DoctorPresenceBadge doctorId={doctor.id} />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-row gap-2 sm:w-44 sm:flex-col">
          <Link
            href={`/doctors/${doctor.id}`}
            className="btn-primary flex-1 !py-2.5 text-center !text-sm"
          >
            Book Appointment
          </Link>
          <Link
            href="/consult"
            className="flex-1 rounded-lg border border-primary-200 bg-primary-50 py-2.5 text-center text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100"
          >
            Consult Online
          </Link>
          <div className="hidden text-center text-xs text-gray-400 dark:text-slate-500 sm:block">
            No Booking Fee
          </div>
        </div>
      </div>
    </article>
  );
}
