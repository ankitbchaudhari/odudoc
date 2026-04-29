// EMR certificate detail — GET, PATCH (void / unvoid / edit notes), DELETE.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getCertificateById,
  updateCertificate,
  deleteCertificate,
  reloadCertificates,
  resolveClinic,
  canWrite,
  writeAudit,
  type CertificateStatus,
} from "@/lib/emr-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

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
  await reloadCertificates();
  const scope = clinic.role === "admin" ? undefined : clinic.ownerEmail;
  const certificate = await getCertificateById(id, scope);
  if (!certificate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ certificate });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!canWrite(clinic.role, "certificates")) {
    return NextResponse.json(
      { error: "Only doctors can update medical certificates." },
      { status: 403 }
    );
  }

  const { id } = await ctx.params;
  let body: {
    status?: CertificateStatus;
    notes?: string;
    restrictions?: string;
    recommendations?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const scope = clinic.role === "admin" ? undefined : clinic.ownerEmail;
  const certificate = await updateCertificate(id, body, scope);
  if (!certificate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await writeAudit({
    ownerEmail: certificate.doctorEmail,
    actorEmail: clinic.userEmail,
    action: "certificate.update",
    resource: "certificate",
    resourceId: certificate.id,
    meta: {
      number: certificate.number,
      newStatus: body.status,
    },
  });

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("emr.certificate.update_persist_failed", err, { id });
    return NextResponse.json(
      { error: "EMR service temporarily unavailable. Please retry." },
      { status: 503 }
    );
  }
  return NextResponse.json({ certificate });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (clinic.role !== "owner" && clinic.role !== "admin") {
    return NextResponse.json(
      { error: "Only the clinic owner can delete certificates." },
      { status: 403 }
    );
  }
  const { id } = await ctx.params;
  await reloadCertificates();
  const scope = clinic.role === "admin" ? undefined : clinic.ownerEmail;
  const existing = await getCertificateById(id, scope);
  const ok = await deleteCertificate(id, scope);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing) {
    await writeAudit({
      ownerEmail: existing.doctorEmail,
      actorEmail: clinic.userEmail,
      action: "certificate.delete",
      resource: "certificate",
      resourceId: id,
      meta: { number: existing.number, type: existing.type },
    });
  }
  return NextResponse.json({ ok: true });
}
