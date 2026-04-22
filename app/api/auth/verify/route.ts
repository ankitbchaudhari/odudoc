import { NextRequest, NextResponse } from "next/server";
import { consumeVerificationToken } from "@/lib/email-verification-store";
import { markEmailVerified } from "@/lib/users-store";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";

export const runtime = "nodejs";

// GET /api/auth/verify?token=...
//
// Consumes a verification token. On success, flips the user's emailVerified
// flag (and bumps lastLoginAt to reset the inactivity clock) and redirects
// back to the login page with ?verified=1 so the UI can show a success toast.
//
// Single-use: the token is deleted whether consumption succeeds or fails.
export async function GET(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "auth-verify", 30, "10 m");
  if (blocked) return blocked;
  const token = req.nextUrl.searchParams.get("token");
  const origin = req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(`${origin}/auth/verify-email?status=missing`);
  }

  const result = await consumeVerificationToken(token);
  if (!result.ok) {
    const status = result.reason === "expired" ? "expired" : "invalid";
    return NextResponse.redirect(`${origin}/auth/verify-email?status=${status}`);
  }

  const user = markEmailVerified(result.email);
  if (!user) {
    // Token was valid but user somehow missing (e.g. in-memory store reset
    // between signup and verify click). Treat as invalid.
    return NextResponse.redirect(`${origin}/auth/verify-email?status=invalid`);
  }

  const purpose = result.purpose;
  return NextResponse.redirect(
    `${origin}/auth/login?verified=1&reason=${purpose}`
  );
}
