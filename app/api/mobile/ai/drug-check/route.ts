// POST /api/mobile/ai/drug-check
//
// Mobile-Bearer-auth. Body: { medicines, allergies?, chronicConditions?,
// age?, sex? }. Returns { result: DrugCheckResult }.

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { checkDrugInteractions } from "@/lib/ai-drug-check";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { log } from "@/lib/log";
import type { MedicineRow } from "@/lib/ai-prescription";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "mobile-ai-drug-check", 60, "10 m");
  if (blocked) return blocked;

  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "doctor" && auth.role !== "admin" && auth.role !== "nurse") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    medicines?: MedicineRow[];
    allergies?: string;
    chronicConditions?: string;
    age?: string;
    sex?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const meds = Array.isArray(body.medicines) ? body.medicines : [];
  if (meds.length === 0) {
    return NextResponse.json({
      result: {
        severity: "none",
        issues: [],
        alternatives: [],
        generatedAt: new Date().toISOString(),
      },
    });
  }

  try {
    const result = await checkDrugInteractions({
      medicines: meds,
      allergies: body.allergies,
      chronicConditions: body.chronicConditions,
      age: body.age,
      sex: body.sex,
      callerEmail: auth.email,
    });
    return NextResponse.json({ result });
  } catch (err) {
    log.error("mobile_ai_drug_check.failed", err);
    const msg = err instanceof Error ? err.message : "Drug check failed";
    return NextResponse.json(
      {
        error: /GEMINI_API_KEY/.test(msg)
          ? "AI drug-check is not configured."
          : "Could not run safety check.",
      },
      { status: 502 }
    );
  }
}
