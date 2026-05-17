// /doctors/[id]/clinics — focused clinic-picker.
//
// Reached from the "🏥 Visit Clinic" CTA on the /doctors listing.
// Shows every active clinic the doctor has registered as a bookable
// card. If the doctor only has one active clinic, we redirect
// straight to /doctors/[id]/book-clinic/[clinicId] so the patient
// doesn't have to make a meaningless choice.

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getDoctorById } from "@/lib/doctors-store";
import { listActiveClinicsByDoctor, reloadClinics } from "@/lib/clinics-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function VisitClinicPickerPage({
  params,
}: {
  params: { id: string };
}) {
  // Cross-Lambda freshness — clinics only. The doctor record is
  // weeks-stable; skip the reloadDoctors Postgres hit here.
  await reloadClinics();

  const doctor = getDoctorById(params.id);
  if (!doctor) notFound();

  const clinics = listActiveClinicsByDoctor(doctor.id);

  // Zero clinics → bounce back to the doctor profile (telemed CTAs).
  if (clinics.length === 0) {
    redirect(`/doctors/${doctor.id}`);
  }

  // One clinic → straight into the booking flow, no picker noise.
  if (clinics.length === 1) {
    redirect(`/doctors/${doctor.id}/book-clinic/${clinics[0].id}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/doctors/${doctor.id}`}
        className="text-xs text-gray-500 dark:text-slate-400 hover:underline"
      >
        ← {doctor.name}
      </Link>
      <header className="mt-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Book a clinic visit
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
          Pick which clinic you&apos;d like to visit. {doctor.name} practices at{" "}
          {clinics.length} locations.
        </p>
      </header>

      <ul className="space-y-4">
        {clinics.map((c) => {
          const addr = [c.addressLine1, c.addressLine2, c.city, c.state, c.postalCode]
            .filter(Boolean)
            .join(", ");
          const hoursToday = c.hours.find(
            (h) => h.day === new Date().getDay(),
          );
          const hoursLabel = hoursToday && !hoursToday.closed
            ? `Today ${hoursToday.open} – ${hoursToday.close}`
            : "Closed today";
          return (
            <li
              key={c.id}
              className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                    {c.name}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                    {addr}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-slate-500">
                    <span>🕒 {hoursLabel}</span>
                    {c.phone && <span>📞 {c.phone}</span>}
                    {c.feeOverride !== undefined && (
                      <span>💵 ${c.feeOverride} consultation</span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                    {c.acceptOnlinePayment && (
                      <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5">
                        Pay online
                      </span>
                    )}
                    {c.acceptClinicPayment && (
                      <span className="rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5">
                        Pay at clinic
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/doctors/${doctor.id}/book-clinic/${c.id}`}
                  className="shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
                >
                  Book this clinic →
                </Link>
              </div>

              {/* Compact weekly hours */}
              <details className="mt-3 text-xs text-gray-500 dark:text-slate-500">
                <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-slate-300">
                  Weekly hours
                </summary>
                <ul className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4">
                  {c.hours.map((h) => (
                    <li key={h.day}>
                      <span className="font-medium">{DAYS[h.day]}:</span>{" "}
                      {h.closed ? "Closed" : `${h.open}–${h.close}`}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
