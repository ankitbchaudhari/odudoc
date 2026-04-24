// POST /api/consultations/[id]/claim
//
// Doctor claims an unclaimed (fan-out / specialty-pool) consultation.
// First doctor to call this wins — subsequent claims return 409 "taken".
// On a successful claim we flip the consultation to "approved" and email
// the patient a confirmation so they know which doctor is on the case.
//
// Why a dedicated endpoint: the existing /decision endpoint assumes the
// caller IS the assigned doctor. For a pool record nobody is assigned
// yet, so the ownership check + atomic write has to live here. Keeps
// the decision handler simple.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  claimConsultation,
  getConsultation,
} from "@/lib/consultations-store";
import { findDoctorByEmail } from "@/lib/doctors-store";
import { sendPatientApproved } from "@/lib/consultation-emails";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; name?: string; role?: string } | undefined) || {};
  if (!user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "doctor") {
    return NextResponse.json({ error: "Only doctors can claim" }, { status: 403 });
  }

  const { id } = await params;
  const existing = getConsultation(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Look up the doctor profile to get their id + canonical name. If the
  // doctor hasn't been added to the directory yet (edge case — a staff
  // member flipped their role to "doctor" but admin hasn't created a
  // profile), we still let them claim using the session info so the
  // workflow doesn't break.
  const doc = findDoctorByEmail(user.email);
  const doctor = doc
    ? { id: doc.id, name: doc.name, email: doc.email }
    : { id: `user-${user.email}`, name: user.name || user.email, email: user.email };

  // Belt-and-suspenders: make sure the doctor's specialty actually
  // matches, so a random doctor from another specialty can't poach
  // pool requests they shouldn't see in the first place.
  if (doc && doc.specialty.toLowerCase() !== existing.specialty.toLowerCase()) {
    return NextResponse.json(
      { error: "This consultation is outside your specialty." },
      { status: 403 },
    );
  }

  const result = claimConsultation(id, doctor);
  if (result === "not_found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (result === "taken") {
    return NextResponse.json(
      { error: "Another doctor already accepted this request." },
      { status: 409 },
    );
  }

  // Patient confirmation — reuse the approved template so patients see
  // the same "your consult is confirmed" mail flow they get from the
  // non-pool path. Errors don't fail the claim.
  sendPatientApproved(result).catch((err) => log.error("claim email failed", err));

  return NextResponse.json({ consultation: result });
}
