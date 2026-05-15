// GET /api/bookings/mobile/doctor
//
// Today + upcoming bookings for the authenticated doctor. The caller's
// JWT must be a doctor account, and we resolve the doctor record by
// email match against doctors-store. Refuses cleanly if the user is a
// patient (they should be hitting /api/bookings/mobile instead).

import { NextRequest, NextResponse } from "next/server";
import { getBookingsForDoctor, reloadBookings } from "@/lib/bookings-store";
import { findDoctorByEmail } from "@/lib/doctors-store";
import { requireMobileUser } from "@/lib/mobile-auth";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "doctor") {
    return NextResponse.json(
      { error: "wrong_role", message: "This endpoint is for doctors." },
      { status: 403 }
    );
  }

  try {
    const doctor = findDoctorByEmail(auth.email);
    if (!doctor) {
      return NextResponse.json(
        { error: "doctor_record_missing", message: "No doctor profile is linked to this account." },
        { status: 404 }
      );
    }
    await reloadBookings();
    const bookings = getBookingsForDoctor(doctor.id);
    return NextResponse.json({ bookings, doctorId: doctor.id, doctorName: doctor.name });
  } catch (err) {
    log.error("mobile-doctor-bookings error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
