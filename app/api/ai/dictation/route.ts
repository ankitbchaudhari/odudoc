// POST /api/ai/dictation
//
// Doctor-only. After a consult ends, the doctor records a short audio
// dictation of their findings + Rx. We send it to Gemini (free tier,
// audio-capable) with a clinical-structuring prompt; the response is
// the same Suggestion shape the text AI helper produces, so
// DoctorNotesPanel can pre-fill the Rx form with zero extra plumbing.
//
// Input: multipart/form-data
//   audio — the recorded blob (webm/opus typical from MediaRecorder)
//   context — optional JSON string with { patientName?, age?, sex?, allergies? }
//
// Output: { suggestion: Suggestion, transcript: string }

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB — Gemini inline cap is 20MB

const ALLOWED_MIME = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/ogg",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
]);

const SYSTEM_PROMPT = `You are a clinical decision-support assistant listening to a licensed doctor's post-consultation dictation. The doctor is describing symptoms, findings, diagnosis, and their intended prescription plan.

Your job has TWO parts, both returned in one JSON object:
1. transcript: a clean, verbatim-ish transcript of what the doctor said (fix obvious speech-to-text errors, remove filler words like "um", but keep all medical content intact).
2. suggestion: a structured clinical plan extracted from the dictation, matching this shape:
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email || user.role !== "doctor") {
    return NextResponse.json(
      { error: "Only doctors can use the dictation helper." },
      { status: 403 },
    );
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json(
      { error: "Dictation requires GEMINI_API_KEY (audio transcription)." },
      { status: 503 },
    );
  }

  try {
    const form = await req.formData();
    const audio = form.get("audio");
    const contextRaw = form.get("context");

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "Missing 'audio' form field" }, { status: 400 });
    }
    if (audio.size === 0) {
      return NextResponse.json({ error: "Empty audio" }, { status: 400 });
    }
    if (audio.size > MAX_BYTES) {
      return NextResponse.json({ error: "Audio exceeds 15MB limit" }, { status: 413 });
    }
    // MediaRecorder's MIME string often carries codec params; strip them
    // when checking allow-list but keep the full string for Gemini.
    const mimeBase = (audio.type || "audio/webm").split(";")[0];
    if (!ALLOWED_MIME.has(audio.type) && !ALLOWED_MIME.has(mimeBase)) {
      return NextResponse.json(
        { error: `Unsupported audio type: ${audio.type || "unknown"}` },
        { status: 415 },
      );
    }

    let context: { patientName?: string; age?: number; sex?: string; allergies?: string } = {};
    if (typeof contextRaw === "string") {
      try {
        context = JSON.parse(contextRaw) || {};
      } catch {
        /* ignore malformed context */
      }
    }
    const contextLine = [
      context.age && `Age: ${context.age}`,
      context.sex && `Sex: ${context.sex}`,
      context.allergies && `Known allergies: ${context.allergies}`,
    ]
      .filter(Boolean)
      .join(" · ");

    const userPrompt = [
      "Transcribe and structure the attached dictation.",
      contextLine && `Patient context: ${contextLine}`,
      "",
      'Respond with: { "transcript": string, "suggestion": { "treatment": string, "investigations": string[], "medicines": [{"name": string, "dose": string, "frequency": string, "duration": string}], "warning": string | null } }',
    ]
      .filter(Boolean)
      .join("\n");

    // Gemini expects base64-encoded inline audio.
    const buf = Buffer.from(await audio.arrayBuffer());
    const b64 = buf.toString("base64");
    const mimeType = mimeBase === "audio/webm" ? "audio/webm" : audio.type || "audio/webm";

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
      log.error("gemini dictation error", { status: res.status, body: errText.slice(0, 400) });
      return NextResponse.json(
        { error: "Transcription service unavailable." },
        { status: 502 },
      );
    }
    const payload = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const parsed = extractJson(text);
    if (!parsed) {
      log.error("dictation non-json response", { text: text.slice(0, 300) });
      return NextResponse.json(
        { error: "AI response was not valid JSON." },
        { status: 502 },
      );
    }

    const rawSug = (parsed.suggestion && typeof parsed.suggestion === "object" ? parsed.suggestion : {}) as Record<string, unknown>;
    const suggestion: Suggestion = {
      treatment: String(rawSug.treatment ?? "").trim(),
      investigations: Array.isArray(rawSug.investigations)
        ? (rawSug.investigations as unknown[]).slice(0, 8).map((s) => String(s).trim()).filter(Boolean)
        : [],
      medicines: Array.isArray(rawSug.medicines)
        ? (rawSug.medicines as unknown[]).slice(0, 8).map((m) => {
            const row = (m && typeof m === "object" ? m : {}) as Record<string, unknown>;
            return {
              name: String(row.name ?? "").trim(),
              dose: String(row.dose ?? "").trim(),
              frequency: String(row.frequency ?? "").trim(),
              duration: String(row.duration ?? "").trim(),
            };
          }).filter((m: MedicineRow) => m.name)
        : [],
      warning:
        typeof rawSug.warning === "string" && rawSug.warning.trim()
          ? rawSug.warning.trim()
          : undefined,
    };
    const transcript = typeof parsed.transcript === "string" ? parsed.transcript.trim() : "";

    return NextResponse.json({ suggestion, transcript });
  } catch (err) {
    log.error("dictation failed", err);
    return NextResponse.json(
      { error: "Dictation service unreachable." },
      { status: 502 },
    );
  }
}

function extractJson(text: string): Record<string, unknown> | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}
