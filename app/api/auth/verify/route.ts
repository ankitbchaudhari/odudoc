import { NextRequest, NextResponse } from "next/server";
import { consumeVerificationToken } from "@/lib/email-verification-store";
import { markEmailVerified } from "@/lib/users-store";
import { addSubscriber } from "@/lib/subscribers-store";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { log } from "@/lib/log";

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

  // Auto-subscribe to newsletter on first verify (signup only — password
  // resets etc. shouldn't re-subscribe an already-unsubscribed user).
  // addSubscriber dedupes on email, so a re-verified account won't create
  // a second row, and an unsubscribed user who re-verifies *will* get
  // resubscribed, which matches their intent (they just clicked a link
  // confirming they own the inbox).
  if (result.purpose === "signup") {
    try {
      addSubscriber(user.email, "signup");
    } catch (err) {
      log.error("auth.verify.auto_subscribe_failed", err, { email: user.email });
    }
  }

  const purpose = result.purpose;
  return NextResponse.redirect(
    `${origin}/auth/login?verified=1&reason=${purpose}`
  );
}
