// EMR patients API — list + create. Doctor-scoped (doctors only see
// their own patients; admin sees all).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listPatients,
  createPatient,
  reloadPatients,
  type Sex,
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

  // Reload from DB so a sibling Lambda's CREATE/PATCH/DELETE is visible
  // even on a warm Lambda that has a stale in-memory copy.
  await reloadPatients();

  const query = req.nextUrl.searchParams.get("query") || undefined;
  const includeArchived =
    req.nextUrl.searchParams.get("archived") === "1";

  const patients = await listPatients({
    doctorEmail: user.role === "admin" ? undefined : user.email,
    query,
    includeArchived,
  });
  return NextResponse.json({ patients });
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
    return NextResponse.json(
      { error: "firstName and lastName are required" },
      { status: 400 }
    );
  }
  if (!phone) {
    return NextResponse.json(
      { error: "phone is required" },
      { status: 400 }
    );
  }

  const patient = await createPatient({
    doctorEmail: user.email,
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

  // Confirm Postgres took the write before responding — the
  // launch-checklist 503-on-silent-failure pattern.
  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("emr.patients.persist_failed", err, {
      doctorEmail: user.email,
      patientId: patient.id,
    });
    return NextResponse.json(
      {
        error:
          "EMR service is temporarily unavailable. Please try again — your patient was not saved.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ patient }, { status: 201 });
}
