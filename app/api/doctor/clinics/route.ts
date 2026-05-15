// GET  /api/doctor/clinics      — list the signed-in doctor's clinics
// POST /api/doctor/clinics      — register a new clinic
//
// Doctors only. Uses the session email to find their directory record;
// clinic.doctorId is set to the doctor's directory id so patient-facing
// lookups (listActiveClinicsByDoctor) can be done with the same id.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { findDoctorByEmail } from "@/lib/doctors-store";
import {
  createClinic,
  listClinicsByDoctor,
  type ClinicHours,
} from "@/lib/clinics-store";
import { parseJson } from "@/lib/api-validate";

export const runtime = "nodejs";

const HoursSchema = z.object({
  day: z.number().int().min(0).max(6),
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
  closed: z.boolean().optional(),
});

const CreateClinicSchema = z.object({
  name: z.string().trim().min(2).max(120),
  addressLine1: z.string().trim().min(3).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().max(80).optional(),
  country: z.string().trim().min(2).max(60),
  postalCode: z.string().trim().max(20).optional(),
  phone: z.string().trim().max(32).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  mapsUrl: z.string().url().max(500).optional(),
  hours: z.array(HoursSchema).max(7),
  acceptOnlinePayment: z.boolean().default(true),
  acceptClinicPayment: z.boolean().default(true),
  feeOverride: z.number().positive().max(100000).optional(),
  photoUrls: z.array(z.string().url()).max(10).optional(),
  // Tax fields — optional at registration time; doctor can also add
  // later via the edit endpoint before the first invoice is issued.
  legalBusinessName: z.string().trim().max(200).optional(),
  taxCountryCode: z.string().trim().length(2).optional(),
  taxIdType: z.enum(["GSTIN", "PAN", "VAT", "EIN", "TRN", "ABN", "OTHER"]).optional(),
  taxId: z.string().trim().max(40).optional(),
  taxRegistered: z.boolean().optional(),
  homeStateCode: z.string().trim().max(10).optional(),
});

function getDoctor(email: string) {
  return findDoctorByEmail(email);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; role?: string } | undefined) || {};
  if (!user.email || user.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const doctor = getDoctor(user.email);
  if (!doctor) return NextResponse.json({ clinics: [] });
  return NextResponse.json({ clinics: listClinicsByDoctor(doctor.id) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; role?: string } | undefined) || {};
  if (!user.email || user.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const doctor = getDoctor(user.email);
  if (!doctor) return NextResponse.json({ error: "Doctor profile not found" }, { status: 404 });

  const parsed = await parseJson(req, CreateClinicSchema);
  if (!parsed.ok) return parsed.response;

  // Patient-payment must be possible by *some* method — block both-off.
  if (!parsed.data.acceptOnlinePayment && !parsed.data.acceptClinicPayment) {
    return NextResponse.json(
      { error: "At least one payment method (online or at-clinic) must be enabled." },
      { status: 400 },
    );
  }

  const clinic = createClinic({
    ...parsed.data,
    doctorId: doctor.id,
    doctorEmail: user.email,
    hours: parsed.data.hours as ClinicHours[],
    active: true,
  });
  return NextResponse.json({ clinic }, { status: 201 });
}
