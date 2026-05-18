// POST /api/auth/signup-otp/verify
//
// Verifies the 6-digit code the user typed against the pending
// challenge for their session. On success, returns a short-lived
// token the next wizard step submits to /api/auth/register so the
// register endpoint knows the email + phone were verified.

import { NextRequest, NextResponse } from "next/server";
import { verifySignupOtp } from "@/lib/signup-otp-store";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({
  sessionId: z.string().trim().min(8).max(64),
  code: z.string().trim().regex(/^\d{6}$/, "code must be 6 digits"),
});

export async function POST(request: NextRequest) {
  // 10 verify attempts per IP per 10 minutes. Per-session attempts
  // are also capped at 5 inside signup-otp-store.
  const blocked = await enforceRateLimit(request, "signup-otp-verify", 10, "10 m");
  if (blocked) return blocked;

  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const { sessionId, code } = parsed;

  const result = verifySignupOtp(sessionId, code);
  if (!result.ok) {
    const status = result.reason === "expired" ? 410 : result.reason === "exhausted" ? 429 : 401;
    return NextResponse.json(
      {
        error:
          result.reason === "expired"
            ? "Code expired. Request a new one."
            : result.reason === "exhausted"
              ? "Too many attempts. Start over."
              : "Incorrect code. Try again.",
      },
      { status },
    );
  }
  return NextResponse.json({ ok: true, token: result.token });
}
