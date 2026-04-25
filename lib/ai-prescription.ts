// Shared AI prescription suggestion logic.
//
// Used by both the web NextAuth-protected /api/ai/prescription endpoint
// and the mobile JWT-protected /api/ai/prescription/mobile endpoint. The
// route handlers handle their own auth + role checks; this module only
// owns the prompt + provider fan-out + JSON coercion.

import { log } from "./log";

export interface MedicineRow {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}

export interface Suggestion {
  treatment: string;
  investigations: string[];
  medicines: MedicineRow[];
  warning?: string;
}

export interface SuggestInput {
  symptoms?: string;
  diagnosis?: string;
  age?: number;
  sex?: string;
  allergies?: string;
}

export type SuggestResult =
  | { ok: true; suggestion: Suggestion; provider: "gemini" | "openai" | "anthropic" }
  | { ok: false; reason: "no_provider" | "bad_input" | "invalid_response" | "upstream_error"; message: string };

const SYSTEM_PROMPT = `You are a clinical decision-support assistant for licensed physicians running a telehealth consultation. A human doctor will review every suggestion before it reaches the patient — you are NOT prescribing directly.

Given the patient's symptoms and the doctor's working diagnosis, produce a concise, safe starter plan:
- treatment: 1–3 short sentences of non-pharmacologic advice (lifestyle, care, red flags)
- investigations: array of 0–5 common investigations to consider (strings like "CBC", "CRP", "Urine routine")
- medicines: array of 0–5 first-line medicines with dose, frequency (e.g. "1-0-1", "Every 6 hours", "SOS"), and duration
- warning: optional one-line caution if the diagnosis warrants urgent in-person care or if information is too thin

Rules:
- Use generic drug names only, no brand names.
- Be conservative — prefer symptomatic relief over broad antibiotics.
- If the diagnosis is ambiguous or suggests an emergency (chest pain, stroke symptoms, severe bleeding, suicidal ideation, anaphylaxis), set medicines=[] and use warning to recommend urgent in-person/ER care.
- Never include controlled substances, opioids, benzodiazepines, or anything requiring specialist monitoring.
- Respond with ONLY a single JSON object matching the schema. No prose, no markdown fences.`;

export async function suggestPrescription(input: SuggestInput): Promise<SuggestResult> {
  const symptoms = input.symptoms?.trim() ?? "";
  const diagnosis = input.diagnosis?.trim() ?? "";
  if (!symptoms && !diagnosis) {
    return { ok: false, reason: "bad_input", message: "Provide at least symptoms or a diagnosis." };
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !openaiKey && !anthropicKey) {
    return {
      ok: false,
      reason: "no_provider",
      message: "AI helper not configured. Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.",
    };
  }

  const userPrompt = [
    diagnosis && `Working diagnosis: ${diagnosis}`,
    symptoms && `Symptoms: ${symptoms}`,
    input.age && `Age: ${input.age}`,
    input.sex && `Sex: ${input.sex}`,
    input.allergies && `Known allergies: ${input.allergies}`,
    "",
    'Respond with a single JSON object: { "treatment": string, "investigations": string[], "medicines": [{"name": string, "dose": string, "frequency": string, "duration": string}], "warning": string | null }',
  ]
    .filter(Boolean)
    .join("\n");

  let text = "";
  let provider: "gemini" | "openai" | "anthropic";
  try {
    if (geminiKey) { provider = "gemini"; text = await callGemini(geminiKey, userPrompt); }
    else if (openaiKey) { provider = "openai"; text = await callOpenAI(openaiKey, userPrompt); }
    else { provider = "anthropic"; text = await callAnthropic(anthropicKey!, userPrompt); }
  } catch (err) {
    log.error("ai_prescription.upstream", err);
    return {
      ok: false,
      reason: "upstream_error",
      message: "AI service unreachable. Falling back to local suggestions.",
    };
  }

  const parsed = extractJson(text);
  if (!parsed) {
    log.error("ai_prescription.invalid_response", undefined, { text: text.slice(0, 300) });
    return { ok: false, reason: "invalid_response", message: "AI response was not valid JSON." };
  }

  const suggestion: Suggestion = {
    treatment: String(parsed.treatment ?? "").trim(),
    investigations: Array.isArray(parsed.investigations)
      ? parsed.investigations.slice(0, 8).map((s: unknown) => String(s).trim()).filter(Boolean)
      : [],
    medicines: Array.isArray(parsed.medicines)
      ? parsed.medicines
          .slice(0, 8)
          .map((m: Record<string, unknown>) => ({
            name: String(m.name ?? "").trim(),
            dose: String(m.dose ?? "").trim(),
            frequency: String(m.frequency ?? "").trim(),
            duration: String(m.duration ?? "").trim(),
          }))
          .filter((m: MedicineRow) => m.name)
      : [],
    warning:
      typeof parsed.warning === "string" && parsed.warning.trim()
        ? parsed.warning.trim()
        : undefined,
  };

  return { ok: true, suggestion, provider };
}

// ---- providers ----------------------------------------------------------

async function callGemini(key: string, userPrompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    log.error("gemini api error", undefined, { status: res.status, body: errText });
    throw new Error(`gemini ${res.status}`);
  }
  const payload = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callOpenAI(key: string, userPrompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    log.error("openai api error", undefined, { status: res.status, body: errText });
    throw new Error(`openai ${res.status}`);
  }
  const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(key: string, userPrompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    log.error("anthropic api error", undefined, { status: res.status, body: errText });
    throw new Error(`anthropic ${res.status}`);
  }
  const payload = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  return payload.content?.find((c) => c.type === "text")?.text ?? "";
}

function extractJson(text: string): Record<string, unknown> | null {
  if (!text) return null;
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch { /* fall through */ }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}
