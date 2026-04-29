// Public certificate verification — HR / employer / school enters
// the verification URL and gets back the certificate's authenticity
// status. Returns the doctor identity + diagnosis + dates so the
// verifier can match it to the printed certificate they're holding.
//
// This is a capability URL — no auth, no patient login. The token is
// printed on the certificate itself so only people the patient
// chooses to share with see it.

import { NextRequest, NextResponse } from "next/server";
import {
  getCertificateByPublicToken,
  getPatientById,
  reloadCertificates,
  reloadPatients,
  writeAudit,
} from "@/lib/emr-store";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params;
  if (!token || token.length < 12) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }
  await reloadCertificates();
  const cert = await getCertificateByPublicToken(token);
  if (!cert) {
    return NextResponse.json(
      {
        verified: false,
        reason: "not_found",
        message: "No certificate matches this verification code.",
      },
      { status: 404 }
    );
  }
  if (cert.status === "voided") {
    return NextResponse.json({
      verified: false,
      reason: "voided",
      message: "This certificate has been voided by the issuing doctor.",
      number: cert.number,
    });
  }

  await reloadPatients();
  const patient = await getPatientById(cert.patientId);

  // Audit the verification — useful for clinics who want to see
  // whether their certificates are being checked. Use a synthetic
  // actor identifier since the verifier is anonymous.
  await writeAudit({
    ownerEmail: cert.doctorEmail,
    actorEmail: `verifier:${token.slice(0, 12)}`,
    action: "certificate.verified",
    resource: "certificate",
    resourceId: cert.id,
    meta: { number: cert.number, type: cert.type },
  });

  // Return only the fields a verifier legitimately needs. We do NOT
  // return clinical findings or recommendations on the public surface —
  // those stay between doctor and patient.
  return NextResponse.json({
    verified: true,
    certificate: {
      number: cert.number,
      type: cert.type,
      issueDate: cert.issueDate,
      fromDate: cert.fromDate,
      toDate: cert.toDate,
      daysOfRest: cert.daysOfRest,
      diagnosis: cert.diagnosis,
      restrictions: cert.restrictions,
      doctorName: cert.doctorName,
      doctorQualification: cert.doctorQualification,
      doctorRegistration: cert.doctorRegistration,
      clinicName: cert.clinicName,
      status: cert.status,
    },
    patientName: patient ? `${patient.firstName} ${patient.lastName}`.trim() : null,
  });
}
