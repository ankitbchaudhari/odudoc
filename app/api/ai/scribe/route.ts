// POST /api/ai/scribe
//
// Multipart form-data with:
//   - audio    (Blob)         required — the consultation recording
//   - patientId (text)        optional — when present, we write an
//                              EMR audit row so the clinic has a
//                              compliance trail
//   - language (text)         optional — e.g. "Hindi", "Marathi"
//   - mode     (text)         optional — "soap" (default) or
//                              "transcribe-only" used by the long-
//                              recording chunking flow
//
// Returns:
//   - mode "soap":             { soap: ScribeSoap }
//   - mode "transcribe-only":  { transcript: string, durationMs?: number }
//
// Hard cap on file size — a 30-min consultation in WebM/Opus 32kbps mono
// is ~7 MB. We allow up to 25 MB which covers ~one hour with headroom.
// Anything larger should be split client-side via the long-recording
// flow that calls this endpoint with mode=transcribe-only per chunk.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { transcribeToSoap, transcribeOnly } from "@/lib/ai-scribe";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { getPatientById, resolveClinic, writeAudit, reloadPatients } from "@/lib/emr-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 120; // Vercel — Gemini audio can take a while

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

function isClinician(role: string | undefined): boolean {
  return role === "doctor" || role === "admin" || role === "nurse";
}

export async function POST(req: NextRequest) {
  // Rate limit is strict — each call is expensive (~$0.05 of Gemini
  // compute for a 15-min consultation).
  const blocked = await enforceRateLimit(req, "ai-scribe", 20, "10 m");
  if (blocked) return blocked;

  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const role = user?.role;
  if (!isClinician(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "Missing 'audio' file in form" }, { status: 400 });
  }
  if (audio.size === 0) {
    return NextResponse.json({ error: "Audio file is empty" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Audio too large (${Math.round(audio.size / 1024 / 1024)} MB). Use long-recording mode (chunked uploads).` },
      { status: 413 }
    );
  }

  const patientId = (form.get("patientId") as string | null) || "";
  const language = (form.get("language") as string | null) || "";
  const mode = ((form.get("mode") as string | null) || "soap").toLowerCase();

  // Audit trail — only for SOAP mode (the chunked transcribe-only flow
  // writes its own audit at finalize time so we don't generate N audit
  // rows for one consultation).
  let patientEmail: string | undefined;
  if (patientId && mode === "soap") {
    try {
      const clinic = await resolveClinic(user?.email, role);
      if (clinic) {
        await reloadPatients();
        const ownerScope = clinic.role === "admin" ? undefined : clinic.ownerEmail;
        const patient = await getPatientById(patientId, ownerScope);
        if (patient) {
          patientEmail = patient.email;
          // Stamp recording_started + consent_acknowledged here. The
          // browser already showed the consent modal before the doctor
          // could click record; we treat that click as consent ack.
          await writeAudit({
            ownerEmail: clinic.ownerEmail,
            actorEmail: user?.email || "",
            action: "scribe.consent_acknowledged",
            resource: "patient",
            resourceId: patientId,
            meta: { language: language || "auto" },
          });
          await writeAudit({
            ownerEmail: clinic.ownerEmail,
            actorEmail: user?.email || "",
            action: "scribe.recording_started",
            resource: "patient",
            resourceId: patientId,
            meta: { audioBytes: audio.size, mime: audio.type || "audio/webm" },
          });
        }
      }
    } catch (err) {
      log.warn("ai_scribe.audit_failed", { err: String(err) });
      // Compliance trail is best-effort — don't fail the call if audit
      // writes are flaky. We log it loudly so the operator notices.
    }
  }

  const buf = await audio.arrayBuffer();
  const mime = audio.type || "audio/webm";

  try {
    if (mode === "transcribe-only") {
      const transcript = await transcribeOnly({
        audio: buf,
        mimeType: mime,
        languageHint: language || undefined,
        callerEmail: user?.email,
        patientEmail,
      });
      return NextResponse.json({ transcript });
    }

    const soap = await transcribeToSoap({
      audio: buf,
      mimeType: mime,
      languageHint: language || undefined,
      callerEmail: user?.email,
      patientEmail,
    });

    if (patientId) {
      try {
        const clinic = await resolveClinic(user?.email, role);
        if (clinic) {
          await writeAudit({
            ownerEmail: clinic.ownerEmail,
            actorEmail: user?.email || "",
            action: "scribe.recording_completed",
            resource: "patient",
            resourceId: patientId,
            meta: { language: language || "auto" },
          });
        }
      } catch (err) {
        log.warn("ai_scribe.completion_audit_failed", { err: String(err) });
      }
    }

    return NextResponse.json({ soap });
  } catch (err) {
    log.error("ai_scribe.failed", err);
    const msg = err instanceof Error ? err.message : "Scribe failed";
    return NextResponse.json(
      {
        error: /GEMINI_API_KEY/.test(msg)
          ? "AI scribe is not configured."
          : "Could not transcribe audio. Try recording again with clearer speech.",
        detail: process.env.NODE_ENV === "development" ? msg : undefined,
      },
      { status: 502 }
    );
  }
}
