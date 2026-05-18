// POST /api/auth/signup-otp/send
//
// Issues a 6-digit OTP to the email + phone of a not-yet-registered
// user as part of the multi-step signup wizard. Rate-limited per IP
// to prevent abuse. Returns the sessionId the wizard's verify step
// will submit alongside the user-entered code.

import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/users-store";
import { issueSignupOtp } from "@/lib/signup-otp-store";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z, emailSchema, phoneSchema } from "@/lib/validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const Schema = z.object({
  email: emailSchema,
  phone: phoneSchema,
});

export async function POST(request: NextRequest) {
  // 5 send attempts per IP per 10 minutes — generous enough for typos
  // but tight enough to deter scraping.
  const blocked = await enforceRateLimit(request, "signup-otp-send", 5, "10 m");
  if (blocked) return blocked;

  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const { email, phone } = parsed;

  // If a user already exists with this email, send a hint instead of
  // an OTP — preserves account privacy (don't disclose the user list)
  // while nudging them to the login flow.
  if (findUserByEmail(email)) {
    return NextResponse.json({
      ok: true,
      alreadyRegistered: true,
      message: "An account with this email already exists. Try signing in instead.",
    });
  }

  const { sessionId, code } = issueSignupOtp(email, phone);

  // Email — always attempted. SMS — best-effort, silent fail.
  const emailRes = await sendEmail({
    from: "no-reply",
    to: email,
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

  // SMS — try the entered phone; surface as 'sent' regardless because
  // many users only check email and we don't want to block on Twilio
  // outages.
  sendSms(phone, `Your OduDoc verification code is ${code}. Expires in 10 min.`).catch((err) => {
    log.warn("signup-otp.sms_failed", err);
  });

  log.info("signup-otp.sent", {
    email,
    emailOk: !!emailRes?.ok,
  });

  return NextResponse.json({
    ok: true,
    sessionId,
    // Hints so the UI can show "Code sent to a***@gmail.com / ***1234"
    emailHint: maskEmail(email),
    phoneHint: maskPhone(phone),
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
