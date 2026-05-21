// POST /api/auth/2fa/verify
//
// Body: { code }
//
// Step 2 of enrolment. Confirms the user's authenticator app produces
// a valid code for the pending secret, then flips totpEnabled to true.
// From this point on every sign-in for this user requires a fresh
// TOTP — the credentials provider's authorize() will throw
// "2fa_required" without one.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { findUserById, enableUserTotp } from "@/lib/users-store";
import { parseJson, z } from "@/lib/validate";
import { recordEvent } from "@/lib/accountability-store";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";

export const runtime = "nodejs";

const Schema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "6-digit numeric"),
});

export async function POST(request: NextRequest) {
  const blocked = await enforceRateLimit(request, "totp-verify", 10, "15 m");
  if (blocked) return blocked;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  const user = findUserById(session.user.id);
  if (!user || !user.totpSecret) {
    return NextResponse.json({ error: "no_pending_setup" }, { status: 400 });
  }

  if (!verifyTotp(user.totpSecret, parsed.code)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  enableUserTotp(user.id);

  await recordEvent({
    category: "system",
    action: "auth.totp.enabled",
    severity: "medium",
    actorEmail: user.email,
    actorRole: user.role,
    actorId: user.id,
    subjectKind: "user",
    subjectId: user.id,
    summary: "2FA TOTP enabled",
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
