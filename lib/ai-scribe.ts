// AI ambient scribe: turns a recording of a doctor-patient consultation
// into a structured SOAP note.
//
// Pipeline:
//   1. Browser records audio (WebM/Opus, MediaRecorder API).
//   2. The /api/ai/scribe route receives the file as multipart/form-data.
//   3. We hand the audio bytes to Gemini Flash with audio modality
//      enabled, plus a system prompt that asks for a structured SOAP
//      note in JSON format.
//   4. Doctor reviews + edits the auto-filled fields before saving the
//      visit. Nothing persists until they press "Save visit".
//
// Privacy model: this is consent-required. The browser side shows a
// modal that the doctor + patient must both accept verbally before the
// recording starts; that consent fact is stamped into the audit log
// (out of scope for Phase 2 — the doctor's word is the legal record
// for now). The audio buffer is passed straight to Gemini without
// being persisted anywhere on OduDoc's infrastructure.
//
// Gemini supports audio inputs via the `inlineData` part with mime
// "audio/webm" (Opus). Files up to ~20 MB are fine inline; longer
// consultations can be split client-side.

import { log } from "./log";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const FALLBACKS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

export interface ScribeSoap {
  chiefComplaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  vitals?: string;
  /** Raw transcript Gemini saw — useful for the doctor to verify a fact
   *  the structured note glossed over. Kept short (truncated server-
   *  side if very long) so the response stays under the JSON schema cap. */
  transcript?: string;
}

const SYSTEM_PROMPT = `You are a medical scribe transcribing a consultation between a doctor and a patient. The audio is a real conversation — there will be filler words, interruptions, the doctor thinking aloud. Your job:

1. Transcribe the conversation in your head (do not output the raw transcript except as a brief summary in the "transcript" field).
2. Produce a structured SOAP note in JSON.

SOAP guidance:
- chiefComplaint: 1 line — why is the patient here today?
- subjective (S): symptoms in the patient's own words; history of present illness; relevant past history mentioned in the call.
- objective (O): vital signs and exam findings the doctor states aloud (e.g. "BP 130/85", "lungs clear"). Empty string if none mentioned.
- assessment (A): the doctor's working diagnosis or clinical impression. If they gave a differential, include the top items.
- plan (P): investigations ordered, medications prescribed (with doses if stated), follow-up timing, lifestyle advice.
- vitals: a one-line "BP/HR/Temp/SpO2" string if the doctor read vitals out loud. Empty otherwise.
- transcript: ~3-5 sentence factual summary of what was said; this is shown to the doctor as a sanity check.

Rules:
- Output ONLY the JSON object — no prose, no markdown.
- Never invent vitals, doses, or findings that weren't in the audio.
- If the audio is unclear or empty, return empty strings for each field rather than guessing.
- Use clinical, professional language.
- This is decision support; the doctor reviews everything before saving.`;

export interface ScribeInput {
  /** Audio bytes (WebM/Opus from MediaRecorder, or MP3/M4A/WAV). */
  audio: ArrayBuffer | Buffer;
  /** MIME type of the audio. Default "audio/webm". */
  mimeType?: string;
}

function toBase64(buf: ArrayBuffer | Buffer): string {
  const b = buf instanceof ArrayBuffer ? Buffer.from(buf) : buf;
  return b.toString("base64");
}

export async function transcribeToSoap(input: ScribeInput): Promise<ScribeSoap> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const mime = input.mimeType || "audio/webm";
  const dataB64 = toBase64(input.audio);

  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: { mimeType: mime, data: dataB64 },
          },
          {
            text: "Transcribe this consultation and produce the structured JSON SOAP note now.",
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          chiefComplaint: { type: "string" },
          subjective: { type: "string" },
          objective: { type: "string" },
          assessment: { type: "string" },
          plan: { type: "string" },
          vitals: { type: "string" },
          transcript: { type: "string" },
        },
        required: ["chiefComplaint", "subjective", "objective", "assessment", "plan"],
      },
    },
  });

  const modelsToTry = [GEMINI_MODEL, ...FALLBACKS.filter((m) => m !== GEMINI_MODEL)];
  let res: Response | null = null;
  let lastErr = "";

  for (const model of modelsToTry) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: requestBody,
      }
    );
    if (r.ok) {
      res = r;
      break;
    }
    lastErr = await r.text().catch(() => "");
    log.warn("ai_scribe.model_failed", { model, status: r.status });
    // Don't retry-loop in this helper — one shot per model. Audio
    // transcription is heavy; the caller can ask the user to retry.
  }

  if (!res) {
    throw new Error(`All Gemini models exhausted. ${lastErr.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!raw) {
    throw new Error("Gemini returned no text content");
  }

  let parsed: Partial<ScribeSoap>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    log.error("ai_scribe.invalid_json", undefined, { snippet: raw.slice(0, 200) });
    throw new Error("Gemini response was not valid JSON");
  }

  return {
    chiefComplaint: (parsed.chiefComplaint || "").trim(),
    subjective: (parsed.subjective || "").trim(),
    objective: (parsed.objective || "").trim(),
    assessment: (parsed.assessment || "").trim(),
    plan: (parsed.plan || "").trim(),
    vitals: (parsed.vitals || "").trim() || undefined,
    transcript: (parsed.transcript || "").trim() || undefined,
  };
}
