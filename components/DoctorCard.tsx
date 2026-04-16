import Link from "next/link";
import type { Doctor } from "@/lib/data";

export default function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <div className="card group flex h-full flex-col items-center text-center">
      {/* Avatar */}
      <div
        className={`flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full text-xl font-bold text-white ${doctor.imageColor}`}
      >
        {doctor.initials}
      </div>

      {/* Info */}
      <div className="mt-4 flex-1">
        <Link href={`/doctors/${doctor.id}`} className="inline-block">
          <h3 className="text-base font-semibold text-primary-600 transition-colors hover:text-primary-700">
            {doctor.name}
          </h3>
        </Link>
        <p className="mt-0.5 text-sm text-gray-500">{doctor.specialty}</p>
        <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">{doctor.qualifications}</p>

        <div className="mt-3 flex items-center justify-center gap-1 text-sm text-gray-600">
          <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="font-medium">{doctor.rating}</span>
          <span className="text-gray-400">({doctor.reviewCount})</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span>{doctor.experience} yrs exp</span>
          <span>•</span>
          <span>{doctor.city}</span>
        </div>
      </div>

      {/* Price + Actions */}
      <div className="mt-4 w-full border-t border-gray-100 pt-4">
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
  );
}
