// GET /api/clinics/by-doctor/:doctorId
//   Public — returns the active clinics registered by this doctor.
//   Used on the patient-facing doctor profile to render clinic cards
//   with a "Book here" CTA.

import { NextResponse } from "next/server";
import { listActiveClinicsByDoctor, reloadClinics } from "@/lib/clinics-store";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { doctorId: string } }) {
  // Cross-Lambda freshness — the doctor's clinic may have been
  // registered on a different Lambda than the one serving this read.
  await reloadClinics();
  const clinics = listActiveClinicsByDoctor(params.doctorId);
  return NextResponse.json({ clinics });
}
