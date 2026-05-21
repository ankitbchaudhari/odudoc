// POST /api/opd/issue — reception issues an OPD token.
//
// Body: { qrToken, doctorId, doctorName, clinicId, clinicName?,
//         departmentId?, departmentName? }
//
// Server resolves the QR (must be kind=identity or kind=appointment),
// pulls the patient's identity + ABHA from the scoped payload, then
// creates an OPD token.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveQr } from "@/lib/qr-store";
import { issueOpdToken } from "@/lib/opd-token-store";
import { findUserById, findUserByEmail } from "@/lib/users-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({
  qrToken: z.string().min(4).max(64),
  doctorId: z.string().min(1).max(64),
  doctorName: z.string().min(1).max(120),
  clinicId: z.string().min(1).max(64),
  clinicName: z.string().max(200).optional(),
  departmentId: z.string().max(64).optional(),
  departmentName: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support", "staff"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  // Resolve the QR. Reception scans must be identity / appointment
  // kind — other kinds (consent / emergency / wristband) aren't for
  // OPD check-in.
  const resolved = await resolveQr(parsed.qrToken, {
    email: session.user.email,
    role: session.user.role || "staff",
  });
  if (!resolved.ok || !resolved.token) {
    return NextResponse.json({ error: resolved.error || "qr_unresolvable" }, { status: 410 });
  }
  if (resolved.token.kind !== "identity" && resolved.token.kind !== "appointment") {
    return NextResponse.json({ error: "wrong_qr_kind", got: resolved.token.kind }, { status: 400 });
  }

  // Pull patient identity from the user store.
  const patient = findUserById(resolved.token.patientId) || findUserByEmail(resolved.token.patientId);
  if (!patient) return NextResponse.json({ error: "patient_not_found" }, { status: 404 });

  const t = await issueOpdToken({
    patientId: patient.id,
    patientName: patient.name,
    patientPhone: patient.phone,
    patientAbhaId: (patient as { abhaId?: string }).abhaId,
    clinicId: parsed.clinicId,
    clinicName: parsed.clinicName,
    departmentId: parsed.departmentId,
    departmentName: parsed.departmentName,
    doctorId: parsed.doctorId,
    doctorName: parsed.doctorName,
    receptionEmail: session.user.email,
    linkedAppointmentId: resolved.token.kind === "appointment" ? resolved.token.contextId : undefined,
    scannedQrToken: resolved.token.token,
  });

  return NextResponse.json({ token: t }, { status: 201 });
}
