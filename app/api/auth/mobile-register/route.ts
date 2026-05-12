// POST /api/auth/mobile-register
//
// Mobile-friendly patient signup. Creates (or reuses, if unverified) a
// patient account and emails a 6-digit code. The app then calls
// /api/auth/mobile-verify with the code to finish signup and receive a JWT.
//
// Differs from /api/auth/register (web flow) because phones can't usefully
// round-trip a magic link — switching apps mid-signup kills the intent.

import { NextRequest, NextResponse } from "next/server";
import {
  findUserByEmail,
  createUser,
  reloadUsers,
} from "@/lib/users-store";
import { issueMobileOtp } from "@/lib/mobile-otp-store";
import { sendEmail } from "@/lib/email";
import { notify } from "@/lib/notifications/notify";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z, nonEmptyString, emailSchema, phoneSchema } from "@/lib/validate";
import { awaitAllFlushes, awaitAllFlushesStrict, PersistenceError } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const RegisterSchema = z.object({
  name: nonEmptyString.max(120),
  email: emailSchema,
  phone: phoneSchema,
  password: z.string().min(6).max(200),
});

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function otpEmailHtml(name: string, code: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#2563eb;padding:18px 24px;color:#ffffff;font-weight:700;font-size:18px;">OduDoc</td></tr>
        <tr><td style="padding:28px 28px 12px 28px;">
          <h1 style="margin:0 0 12px 0;font-size:20px;">Your verification code</h1>
          <p style="margin:0 0 12px 0;color:#374151;font-size:15px;">
            Hi ${escape(name)}, enter this code in the OduDoc app to finish signup.
          </p>
          <div style="font-size:30px;font-weight:700;letter-spacing:8px;text-align:center;
                      padding:18px 0;background:#f3f4f6;border-radius:10px;margin:12px 0;">
            ${escape(code)}
          </div>
          <p style="margin:12px 0 0 0;font-size:13px;color:#6b7280;">
            This code expires in 10 minutes. If you didn't request it, ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function POST(request: NextRequest) {
  const blocked = await enforceRateLimit(request, "mobile-register", 5, "10 m");
  if (blocked) return blocked;

  const parsed = await parseJson(request, RegisterSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { name, email, phone, password } = parsed;

  try {
    await reloadUsers();

    const existing = findUserByEmail(email);

    // Case 1: user exists AND is already verified → they should log in,
    // not register again.
    if (existing && existing.emailVerified) {
      return NextResponse.json(
        { error: "email_in_use", message: "An account with this email already exists. Please log in." },
        { status: 409 }
      );
    }

    // Case 2: user doesn't exist → create. Case 3 (unverified duplicate) →
    // we silently allow re-registration by just re-issuing a code to the
    // existing record. The web flow does the same thing, keyed off the
    // verification link. We skip re-creating the user and just send a new
    // OTP.
    if (!existing) {
      createUser({ name, email, phone, password, role: "patient" });
      // Strict drain — refuses to ack the signup unless Postgres
      // confirms the write. Avoids the "Email verified → No account
      // found" data-loss path on transient DB blips.
      try {
        await awaitAllFlushesStrict();
      } catch (err) {
        log.error("mobile-register.persist_failed", err, { email });
        return NextResponse.json(
          {
            error: "server_busy",
            message: "Signup is temporarily unavailable. Please try again in a few moments.",
            ...(err instanceof PersistenceError ? { detail: err.errors.map((e) => e.key) } : {}),
          },
          { status: 503 }
        );
      }
      // Read-back verification.
      await reloadUsers();
      if (!findUserByEmail(email)) {
        log.error("mobile-register.readback_missing", undefined, { email });
        return NextResponse.json(
          { error: "server_busy", message: "Signup is temporarily unavailable. Please try again." },
          { status: 503 }
        );
      }
    }

    const otp = await issueMobileOtp(email);
    if (!otp.ok) {
      const secs = Math.ceil(otp.retryAfterMs / 1000);
      return NextResponse.json(
        { error: "cooldown", message: `Please wait ${secs}s before requesting another code.`, retryAfterSeconds: secs },
        { status: 429 }
      );
    }

    // Fan out the code to both email and SMS. Mobile users on flaky
    // networks may not see one of them; sending both is cheap insurance.
    // OTP is a safety-critical category, so we ignore Do-Not-Disturb /
    // category opt-outs (enforced inside notifyUser when wired).
    const smsBody = `${otp.code} is your OduDoc verification code. It expires in 10 minutes.`;
    await Promise.allSettled([
      sendEmail({
        from: "no-reply",
        to: email,
        subject: "Your OduDoc verification code",
        html: otpEmailHtml(name, otp.code),
      })
        .then((r) => {
          if (!r.ok) log.error("mobile-register email failed", undefined, { error: r.error });
        })
        .catch((err) => log.error("mobile-register email threw", err)),
      notify({ channel: "sms", to: phone, body: smsBody, category: "otp" })
        .then((r) => {
          if (!r.ok && !r.skipped) log.warn("mobile-register sms failed", { error: r.error });
        })
        .catch((err) => log.error("mobile-register sms threw", err)),
    ]);

    return NextResponse.json({
      ok: true,
      email: email.toLowerCase(),
      message: "We've sent a 6-digit code to your email. It expires in 10 minutes.",
    });
  } catch (err) {
    log.error("mobile-register error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
