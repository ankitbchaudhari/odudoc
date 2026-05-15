// POST   /api/clinic/auth      — staff login (sets cookie)
// DELETE /api/clinic/auth      — staff logout (clears cookie)
// GET    /api/clinic/auth      — current session (returns staff + clinic info)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyClinicStaffCredentials, getStaffById, reloadStaff } from "@/lib/clinic-staff-store";
import { getClinicById, reloadClinics } from "@/lib/clinics-store";
import {
  signClinicSession,
  getClinicSession,
  CLINIC_SESSION_COOKIE,
  CLINIC_SESSION_TTL,
} from "@/lib/clinic-session";
import { parseJson } from "@/lib/api-validate";

export const runtime = "nodejs";

const LoginSchema = z.object({
  clinicId: z.string().regex(/^CL-\d+$/),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, LoginSchema);
  if (!parsed.ok) return parsed.response;
  const { clinicId, email, password } = parsed.data;

  await reloadClinics();
  const clinic = getClinicById(clinicId);
  if (!clinic) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }
  // Force a re-pull of staff rows from Postgres before checking
  // credentials. Without this, a Lambda warmed up before the doctor
  // added the staff member won't see that record and login fails as
  // "Invalid email or password" even though the row exists in the DB.
  await reloadStaff();
  const staff = await verifyClinicStaffCredentials(clinicId, email, password);
  if (!staff) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = signClinicSession({
    staffId: staff.id,
    clinicId: staff.clinicId,
    role: staff.role,
  });

  const res = NextResponse.json({
    ok: true,
    staff: { id: staff.id, name: staff.name, email: staff.email, role: staff.role },
    clinic: { id: clinic.id, name: clinic.name },
  });
  res.cookies.set(CLINIC_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CLINIC_SESSION_TTL,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CLINIC_SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function GET(req: NextRequest) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ session: null }, { status: 200 });
  const staff = getStaffById(session.staffId);
  const clinic = getClinicById(session.clinicId);
  if (!staff || !clinic) return NextResponse.json({ session: null });
  return NextResponse.json({
    session: {
      staffId: staff.id,
      staffName: staff.name,
      role: staff.role,
      clinicId: clinic.id,
      clinicName: clinic.name,
      exp: session.exp,
    },
  });
}
