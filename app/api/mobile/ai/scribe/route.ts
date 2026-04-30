// POST /api/mobile/ai/scribe
//
// Mobile-Bearer-auth equivalent of /api/ai/scribe (short-form mode).
// Multipart form-data:
//   - audio       (Blob)   required
//   - patientId   (text)   optional — when present, audit row is written
//   - language    (text)   optional — language hint, e.g. "Hindi"
//
// Returns: { soap: { chiefComplaint, subjective, objective, assessment, plan, vitals?, transcript? } }

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { transcribeToSoap } from "@/lib/ai-scribe";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { getPatientById, resolveClinic, writeAudit, reloadPatients } from "@/lib/emr-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "mobile-ai-scribe", 20, "10 m");
  if (blocked) return blocked;

  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "doctor" && auth.role !== "admin") {
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
    return NextResponse.json({ error: "Missing 'audio'" }, { status: 400 });
  }
  if (audio.size === 0) {
    return NextResponse.json({ error: "Audio is empty" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Audio too large (${Math.round(audio.size / 1024 / 1024)} MB)` },
      { status: 413 },
    );
  }

  const patientId = (form.get("patientId") as string | null) || "";
  const language = (form.get("language") as string | null) || "";

  // Audit + patient lookup (best-effort)
  let patientEmail: string | undefined;
  if (patientId) {
    try {
      const clinic = await resolveClinic(auth.email, auth.role);
      if (clinic) {
        await reloadPatients();
        const ownerScope = clinic.role === "admin" ? undefined : clinic.ownerEmail;
        const patient = await getPatientById(patientId, ownerScope);
        if (patient) {
          patientEmail = patient.email;
          await writeAudit({
            ownerEmail: clinic.ownerEmail,
            actorEmail: auth.email,
            action: "scribe.consent_acknowledged",
            resource: "patient",
            resourceId: patientId,
            meta: { language: language || "auto", platform: "mobile" },
          });
          await writeAudit({
            ownerEmail: clinic.ownerEmail,
            actorEmail: auth.email,
            action: "scribe.recording_started",
            resource: "patient",
            resourceId: patientId,
            meta: { audioBytes: audio.size, mime: audio.type, platform: "mobile" },
          });
        }
      }
    } catch (err) {
      log.warn("mobile_ai_scribe.audit_failed", { err: String(err) });
    }
  }

  const buf = await audio.arrayBuffer();
  const mime = audio.type || "audio/m4a";

  try {
    const soap = await transcribeToSoap({
      audio: buf,
      mimeType: mime,
      languageHint: language || undefined,
      callerEmail: auth.email,
      patientEmail,
    });

    if (patientId) {
      try {
        const clinic = await resolveClinic(auth.email, auth.role);
        if (clinic) {
          await writeAudit({
            ownerEmail: clinic.ownerEmail,
            actorEmail: auth.email,
            action: "scribe.recording_completed",
            resource: "patient",
            resourceId: patientId,
            meta: { language: language || "auto", platform: "mobile" },
          });
        }
      } catch (err) {
        log.warn("mobile_ai_scribe.completion_audit_failed", { err: String(err) });
      }
    }

    return NextResponse.json({ soap });
  } catch (err) {
    log.error("mobile_ai_scribe.failed", err);
    const msg = err instanceof Error ? err.message : "Scribe failed";
    return NextResponse.json(
      {
        error: /GEMINI_API_KEY/.test(msg)
          ? "AI scribe is not configured."
          : "Could not transcribe. Try recording again with clearer speech.",
      },
      { status: 502 },
    );
  }
}
