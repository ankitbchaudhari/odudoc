// POST /api/opd/[id]/start-consult
//
// Doctor scans the OPD token chit (or clicks "Start" in their
// dashboard). Flips status to in_consult AND returns a patient data
// envelope for the encounter form to auto-fill from. This closes the
// V17 §4 loop: reception → token → doctor → patient context appears
// in-cabin without re-typing.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { startConsult } from "@/lib/opd-token-store";
import { findUserById, findUserByEmail } from "@/lib/users-store";
import { listConsultations } from "@/lib/consultations-store";

export const runtime = "nodejs";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "doctor", "support", "staff"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const token = await startConsult(id, {
    email: session.user.email,
    role: session.user.role,
    doctorId: session.user.id,
  });
  if (!token) return NextResponse.json({ error: "not_found_or_wrong_doctor" }, { status: 404 });

  // Build the auto-fill envelope. Each section is a best-effort
  // lookup so a missing store doesn't 500 the doctor's screen.
  const patient = findUserById(token.patientId) || findUserByEmail(token.patientId);
  const recentConsults = listConsultations({ patientEmail: patient?.email || token.patientId })
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      doctorName: c.doctorName,
      specialty: c.specialty,
      dateLabel: c.dateLabel,
      status: c.status,
      diagnosis: c.medicalHistory?.chiefComplaint || undefined,
    }));

  return NextResponse.json({
    token,
    patient: patient ? {
      id: patient.id,
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      dob: (patient as { dob?: string }).dob,
      gender: (patient as { gender?: string }).gender,
      country: patient.country,
      abhaId: (patient as { abhaId?: string }).abhaId,
      photoUrl: (patient as { photoUrl?: string }).photoUrl,
      medicalId: (patient as { medicalId?: string }).medicalId,
    } : null,
    emergencyProfile: patient ? (patient as { emergencyProfile?: Record<string, unknown> }).emergencyProfile : null,
    recentConsults,
    // Linked appointment so the doctor sees "booked online" vs walk-in
    linkedAppointmentId: token.linkedAppointmentId,
  });
}
