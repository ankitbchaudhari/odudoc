// POST /api/bookings/mobile/{id}/cancel
//
// Patient-initiated booking cancellation from the Android app. Refuses if:
//   - caller doesn't own the booking
//   - already cancelled
//   - less than 30 minutes until the slot starts (matches slot-utils lead)

import { NextRequest, NextResponse } from "next/server";
import { cancelBookingByUser } from "@/lib/bookings-store";
import { requireMobileUser } from "@/lib/mobile-auth";
import { BOOKING_LEAD_MIN } from "@/lib/slot-utils";
import { sendToEmail } from "@/lib/fcm";
import { findDoctorByEmail } from "@/lib/doctors-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "patient") {
    return NextResponse.json(
      { error: "wrong_role", message: "This endpoint is for patients." },
      { status: 403 }
    );
  }

  try {
    const result = cancelBookingByUser(params.id, auth.userId, {
      leadMinutes: BOOKING_LEAD_MIN,
    });
    if (!result.ok) {
      const statusMap: Record<typeof result.reason, { status: number; message: string }> = {
        not_found: { status: 404, message: "Booking not found." },
        not_owner: { status: 403, message: "This booking belongs to another user." },
        already_cancelled: { status: 409, message: "This booking is already cancelled." },
        too_late: { status: 400, message: "This booking is too close to the slot to cancel." },
      };
      const { status, message } = statusMap[result.reason];
      return NextResponse.json({ error: result.reason, message }, { status });
    }
    // Push the doctor so they see the cancel without polling. We don't
    // push the patient — they tapped the cancel button themselves.
    const b = result.booking;
    const doctor = b.doctorId ? findDoctorByEmail(`${b.doctorName.toLowerCase().replace(/\s+/g, ".")}@odudoc.com`) : null;
    if (doctor?.email) {
      void sendToEmail(doctor.email, {
        title: "Appointment cancelled",
        body: `${b.patientName} cancelled the ${b.date ?? ""} ${b.timeSlot} slot`,
        deepLink: `consult/${b.id}`,
        channel: "appointments",
      });
    }

    return NextResponse.json({ booking: result.booking });
  } catch (err) {
    log.error("mobile-booking cancel error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
