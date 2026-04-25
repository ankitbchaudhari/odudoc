// POST /api/prescriptions/safety-check
//
// Stateless validator. Doctor app calls this BEFORE submitting a
// prescription so dangerous combinations / allergy hits are surfaced
// while the doctor can still edit. The mobile prescribe endpoint also
// calls this server-side as a belt-and-suspenders check — even if the
// client somehow skipped the validator, a high-severity warning blocks
// the prescription from being issued without an explicit override flag.

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { checkPrescriptionSafety, type SafetyInput } from "@/lib/drug-safety";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const SafetySchema = z.object({
  medicines: z
    .array(z.object({
      name: z.string().trim().min(1).max(200),
      dose: z.string().trim().max(200).optional(),
    }))
    .max(20),
  patient: z.object({
    age: z.number().int().min(0).max(130).optional(),
    sex: z.enum(["male", "female", "other"]).optional(),
    allergies: z.string().max(500).optional(),
    pregnant: z.boolean().optional(),
    breastfeeding: z.boolean().optional(),
    conditions: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "doctor") {
    return NextResponse.json(
      { error: "wrong_role", message: "Only doctors can use the safety checker." },
      { status: 403 }
    );
  }

  const parsed = await parseJson(request, SafetySchema);
  if (parsed instanceof NextResponse) return parsed;

  const warnings = checkPrescriptionSafety(parsed as SafetyInput);
  return NextResponse.json({
    warnings,
    counts: {
      high: warnings.filter((w) => w.severity === "high").length,
      medium: warnings.filter((w) => w.severity === "medium").length,
      low: warnings.filter((w) => w.severity === "low").length,
    },
  });
}
