// POST /api/ai/scribe/finalize
//
// Companion to /api/ai/scribe?mode=transcribe-only — used by the long-
// recording flow on the client. The client records continuously, slices
// the audio into 4-min chunks, transcribes each chunk via the regular
// scribe endpoint with mode=transcribe-only (returns plain text), then
// concatenates the transcripts and POSTs them here for SOAP structuring.
//
// One short Gemini call regardless of the original recording length —
// avoids holding any single Lambda open beyond the Vercel timeout.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { finalizeFromTranscript } from "@/lib/ai-scribe";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { resolveClinic, writeAudit } from "@/lib/emr-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 60;

function isClinician(role: string | undefined): boolean {
  return role === "doctor" || role === "admin" || role === "nurse";
}

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "ai-scribe-finalize", 30, "10 m");
  if (blocked) return blocked;

  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const role = user?.role;
  if (!isClinician(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { transcript?: string; patientId?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const transcript = (body.transcript || "").trim();
  if (!transcript) {
    return NextResponse.json({ error: "transcript is required" }, { status: 400 });
  }
  if (transcript.length > 200_000) {
    return NextResponse.json(
      { error: "Transcript is unusually long. Split the consultation and try again." },
      { status: 413 }
    );
  }

  try {
    const soap = await finalizeFromTranscript({
      transcript,
      languageHint: body.language,
      callerEmail: user?.email,
    });

    if (body.patientId) {
      try {
        const clinic = await resolveClinic(user?.email, role);
        if (clinic) {
          await writeAudit({
            ownerEmail: clinic.ownerEmail,
            actorEmail: user?.email || "",
            action: "scribe.recording_completed",
            resource: "patient",
            resourceId: body.patientId,
            meta: { mode: "long-recording", language: body.language || "auto", chars: transcript.length },
          });
        }
      } catch (err) {
        log.warn("ai_scribe_finalize.audit_failed", { err: String(err) });
      }
    }

    return NextResponse.json({ soap });
  } catch (err) {
    log.error("ai_scribe_finalize.failed", err);
    const msg = err instanceof Error ? err.message : "Finalize failed";
    return NextResponse.json(
      { error: /GEMINI_API_KEY/.test(msg) ? "AI scribe is not configured." : "Could not produce SOAP from transcript." },
      { status: 502 }
    );
  }
}
