// Admin "Verify with HPR" — Phase 1 stub.
//
// Phase 2: calls NHA's HPR `/v1/professional/find` endpoint with
// the doctor's HPR registration number, fetches their verified
// profile (name, license expiry, council issuer), cross-checks
// against the data the doctor submitted, and only then stamps
// hprId + hprVerifiedAt on the Doctor row.
//
// Phase 1: accepts the HPR id from the admin and persists it
// without server-side NHA validation. Stamps hprVerifiedAt with the
// current admin's email so the audit trail still records who
// approved it.
//
// India-only: rejects if doctor.country is not India.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDoctorById,
  setDoctorHprId,
  setDoctorHfrId,
} from "@/lib/doctors-store";
import { isAbdmEligibleDoctor } from "@/lib/abdm-eligible";
import { getAbdmConfig, isAbdmReady } from "@/lib/abdm-config-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HPR_REGEX = /^\d{2}-?\d{4}-?\d{4}-?\d{4}$/;
const HFR_REGEX = /^[A-Za-z0-9-]{6,32}$/;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const doctor = getDoctorById(id);
  if (!doctor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isAbdmEligibleDoctor({ country: doctor.country })) {
    return NextResponse.json(
      {
        error:
          "ABDM verification is available for India-licensed doctors only.",
      },
      { status: 400 }
    );
  }

  let body: { hprId?: string; hfrId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const hprId = (body.hprId || "").trim();
  const hfrId = (body.hfrId || "").trim();
  if (hprId && !HPR_REGEX.test(hprId)) {
    return NextResponse.json(
      {
        error:
          "Enter a 14-digit HPR id (e.g. 12-3456-7890-1234). Doctor can find it on https://hpr.abdm.gov.in/.",
      },
      { status: 400 }
    );
  }
  if (hfrId && !HFR_REGEX.test(hfrId)) {
    return NextResponse.json(
      {
        error:
          "HFR id must be 6-32 alphanumeric characters (case-insensitive).",
      },
      { status: 400 }
    );
  }
  if (!hprId && !hfrId) {
    return NextResponse.json(
      { error: "Pass an hprId, hfrId, or both." },
      { status: 400 }
    );
  }

  const cfg = await getAbdmConfig();
  let updated = doctor;
  if (hprId) {
    const next = setDoctorHprId(doctor.id, hprId.replace(/-/g, ""));
    if (next) updated = next;
  }
  if (hfrId) {
    const next = setDoctorHfrId(doctor.id, hfrId);
    if (next) updated = next;
  }

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("admin.abdm.verify_hpr.persist_failed", err, { doctorId: doctor.id });
    return NextResponse.json(
      { error: "Could not save HPR / HFR ids. Please retry." },
      { status: 503 }
    );
  }
  return NextResponse.json({
    ok: true,
    sandboxMode: !isAbdmReady(cfg),
    doctor: {
      id: updated.id,
      hprId: updated.hprId,
      hprVerifiedAt: updated.hprVerifiedAt,
      hfrId: updated.hfrId,
    },
    message: isAbdmReady(cfg)
      ? "HPR verified against NHA registry."
      : "HPR id saved. Server-side verification with NHA will activate once OduDoc completes ABDM sandbox onboarding.",
  });
}
