// EMR admission queue — list + create.
// GET  /api/emr/admissions?today=1&status=...
// POST /api/emr/admissions  → schedules a new admission row

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveClinic, writeAudit } from "@/lib/emr-store";
import {
  createAdmission,
  listAdmissions,
  countByStatusToday,
  type AdmissionStatus,
} from "@/lib/admissions-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const today = sp.get("today") === "1";
  const status = (sp.get("status") || undefined) as AdmissionStatus | "All" | undefined;
  const search = sp.get("search") || undefined;

  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const rows = await listAdmissions({ doctorEmail: ownerEmail, status, today, search });
  const counts = await countByStatusToday(ownerEmail);
  return NextResponse.json({ admissions: rows, counts });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Reception, owner, doctor, nurse can all schedule.
  if (clinic.role === "billing" || clinic.role === "lab_tech") {
    return NextResponse.json({ error: "Your role can't create admissions." }, { status: 403 });
  }

  let body: {
    patientId?: string;
    patientName?: string;
    consultingDoctorEmail?: string;
    department?: string;
    location?: string;
    reasonForVisit?: string;
    triage?: "red" | "yellow" | "green" | "black" | "";
    scheduledAt?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.patientId || !body.patientName) {
    return NextResponse.json(
      { error: "patientId and patientName are required" },
      { status: 400 },
    );
  }

  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const row = await createAdmission({
    doctorEmail: ownerEmail,
    patientId: body.patientId,
    patientName: body.patientName,
    consultingDoctorEmail: body.consultingDoctorEmail,
    department: body.department,
    location: body.location,
    reasonForVisit: body.reasonForVisit,
    triage: body.triage,
    scheduledAt: body.scheduledAt,
    notes: body.notes,
  });

  await writeAudit({
    ownerEmail,
    actorEmail: clinic.userEmail,
    action: "patient.update", // closest existing action; future: dedicated action types
    resource: "patient",
    resourceId: row.patientId,
    meta: { admission: row.id, scheduled: !!row.scheduledAt },
  }).catch(() => {});

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("emr.admissions.persist_failed", err);
    return NextResponse.json(
      { error: "Saved temporarily but failed to persist. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ admission: row }, { status: 201 });
}
