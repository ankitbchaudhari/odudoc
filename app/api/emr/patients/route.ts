// EMR patients API — list + create. Clinic-scoped (resolved via
// resolveClinic so staff members read/write under the owner doctor's
// clinic). POST is gated by the 50/month free quota.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await reloadPatients();
  const query = req.nextUrl.searchParams.get("query") || undefined;
  const includeArchived = req.nextUrl.searchParams.get("archived") === "1";

  const patients = await listPatients({
    ownerEmail: clinic.role === "admin" ? undefined : clinic.ownerEmail,
    query,
    includeArchived,
  });
  return NextResponse.json({ patients });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!canWrite(clinic.role, "patients")) {
    return NextResponse.json(
      { error: "Your role can't add patients. Ask the clinic owner." },
      { status: 403 }
    );
  }

  // Quota gate. Admin bypasses entirely (cross-clinic — not a single
  // clinic's quota). Owner + staff are checked against the owner's
  // monthly bucket.
  if (clinic.role !== "admin") {
    const quota = await getQuotaState(clinic.ownerEmail);
    if (quota.blocked) {
      return NextResponse.json(
        {
          error: "Monthly patient quota reached",
          quota,
          // 402 = Payment Required — the canonical signal for client
          // code to open the unlock paywall.
        },
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
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const firstName = (body.firstName || "").trim();
  const lastName = (body.lastName || "").trim();
  const phone = (body.phone || "").trim();
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "firstName and lastName are required" }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "phone is required" }, { status: 400 });
  }

  const ownerEmail =
    clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
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
      phone: patient.phone,
    },
  });

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("emr.patients.persist_failed", err, {
      ownerEmail,
      patientId: patient.id,
    });
    return NextResponse.json(
      { error: "EMR service is temporarily unavailable. Please retry — your patient was not saved." },
      { status: 503 }
    );
  }

  return NextResponse.json({ patient }, { status: 201 });
}
