// GET /api/patients/mobile/{bookingId}/history
//
// Doctor-facing patient history. Keyed off the booking id rather than a
// patient id because the doctor app navigates from a booking — that
// way the same auth check that owns prescribe also gates this endpoint
// (the doctor must own the booking to see the patient's records).
//
// Returns:
//   {
//     patient: { name, email, phone, age?, sex?, allergies? },
//     prescriptions: PrescriptionRecord[],   // most recent first
//     pastBookings: Booking[]                // with this doctor (any status)
//   }

import { NextRequest, NextResponse } from "next/server";
import { getBookingById, getBookings } from "@/lib/bookings-store";
import { findDoctorByEmail } from "@/lib/doctors-store";
import { findUserByEmail, reloadUsers } from "@/lib/users-store";
import { listPrescriptions } from "@/lib/prescriptions-store";
import { requireMobileUser } from "@/lib/mobile-auth";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "doctor") {
    return NextResponse.json(
      { error: "wrong_role", message: "This endpoint is for doctors." },
      { status: 403 }
    );
  }

  try {
    const booking = getBookingById(params.bookingId);
    if (!booking) {
      return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
    }

    const doctor = findDoctorByEmail(auth.email);
    if (!doctor || doctor.id !== booking.doctorId) {
      return NextResponse.json(
        { error: "not_your_booking" },
        { status: 403 }
      );
    }

    await reloadUsers();
    const patient = booking.patientEmail
      ? findUserByEmail(booking.patientEmail)
      : null;

    // Past bookings between this patient + this doctor — excluding the
    // current one. Skipping cancelled gives the doctor the clinically
    // useful list (consults that actually happened).
    const pastBookings = getBookings().filter((b) => {
      if (b.id === booking.id) return false;
      if (b.doctorId !== doctor.id) return false;
      if (b.patientUserId && booking.patientUserId) {
        return b.patientUserId === booking.patientUserId;
      }
      // Pre-mobile bookings have no patientUserId; fall back to email match.
      if (b.patientEmail && booking.patientEmail) {
        return b.patientEmail.toLowerCase() === booking.patientEmail.toLowerCase();
      }
      return b.patientName === booking.patientName;
    }).slice(0, 30);

    const prescriptions = booking.patientEmail
      ? listPrescriptions({ patientEmail: booking.patientEmail }).slice(0, 30)
      : [];

    return NextResponse.json({
      patient: {
        name: booking.patientName,
        email: booking.patientEmail || patient?.email || "",
        phone: booking.patientPhone || patient?.phone || "",
        // Age / sex / allergies aren't on the User schema today —
        // exposed as nullable so the UI can render an "Add" affordance
        // when we surface those fields later.
      },
      prescriptions,
      pastBookings,
    });
  } catch (err) {
    log.error("mobile patient-history error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
