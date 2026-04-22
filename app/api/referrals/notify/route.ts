import { NextResponse } from "next/server";
import {
  sendReferralToReceivingDoctor,
  sendReferralToPatient,
  type ReferralPayload,
} from "@/lib/referral-emails";
import { doctors } from "@/lib/data";

import { log } from "@/lib/log";
export async function POST(req: Request) {
  let body: Partial<ReferralPayload> & { toDoctorId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const required = [
    "patientEmail",
    "patientName",
    "fromDoctorName",
    "fromDoctorEmail",
    "fromSpecialty",
    "toDoctorName",
    "toSpecialty",
    "reason",
    "urgency",
  ] as const;

  for (const k of required) {
    if (!body[k]) {
      return NextResponse.json({ error: `Missing ${k}` }, { status: 400 });
    }
  }

  // Resolve receiving doctor email from the static doctor list if not provided
  let toDoctorEmail = body.toDoctorEmail;
  if (!toDoctorEmail && body.toDoctorId) {
    const match = doctors.find((d) => d.id === body.toDoctorId);
    // doctors in lib/data don't have email — fall back to a safe notifications mailbox
    toDoctorEmail = match ? `notifications@odudoc.com` : undefined;
  }

  const payload: ReferralPayload = {
    patientEmail: body.patientEmail!,
    patientName: body.patientName!,
    fromDoctorName: body.fromDoctorName!,
    fromDoctorEmail: body.fromDoctorEmail!,
    fromSpecialty: body.fromSpecialty!,
    toDoctorName: body.toDoctorName!,
    toDoctorEmail,
    toSpecialty: body.toSpecialty!,
    reason: body.reason!,
    clinicalNotes: body.clinicalNotes,
    urgency: body.urgency as ReferralPayload["urgency"],
  };

  // Fire both in parallel — don't block on email failures
  Promise.all([
    sendReferralToReceivingDoctor(payload),
    sendReferralToPatient(payload),
  ]).catch((err) => log.error("[referrals/notify]", err));

  return NextResponse.json({ ok: true });
}
