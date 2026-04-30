// POST /api/ai/intake
//
// Body: { history: MedicalHistory, patientAge?, patientSex?, specialty? }
// Returns: { intake: PreVisitIntake }
//
// Auth: any clinician role. Patients never call this directly — the
// output is doctor-facing.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildPreVisitIntake, type IntakeMedicalHistory } from "@/lib/ai-intake";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { log } from "@/lib/log";

export const runtime = "nodejs";

function isClinician(role: string | undefined): boolean {
  return role === "doctor" || role === "admin" || role === "nurse";
}

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "ai-intake", 60, "10 m");
  if (blocked) return blocked;

  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isClinician(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    history?: IntakeMedicalHistory;
    patientAge?: string;
    patientSex?: string;
    specialty?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.history) {
    return NextResponse.json({ error: "history is required" }, { status: 400 });
  }

  try {
    const intake = await buildPreVisitIntake({
      history: body.history,
      patientAge: body.patientAge,
      patientSex: body.patientSex,
      specialty: body.specialty,
    });
    return NextResponse.json({ intake });
  } catch (err) {
    log.error("ai_intake.failed", err);
    const msg = err instanceof Error ? err.message : "Intake failed";
    return NextResponse.json(
      {
        error: /GEMINI_API_KEY/.test(msg)
          ? "AI intake is not configured."
          : "Could not build intake summary. Try again.",
      },
      { status: 502 }
    );
  }
}
