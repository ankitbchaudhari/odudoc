// Mobile EMR — list + create patients (Bearer JWT auth, identical
// surface to the website /api/emr/patients but resolved off the
// mobile JWT instead of NextAuth web sessions). Same clinic-scoped
// permissions and 50/mo free quota apply.

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import {
  listPatients,
  createPatient,
  reloadPatients,
  resolveClinic,
  canWrite,
  getQuotaState,
  writeAudit,
  type Sex,
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

  await reloadPatients();
  const query = request.nextUrl.searchParams.get("query") || undefined;
  const patients = await listPatients({
    ownerEmail: clinic.role === "admin" ? undefined : clinic.ownerEmail,
    query,
  });
  return NextResponse.json({ patients });
}

export async function POST(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;
  const clinic = await resolveClinic(auth.email, auth.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!canWrite(clinic.role, "patients")) {
    return NextResponse.json(
      { error: "Your role can't add patients." },
      { status: 403 }
    );
  }
  if (clinic.role !== "admin") {
    const quota = await getQuotaState(clinic.ownerEmail);
    if (quota.blocked) {
      return NextResponse.json(
        { error: "Monthly patient quota reached", quota },
        { status: 402 }
      );
    }
  }

  let body: {
    firstName?: string;
    lastName?: string;
    age?: string;
    sex?: Sex;
    phone?: string;
    email?: string;
    address?: string;
    bloodGroup?: string;
    allergies?: string;
    chronicConditions?: string;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const firstName = (body.firstName || "").trim();
  const lastName = (body.lastName || "").trim();
  const phone = (body.phone || "").trim();
  if (!firstName || !lastName || !phone) {
    return NextResponse.json(
      { error: "firstName, lastName and phone required" },
      { status: 400 }
    );
  }

  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const patient = await createPatient({
    ownerEmail,
    firstName,
    lastName,
    age: (body.age || "").toString(),
    sex: (body.sex || "") as Sex,
    phone,
    email: body.email,
    address: body.address,
    bloodGroup: body.bloodGroup,
    allergies: body.allergies,
    chronicConditions: body.chronicConditions,
    notes: body.notes,
  });
  await writeAudit({
    ownerEmail,
    actorEmail: clinic.userEmail,
    action: "patient.create",
    resource: "patient",
    resourceId: patient.id,
    meta: {
      name: `${patient.firstName} ${patient.lastName}`.trim(),
      via: "mobile",
    },
  });
  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("emr.mobile.patient.persist_failed", err, { ownerEmail });
    return NextResponse.json(
      { error: "EMR service temporarily unavailable. Please retry." },
      { status: 503 }
    );
  }
  return NextResponse.json({ patient }, { status: 201 });
}
