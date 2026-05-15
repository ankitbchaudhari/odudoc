// GET  /api/doctor/clinics/:id/staff           — list clinic staff (doctor only)
// POST /api/doctor/clinics/:id/staff           — add a staff member

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { findDoctorByEmail } from "@/lib/doctors-store";
import { getClinicById, reloadClinics } from "@/lib/clinics-store";
import {
  createClinicStaff,
  listStaffByClinic,
  reloadStaff,
} from "@/lib/clinic-staff-store";
import { parseJson } from "@/lib/api-validate";

export const runtime = "nodejs";

const AddStaffSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(32).optional(),
  role: z.enum(["receptionist", "assistant", "manager"]).default("receptionist"),
  password: z.string().min(8).max(128),
});

async function authorize(clinicId: string) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; role?: string } | undefined) || {};
  if (!user.email || user.role !== "doctor") return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const doctor = findDoctorByEmail(user.email);
  if (!doctor) return { error: NextResponse.json({ error: "Doctor not found" }, { status: 404 }) };
  await reloadClinics();
  const clinic = getClinicById(clinicId);
  if (!clinic || clinic.doctorId !== doctor.id) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { clinic };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const r = await authorize(params.id);
  if ("error" in r) return r.error;
  await reloadStaff();
  // Strip password hashes before returning.
  const staff = listStaffByClinic(params.id).map(({ passwordHash: _ph, ...rest }) => rest);
  return NextResponse.json({ staff });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await authorize(params.id);
  if ("error" in r) return r.error;
  const parsed = await parseJson(req, AddStaffSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const staff = await createClinicStaff({
      clinicId: params.id,
      ...parsed.data,
    });
    const { passwordHash: _ph, ...safe } = staff;
    return NextResponse.json({ staff: safe }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create staff";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
