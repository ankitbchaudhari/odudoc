// POST /api/auth/signup-otp/send
//
// Issues a 6-digit OTP to ONE channel (email OR phone) — the caller
// picks which via the `channel` field. Previously we sent to both,
// which doubled the SMS bill for every signup; the wizard now lets
// the user choose whichever they have in front of them.
//
// Rate-limited per IP. Returns the sessionId the verify step submits
// alongside the user-entered code.

import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/users-store";
import { issueSignupOtp } from "@/lib/signup-otp-store";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z, emailSchema, phoneSchema } from "@/lib/validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

// Either field may be omitted, but the picked channel must have its
// corresponding value populated. Refined below.
const Schema = z
  .object({
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    channel: z.enum(["email", "phone"]),
  })
  .refine(
    (v) => (v.channel === "email" ? !!v.email : !!v.phone),
    {
      message: "Provide the value matching the selected channel",
      path: ["channel"],
    },
  );

export async function POST(request: NextRequest) {
  // 5 send attempts per IP per 10 minutes — generous enough for typos
  // but tight enough to deter scraping.
  const blocked = await enforceRateLimit(request, "signup-otp-send", 5, "10 m");
  if (blocked) return blocked;

  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const { email, phone, channel } = parsed;

  // If a user already exists with this email, send a hint instead of
  // an OTP — preserves account privacy (don't disclose the user list)
  // while nudging them to the login flow. We only do this check when
  // an email was supplied; phone-only users can still sign up.
  if (email && findUserByEmail(email)) {
    return NextResponse.json({
      ok: true,
      alreadyRegistered: true,
      message: "An account with this email already exists. Try signing in instead.",
    });
  }

  // Bind the OTP session to whatever identifiers the user gave us.
  // The verify step pairs the code to this sessionId, so missing
  // fields are stored as empty strings without affecting verification.
  const { sessionId, code } = issueSignupOtp(email || "", phone || "");

  if (channel === "email") {
    const emailRes = await sendEmail({
      from: "no-reply",
      to: email!,
      subject: `Your OduDoc signup code: ${code}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2 style="color:#0F3570;">Verify your email</h2>
          <p>Your OduDoc signup verification code is:</p>
          <p style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f1f5f9;padding:16px;text-align:center;border-radius:12px;">${code}</p>
          <p style="color:#64748b;font-size:13px;">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
        </div>
      `,
      text: `Your OduDoc signup verification code is: ${code}\n\nThis code expires in 10 minutes.`,
    }).catch((err) => {
      log.error("signup-otp.email_failed", err);
      return { ok: false };
    });
    log.info("signup-otp.sent", {
      channel: "email",
      email,
      emailOk: !!emailRes?.ok,
    });
  } else {
    // SMS path. Twilio failures are surfaced to the client as a 502
    // so the user can pick the email channel instead — silent fail
    // here would leave them waiting forever for a code that never
    // arrives.
    let smsOk = true;
    await sendSms(
      phone!,
      `Your OduDoc verification code is ${code}. Expires in 10 min.`,
    ).catch((err) => {
      log.warn("signup-otp.sms_failed", err);
      smsOk = false;
    });
    if (!smsOk) {
      return NextResponse.json(
        {
          ok: false,
          error: "sms_failed",
          message:
            "Couldn't send the SMS code. Please try the email option instead.",
        },
        { status: 502 },
      );
    }
    log.info("signup-otp.sent", { channel: "phone", phone });
  }

  return NextResponse.json({
    ok: true,
    sessionId,
    channel,
    // Hints so the UI can show "Code sent to a***@gmail.com" or "***1234"
    emailHint: email ? maskEmail(email) : null,
    phoneHint: phone ? maskPhone(phone) : null,
  });
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const head = user.slice(0, 2);
  return `${head}${"*".repeat(Math.max(user.length - 2, 1))}@${domain}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 4) return phone;
  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}
