// Triage chatbot endpoints. Both unauthenticated — the public
// /doctors/[id] profile page calls these without a session.

import { NextRequest, NextResponse } from "next/server";
import { runTriage, buildFollowUps, type TriageInput } from "@/lib/triage/engine";
import { findBucket } from "@/lib/clinical-ai/differential-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = String(body.action || "triage");

  if (action === "follow_ups") {
    const chief = String(body.chiefComplaint || "");
    const bucket = findBucket(chief);
    return NextResponse.json({
      bucketId: bucket?.id || null,
      questions: buildFollowUps(bucket),
    });
  }

  // Default: full triage.
  const input: TriageInput = {
    chiefComplaint: String(body.chiefComplaint || ""),
    modifiers: Array.isArray(body.modifiers) ? body.modifiers : [],
    ageBand: body.ageBand,
    durationDays: typeof body.durationDays === "number" ? body.durationDays : undefined,
    severity: typeof body.severity === "number" ? body.severity : undefined,
    doctorSpecialty: body.doctorSpecialty ? String(body.doctorSpecialty) : undefined,
  };
  if (!input.chiefComplaint.trim()) {
    return NextResponse.json({ error: "missing_chief_complaint" }, { status: 400 });
  }
  return NextResponse.json(runTriage(input));
}
