// Self-serve BAA / DPA re-acceptance for the signed-in doctor.
//
// GET — returns whether the doctor's most recent acceptance matches
//       the CURRENT_VERSIONS for their jurisdiction's framework, plus
//       the framework + current version + summary blurb the dashboard
//       prompt should display.
//
// POST { signature } — records a fresh acceptance against the current
//       version. The doctor's framework is derived from their license
//       country; signature is captured + persisted to the audit store.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findDoctorByEmail } from "@/lib/doctors-store";
import {
  CURRENT_VERSIONS,
  isCurrent,
  latestAcceptance,
  recordAcceptance,
  type ComplianceFramework,
} from "@/lib/doctor-baa-store";
import { licenseMetaFor } from "@/lib/medical-licenses";
import { clientIp } from "@/lib/rate-limit-helpers";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUMMARIES: Record<ComplianceFramework, { title: string; summary: string }> = {
  HIPAA_BAA: {
    title: "HIPAA Business Associate Agreement",
    summary:
      "OduDoc acts as a Business Associate under HIPAA. We process Protected Health Information only to deliver consultations you book through the platform; we do not sell PHI; we apply administrative, physical, and technical safeguards; we will report any breach to you within 60 days and to HHS as required.",
  },
  GDPR_DPA: {
    title: "GDPR Data Processing Agreement",
    summary:
      "OduDoc acts as a Processor under GDPR / UK GDPR. We process personal data only on your documented instructions, apply Article 32 security measures, transfer data outside the EEA only under Standard Contractual Clauses, and assist with data-subject-rights requests within statutory windows.",
  },
  GENERIC_DPA: {
    title: "Data Processing Agreement",
    summary:
      "OduDoc processes patient data on your behalf solely to deliver booked consultations. We apply industry-standard encryption in transit (TLS 1.3) and at rest (AES-256), keep audit logs of every read and write, and notify you within 72 hours of any confirmed security incident.",
  },
};

function frameworkFor(doctorCountry: string | undefined): ComplianceFramework {
  return licenseMetaFor(doctorCountry || "").framework;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email || user.role !== "doctor") {
    return NextResponse.json({ error: "Doctor session required" }, { status: 403 });
  }
  const doctor = findDoctorByEmail(user.email);
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  const fw = frameworkFor(doctor.licenseCountry);
  const current = isCurrent(user.email, fw);
  const latest = latestAcceptance(user.email, fw);
  return NextResponse.json({
    framework: fw,
    currentVersion: CURRENT_VERSIONS[fw],
    needsAcceptance: !current,
    latest,
    ...SUMMARIES[fw],
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email || user.role !== "doctor") {
    return NextResponse.json({ error: "Doctor session required" }, { status: 403 });
  }
  const doctor = findDoctorByEmail(user.email);
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  let body: { signature?: string } = {};
  try {
    body = (await req.json()) as { signature?: string };
  } catch {
    /* empty body — we'll fail validation below */
  }
  const signature = (body.signature || "").trim();
  if (signature.length < 2) {
    return NextResponse.json(
      { error: "Type your full name to sign the agreement" },
      { status: 400 },
    );
  }

  const fw = frameworkFor(doctor.licenseCountry);
  try {
    const accepted = recordAcceptance({
      doctorId: doctor.id,
      email: user.email,
      framework: fw,
      ipAddress: clientIp(req),
      userAgent: req.headers.get("user-agent") || undefined,
      signature,
    });
    return NextResponse.json({ ok: true, accepted });
  } catch (err) {
    log.error("doctor_baa.record_failed", err);
    return NextResponse.json({ error: "Failed to record acceptance" }, { status: 500 });
  }
}
