// POST /api/auth/2fa/setup
//
// Step 1 of 2FA enrolment. Generates a fresh TOTP secret for the
// current user, stores it as "pending" (totpSecret set, totpEnabled
// still false), and returns the otpauth:// URI for the QR code +
// the raw secret for manual entry. Step 2 is /verify, which flips
// totpEnabled to true once the user proves their authenticator app
// can produce a valid code.
//
// Only doctors + admin + staff roles may enrol — patients use OTP
// login already, so layering TOTP on top would be friction without
// security benefit.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateSecret, totpUri } from "@/lib/totp";
import { findUserById, setUserTotpSecret } from "@/lib/users-store";
import { recordEvent } from "@/lib/accountability-store";

export const runtime = "nodejs";

const ALLOWED: ReadonlyArray<string> = ["doctor", "admin", "staff", "hr", "support", "pharmacist", "vendor"];

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!ALLOWED.includes(session.user.role)) {
    return NextResponse.json({ error: "role_not_eligible" }, { status: 403 });
  }

  const user = findUserById(session.user.id);
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  const secret = generateSecret();
  setUserTotpSecret(user.id, secret);

  await recordEvent({
    category: "system",
    action: "auth.totp.setup_started",
    actorEmail: user.email,
    actorRole: user.role,
    actorId: user.id,
    subjectKind: "user",
    subjectId: user.id,
    summary: "2FA TOTP setup initiated",
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    secret,
    otpauthUri: totpUri({ secret, accountName: user.email, issuer: "OduDoc" }),
  });
}
