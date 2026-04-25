// POST /api/ai/prescription/mobile
//
// Mobile-JWT-protected variant of /api/ai/prescription. Accepts the same
// input { symptoms, diagnosis, age?, sex?, allergies? } and returns the
// same { suggestion } shape so the doctor app's notes panel can use it
// drop-in. All the prompt + provider fan-out lives in lib/ai-prescription.ts
// — this route is just an auth + transport wrapper.

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { suggestPrescription, type SuggestInput } from "@/lib/ai-prescription";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({
  symptoms: z.string().max(2000).optional(),
  diagnosis: z.string().max(500).optional(),
  age: z.number().int().min(0).max(130).optional(),
  sex: z.enum(["male", "female", "other"]).optional(),
  allergies: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "doctor") {
    return NextResponse.json(
      { error: "wrong_role", message: "Only doctors can use the AI helper." },
      { status: 403 }
    );
  }

  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  const result = await suggestPrescription(parsed as SuggestInput);
  if (!result.ok) {
    const statusByReason: Record<typeof result.reason, number> = {
      bad_input: 400,
      no_provider: 503,
      invalid_response: 502,
      upstream_error: 502,
    };
    return NextResponse.json(
      { error: result.reason, message: result.message },
      { status: statusByReason[result.reason] }
    );
  }
  return NextResponse.json({ suggestion: result.suggestion, provider: result.provider });
}
