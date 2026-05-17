// In-person clinic appointment booking — server-rendered shell.
// URL: /doctors/:doctorId/book-clinic/:clinicId
//
// Was a "use client" page that fetched doctor + clinic on mount,
// showing a blank loading state for ~1–3s on cold Lambdas. Now the
// data is fetched server-side from the in-memory stores (no API
// round-trip) and handed to BookingForm as props, so the user sees
// the form on first paint.

import { notFound } from "next/navigation";
import Link from "next/link";
import { getDoctorById, reloadDoctors } from "@/lib/doctors-store";
import { getClinicById, reloadClinics } from "@/lib/clinics-store";
import BookingForm from "./BookingForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function BookClinicPage({
  params,
}: {
  params: { id: string; clinicId: string };
}) {
  // Cross-Lambda freshness — clinic registered on a sibling Lambda
  // must show up here on first load. reload() is internally cached
  // to 10s per Lambda so this isn't a per-request Postgres hit.
  await Promise.all([reloadDoctors(), reloadClinics()]);

  const doctor = getDoctorById(params.id);
  const clinic = getClinicById(params.clinicId);

  if (!doctor || !clinic || clinic.doctorId !== doctor.id || !clinic.active) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <p className="text-sm text-red-700">Clinic or doctor not found.</p>
        <Link href="/doctors" className="mt-3 inline-block text-sm text-primary-600 hover:underline">
          ← All doctors
        </Link>
      </main>
    );
  }

  return (
    <BookingForm
      doctor={{
        id: doctor.id,
        name: doctor.name,
        fee: doctor.fee ?? 0,
        timeSlots: doctor.timeSlots ?? [],
        email: doctor.email,
        phone: doctor.phone,
      }}
      clinic={{
        id: clinic.id,
        name: clinic.name,
        addressLine1: clinic.addressLine1,
        city: clinic.city,
        feeOverride: clinic.feeOverride,
        acceptOnlinePayment: clinic.acceptOnlinePayment,
        acceptClinicPayment: clinic.acceptClinicPayment,
      }}
    />
  );
}
