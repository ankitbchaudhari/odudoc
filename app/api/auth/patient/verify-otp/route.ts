// POST /api/auth/patient/verify-otp
//
// Body: { identifier, otp }
//
// Verifies the 6-digit code, then issues both a mobile JWT (for app
// callers) AND sets a NextAuth-compatible cookie via the credentials
// provider (for web callers). The web client then redirects to
// /dashboard.

import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, findUserByPhone, touchLastLogin, reloadUsers, markEmailVerified } from "@/lib/users-store";
import { verifyMobileOtp } from "@/lib/mobile-otp-store";
import { signMobileToken } from "@/lib/mobile-auth";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z } from "@/lib/validate";
import { recordEvent } from "@/lib/accountability-store";

export const runtime = "nodejs";

const Schema = z.object({
  identifier: z.string().trim().min(3).max(200),
  otp: z.string().trim().regex(/^\d{6}$/, "6-digit numeric"),
});

export async function POST(request: NextRequest) {
  // V14 §security: 10 verify attempts per IP per 15 min. After 5
  // wrong codes for a specific identifier the OTP store itself
  // locks out.
  const blocked = await enforceRateLimit(request, "patient-otp-verify", 10, "15 m");
  if (blocked) return blocked;

  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  await reloadUsers();
  const looksLikePhone = !parsed.identifier.includes("@");
  const user = looksLikePhone
    ? findUserByPhone(parsed.identifier)
    : findUserByEmail(parsed.identifier);
  if (!user) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }
  if (user.role !== "patient") {
    return NextResponse.json({ error: "wrong_role_for_otp" }, { status: 403 });
  }
  if (user.status === "banned") {
    return NextResponse.json({ error: "account_banned" }, { status: 403 });
  }

  const result = await verifyMobileOtp(user.email, parsed.otp);
  if (!result.ok) {
    await recordEvent({
      category: "system",
      action: "patient.login.otp_failed",
      severity: result.reason === "too_many_attempts" ? "high" : "low",
      actorEmail: user.email,
      subjectKind: "user",
      subjectId: user.id,
      summary: `Patient OTP login failed · ${result.reason}`,
    }).catch(() => {});
    const status =
      result.reason === "expired" ? 410 :
      result.reason === "too_many_attempts" ? 423 :
      result.reason === "not_found" ? 410 :
      401;
    return NextResponse.json({ error: result.reason }, { status });
  }

  // Promote any unverified email — surviving an OTP loop on a
  // previously-unverified account confirms ownership.
  if (!user.emailVerified) markEmailVerified(user.email);
  touchLastLogin(user.email);

  const { token, expiresAt } = await signMobileToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  await recordEvent({
    category: "system",
    action: "patient.login.otp_success",
    actorEmail: user.email,
    subjectKind: "user",
    subjectId: user.id,
    summary: `Patient logged in via OTP (${user.email})`,
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    token,
    expiresAt,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    // The web caller still needs a NextAuth session cookie. We use
    // the existing credentials provider — the verify endpoint
    // returns a one-time autoLoginToken the /login/patient page
    // then POSTs to NextAuth's credentials signIn to convert the
    // OTP success into a session.
    autoLoginToken: token,
  });
}
