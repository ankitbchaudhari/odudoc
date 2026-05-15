// GET /api/doctor-earnings/mobile/me
//
// Earnings dashboard for the authenticated doctor — what the mobile
// "Earnings" tab renders.
//
// Response:
//   {
//     doctor: { id, name, email },
//     totals: { today, week, month },
//     pendingBalance,
//     recent: DoctorEarning[]    // most recent 20 entries
//   }

import { NextRequest, NextResponse } from "next/server";
import {
  listEarnings,
  getPendingBalance,
  getPeriodTotals,
  reloadDoctorEarnings,
} from "@/lib/doctor-earnings-store";
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
        { error: "doctor_record_missing" },
        { status: 404 }
      );
    }
    await reloadDoctorEarnings();
    const totals = getPeriodTotals(doctor.email);
    const pendingBalance = getPendingBalance(doctor.email);
    const recent = listEarnings({ doctorEmail: doctor.email }).slice(0, 20);

    return NextResponse.json({
      doctor: { id: doctor.id, name: doctor.name, email: doctor.email },
      totals,
      pendingBalance,
      recent,
    });
  } catch (err) {
    log.error("mobile-doctor-earnings error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
