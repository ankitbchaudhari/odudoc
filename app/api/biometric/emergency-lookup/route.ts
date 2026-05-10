// Emergency biometric lookup — hospital reception scans an
// unconscious patient's fingerprint or face, gets back the limited
// emergency-profile (allergies, blood group, current Rx, NOK).
//
// Auth: caller must be admin/staff (hospital reception). Lookup is
// audit-logged against the patient — they see who looked at their
// record from where.
//
// Returns the emergency profile + the canonical patient ID. We do
// NOT return the wider patient record here — that needs a separate
// authorization path (and a court order in some jurisdictions).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  emergencyLookupByHash, getEmergencyProfile, BiometricKind,
} from "@/lib/emergency-profile/store";
import { clientIpFromHeaders } from "@/lib/audit/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function role(session: Awaited<ReturnType<typeof getServerSession>> | null): string | undefined {
  const u = (session as { user?: { role?: string } } | null)?.user;
  return u?.role;
}

const KINDS: BiometricKind[] = ["fingerprint", "face"];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (role(session) !== "admin" && role(session) !== "staff" && role(session) !== "doctor") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  if (!body.kind || !KINDS.includes(body.kind)) return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  if (!body.templateHash) return NextResponse.json({ error: "missing_template_hash" }, { status: 400 });
  if (!body.orgId) return NextResponse.json({ error: "missing_org" }, { status: 400 });

  const userId = (session?.user as { id?: string } | undefined)?.id;
  const result = emergencyLookupByHash({
    kind: body.kind,
    templateHash: String(body.templateHash),
    lookingUpOrgId: String(body.orgId),
    lookingUpUserId: userId,
    lookingUpEmail: session?.user?.email || undefined,
    ip: clientIpFromHeaders(req.headers),
    reason: body.reason ? String(body.reason) : "biometric emergency lookup",
  });
  if (!result) {
    return NextResponse.json({ matched: false });
  }
  // We expose the trimmed emergency profile + a stable userId so
  // the hospital can attach incoming care to the right record.
  // Wider record access goes through a separate consent-grant flow.
  const profile = getEmergencyProfile(result.matchedUserId);
  return NextResponse.json({
    matched: true,
    matchedUserId: result.matchedUserId,
    profile,
  });
}
