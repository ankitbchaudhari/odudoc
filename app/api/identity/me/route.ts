// GET /api/identity/me
//
// Returns the signed-in user's Medical ID + identity verification state.
// Used by the profile page "Verification" card and by the consult-start
// flow to decide whether to show the "verify to strengthen your account"
// banner. Deliberately minimal — no gov-ID blob URL is leaked back to
// the client; once submitted, only admins see the document.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getIdentity } from "@/lib/users-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const identity = getIdentity(user.id);
  if (!identity) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }
  // Do not expose docUrl — that's admin-only.
  return NextResponse.json({
    medicalId: identity.medicalId,
    status: identity.status,
    docType: identity.docType,
    docFilename: identity.docFilename,
    submittedAt: identity.submittedAt,
    reviewedAt: identity.reviewedAt,
    reviewNote: identity.reviewNote,
  });
}
