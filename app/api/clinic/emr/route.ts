// POST /api/clinic/emr   — create or update an EMR entry for a booking.
//
// Reception or assistant fills the form on /c/:clinicId/reception. The
// store is keyed by bookingId so re-submitting updates rather than
// duplicating. Auth: clinic-session cookie required; the booking's
// clinicId must match the staff's clinic.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClinicSession } from "@/lib/clinic-session";
import { getBookingById, reloadBookings } from "@/lib/bookings-store";
import { upsertEmrEntry } from "@/lib/clinic-emr-store";
import { getClinicById } from "@/lib/clinics-store";
import { parseJson } from "@/lib/api-validate";

export const runtime = "nodejs";

const EmrSchema = z.object({
  bookingId: z.string().regex(/^BK-\d+$/),
  chiefComplaint: z.string().trim().max(2000).optional(),
  vitals: z.object({
    bpSystolic: z.number().int().min(40).max(260).optional(),
    bpDiastolic: z.number().int().min(20).max(200).optional(),
    pulseBpm: z.number().int().min(20).max(260).optional(),
    temperatureC: z.number().min(25).max(45).optional(),
    respiratoryRate: z.number().int().min(4).max(60).optional(),
    spo2: z.number().int().min(40).max(100).optional(),
    weightKg: z.number().min(1).max(400).optional(),
    heightCm: z.number().min(20).max(260).optional(),
  }).optional(),
  diagnosis: z.string().trim().max(2000).optional(),
  prescriptionText: z.string().trim().max(8000).optional(),
  notes: z.string().trim().max(4000).optional(),
  attachments: z.array(z.object({
    url: z.string().url(),
    label: z.string().min(1).max(120),
    uploadedAt: z.string().optional(),
  })).max(20).optional(),
});

export async function POST(req: NextRequest) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseJson(req, EmrSchema);
  if (!parsed.ok) return parsed.response;
  const { bookingId, ...rest } = parsed.data;

  // Cross-Lambda freshness — booking row may live on a sibling Lambda's
  // memory; without reload we'd 404 here despite the row existing in PG.
  await reloadBookings();
  const booking = getBookingById(bookingId);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.clinicId && booking.clinicId !== session.clinicId) {
    return NextResponse.json({ error: "This booking belongs to a different clinic." }, { status: 403 });
  }

  const clinic = getClinicById(session.clinicId);
  if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });

  const entry = upsertEmrEntry({
    bookingId,
    clinicId: clinic.id,
    doctorId: booking.doctorId,
    patientName: booking.patientName,
    patientPhone: booking.patientPhone,
    patientEmail: booking.patientEmail,
    visitDate: booking.date || new Date().toISOString().slice(0, 10),
    arrivedAt: booking.arrivedAt,
    attachments: rest.attachments?.map((a) => ({ ...a, uploadedAt: a.uploadedAt || new Date().toISOString() })),
    chiefComplaint: rest.chiefComplaint,
    vitals: rest.vitals,
    diagnosis: rest.diagnosis,
    prescriptionText: rest.prescriptionText,
    notes: rest.notes,
    createdByStaffId: session.staffId,
  });

  return NextResponse.json({ entry });
}
