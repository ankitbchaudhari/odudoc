// GDPR Article 20 / Article 15 — patient data portability + access.
//
// Returns the full patient record as JSON: demographics + every visit
// + file metadata (with download URLs) + invoices + a FHIR R4 bundle
// view for machine consumption.
//
// The doctor decides when to expose this. Typical flow: patient
// requests a copy, doctor verifies identity in person, doctor hits
// "Export full record" in the UI which downloads this JSON. Audited.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  reloadPatients,
  reloadVisits,
  reloadFiles,
  reloadInvoices,
  resolveClinic,
  writeAudit,
} from "@/lib/emr-store";
import { buildPatientDataExport } from "@/lib/emr-gdpr";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // Only the owner can issue a portability export — Article 15 is the
  // controller's obligation, and clinics in this product map 1:1 to
  // doctor accounts. Staff can produce the data through normal pages.
  if (clinic.role !== "owner" && clinic.role !== "admin") {
    return NextResponse.json(
      { error: "Only the clinic owner can issue a GDPR export." },
      { status: 403 }
    );
  }

  const { id } = await ctx.params;
  await reloadPatients();
  await reloadVisits();
  await reloadFiles();
  await reloadInvoices();
  const scope = clinic.role === "admin" ? undefined : clinic.ownerEmail;
  const bundle = await buildPatientDataExport(id, scope);
  if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await writeAudit({
    ownerEmail: bundle.patient.doctorEmail,
    actorEmail: clinic.userEmail,
    action: "patient.update",
    resource: "patient",
    resourceId: id,
    meta: {
      gdprExport: true,
      visitCount: bundle.visits.length,
      fileCount: bundle.files.length,
      invoiceCount: bundle.invoices.length,
    },
  });

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="patient-${id}-full-export.json"`,
    },
  });
}
