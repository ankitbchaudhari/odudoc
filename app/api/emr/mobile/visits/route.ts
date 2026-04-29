// Mobile EMR visits — list by patient or recent, plus SOAP create.

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import {
  listVisitsForPatient,
  listRecentVisits,
  createVisit,
  reloadVisits,
  resolveClinic,
  canWrite,
  writeAudit,
} from "@/lib/emr-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;
  const clinic = await resolveClinic(auth.email, auth.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await reloadVisits();
  const patientId = request.nextUrl.searchParams.get("patientId");
  const recent = request.nextUrl.searchParams.get("recent") === "1";
  const scope = clinic.role === "admin" ? undefined : clinic.ownerEmail;

  if (recent) {
    const visits = await listRecentVisits(
      clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail,
      15
    );
    return NextResponse.json({ visits });
  }
  if (!patientId) {
    return NextResponse.json(
      { error: "patientId or recent=1 required" },
      { status: 400 }
    );
  }
  const visits = await listVisitsForPatient(patientId, scope);
  return NextResponse.json({ visits });
}

export async function POST(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;
  const clinic = await resolveClinic(auth.email, auth.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!canWrite(clinic.role, "visits")) {
    return NextResponse.json(
      { error: "Your role can't write SOAP notes." },
      { status: 403 }
    );
  }

  let body: {
    patientId?: string;
    visitDate?: string;
    chiefComplaint?: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    vitals?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const patientId = (body.patientId || "").trim();
  const chiefComplaint = (body.chiefComplaint || "").trim();
  const assessment = (body.assessment || "").trim();
  const plan = (body.plan || "").trim();
  if (!patientId || !chiefComplaint || !assessment || !plan) {
    return NextResponse.json(
      { error: "patientId, chiefComplaint, assessment and plan required" },
      { status: 400 }
    );
  }

  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const visit = await createVisit({
    patientId,
    ownerEmail,
    authoredBy: clinic.userEmail,
    visitDate: body.visitDate,
    chiefComplaint,
    subjective: body.subjective,
    objective: body.objective,
    assessment,
    plan,
    vitals: body.vitals,
  });
  await writeAudit({
    ownerEmail,
    actorEmail: clinic.userEmail,
    action: "visit.create",
    resource: "visit",
    resourceId: visit.id,
    meta: {
      patientId,
      visitDate: visit.visitDate,
      chiefComplaint: visit.chiefComplaint.slice(0, 80),
      via: "mobile",
    },
  });
  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("emr.mobile.visit.persist_failed", err, { ownerEmail, patientId });
    return NextResponse.json(
      { error: "EMR service temporarily unavailable. Please retry." },
      { status: 503 }
    );
  }
  return NextResponse.json({ visit }, { status: 201 });
}
