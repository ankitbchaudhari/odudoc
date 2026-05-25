// GET /api/me/verification-status
//
// Returns the signed-in user's verification checklist state — what's
// done, what's pending, the next nudge. Client renders the result via
// <VerificationChecklist />. Read-only; the actual marking happens in
// the OTP / email-verify routes and the ID-attach flow.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById } from "@/lib/users-store";
import { computeVerificationStatus } from "@/lib/verification-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const user = findUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    status: computeVerificationStatus(user),
  });
}
