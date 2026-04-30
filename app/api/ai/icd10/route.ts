// POST /api/ai/icd10
//
// Body: { chiefComplaint, subjective?, objective?, assessment, plan?, vitals?,
//         patientAge?, patientSex? }
// Returns: { result: { suggestions: [...], generatedAt } }

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { suggestIcd10 } from "@/lib/ai-icd10";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { log } from "@/lib/log";

export const runtime = "nodejs";

function isClinician(role: string | undefined): boolean {
  return role === "doctor" || role === "admin" || role === "nurse";
}

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "ai-icd10", 30, "10 m");
  if (blocked) return blocked;

  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const role = user?.role;
  if (!isClinician(role)) {
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
      callerEmail: user?.email,
    });
    return NextResponse.json({ result });
  } catch (err) {
    log.error("ai_icd10.failed", err);
    const msg = err instanceof Error ? err.message : "ICD-10 suggest failed";
    return NextResponse.json(
      {
        error: /GEMINI_API_KEY/.test(msg)
          ? "AI ICD-10 helper is not configured."
          : "Could not suggest codes. Try again.",
      },
      { status: 502 }
    );
  }
}
