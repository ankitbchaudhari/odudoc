// POST /api/ai/drug-check
//
// Body: { medicines: MedicineRow[], allergies?, chronicConditions?, age?, sex? }
// Returns: { result: DrugCheckResult }
//
// Auth: any logged-in doctor (or admin). Rate-limited because the
// caller debounces on every keystroke in the medicines table — we want
// to be tolerant of bursts but cap a runaway loop.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkDrugInteractions } from "@/lib/ai-drug-check";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { log } from "@/lib/log";
import type { MedicineRow } from "@/lib/ai-prescription";

export const runtime = "nodejs";

function isClinician(role: string | undefined): boolean {
  return role === "doctor" || role === "admin" || role === "nurse" || role === "frontdesk";
}

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "ai-drug-check", 60, "10 m");
  if (blocked) return blocked;

  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isClinician(role)) {
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
    });
    return NextResponse.json({ result });
  } catch (err) {
    log.error("ai_drug_check.failed", err);
    const msg = err instanceof Error ? err.message : "Drug check failed";
    return NextResponse.json(
      {
        error: /GEMINI_API_KEY/.test(msg)
          ? "AI drug-check is not configured."
          : "Could not run safety check. Try again.",
      },
      { status: 502 }
    );
  }
}
