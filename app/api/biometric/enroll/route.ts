// Biometric enrollment.
//
// Two-step flow:
//   1. GET /api/biometric/enroll?kind=fingerprint
//      → returns a per-user salt the device must use to compute
//        templateHash. Every enrollment uses a fresh salt.
//   2. POST { kind, templateHash, salt, consentRecordId, orgId }
//      → stores the enrollment. We never see the raw template.
//
// The kiosk flow (hospital reception) MUST collect explicit consent
// from the patient first and pass the resulting consentRecordId
// here. Enrollments without a consent reference are rejected.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  enrollBiometric, generateSalt, BiometricKind,
} from "@/lib/emergency-profile/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: BiometricKind[] = ["fingerprint", "face"];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as BiometricKind | null;
  if (!kind || !KINDS.includes(kind)) return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  return NextResponse.json({
    salt: generateSalt(),
    instructions: "Compute templateHash = base64(HMAC-SHA-256(salt, deviceTemplate)). POST { kind, templateHash, salt, consentRecordId, orgId }.",
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.kind || !KINDS.includes(body.kind)) {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }
  if (!body.templateHash || typeof body.templateHash !== "string" || body.templateHash.length < 16) {
    return NextResponse.json({ error: "invalid_template_hash" }, { status: 400 });
  }
  if (!body.salt || typeof body.salt !== "string") {
    return NextResponse.json({ error: "missing_salt" }, { status: 400 });
  }
  if (!body.consentRecordId) {
    return NextResponse.json({ error: "missing_consent" }, { status: 400 });
  }
  if (!body.orgId) {
    return NextResponse.json({ error: "missing_org" }, { status: 400 });
  }
  const e = enrollBiometric({
    userId,
    kind: body.kind,
    templateHash: String(body.templateHash),
    salt: String(body.salt),
    consentRecordId: String(body.consentRecordId),
    enrolledByOrgId: String(body.orgId),
  });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({
    enrollment: { id: e.id, kind: e.kind, enrolledAt: e.enrolledAt, active: e.active },
  });
}
