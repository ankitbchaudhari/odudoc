// Public slot availability endpoint.
// GET /api/doctors/[id]/slots?date=YYYY-MM-DD
//
// Returns the 15-minute appointment slots a patient can still book with
// this doctor on the given date. Already-booked and too-close-to-now
// slots are filtered out per lib/slot-utils.ts.
//
// Used by the consult-book flow to drive the slot grid, and by the
// patient-side reschedule UI. Public (no auth) because the booking page
// is visited by anonymous users picking a doctor before sign-up.

import { NextRequest, NextResponse } from "next/server";
import { getDoctorById } from "@/lib/doctors-store";
import { listConsultations } from "@/lib/consultations-store";
import {
  availableSlots,
  SLOT_INTERVAL_MIN,
  BOOKING_LEAD_MIN,
} from "@/lib/slot-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Basic YYYY-MM-DD shape check so callers can't pass junk that would
// then false-match "today".
function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  return !isNaN(d.getTime());
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const date = req.nextUrl.searchParams.get("date") || "";
  if (!isValidDate(date)) {
    return NextResponse.json({ error: "Invalid ?date" }, { status: 400 });
  }

  const doctor = getDoctorById(params.id);
  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  // Pull every consultation pinned to this doctor (any status) and let
  // the slot helper filter by blocking statuses. Cheap enough — a doctor
  // has O(100) consults/day.
  const consultations = listConsultations({ doctorId: doctor.id });

  const slots = availableSlots({ dateStr: date, consultations });

  return NextResponse.json({
    date,
    doctorId: doctor.id,
    doctorName: doctor.name,
    slots,
    meta: {
      intervalMinutes: SLOT_INTERVAL_MIN,
      leadMinutes: BOOKING_LEAD_MIN,
    },
  });
}
