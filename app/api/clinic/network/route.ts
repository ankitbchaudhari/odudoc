// GET /api/clinic/network
//
// Directory of active clinics in the OduDoc network that the calling
// clinic can refer patients to. Returns clinics from every doctor on
// the platform (not just the calling clinic's own), so a GP at one
// clinic can refer a patient to a cardiology clinic run by a
// different doctor.
//
// Auth: clinic-session cookie required so external scrapers can't
// hit this. We don't return tax ids or contact emails — just the
// pieces a referrer needs to make an informed choice (name, city,
// specialty, doctor name).

import { NextRequest, NextResponse } from "next/server";
import { getClinicSession } from "@/lib/clinic-session";
import { listClinicsByDoctor, reloadClinics } from "@/lib/clinics-store";
import { listDoctors, reloadDoctors } from "@/lib/doctors-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  await Promise.all([reloadDoctors(), reloadClinics()]);

  const doctors = listDoctors({});
  const network: Array<{
    id: string;
    name: string;
    city: string;
    country: string;
    addressLine1: string;
    specialty?: string;
    doctorId: string;
    doctorName: string;
    self: boolean;
  }> = [];
  for (const d of doctors) {
    const clinics = listClinicsByDoctor(d.id).filter((c) => c.active);
    for (const c of clinics) {
      network.push({
        id: c.id,
        name: c.name,
        city: c.city,
        country: c.country,
        addressLine1: c.addressLine1,
        specialty: d.specialty,
        doctorId: d.id,
        doctorName: d.name,
        // The UI hides the calling clinic from the picker — a clinic
        // can't refer to itself.
        self: c.id === session.clinicId,
      });
    }
  }
  return NextResponse.json({ network });
}
