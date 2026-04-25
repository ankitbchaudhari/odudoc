// POST /api/ai/dictation/mobile
//
// JWT-authenticated parallel of /api/ai/dictation. Accepts a multipart
// audio upload and returns { transcript, suggestion } the doctor app
// drops into the notes panel. Same Gemini-based implementation but
// guarded by mobile JWT instead of NextAuth session.
//
// Request: multipart/form-data
//   audio    — recorded blob (AAC/M4A from Android MediaRecorder, or
//              webm/opus from web fallback)
//   context? — JSON string { age?, sex?, allergies? }
//
// Response:
//   { transcript: string, suggestion: Suggestion }

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/ogg",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  // Android MediaRecorder MPEG_4 / AAC default
  "audio/3gpp",
  "audio/amr",
]);

const SYSTEM_PROMPT = `You are a clinical decision-support assistant listening to a licensed doctor's post-consultation dictation. The doctor is describing symptoms, findings, diagnosis, and their intended prescription plan.

Your job has TWO parts, both returned in one JSON object:
1. transcript: a clean, verbatim-ish transcript of what the doctor said (fix obvious speech-to-text errors, remove filler words like "um", but keep all medical content intact).
2. suggestion: a structured clinical plan extracted from the dictation:
   - treatment: 1–3 short sentences of non-pharmacologic advice
   - investigations: 0–5 recommended investigations (strings)
   - medicines: 0–5 medicines with { name, dose, frequency, duration }
   - warning: optional one-liner if the case warrants urgent in-person care

Rules:
- Use generic drug names only.
- If the doctor's dictation is unclear or incomplete on any section, leave that section empty rather than guessing.
- Never invent medications or investigations the doctor didn't say.
- Respond with ONLY a single JSON object. No prose, no markdown fences.`;

interface MedicineRow {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}

interface Suggestion {
  treatment: string;
  investigations: string[];
  medicines: MedicineRow[];
  warning?: string;
}

export async function POST(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "doctor") {
    return NextResponse.json(
      { error: "wrong_role", message: "Only doctors can use the dictation helper." },
      { status: 403 }
    );
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json(
      { error: "no_provider", message: "Dictation requires GEMINI_API_KEY." },
      { status: 503 }
    );
  }

  try {
    const form = await request.formData();
    const audio = form.get("audio");
    const contextRaw = form.get("context");

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "missing_audio" }, { status: 400 });
    }
    if (audio.size === 0) {
      return NextResponse.json({ error: "empty_audio" }, { status: 400 });
    }
    if (audio.size > MAX_BYTES) {
      return NextResponse.json({ error: "audio_too_large" }, { status: 413 });
    }
    const mimeBase = (audio.type || "audio/mp4").split(";")[0];
    if (!ALLOWED_MIME.has(audio.type) && !ALLOWED_MIME.has(mimeBase)) {
      return NextResponse.json(
        { error: "unsupported_audio_type", message: `Unsupported: ${audio.type || "unknown"}` },
        { status: 415 }
      );
    }

    let context: { age?: number; sex?: string; allergies?: string } = {};
    if (typeof contextRaw === "string") {
      try { context = JSON.parse(contextRaw) || {}; } catch { /* ignore */ }
    }
    const contextLine = [
      context.age && `Age: ${context.age}`,
      context.sex && `Sex: ${context.sex}`,
      context.allergies && `Known allergies: ${context.allergies}`,
    ].filter(Boolean).join(" · ");

    const userPrompt = [
      "Transcribe and structure the attached dictation.",
      contextLine && `Patient context: ${contextLine}`,
      "",
      'Respond with: { "transcript": string, "suggestion": { "treatment": string, "investigations": string[], "medicines": [{"name": string, "dose": string, "frequency": string, "duration": string}], "warning": string | null } }',
    ].filter(Boolean).join("\n");

    const buf = Buffer.from(await audio.arrayBuffer());
    const b64 = buf.toString("base64");
    const mimeType = audio.type || mimeBase || "audio/mp4";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [
              { text: userPrompt },
              { inline_data: { mime_type: mimeType, data: b64 } },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      log.error("gemini dictation mobile error", undefined, { status: res.status, body: errText.slice(0, 400) });
      return NextResponse.json(
        { error: "upstream_error", message: "Transcription service unavailable." },
        { status: 502 }
      );
    }
    const payload = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const parsed = extractJson(text);
    if (!parsed) {
      log.error("dictation mobile non-json", undefined, { text: text.slice(0, 300) });
      return NextResponse.json(
        { error: "invalid_response", message: "AI response was not valid JSON." },
        { status: 502 }
      );
    }

    const rawSug = (parsed.suggestion && typeof parsed.suggestion === "object"
      ? parsed.suggestion
      : {}) as Record<string, unknown>;

    const suggestion: Suggestion = {
      treatment: String(rawSug.treatment ?? "").trim(),
      investigations: Array.isArray(rawSug.investigations)
        ? rawSug.investigations.slice(0, 8).map((s: unknown) => String(s).trim()).filter(Boolean)
        : [],
      medicines: Array.isArray(rawSug.medicines)
        ? rawSug.medicines.slice(0, 8).map((m: Record<string, unknown>) => ({
            name: String(m.name ?? "").trim(),
            dose: String(m.dose ?? "").trim(),
            frequency: String(m.frequency ?? "").trim(),
            duration: String(m.duration ?? "").trim(),
          })).filter((m: MedicineRow) => m.name)
        : [],
      warning: typeof rawSug.warning === "string" && rawSug.warning.trim()
        ? rawSug.warning.trim()
        : undefined,
    };

    const transcript = typeof parsed.transcript === "string" ? parsed.transcript.trim() : "";

    return NextResponse.json({ transcript, suggestion });
  } catch (err) {
    log.error("dictation mobile threw", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

function extractJson(text: string): Record<string, unknown> | null {
  if (!text) return null;
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch { /* fall through */ }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}
