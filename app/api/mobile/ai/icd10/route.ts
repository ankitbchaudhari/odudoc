// POST /api/mobile/ai/icd10
//
// Mobile-Bearer-auth. Body: { chiefComplaint, subjective?, objective?,
// assessment, plan?, vitals?, patientAge?, patientSex? }
// Returns: { result: { suggestions: [...], generatedAt } }

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { suggestIcd10 } from "@/lib/ai-icd10";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "mobile-ai-icd10", 30, "10 m");
  if (blocked) return blocked;

  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "doctor" && auth.role !== "admin" && auth.role !== "nurse") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    chiefComplaint?: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    vitals?: string;
    patientAge?: string;
    patientSex?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.chiefComplaint && !body.assessment) {
    return NextResponse.json(
      { error: "Need at least chief complaint or assessment to suggest codes." },
      { status: 400 }
    );
  }

  try {
    const result = await suggestIcd10({
      chiefComplaint: body.chiefComplaint || "",
      subjective: body.subjective,
      objective: body.objective,
      assessment: body.assessment || "",
      plan: body.plan,
      vitals: body.vitals,
      patientAge: body.patientAge,
      patientSex: body.patientSex,
      callerEmail: auth.email,
    });
    return NextResponse.json({ result });
  } catch (err) {
    log.error("mobile_ai_icd10.failed", err);
    const msg = err instanceof Error ? err.message : "ICD-10 suggest failed";
    return NextResponse.json(
      {
        error: /GEMINI_API_KEY/.test(msg)
          ? "AI ICD-10 helper is not configured."
          : "Could not suggest codes.",
      },
      { status: 502 }
    );
  }
}
