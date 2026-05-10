// HIE consent artifact — issue + verify.
//
// POST { action: "issue", patientId, hiuId, hiuName, contextIds[],
//        purpose, ttlHours? }                                → { artifact }
// POST { action: "verify", artifact }                         → { ok, reason? }

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  issueConsentArtifact,
  verifyConsentArtifact,
} from "@/lib/abdm/mock-nha";
import { recordConsent } from "@/lib/consent-vault-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = String(body.action || "");

  if (action === "issue") {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    const artifact = issueConsentArtifact({
      patientId: String(body.patientId || ""),
      hiuId: String(body.hiuId || ""),
      hiuName: String(body.hiuName || ""),
      contextIds: Array.isArray(body.contextIds) ? body.contextIds.map(String) : [],
      purpose: String(body.purpose || "CAREMGT"),
      ttlHours: typeof body.ttlHours === "number" ? body.ttlHours : 24,
    });
    // Mirror into the unified consent vault — every HIE share is
    // also a consent vault row pinned to the requesting HIU.
    recordConsent({
      userId,
      purpose: "abdm_phr_push",
      purposeStatement: `Allow ${artifact.hiuName} to access ${artifact.contextIds.length} care context${artifact.contextIds.length === 1 ? "" : "s"} from your ABDM PHR for ${artifact.purpose} for ${body.ttlHours ?? 24} hours.`,
      recipientKind: "external",
      recipientId: artifact.hiuId,
      recipientName: artifact.hiuName,
      dataCategories: ["abdm_care_contexts"],
      ttlHours: body.ttlHours,
      lawfulBasis: "consent",
    });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ artifact });
  }
  if (action === "verify") {
    const r = verifyConsentArtifact(body.artifact);
    return NextResponse.json(r);
  }
  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
