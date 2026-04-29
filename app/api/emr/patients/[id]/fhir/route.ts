// FHIR R4 export — returns a Bundle containing the patient + their
// chronic conditions + their visit encounters. Plain JSON download
// suitable for migrating to another EMR. Not a certified mapping;
// for clean interoperability a clinic should pair this with a
// validation pass through HAPI FHIR or similar.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getPatientById,
  listVisitsForPatient,
  buildFhirBundle,
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
  const bundle = buildFhirBundle(patient, visits);

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/fhir+json; charset=utf-8",
      "Content-Disposition": `attachment; filename="patient-${id}-fhir.json"`,
    },
  });
}
