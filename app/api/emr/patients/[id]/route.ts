// EMR patient detail API — get / update / delete a single patient.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getPatientById,
  updatePatient,
  deletePatient,
  reloadPatients,
  type Sex,
} from "@/lib/emr-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

function isAllowedRole(role: string | undefined): boolean {
  return role === "doctor" || role === "admin";
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function resolveDoctorEmail(): Promise<{
  email?: string;
  role?: string;
} | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email || !isAllowedRole(user.role)) return null;
  return user;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const user = await resolveDoctorEmail();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await reloadPatients();
  const patient = await getPatientById(
    id,
    user.role === "admin" ? undefined : user.email
  );
  if (!patient) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ patient });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const user = await resolveDoctorEmail();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const patient = await updatePatient(
    id,
    patch,
    user.role === "admin" ? undefined : user.email
  );
  if (!patient) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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
  const user = await resolveDoctorEmail();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await reloadPatients();
  const ok = await deletePatient(
    id,
    user.role === "admin" ? undefined : user.email
  );
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
