// POST /api/auth/mobile-login
//
// Exchange email + password for a 30-day JWT used by the Android apps.
// Mirrors the credential gates in lib/auth.ts (banned users, expired temp
// passwords) so mobile can't bypass anything the web check enforces.

import { NextRequest, NextResponse } from "next/server";
import {
  findUserByEmail,
  validatePassword,
  touchLastLogin,
  markEmailVerified,
  reloadUsers,
} from "@/lib/users-store";
import { signMobileToken } from "@/lib/mobile-auth";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z, emailSchema } from "@/lib/validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  const blocked = await enforceRateLimit(request, "mobile-login", 10, "1 m");
  if (blocked) return blocked;

  const parsed = await parseJson(request, LoginSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { email, password } = parsed;

  try {
    await reloadUsers();

    const user = findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "invalid_credentials" },
        { status: 401 }
      );
    }

    if (user.status === "banned") {
      return NextResponse.json(
        { error: "account_banned", message: "This account has been banned. Contact support." },
        { status: 403 }
      );
    }

    if (!validatePassword(password, user.password)) {
      return NextResponse.json(
        { error: "invalid_credentials" },
        { status: 401 }
      );
    }

    if (user.mustChangePassword && user.tempPasswordExpiresAt) {
      const expiry = new Date(user.tempPasswordExpiresAt).getTime();
      if (!Number.isNaN(expiry) && expiry < Date.now()) {
        return NextResponse.json(
          {
            error: "temp_password_expired",
            message: "Your temporary password has expired. Contact an admin.",
          },
          { status: 403 }
        );
      }
    }

    // Silently upgrade unverified users (mirrors web flow).
    if (!user.emailVerified) {
      markEmailVerified(user.email);
    }
    touchLastLogin(user.email);

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
        emailVerified: user.emailVerified,
      },
    });
  } catch (err) {
    log.error("mobile-login error:", err);
    return NextResponse.json(
      { error: "server_error" },
      { status: 500 }
    );
  }
}
