// GET  /api/clinic/referrals?box=inbound|outbound
//   List referrals visible to the calling clinic. Default: both,
//   tagged with a direction field so the UI can render two tabs.
//
// POST /api/clinic/referrals
//   Create a new referral. Receptionist + above can send referrals
//   (it's a coordination task, not a clinical one). Receiving clinic
//   acts on it via PATCH on /api/clinic/referrals/[id].

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClinicSession } from "@/lib/clinic-session";
import { getClinicById, reloadClinics } from "@/lib/clinics-store";
import {
  createClinicReferral,
  listInboundReferrals,
  listOutboundReferrals,
  reloadClinicReferrals,
} from "@/lib/clinic-referrals-store";
import { parseJson } from "@/lib/api-validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  toClinicId: z.string().regex(/^CL-\d+$/),
  patientName: z.string().trim().min(1).max(120),
  patientPhone: z.string().trim().min(3).max(32),
  patientEmail: z.string().trim().email().max(200).optional(),
  patientAgeYears: z.number().int().min(0).max(130).optional(),
  patientSex: z.enum(["male", "female", "other"]).optional(),
  sourceBookingId: z.string().regex(/^BK-\d+$/).optional(),
  reason: z.string().trim().min(3).max(500),
  specialty: z.string().trim().max(80).optional(),
  urgency: z.enum(["routine", "urgent", "emergency"]).optional(),
  note: z.string().trim().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  await reloadClinicReferrals();
  const url = new URL(req.url);
  const box = url.searchParams.get("box");
  const inbound = box === "outbound" ? [] : listInboundReferrals(session.clinicId);
  const outbound = box === "inbound" ? [] : listOutboundReferrals(session.clinicId);
  return NextResponse.json({ inbound, outbound });
}

export async function POST(req: NextRequest) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  const parsed = await parseJson(req, CreateSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  if (body.toClinicId === session.clinicId) {
    return NextResponse.json(
      { error: "Can't refer a patient to your own clinic." },
      { status: 400 },
    );
  }

  await reloadClinics();
  const fromClinic = getClinicById(session.clinicId);
  const toClinic = getClinicById(body.toClinicId);
  if (!fromClinic) return NextResponse.json({ error: "Your clinic record is missing." }, { status: 404 });
  if (!toClinic || !toClinic.active) {
    return NextResponse.json({ error: "Destination clinic not found or inactive." }, { status: 404 });
  }

  const referral = createClinicReferral({
    fromClinicId: fromClinic.id,
    fromClinicName: fromClinic.name,
    toClinicId: toClinic.id,
    toClinicName: toClinic.name,
    patientName: body.patientName,
    patientPhone: body.patientPhone,
    patientEmail: body.patientEmail,
    patientAgeYears: body.patientAgeYears,
    patientSex: body.patientSex,
    sourceBookingId: body.sourceBookingId,
    reason: body.reason,
    specialty: body.specialty,
    urgency: body.urgency || "routine",
    note: body.note,
    createdByStaffId: session.staffId,
  });

  return NextResponse.json({ referral }, { status: 201 });
}
