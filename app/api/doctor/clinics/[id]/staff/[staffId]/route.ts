// DELETE /api/doctor/clinics/:id/staff/:staffId   — remove a staff member

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findDoctorByEmail } from "@/lib/doctors-store";
import { getClinicById } from "@/lib/clinics-store";
import { deleteStaff, getStaffById } from "@/lib/clinic-staff-store";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; staffId: string } },
) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; role?: string } | undefined) || {};
  if (!user.email || user.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const doctor = findDoctorByEmail(user.email);
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  const clinic = getClinicById(params.id);
  if (!clinic || clinic.doctorId !== doctor.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const staff = getStaffById(params.staffId);
  if (!staff || staff.clinicId !== params.id) {
    return NextResponse.json({ error: "Staff not found at this clinic" }, { status: 404 });
  }
  deleteStaff(params.staffId);
  return NextResponse.json({ ok: true });
}
