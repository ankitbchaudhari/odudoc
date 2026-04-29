// HL7 v2.5.1 export — sibling to the FHIR endpoint. Returns a
// pipe-delimited ADT^A08 message with PID + AL1 + DG1 + PV1 + OBX
// segments derived from the patient + their visits. Plain text
// download. Not certified — meant for migration into another EMR
// that already speaks HL7.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getPatientById,
  listVisitsForPatient,
  buildHl7v2,
  reloadPatients,
  reloadVisits,
  resolveClinic,
} from "@/lib/emr-store";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  await reloadPatients();
  await reloadVisits();
  const scope = clinic.role === "admin" ? undefined : clinic.ownerEmail;
  const patient = await getPatientById(id, scope);
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const visits = await listVisitsForPatient(id, scope);
  const message = buildHl7v2(patient, visits);

  return new NextResponse(message, {
    status: 200,
    headers: {
      // application/hl7-v2 is the registered media type; browsers fall
      // back to text/plain rendering for it. We send the canonical
      // mime so HL7 importers recognise it.
      "Content-Type": "application/hl7-v2; charset=utf-8",
      "Content-Disposition": `attachment; filename="patient-${id}.hl7"`,
    },
  });
}
