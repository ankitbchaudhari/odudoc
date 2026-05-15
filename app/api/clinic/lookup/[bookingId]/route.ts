// GET /api/clinic/lookup/:bookingId
//   Reception lookup — returns the booking + linked EMR (if any) for the
//   clinic's reception view. Requires a valid clinic-session cookie AND
//   the booking's clinicId must match the staff's clinic.
//
// POST /api/clinic/lookup/:bookingId/arrive   — handled by ?action=arrive
//   Same auth; marks the booking arrived (idempotent).

import { NextRequest, NextResponse } from "next/server";
import { getClinicSession } from "@/lib/clinic-session";
import { getBookingById, markBookingArrived } from "@/lib/bookings-store";
import { getEmrByBookingId } from "@/lib/clinic-emr-store";
import { getClinicById } from "@/lib/clinics-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { bookingId: string } }) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const booking = getBookingById(params.bookingId);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.clinicId && booking.clinicId !== session.clinicId) {
    return NextResponse.json({ error: "This booking is for a different clinic." }, { status: 403 });
  }
  // Defensive: if booking has no clinicId at all (legacy / telemed), still
  // allow lookup so the doctor's clinic staff can see a video-consult
  // patient who may have walked in.
  const clinic = getClinicById(session.clinicId);
  const emr = getEmrByBookingId(params.bookingId) || null;
  return NextResponse.json({ booking, clinic, emr });
}

export async function POST(req: NextRequest, { params }: { params: { bookingId: string } }) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const booking = getBookingById(params.bookingId);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.clinicId && booking.clinicId !== session.clinicId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const updated = markBookingArrived(params.bookingId);
  return NextResponse.json({ booking: updated });
}
