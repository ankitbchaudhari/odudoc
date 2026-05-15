// Complete a self-service password reset. Verifies the single-use token
// from the email link, writes the new hashed password, then consumes
// the token so the link can't be reused.

import { NextRequest, NextResponse } from "next/server";
import { setUserPassword } from "@/lib/users-store";
import {
  consumeResetToken,
  peekResetToken,
} from "@/lib/password-reset-store";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

const ResetSchema = z.object({
  token: nonEmptyString,
  password: z.string().min(8).max(200),
});

export const runtime = "nodejs";

// GET /api/auth/reset-password?token=XYZ — validity check for the page
// to show "invalid/expired" up front.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const rec = await peekResetToken(token);
  if (!rec) {
    return NextResponse.json({ valid: false }, { status: 200 });
  }
  return NextResponse.json({ valid: true, email: rec.email });
}

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "reset-password", 10, "15 m");
  if (blocked) return blocked;
  const parsed = await parseJson(req, ResetSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { token, password } = parsed;

  const rec = await consumeResetToken(token);
  if (!rec) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Please request a new one." },
      { status: 400 }
    );
  }

  const user = setUserPassword(rec.email, password);
  if (!user) {
    // Extremely unlikely (user deleted between token creation and use) —
    // but surface clearly if it happens.
    return NextResponse.json(
      { error: "Account no longer exists" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
