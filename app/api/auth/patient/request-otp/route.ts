// POST /api/auth/patient/request-otp
//
// Patient passwordless login — issues a 6-digit OTP to the patient's
// registered email (and, when WhatsApp is wired for this user, also
// to their phone). Distinct from the signup OTP path: the patient
// must already exist; we don't auto-create accounts here.
//
// Body: { identifier, identifier_type? }
//   identifier      — email OR phone
//   identifier_type — "email" | "phone" (optional; auto-detected)
//
// Rate limit: 5 requests per IP per hour (V14 §security spec).

import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, findUserByPhone, reloadUsers } from "@/lib/users-store";
import { issueMobileOtp } from "@/lib/mobile-otp-store";
import { sendEmail } from "@/lib/email";
import { sendWhatsAppTemplate } from "@/lib/sms";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z } from "@/lib/validate";
import { recordEvent } from "@/lib/accountability-store";

export const runtime = "nodejs";

const Schema = z.object({
  identifier: z.string().trim().min(3).max(200),
  identifier_type: z.enum(["email", "phone"]).optional(),
});

function detectType(id: string): "email" | "phone" {
  if (id.includes("@")) return "email";
  // Anything that looks like a phone number (starts with + or digit).
  return "phone";
}

function maskIdentifier(id: string, type: "email" | "phone"): string {
  if (type === "email") {
    const [local, domain] = id.split("@");
    if (!local || !domain) return id;
    return `${local.slice(0, 1)}•••••@${domain}`;
  }
  // Phone — keep last 4 + country code
  return id.slice(0, 3) + "•".repeat(Math.max(0, id.length - 7)) + id.slice(-4);
}

export async function POST(request: NextRequest) {
  const blocked = await enforceRateLimit(request, "patient-otp-request", 5, "1 h");
  if (blocked) return blocked;

  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  const idType = parsed.identifier_type || detectType(parsed.identifier);

  await reloadUsers();
  const user = idType === "phone"
    ? findUserByPhone(parsed.identifier)
    : findUserByEmail(parsed.identifier);
  if (!user) {
    // Don't disclose whether the account exists — fixed-shape response.
    // V14 §security spec calls this "user-enumeration resistance".
    return NextResponse.json({
      ok: true,
      maskedIdentifier: maskIdentifier(parsed.identifier, idType),
      channel: idType === "phone" ? "whatsapp" : "email",
      message: "If an account exists with that identifier, a 6-digit code is on its way.",
    });
  }

  // Patient-only login path. Doctors + staff use email+password.
  if (user.role !== "patient") {
    return NextResponse.json({
      error: "wrong_role_for_otp",
      message: "This account uses email + password login. Go back and pick the right door.",
    }, { status: 403 });
  }

  if (user.status === "banned") {
    return NextResponse.json({ error: "account_banned" }, { status: 403 });
  }

  const issued = await issueMobileOtp(user.email);
  if (!issued.ok) {
    return NextResponse.json({
      error: "cooldown",
      retryAfterMs: issued.retryAfterMs,
    }, { status: 429 });
  }

  // Deliver via the channel matching the identifier. WhatsApp uses an
  // approved Meta template (configured via sent.dm or Twilio ContentSid)
  // — we can't send freeform cold-contact OTPs outside the 24h CS window.
  // Both delivery paths fail open: the fixed-shape success response is
  // already in flight; we just won't have a code to send.
  if (idType === "phone" && user.phone) {
    const tplSid = process.env.TWILIO_WA_OTP_CONTENT_SID;
    const sentDmTpl = process.env.SENTDM_TEMPLATE_LOGIN_OTP;
    if (tplSid || sentDmTpl) {
      await sendWhatsAppTemplate(
        user.phone,
        tplSid,
        { var_1: issued.code, "1": issued.code, code: issued.code },
        { sentDmTemplate: sentDmTpl },
      ).catch(() => {});
    }
  } else {
    await sendEmail({
      from: "no-reply",
      to: user.email,
      subject: "Your OduDoc login code",
      html: `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#111;padding:24px;">
        <h2 style="margin:0 0 12px;">Your OduDoc login code</h2>
        <p style="font-size:14px;color:#444;">Use this code to finish signing in. It expires in 10 minutes.</p>
        <p style="font-size:32px;letter-spacing:8px;font-weight:bold;background:#f5f5f5;padding:16px 20px;border-radius:8px;display:inline-block;">${issued.code}</p>
        <p style="font-size:12px;color:#666;margin-top:16px;">If you didn't request this, ignore this email — your account is safe.</p>
      </body></html>`,
      bulk: false,
    }).catch(() => {});
  }

  const maskedTarget = idType === "phone"
    ? maskIdentifier(user.phone || parsed.identifier, "phone")
    : maskIdentifier(user.email, "email");

  await recordEvent({
    category: "system",
    action: "patient.login.otp_requested",
    actorEmail: user.email,
    subjectKind: "user",
    subjectId: user.id,
    summary: `Patient OTP login requested via ${idType} (${maskedTarget})`,
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    maskedIdentifier: maskedTarget,
    channel: idType === "phone" ? "whatsapp" : "email",
    message: `Code sent to ${maskedTarget}. Expires in 10 minutes.`,
  });
}
