// AI patient-chart summary endpoint.
//
// GET /api/emr/patients/[id]/summary
//   Returns a Gemini-generated summary of the patient's chart for the
//   doctor to read at a glance. Scoped to the authed user's clinic so
//   one doctor can never request a summary of another doctor's patient.
//
// Rate limited per-IP — Gemini calls cost real money and a runaway
// loop on the chart page (e.g. a buggy useEffect) shouldn't drain the
// monthly quota. 30 calls / 10 min is generous for normal use (one
// per chart open), tight enough to catch loops.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const blocked = await enforceRateLimit(req, "emr-ai-summary", 30, "10 m");
  if (blocked) return blocked;

  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const ownerScope = clinic.role === "admin" ? undefined : clinic.ownerEmail;

  // Reload all three stores. Cheap on warm Lambda (just reads the
  // app_kv blob), guarantees we see the freshest data the doctor just
  // wrote without waiting for the next cold start.
  await Promise.all([reloadPatients(), reloadVisits(), reloadFiles()]);

  const patient = await getPatientById(id, ownerScope);
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const [visits, files] = await Promise.all([
    listVisitsForPatient(id, ownerScope),
    listFilesForPatient(id, ownerScope),
  ]);

  try {
    const summary = await summarisePatientChart({ patient, visits, files });
    return NextResponse.json({ summary });
  } catch (err) {
    log.error("ai-emr.summary_failed", err, { patientId: id });
    const msg = err instanceof Error ? err.message : "AI summary failed";
    // Surface the message to the UI so the doctor knows whether to retry
    // (transient 5xx from Gemini) or escalate (missing API key).
    const isConfig = /GEMINI_API_KEY/.test(msg);
    return NextResponse.json(
      {
        error: isConfig
          ? "AI summary is not configured for this deployment. Contact your admin."
          : "Could not generate summary. Try again in a moment.",
        detail: process.env.NODE_ENV === "development" ? msg : undefined,
      },
      { status: isConfig ? 501 : 502 }
    );
  }
}
