// GET /api/clinics/doctors-with-clinics
//
// Public — returns the set of doctor ids who have at least one active
// clinic registered. Used by /doctors listing so each row can show
// a "Visit clinic" CTA only when the doctor actually has a clinic
// to visit. Single round-trip avoids the N+1 problem of each
// DoctorListRow fetching its own clinic list.

import { NextResponse } from "next/server";
import { listClinicsByDoctor, reloadClinics } from "@/lib/clinics-store";
import { listDoctors } from "@/lib/doctors-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Cross-Lambda freshness — a doctor's newly-registered clinic
  // would otherwise stay invisible on /doctors for visitors served
  // by a different Lambda than the one that wrote the clinic row.
  await reloadClinics();
  const doctors = listDoctors({});
  const doctorIds: string[] = [];
  // singleClinic[doctorId] = clinicId when the doctor has EXACTLY
  // one active clinic. The DoctorListRow uses this to deep-link the
  // "🏥 Visit Clinic" CTA past the picker and straight to the
  // booking form, saving a full navigation hop.
  const singleClinic: Record<string, string> = {};
  for (const d of doctors) {
    const active = listClinicsByDoctor(d.id).filter((c) => c.active);
    if (active.length > 0) {
      doctorIds.push(d.id);
      if (active.length === 1) singleClinic[d.id] = active[0].id;
    }
  }
  return NextResponse.json({ doctorIds, singleClinic });
}
