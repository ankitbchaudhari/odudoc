// PATCH  /api/doctor/clinics/:id/staff/:staffId   — change role / suspend
// DELETE /api/doctor/clinics/:id/staff/:staffId   — remove a staff member

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { findDoctorByEmail } from "@/lib/doctors-store";
import { getClinicById, reloadClinics } from "@/lib/clinics-store";
import {
  deleteStaff,
  getStaffById,
  reloadStaff,
  setStaffActive,
  updateStaffRole,
} from "@/lib/clinic-staff-store";
import { parseJson } from "@/lib/api-validate";

export const runtime = "nodejs";

const PatchSchema = z.object({
  role: z.enum(["receptionist", "assistant", "manager"]).optional(),
  active: z.boolean().optional(),
});

async function authorize(clinicId: string, staffId: string) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; role?: string } | undefined) || {};
  if (!user.email || user.role !== "doctor") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const doctor = findDoctorByEmail(user.email);
  if (!doctor) return { error: NextResponse.json({ error: "Doctor not found" }, { status: 404 }) };
  await Promise.all([reloadClinics(), reloadStaff()]);
  const clinic = getClinicById(clinicId);
  if (!clinic || clinic.doctorId !== doctor.id) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const staff = getStaffById(staffId);
  if (!staff || staff.clinicId !== clinicId) {
    return { error: NextResponse.json({ error: "Staff not found at this clinic" }, { status: 404 }) };
  }
  return { staff };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; staffId: string } },
) {
  const auth = await authorize(params.id, params.staffId);
  if ("error" in auth) return auth.error;
  const parsed = await parseJson(req, PatchSchema);
  if (!parsed.ok) return parsed.response;
  const { role, active } = parsed.data;
  let staff = auth.staff;
  if (role !== undefined) {
    const updated = updateStaffRole(params.staffId, role);
    if (updated) staff = updated;
  }
  if (active !== undefined) {
    const updated = setStaffActive(params.staffId, active);
    if (updated) staff = updated;
  }
  // Drop password hash before returning to the client.
  const { passwordHash: _ph, ...safe } = staff;
  return NextResponse.json({ staff: safe });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; staffId: string } },
) {
  const auth = await authorize(params.id, params.staffId);
  if ("error" in auth) return auth.error;
  deleteStaff(params.staffId);
  return NextResponse.json({ ok: true });
}
