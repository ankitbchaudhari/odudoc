// GET /api/patient/clinic-visits
//
// Returns every clinic EMR entry that's been claimed by the signed-in
// patient — populated by the claim hook in auth/verify + mobile-verify
// when their phone number on a pre-account clinic visit matches the
// new user's phone.
//
// Also returns the bookings list so the page can show a unified
// "Past visits" feed combining QR-booked clinic visits with EMR notes.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listEmrByPatientUserId, reloadEmr } from "@/lib/clinic-emr-store";
import { getBookings, reloadBookings } from "@/lib/bookings-store";
import { getClinicById, reloadClinics } from "@/lib/clinics-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const userId = user.id;

  // Pull fresh state from Postgres before listing — the patient's
  // visit may have been written by a reception Lambda whose in-
  // memory data hasn't propagated to the read Lambda yet.
  await Promise.all([reloadBookings(), reloadEmr(), reloadClinics()]);

  // EMR entries (full visit notes from reception)
  const emr = listEmrByPatientUserId(userId).map((e) => {
    const clinic = e.clinicId ? getClinicById(e.clinicId) : undefined;
    return {
      ...e,
      clinicName: clinic?.name,
      clinicCity: clinic?.city,
      clinicCountry: clinic?.country,
    };
  });

  // Bookings claimed by this user. We only surface in-person /
  // clinic-tagged bookings here — telemed bookings live under
  // /dashboard/consultations already.
  const bookings = getBookings()
    .filter((b) => b.patientUserId === userId && b.clinicId)
    .map((b) => {
      const clinic = b.clinicId ? getClinicById(b.clinicId) : undefined;
      return {
        ...b,
        clinicCity: clinic?.city,
        clinicCountry: clinic?.country,
      };
    });

  return NextResponse.json({ emr, bookings });
}
