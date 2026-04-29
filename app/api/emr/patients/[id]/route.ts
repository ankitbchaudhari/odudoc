// EMR patient detail API — get / update / delete a single patient.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getPatientById,
  updatePatient,
  deletePatient,
  reloadPatients,
  resolveClinic,
  canWrite,
  type Sex,
} from "@/lib/emr-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function resolveOrForbid() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  return resolveClinic(user?.email, user?.role);
}

function ownerScope(clinic: { role: string; ownerEmail: string }): string | undefined {
  return clinic.role === "admin" ? undefined : clinic.ownerEmail;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const clinic = await resolveOrForbid();
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await reloadPatients();
  const patient = await getPatientById(id, ownerScope(clinic));
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ patient });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const clinic = await resolveOrForbid();
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!canWrite(clinic.role, "patients")) {
    return NextResponse.json({ error: "Your role can't edit patients." }, { status: 403 });
  }
  const { id } = await ctx.params;
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
    archive?: boolean;
    unarchive?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Parameters<typeof updatePatient>[1] = {};
  for (const key of [
    "firstName",
    "lastName",
    "age",
    "sex",
    "phone",
    "email",
    "address",
    "bloodGroup",
    "allergies",
    "chronicConditions",
    "notes",
  ] as const) {
    if (body[key] !== undefined) {
      // @ts-expect-error -- generic narrow
      patch[key] = body[key];
    }
  }
  if (body.archive) patch.archivedAt = new Date().toISOString();
  if (body.unarchive) patch.archivedAt = null;

  const patient = await updatePatient(id, patch, ownerScope(clinic));
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("emr.patient.update_persist_failed", err, { patientId: id });
    return NextResponse.json(
      { error: "EMR service is temporarily unavailable. Please retry." },
      { status: 503 }
    );
  }
  return NextResponse.json({ patient });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const clinic = await resolveOrForbid();
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // Only owners + admins can delete a patient (cascades visits/files/invoices).
  if (clinic.role !== "owner" && clinic.role !== "admin") {
    return NextResponse.json({ error: "Only the clinic owner can delete patients." }, { status: 403 });
  }
  const { id } = await ctx.params;
  await reloadPatients();
  const ok = await deletePatient(id, ownerScope(clinic));
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
