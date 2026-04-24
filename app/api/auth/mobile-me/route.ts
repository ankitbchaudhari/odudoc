// GET /api/auth/mobile-me
//
// Validates the Bearer JWT and returns the current user record. The apps
// call this on launch to decide whether to show login or go straight to
// the home screen. Also serves as a cheap liveness check for the token.

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { findUserByEmail, reloadUsers } from "@/lib/users-store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;

  await reloadUsers();
  const user = findUserByEmail(auth.email);
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }
  if (user.status === "banned") {
    return NextResponse.json({ error: "account_banned" }, { status: 403 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      emailVerified: user.emailVerified,
    },
  });
}
