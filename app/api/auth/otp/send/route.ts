import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, validatePassword } from "@/lib/users-store";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z, emailSchema } from "@/lib/validate";

import { log } from "@/lib/log";
const OtpSendSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

/**
 * POST /api/auth/otp/send
 * Body: { email, password }
 *
 * Validates credentials (without logging in), then generates and sends OTP
 * codes to the user's email + phone. Returns { success, phoneHint, emailHint }.
 *
 * If credentials are invalid, returns 401. On success, codes are sent and the
 * client redirects to /auth/verify.
 */
export async function POST(request: NextRequest) {
  try {
    const blocked = await enforceRateLimit(request, "otp-send", 5, "10 m");
    if (blocked) return blocked;
    const parsed = await parseJson(request, OtpSendSchema);
    if (parsed instanceof NextResponse) return parsed;
    const { email, password } = parsed;

    const user = findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email" },
        { status: 401 }
      );
    }

    const valid = validatePassword(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // TEMPORARY: SMS + email 2FA verification is disabled. All authenticated
    // users skip the OTP step and sign in directly. Re-enable by restoring
    // the previous admin/demo-only bypass logic and the createOtp/sendOtpCodes
    // calls below.
    return NextResponse.json({
      success: true,
      skipOtp: true,
      role: user.role,
    });
  } catch (error) {
    log.error("OTP send error:", error);
    return NextResponse.json(
      { error: "Failed to send verification codes" },
      { status: 500 }
    );
  }
}
