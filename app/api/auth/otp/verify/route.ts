import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp-store";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z, emailSchema } from "@/lib/validate";

import { log } from "@/lib/log";
const OtpVerifySchema = z.object({
  email: emailSchema,
  emailCode: z.string().regex(/^\d{4,8}$/),
  phoneCode: z.string().regex(/^\d{4,8}$/),
});

/**
 * POST /api/auth/otp/verify
 * Body: { email, emailCode, phoneCode }
 * Returns: { success: true, token }  on success
 *          { error }                 on failure
 */
export async function POST(request: NextRequest) {
  try {
    const blocked = await enforceRateLimit(request, "otp-verify", 10, "10 m");
    if (blocked) return blocked;
    const parsed = await parseJson(request, OtpVerifySchema);
    if (parsed instanceof NextResponse) return parsed;
    const { email, emailCode, phoneCode } = parsed;

    const result = verifyOtp(email, emailCode, phoneCode);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({ success: true, token: result.token });
  } catch (error) {
    log.error("OTP verify error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
