// POST /api/auth/mobile-verify
//
// Consume a 6-digit signup code issued by /api/auth/mobile-register. On
// success marks the email verified and returns a JWT so the app can skip
// the login screen and go straight to Home.

import { NextRequest, NextResponse } from "next/server";
import {
  findUserByEmail,
  markEmailVerified,
  touchLastLogin,
  reloadUsers,
} from "@/lib/users-store";
import { verifyMobileOtp } from "@/lib/mobile-otp-store";
import { signMobileToken } from "@/lib/mobile-auth";
import { addSubscriber } from "@/lib/subscribers-store";
import { sendWelcomeEmail } from "@/lib/email";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z, emailSchema } from "@/lib/validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const VerifySchema = z.object({
  email: emailSchema,
  code: z.string().trim().regex(/^\d{6}$/, "code must be 6 digits"),
});

export async function POST(request: NextRequest) {
  // Per-IP limit on verify attempts — the per-code limit is enforced inside
  // the store (MAX_ATTEMPTS), this one guards against rotating codes.
  const blocked = await enforceRateLimit(request, "mobile-verify", 20, "10 m");
  if (blocked) return blocked;

  const parsed = await parseJson(request, VerifySchema);
  if (parsed instanceof NextResponse) return parsed;
  const { email, code } = parsed;

  try {
    const result = await verifyMobileOtp(email, code);
    if (!result.ok) {
      const map: Record<typeof result.reason, { status: number; message: string }> = {
        not_found: { status: 404, message: "No active code for this email. Request a new one." },
        expired: { status: 410, message: "This code has expired. Request a new one." },
        too_many_attempts: { status: 429, message: "Too many wrong attempts. Request a new code." },
        invalid_code: { status: 400, message: "Incorrect code. Try again." },
      };
      const { status, message } = map[result.reason];
      return NextResponse.json({ error: result.reason, message }, { status });
    }

    await reloadUsers();
    const user = findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }
    if (user.status === "banned") {
      return NextResponse.json({ error: "account_banned" }, { status: 403 });
    }

    // Snapshot verification state BEFORE markEmailVerified() so we can
    // distinguish first-time activation from a re-verify.
    const isFirstVerification = !user.emailVerified;
    markEmailVerified(user.email);
    touchLastLogin(user.email);

    // Drain the verification flag + last-login update to Postgres
    // before issuing the JWT. Without this strict drain, the Lambda
    // could freeze on response-flush and the verified flag would be
    // lost — user would have to re-verify on next login.
    try {
      await awaitAllFlushesStrict();
    } catch (err) {
      log.error("mobile-verify.persist_failed", err, { email: user.email });
      return NextResponse.json(
        { error: "server_busy", message: "Verification temporarily unavailable. Please retry." },
        { status: 503 }
      );
    }

    // Auto-subscribe to newsletter on first mobile signup. addSubscriber
    // dedupes by email so a re-verify is a no-op. Best-effort — never
    // fail the login over a subscriber-list bookkeeping error.
    try {
      addSubscriber(user.email, "mobile-signup");
    } catch (err) {
      log.error("mobile-verify.auto_subscribe_failed", err, { email: user.email });
    }

    // Welcome email on first verification only — re-verifies (a user
    // re-running mobile-register after expiry) shouldn't get a duplicate
    // welcome. Best-effort; never block the JWT response on email delivery.
    if (isFirstVerification) {
      sendWelcomeEmail({ to: user.email, name: user.name })
        .catch((err) => log.error("mobile-verify.welcome_email_failed", err, { email: user.email }));
    }

    const { token, expiresAt } = await signMobileToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return NextResponse.json({
      token,
      expiresAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerified: true,
      },
    });
  } catch (err) {
    log.error("mobile-verify error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
