// EMR medical certificates — list (by patient or owner) + create.
//
// Only roles with canWrite("certificates") can issue: clinic owner,
// staff doctors, and admin. Nurses / front desk cannot — certificates
// carry the issuing doctor's medical-council registration number and
// can't be delegated.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listCertificatesForPatient,
  createCertificate,
  reloadCertificates,
  resolveClinic,
  canWrite,
  writeAudit,
  type CertificateType,
} from "@/lib/emr-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const VALID_TYPES: CertificateType[] = [
  "sick-leave",
  "fitness-to-work",
  "fitness-to-travel",
  "fitness-for-activity",
  "vaccination",
  "general",
];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await reloadCertificates();
  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) {
    return NextResponse.json({ error: "patientId required" }, { status: 400 });
  }
  const scope = clinic.role === "admin" ? undefined : clinic.ownerEmail;
  const certificates = await listCertificatesForPatient(patientId, scope);
  return NextResponse.json({ certificates });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; name?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!canWrite(clinic.role, "certificates")) {
    return NextResponse.json(
      { error: "Only doctors can issue medical certificates." },
      { status: 403 }
    );
  }

  let body: {
    patientId?: string;
    type?: CertificateType;
    issueDate?: string;
    fromDate?: string;
    toDate?: string;
    diagnosis?: string;
    findings?: string;
    restrictions?: string;
    recommendations?: string;
    doctorName?: string;
    doctorQualification?: string;
    doctorRegistration?: string;
    clinicName?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patientId = (body.patientId || "").trim();
  const type = body.type;
  const diagnosis = (body.diagnosis || "").trim();
  const doctorName = (body.doctorName || user?.name || "").trim();
  if (!patientId) {
    return NextResponse.json({ error: "patientId required" }, { status: 400 });
  }
  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `type must be one of ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  if (!diagnosis) {
    return NextResponse.json({ error: "diagnosis required" }, { status: 400 });
  }
  if (!doctorName) {
    return NextResponse.json(
      { error: "doctorName required (snapshot of issuing doctor)" },
      { status: 400 }
    );
  }
  // Sick-leave / fitness-to-travel / fitness-for-activity certificates
  // are useless without a date range — surface that early instead of
  // silently issuing an unverifiable certificate.
  if (
    (type === "sick-leave" ||
      type === "fitness-to-travel" ||
      type === "fitness-for-activity") &&
    (!body.fromDate || !body.toDate)
  ) {
    return NextResponse.json(
      { error: "fromDate and toDate are required for this certificate type" },
      { status: 400 }
    );
  }

  const ownerEmail =
    clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const cert = await createCertificate({
    ownerEmail,
    authoredBy: clinic.userEmail,
    patientId,
    type,
    issueDate: body.issueDate,
    fromDate: body.fromDate,
    toDate: body.toDate,
    diagnosis,
    findings: body.findings,
    restrictions: body.restrictions,
    recommendations: body.recommendations,
    doctorName,
    doctorQualification: body.doctorQualification,
    doctorRegistration: body.doctorRegistration,
    clinicName: body.clinicName,
    notes: body.notes,
  });

  await writeAudit({
    ownerEmail,
    actorEmail: clinic.userEmail,
    action: "certificate.create",
    resource: "certificate",
    resourceId: cert.id,
    meta: {
      patientId,
      type: cert.type,
      number: cert.number,
      fromDate: cert.fromDate,
      toDate: cert.toDate,
      diagnosis: cert.diagnosis.slice(0, 80),
    },
  });

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("emr.certificate.persist_failed", err, { ownerEmail, patientId });
    return NextResponse.json(
      { error: "EMR service temporarily unavailable — certificate not saved." },
      { status: 503 }
    );
  }
  return NextResponse.json({ certificate: cert }, { status: 201 });
}
