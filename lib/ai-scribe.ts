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
import { recordAiUsage } from "./ai-usage";

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
  /** Optional language hint, e.g. "Hindi", "Marathi-English code-switch",
   *  "Tamil". Pinned into the system prompt so Gemini locks onto the
   *  right phonemes — especially helpful for Indian-language consults
   *  with English medical terms mixed in. */
  languageHint?: string;
  /** Forwarded to ai_usage so admins can attribute the call. */
  callerEmail?: string;
  patientEmail?: string;
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
  const startedAt = Date.now();

  const systemPromptWithHint = input.languageHint
    ? `${SYSTEM_PROMPT}\n\nLANGUAGE HINT: This consultation is primarily in ${input.languageHint}. Transcribe in the same language(s) the speakers used; medical terms in English are common in Indian consultations and should stay in English.`
    : SYSTEM_PROMPT;

  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPromptWithHint }] },
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
    void recordAiUsage({
      route: "ai-scribe",
      callerEmail: input.callerEmail,
      patientEmail: input.patientEmail,
      latencyMs: Date.now() - startedAt,
      ok: false,
      errorTag: "all_models_exhausted",
    });
    throw new Error(`All Gemini models exhausted. ${lastErr.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  };
  const usage = data.usageMetadata;
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!raw) {
    void recordAiUsage({
      route: "ai-scribe",
      callerEmail: input.callerEmail,
      patientEmail: input.patientEmail,
      latencyMs: Date.now() - startedAt,
      ok: false,
      errorTag: "empty_response",
    });
    throw new Error("Gemini returned no text content");
  }

  let parsed: Partial<ScribeSoap>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    log.error("ai_scribe.invalid_json", undefined, { snippet: raw.slice(0, 200) });
    void recordAiUsage({
      route: "ai-scribe",
      callerEmail: input.callerEmail,
      patientEmail: input.patientEmail,
      latencyMs: Date.now() - startedAt,
      ok: false,
      errorTag: "invalid_json",
    });
    throw new Error("Gemini response was not valid JSON");
  }

  void recordAiUsage({
    route: "ai-scribe",
    callerEmail: input.callerEmail,
    patientEmail: input.patientEmail,
    promptTokens: usage?.promptTokenCount,
    outputTokens: usage?.candidatesTokenCount,
    totalTokens: usage?.totalTokenCount,
    latencyMs: Date.now() - startedAt,
    ok: true,
  });

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

/* ------------------------------------------------------------------ */
/*  Long-recording / chunked flow                                      */
/* ------------------------------------------------------------------ */

const TRANSCRIBE_ONLY_PROMPT = `You are a literal transcriber. Output ONLY a faithful text transcript of the provided audio segment. Do not summarise. Do not interpret. Preserve spoken words including non-clinical chatter. Use [doctor]: and [patient]: speaker labels when speakers are clearly distinguishable, otherwise prepend nothing. Do not output JSON, markdown, or commentary — just the transcript text.`;

/** Transcribe one audio chunk to plain text. Used by the long-recording
 *  flow which records 4-min slices, transcribes each, then concatenates
 *  + structures the full transcript. Avoids holding a single Lambda
 *  open for 60+ seconds on Vercel. */
export async function transcribeOnly(input: ScribeInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is not set");

  const mime = input.mimeType || "audio/webm";
  const dataB64 = toBase64(input.audio);
  const startedAt = Date.now();

  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: TRANSCRIBE_ONLY_PROMPT }] },
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: mime, data: dataB64 } },
          { text: input.languageHint
              ? `Transcribe this audio. Primary language: ${input.languageHint}. Output ONLY the transcript text.`
              : "Transcribe this audio. Output ONLY the transcript text." },
        ],
      },
    ],
    generationConfig: { temperature: 0.0, maxOutputTokens: 8192 },
  });

  const modelsToTry = [GEMINI_MODEL, ...FALLBACKS.filter((m) => m !== GEMINI_MODEL)];
  let res: Response | null = null;
  let lastErr = "";
  for (const model of modelsToTry) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      { method: "POST", headers: { "content-type": "application/json" }, body: requestBody }
    );
    if (r.ok) { res = r; break; }
    lastErr = await r.text().catch(() => "");
  }
  if (!res) {
    void recordAiUsage({
      route: "ai-scribe.chunk",
      callerEmail: input.callerEmail,
      patientEmail: input.patientEmail,
      latencyMs: Date.now() - startedAt,
      ok: false,
      errorTag: "all_models_exhausted",
    });
    throw new Error(`Chunk transcription failed. ${lastErr.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  void recordAiUsage({
    route: "ai-scribe.chunk",
    callerEmail: input.callerEmail,
    patientEmail: input.patientEmail,
    promptTokens: data.usageMetadata?.promptTokenCount,
    outputTokens: data.usageMetadata?.candidatesTokenCount,
    totalTokens: data.usageMetadata?.totalTokenCount,
    latencyMs: Date.now() - startedAt,
    ok: !!text,
    errorTag: text ? undefined : "empty_response",
  });
  return text;
}

/** Take a full concatenated transcript (from N transcribed chunks) and
 *  produce the structured SOAP. Single text-mode Gemini call so it
 *  finishes well within the Vercel timeout regardless of recording
 *  length. */
export async function finalizeFromTranscript(input: {
  transcript: string;
  languageHint?: string;
  callerEmail?: string;
  patientEmail?: string;
}): Promise<ScribeSoap> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is not set");

  const text = (input.transcript || "").trim();
  if (!text) {
    return {
      chiefComplaint: "",
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
    };
  }

  const startedAt = Date.now();
  const userPrompt = `CONSULTATION TRANSCRIPT:\n\n${text}\n\nProduce the structured SOAP JSON now.`;

  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
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
      { method: "POST", headers: { "content-type": "application/json" }, body: requestBody }
    );
    if (r.ok) { res = r; break; }
    lastErr = await r.text().catch(() => "");
  }
  if (!res) {
    void recordAiUsage({
      route: "ai-scribe.finalize",
      callerEmail: input.callerEmail,
      patientEmail: input.patientEmail,
      latencyMs: Date.now() - startedAt,
      ok: false,
      errorTag: "all_models_exhausted",
    });
    throw new Error(`Transcript SOAP failed. ${lastErr.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  };
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  let parsed: Partial<ScribeSoap>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    void recordAiUsage({
      route: "ai-scribe.finalize",
      callerEmail: input.callerEmail,
      patientEmail: input.patientEmail,
      latencyMs: Date.now() - startedAt,
      ok: false,
      errorTag: "invalid_json",
    });
    throw new Error("SOAP finalize did not return JSON");
  }
  void recordAiUsage({
    route: "ai-scribe.finalize",
    callerEmail: input.callerEmail,
    patientEmail: input.patientEmail,
    promptTokens: data.usageMetadata?.promptTokenCount,
    outputTokens: data.usageMetadata?.candidatesTokenCount,
    totalTokens: data.usageMetadata?.totalTokenCount,
    latencyMs: Date.now() - startedAt,
    ok: true,
  });
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
