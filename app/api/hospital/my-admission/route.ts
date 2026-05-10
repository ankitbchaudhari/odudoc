// "Am I currently admitted anywhere?" — patient-facing read.
//
// Returns the active admission for the signed-in patient if one
// exists, with ward + bed identifiers and the assigned-doctor list.
// Used by the patient dashboard to show "you're in ward G-4 bed 3
// at Apollo, your team is Dr X + Dr Y" without granting access to
// other patients on the same admission.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findActiveAdmissionForPatient } from "@/lib/hospital/admissions-store";
import { getOrganizationById } from "@/lib/organizations-store";
import { getBranding } from "@/lib/org-branding/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const adm = findActiveAdmissionForPatient(userId);
  if (!adm) return NextResponse.json({ admission: null });
  const org = getOrganizationById(adm.organizationId);
  const branding = getBranding(adm.organizationId);
  return NextResponse.json({
    admission: {
      id: adm.id,
      hospitalName: branding?.displayName || org?.name || "Hospital",
      hospitalLogo: branding?.logoLight,
      admittedAt: adm.admittedAt,
      admittedAtLocation: adm.admittedAtLocation,
      currentWardId: adm.currentWardId,
      currentBedId: adm.currentBedId,
      admittingDoctor: adm.admittingDoctor,
      assignedDoctorEmails: adm.assignedDoctorEmails || [],
      chiefComplaint: adm.chiefComplaint,
      provisionalDiagnosis: adm.provisionalDiagnosis,
    },
  });
}
