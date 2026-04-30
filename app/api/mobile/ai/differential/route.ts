// POST /api/mobile/ai/differential
//
// Mobile-Bearer-auth differential-diagnosis suggester.

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { suggestDifferentials } from "@/lib/ai-differential";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "mobile-ai-differential", 30, "10 m");
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
    vitals?: string;
    patientAge?: string;
    patientSex?: string;
    patientAllergies?: string;
    patientChronicConditions?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.chiefComplaint && !body.subjective) {
    return NextResponse.json(
      { error: "Need chief complaint or subjective to suggest a differential." },
      { status: 400 }
    );
  }

  try {
    const result = await suggestDifferentials({
      chiefComplaint: body.chiefComplaint || "",
      subjective: body.subjective,
      objective: body.objective,
      vitals: body.vitals,
      patientAge: body.patientAge,
      patientSex: body.patientSex,
      patientAllergies: body.patientAllergies,
      patientChronicConditions: body.patientChronicConditions,
      callerEmail: auth.email,
    });
    return NextResponse.json({ result });
  } catch (err) {
    log.error("mobile_ai_differential.failed", err);
    const msg = err instanceof Error ? err.message : "Differential failed";
    return NextResponse.json(
      {
        error: /GEMINI_API_KEY/.test(msg)
          ? "AI differential helper is not configured."
          : "Could not produce differential.",
      },
      { status: 502 }
    );
  }
}
