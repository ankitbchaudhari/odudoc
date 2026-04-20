"use client";

import Link from "next/link";
import type { Doctor } from "@/lib/data";
import DoctorPresenceBadge, { PresenceDot } from "@/components/DoctorPresenceBadge";
import { pickDoctorPhoto } from "@/lib/doctor-photos";

export default function DoctorCard({ doctor, hidePhoto = false }: { doctor: Doctor; hidePhoto?: boolean }) {
  const photo = pickDoctorPhoto({
    id: doctor.id,
    gender: doctor.gender,
    explicit: doctor.photoUrl,
  });

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      {/* Photo — full-bleed top section */}
      <Link href={`/doctors/${doctor.id}`} className="relative block">
        <div className={`relative aspect-[4/5] w-full overflow-hidden ${doctor.imageColor}`}>
          {hidePhoto ? (
            <>
              {/* Gated view for signed-out users — initials only, no portrait */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-5xl font-bold text-white/90">
                {doctor.initials}
              </div>
              <Link
                href={`/auth/login?callbackUrl=/consult`}
                className="absolute inset-x-3 bottom-12 flex items-center justify-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-primary-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Sign in to view photo
              </Link>
            </>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt={doctor.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  // If the portrait CDN ever hiccups, hide the broken image and
                  // let the coloured background + initials overlay shine through.
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              {/* Initials as fallback — sits behind the img so it shows if the image fails */}
              <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center text-5xl font-bold text-white/90">
                {doctor.initials}
              </div>
            </>
          )}
          {/* Presence pill (online/offline) */}
          <div className="absolute right-3 top-3">
            <PresenceDot doctorId={doctor.id} />
          </div>
          {/* Specialty pill floating bottom-left over image */}
          <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-primary-700 shadow-sm backdrop-blur-sm">
            {doctor.specialty}
          </span>
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col p-5">
        <Link href={`/doctors/${doctor.id}`} className="inline-block">
          <h3 className="text-base font-semibold text-primary-600 transition-colors hover:text-primary-700">
            {doctor.name}
          </h3>
        </Link>
        <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">{doctor.qualifications}</p>

        {/* Presence */}
        <div className="mt-2 flex">
          <DoctorPresenceBadge doctorId={doctor.id} />
        </div>

        <div className="mt-3 flex items-center gap-1 text-sm text-gray-600">
          <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="font-medium">{doctor.rating}</span>
          <span className="text-gray-400">({doctor.reviewCount})</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span>{doctor.experience} yrs exp</span>
          <span>•</span>
          <span>{doctor.city}</span>
        </div>

        {/* Price + Actions */}
        <div className="mt-auto w-full border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-400">Consultation fee</p>
          <p className="text-xl font-bold text-gray-900">${doctor.fee}</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href={`/doctors/${doctor.id}`}
              className="btn-primary w-full !py-2 !text-xs"
            >
              Book Appointment
            </Link>
            <Link
              href="/consult"
              className="w-full rounded-lg border border-primary-200 bg-primary-50 py-2 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100"
            >
              Video Consult
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
