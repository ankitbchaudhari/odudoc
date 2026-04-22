// Start a self-service password reset. Always returns a generic success
// response so an attacker can't use this endpoint to enumerate which
// emails are registered.

import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/users-store";
import { createResetToken } from "@/lib/password-reset-store";
import { sendPasswordResetEmail } from "@/lib/email";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z, emailSchema } from "@/lib/validate";

import { log } from "@/lib/log";
const ForgotSchema = z.object({ email: emailSchema });

export const runtime = "nodejs";

const SITE_URL = "https://www.odudoc.com";

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "forgot-password", 5, "15 m");
  if (blocked) return blocked;
  const parsed = await parseJson(req, ForgotSchema);
  if (parsed instanceof NextResponse) return parsed;
  const email = parsed.email.toLowerCase();

  const user = findUserByEmail(email);
  // Fire-and-forget: generate token + send email only when the user exists.
  // Either way we return ok:true so the caller can't tell.
  if (user) {
    const rec = createResetToken(user.email);
    const resetUrl = `${SITE_URL}/auth/reset-password?token=${rec.token}`;
    try {
      await sendPasswordResetEmail({ to: user.email, resetUrl });
    } catch (err) {
      log.error("console.error", undefined, { args: ["[forgot-password] email failed:", err] });
    }
  }

  return NextResponse.json({
    ok: true,
    message:
      "If an account exists for that email, we've sent a reset link. Check your inbox (and spam folder).",
  });
}
