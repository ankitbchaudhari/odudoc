"use client";

// Patient-facing list of physical clinics the doctor has registered.
// Each card shows the clinic name, address, hours, and a "Book at this
// clinic" button that deep-links into the in-person booking flow.
// Renders nothing when the doctor hasn't registered any clinics yet.

import { useEffect, useState } from "react";
import Link from "next/link";

interface ClinicHours {
  day: number;
  open: string;
  close: string;
  closed?: boolean;
}

interface Clinic {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  phone?: string;
  mapsUrl?: string;
  hours: ClinicHours[];
  acceptOnlinePayment: boolean;
  acceptClinicPayment: boolean;
  feeOverride?: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ClinicLocations({
  doctorId,
  onBookOnline,
}: {
  doctorId: string;
  /** When provided, "Book online" CTA shows on each clinic card. The
   *  parent doctor profile uses this to open BookingModal pre-tagged
   *  with the clinicId so the booking lands as an in-person clinic
   *  visit paid online. */
  onBookOnline?: (clinicId: string, clinicName: string) => void;
}) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/clinics/by-doctor/${encodeURIComponent(doctorId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setClinics(d.clinics || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [doctorId]);

  if (!loaded || clinics.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition hover:shadow-md p-6">
      <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-slate-100">
        Visit in person {clinics.length > 1 ? `(${clinics.length} clinics)` : ""}
      </h2>
      <p className="text-xs text-gray-500 dark:text-slate-400">
        Book an in-person appointment at any of these clinics.
      </p>

      <div className="mt-4 grid gap-4">
        {clinics.map((c) => (
          <ClinicCard key={c.id} clinic={c} doctorId={doctorId} onBookOnline={onBookOnline} />
        ))}
      </div>
    </div>
  );
}

function ClinicCard({
  clinic,
  doctorId,
  onBookOnline,
}: {
  clinic: Clinic;
  doctorId: string;
  onBookOnline?: (clinicId: string, clinicName: string) => void;
}) {
  const address = [clinic.addressLine1, clinic.addressLine2, clinic.city, clinic.state, clinic.postalCode]
    .filter(Boolean)
    .join(", ");
  const mapsHref =
    clinic.mapsUrl ||
    `https://maps.google.com/maps?q=${encodeURIComponent(address)}`;
  const todayHours = clinic.hours.find((h) => h.day === new Date().getDay());

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">{clinic.name}</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{address}</p>
          {clinic.phone && (
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">📞 {clinic.phone}</p>
          )}
          {todayHours && !todayHours.closed && (
            <p className="mt-1 text-xs text-emerald-700">
              Today: {todayHours.open} – {todayHours.close}
            </p>
          )}
        </div>
        {clinic.feeOverride && (
          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
            ${clinic.feeOverride}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {clinic.acceptOnlinePayment && (
          <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">Pay online ✓</span>
        )}
        {clinic.acceptClinicPayment && (
          <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700">Pay at clinic ✓</span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {clinic.acceptOnlinePayment && onBookOnline && (
          <button
            type="button"
            onClick={() => onBookOnline(clinic.id, clinic.name)}
            className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700"
          >
            Book online
          </button>
        )}
        {clinic.acceptClinicPayment && (
          <Link
            href={`/doctors/${doctorId}/book-clinic/${clinic.id}`}
            className="rounded-lg border border-primary-600 px-4 py-2 text-center text-sm font-semibold text-primary-700 transition hover:bg-primary-50"
          >
            Pay at clinic
          </Link>
        )}
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2 text-center text-sm text-gray-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 sm:col-span-2"
        >
          Open in Maps →
        </a>
      </div>
    </div>
  );
}

// Re-export for completeness — caller can use DAYS to render schedule
// if they ever want a full week table.
export { DAYS };
