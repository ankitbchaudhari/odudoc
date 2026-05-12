// POST /api/auth/mobile-resend-code
//
// Re-send a 6-digit signup code. Refuses if there's no pending registration,
// if the user is already verified, or if the 30-second cooldown hasn't
// passed.

import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, reloadUsers } from "@/lib/users-store";
import { issueMobileOtp } from "@/lib/mobile-otp-store";
import { sendEmail } from "@/lib/email";
import { notify } from "@/lib/notifications/notify";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z, emailSchema } from "@/lib/validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const Schema = z.object({ email: emailSchema });

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function otpEmailHtml(name: string, code: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:12px;">
        <tr><td style="background:#2563eb;padding:18px 24px;color:#fff;font-weight:700;">OduDoc</td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 12px 0;font-size:20px;">New verification code</h1>
          <p style="margin:0 0 12px 0;color:#374151;">Hi ${escape(name)}, here's your fresh code:</p>
          <div style="font-size:30px;font-weight:700;letter-spacing:8px;text-align:center;padding:18px 0;background:#f3f4f6;border-radius:10px;">${escape(code)}</div>
          <p style="margin:12px 0 0 0;font-size:13px;color:#6b7280;">Expires in 10 minutes.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function POST(request: NextRequest) {
  const blocked = await enforceRateLimit(request, "mobile-resend", 5, "10 m");
  if (blocked) return blocked;

  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const { email } = parsed;

  try {
    await reloadUsers();
    const user = findUserByEmail(email);
    if (!user) {
      // Don't leak whether an email is registered — respond as if sent.
      return NextResponse.json({ ok: true });
    }
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "already_verified", message: "This email is already verified. Log in instead." },
        { status: 409 }
      );
    }

    const otp = await issueMobileOtp(email);
    if (!otp.ok) {
      const secs = Math.ceil(otp.retryAfterMs / 1000);
      return NextResponse.json(
        { error: "cooldown", retryAfterSeconds: secs, message: `Please wait ${secs}s.` },
        { status: 429 }
      );
    }

    // Fan out to email + SMS so users on flaky networks see at least one.
    const smsBody = `${otp.code} is your OduDoc verification code. It expires in 10 minutes.`;
    await Promise.allSettled([
      sendEmail({
        from: "no-reply",
        to: email,
        subject: "Your OduDoc verification code",
        html: otpEmailHtml(user.name, otp.code),
      }).catch((err) => log.error("mobile-resend email threw", err)),
      user.phone
        ? notify({ channel: "sms", to: user.phone, body: smsBody, category: "otp" }).catch(
            (err) => log.error("mobile-resend sms threw", err)
          )
        : Promise.resolve(),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("mobile-resend error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
