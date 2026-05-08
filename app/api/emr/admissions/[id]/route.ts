// PATCH a single admission — drives check-in / check-out / triage /
// location updates from the reception + nurse panels.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveClinic } from "@/lib/emr-store";
import {
  getAdmissionById,
  updateAdmission,
  type AdmissionStatus,
  type Triage,
} from "@/lib/admissions-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID_STATUS: AdmissionStatus[] = [
  "scheduled", "checked_in", "in_consult", "completed",
  "admitted", "in_or", "post_op", "discharged",
  "transferred", "cancelled", "no_show",
];
const VALID_TRIAGE: Triage[] = ["red", "yellow", "green", "black", ""];

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const existing = await getAdmissionById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.doctorEmail !== ownerEmail.toLowerCase() && clinic.role !== "admin") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: {
    status?: AdmissionStatus;
    location?: string;
    triage?: Triage;
    notes?: string;
    consultingDoctorEmail?: string;
    department?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.status && !VALID_STATUS.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  if (body.triage && !VALID_TRIAGE.includes(body.triage)) {
    return NextResponse.json({ error: "invalid triage" }, { status: 400 });
  }

  const updated = await updateAdmission(id, {
    status: body.status,
    location: body.location,
    triage: body.triage,
    notes: body.notes,
    consultingDoctorEmail: body.consultingDoctorEmail,
    department: body.department,
    actorEmail: clinic.userEmail,
  });

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("emr.admissions.update_persist_failed", err);
    return NextResponse.json(
      { error: "Saved temporarily but failed to persist. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ admission: updated });
}
