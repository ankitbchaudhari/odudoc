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
import { findUserByEmail, reloadUsers } from "@/lib/users-store";
import { issueMobileOtp } from "@/lib/mobile-otp-store";
import { sendEmail } from "@/lib/email";
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

  // We only support email today for the actual OTP send (phone OTP
  // arrives via the WhatsApp / Sent-DM channel; that path lives in
  // lib/whatsapp-* and is owned by the mobile signup flow).
  if (idType !== "email") {
    return NextResponse.json({
      error: "phone_otp_not_yet_supported",
      message: "Phone-OTP login lands in the next release. Use your registered email for now.",
    }, { status: 400 });
  }

  await reloadUsers();
  const user = findUserByEmail(parsed.identifier);
  if (!user) {
    // Don't disclose whether the account exists — fixed-shape response.
    // V14 §security spec calls this "user-enumeration resistance".
    return NextResponse.json({
      ok: true,
      maskedIdentifier: maskIdentifier(parsed.identifier, "email"),
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

  // Send via email. WhatsApp wiring is the follow-up commit.
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
  }).catch(() => {/* delivery failures fall back to the masked-identifier response */});

  await recordEvent({
    category: "system",
    action: "patient.login.otp_requested",
    actorEmail: user.email,
    subjectKind: "user",
    subjectId: user.id,
    summary: `Patient OTP login requested (${maskIdentifier(user.email, "email")})`,
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    maskedIdentifier: maskIdentifier(user.email, "email"),
    message: `Code sent to ${maskIdentifier(user.email, "email")}. Expires in 10 minutes.`,
  });
}
