// GET    /api/doctor/clinics/:id   — fetch one clinic owned by the doctor
// PUT    /api/doctor/clinics/:id   — update fields
// DELETE /api/doctor/clinics/:id   — soft-delete (active=false) or hard-delete

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { findDoctorByEmail } from "@/lib/doctors-store";
import {
  getClinicById,
  updateClinic,
  deleteClinic,
} from "@/lib/clinics-store";
import { parseJson } from "@/lib/api-validate";

export const runtime = "nodejs";

const UpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  addressLine1: z.string().trim().min(3).max(200).optional(),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(80).optional(),
  state: z.string().trim().max(80).optional(),
  country: z.string().trim().min(2).max(60).optional(),
  postalCode: z.string().trim().max(20).optional(),
  phone: z.string().trim().max(32).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  mapsUrl: z.string().url().max(500).optional(),
  hours: z.array(z.object({
    day: z.number().int().min(0).max(6),
    open: z.string().regex(/^\d{2}:\d{2}$/),
    close: z.string().regex(/^\d{2}:\d{2}$/),
    closed: z.boolean().optional(),
  })).max(7).optional(),
  acceptOnlinePayment: z.boolean().optional(),
  acceptClinicPayment: z.boolean().optional(),
  feeOverride: z.number().positive().max(100000).nullable().optional(),
  photoUrls: z.array(z.string().url()).max(10).optional(),
  active: z.boolean().optional(),
});

async function authorize(req: NextRequest, clinicId: string) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; role?: string } | undefined) || {};
  if (!user.email || user.role !== "doctor") return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const doctor = findDoctorByEmail(user.email);
  if (!doctor) return { error: NextResponse.json({ error: "Doctor not found" }, { status: 404 }) };
  const clinic = getClinicById(clinicId);
  if (!clinic) return { error: NextResponse.json({ error: "Clinic not found" }, { status: 404 }) };
  if (clinic.doctorId !== doctor.id) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { clinic, doctor };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const r = await authorize(_req, params.id);
  if ("error" in r) return r.error;
  return NextResponse.json({ clinic: r.clinic });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await authorize(req, params.id);
  if ("error" in r) return r.error;
  const parsed = await parseJson(req, UpdateSchema);
  if (!parsed.ok) return parsed.response;
  const updated = updateClinic(params.id, {
    ...parsed.data,
    feeOverride: parsed.data.feeOverride === null ? undefined : parsed.data.feeOverride,
  });
  return NextResponse.json({ clinic: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await authorize(req, params.id);
  if ("error" in r) return r.error;
  const url = new URL(req.url);
  const hard = url.searchParams.get("hard") === "1";
  if (hard) {
    deleteClinic(params.id);
    return NextResponse.json({ ok: true, deleted: true });
  }
  // Default: soft delete (deactivate) so booking history references remain.
  updateClinic(params.id, { active: false });
  return NextResponse.json({ ok: true, deactivated: true });
}
