// POST /api/mobile/ai/patient-summary
//
// Mobile-Bearer-auth equivalent of /api/emr/patients/[id]/summary.
// Body: { patientId: string }
// Returns: { summary: PatientSummary }
//
// Doctor app uses this from the patient detail screen — opens the AI
// summary card at the top so the doctor walks into the next visit
// already oriented.

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import {
  getPatientById,
  listVisitsForPatient,
  listFilesForPatient,
  reloadPatients,
  reloadVisits,
  reloadFiles,
  resolveClinic,
} from "@/lib/emr-store";
import { summarisePatientChart } from "@/lib/ai-emr";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "mobile-emr-summary", 30, "10 m");
  if (blocked) return blocked;

  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "doctor" && auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { patientId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const patientId = body.patientId?.trim();
  if (!patientId) {
    return NextResponse.json({ error: "patientId required" }, { status: 400 });
  }

  const clinic = await resolveClinic(auth.email, auth.role);
  if (!clinic) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const ownerScope = clinic.role === "admin" ? undefined : clinic.ownerEmail;

  await Promise.all([reloadPatients(), reloadVisits(), reloadFiles()]);

  const patient = await getPatientById(patientId, ownerScope);
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const [visits, files] = await Promise.all([
    listVisitsForPatient(patientId, ownerScope),
    listFilesForPatient(patientId, ownerScope),
  ]);

  try {
    const summary = await summarisePatientChart({
      patient,
      visits,
      files,
      callerEmail: auth.email,
    });
    return NextResponse.json({ summary });
  } catch (err) {
    log.error("mobile_ai.patient_summary_failed", err, { patientId });
    const msg = err instanceof Error ? err.message : "AI summary failed";
    return NextResponse.json(
      {
        error: /GEMINI_API_KEY/.test(msg)
          ? "AI summary is not configured."
          : "Could not generate summary. Try again.",
      },
      { status: 502 },
    );
  }
}
