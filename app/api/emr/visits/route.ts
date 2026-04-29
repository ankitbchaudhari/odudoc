// EMR visits API — list visits for a patient + create new SOAP visit.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listVisitsForPatient,
  listRecentVisits,
  createVisit,
  reloadVisits,
} from "@/lib/emr-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

function isAllowedRole(role: string | undefined): boolean {
  return role === "doctor" || role === "admin";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAllowedRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await reloadVisits();
  const patientId = req.nextUrl.searchParams.get("patientId");
  const recent = req.nextUrl.searchParams.get("recent") === "1";
  const scopeEmail = user.role === "admin" ? undefined : user.email;

  if (recent) {
    const visits = await listRecentVisits(user.email, 15);
    return NextResponse.json({ visits });
  }
  if (!patientId) {
    return NextResponse.json(
      { error: "patientId or recent=1 required" },
      { status: 400 }
    );
  }
  const visits = await listVisitsForPatient(patientId, scopeEmail);
  return NextResponse.json({ visits });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAllowedRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    prescriptionId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patientId = (body.patientId || "").trim();
  const chiefComplaint = (body.chiefComplaint || "").trim();
  const assessment = (body.assessment || "").trim();
  const plan = (body.plan || "").trim();
  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }
  if (!chiefComplaint || !assessment || !plan) {
    return NextResponse.json(
      { error: "chiefComplaint, assessment and plan are required" },
      { status: 400 }
    );
  }

  const visit = await createVisit({
    patientId,
    doctorEmail: user.email,
    visitDate: body.visitDate,
    chiefComplaint,
    subjective: body.subjective,
    objective: body.objective,
    assessment,
    plan,
    vitals: body.vitals,
    prescriptionId: body.prescriptionId,
  });

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("emr.visit.persist_failed", err, {
      doctorEmail: user.email,
      patientId,
    });
    return NextResponse.json(
      {
        error:
          "EMR service is temporarily unavailable. Please retry — your visit note was not saved.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ visit }, { status: 201 });
}
