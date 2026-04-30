// POST /api/ai/prescription
//
// Takes a free-text symptoms + diagnosis (+ optional patient context)
// and asks Claude for a structured prescription plan: treatment,
// investigations, and a starter medicine list. The caller (doctor's
// notes panel during a live consultation) merges the suggestion into
// the form and the doctor reviews before sending to the patient.
//
// Doctor-only. No patient-identifying fields are sent to Anthropic —
// we forward the clinical fields (symptoms, diagnosis, age, sex,
// allergies) that are actually needed for the suggestion, never
// names/emails/phone numbers. If ANTHROPIC_API_KEY is missing we
// return 503 so the client can fall back to its local rule library.
//
// We call the Messages API directly over fetch to avoid adding an SDK
// dependency. Model: claude-sonnet-4-5 — good balance of quality and
// latency for clinical-style structured output.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { log } from "@/lib/log";

export const runtime = "nodejs";

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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email || user.role !== "doctor") {
    return NextResponse.json({ error: "Only doctors can use the AI helper." }, { status: 403 });
  }

  // Provider precedence: GEMINI_API_KEY (free tier via AI Studio) →
  // OPENAI_API_KEY → ANTHROPIC_API_KEY. Falls through to 503 so the
  // client can use its local rule library.
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !openaiKey && !anthropicKey) {
    return NextResponse.json(
      { error: "AI helper not configured. Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const symptoms = typeof body.symptoms === "string" ? body.symptoms.trim() : "";
  const diagnosis = typeof body.diagnosis === "string" ? body.diagnosis.trim() : "";
  const age = typeof body.age === "number" ? body.age : undefined;
  const sex = typeof body.sex === "string" ? body.sex : undefined;
  const allergies = typeof body.allergies === "string" ? body.allergies : undefined;
  const language = typeof body.language === "string" ? body.language.trim() : "";
  const wantsTranslation = !!language && !/^en(glish)?$/i.test(language);

  if (!symptoms && !diagnosis) {
    return NextResponse.json(
      { error: "Provide at least symptoms or a diagnosis." },
      { status: 400 },
    );
  }

  const userPrompt = [
    diagnosis && `Working diagnosis: ${diagnosis}`,
    symptoms && `Symptoms: ${symptoms}`,
    age && `Age: ${age}`,
    sex && `Sex: ${sex}`,
    allergies && `Known allergies: ${allergies}`,
    wantsTranslation
      ? `Output language: ${language}. Write the "treatment" and "warning" fields in ${language} using its native script. Investigations may stay in English where standard (e.g. "CBC", "TSH"). Medicine NAMES must stay in English / Latin script — pharmacists need them that way and transliteration is unsafe; only the dose/frequency/duration text may be localised.`
      : "",
    "",
    "Respond with a single JSON object: { \"treatment\": string, \"investigations\": string[], \"medicines\": [{\"name\": string, \"dose\": string, \"frequency\": string, \"duration\": string}], \"warning\": string | null }",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    let text = "";
    let provider = "";
    if (geminiKey) {
      provider = "gemini";
      text = await callGemini(geminiKey, userPrompt);
    } else if (openaiKey) {
      provider = "openai";
      text = await callOpenAI(openaiKey, userPrompt);
    } else {
      provider = "anthropic";
      text = await callAnthropic(anthropicKey!, userPrompt);
    }

    const parsed = extractJson(text);
    if (!parsed) {
      log.error("ai response not json", { provider, text: text.slice(0, 300) });
      return NextResponse.json(
        { error: "AI response was not valid JSON." },
        { status: 502 },
      );
    }

    // Coerce to our Suggestion shape + defensive trimming so a rogue
    // response can't spam the UI with 50 investigations.
    const suggestion: Suggestion = {
      treatment: String(parsed.treatment ?? "").trim(),
      investigations: Array.isArray(parsed.investigations)
        ? parsed.investigations.slice(0, 8).map((s: unknown) => String(s).trim()).filter(Boolean)
        : [],
      medicines: Array.isArray(parsed.medicines)
        ? parsed.medicines.slice(0, 8).map((m: Record<string, unknown>) => ({
            name: String(m.name ?? "").trim(),
            dose: String(m.dose ?? "").trim(),
            frequency: String(m.frequency ?? "").trim(),
            duration: String(m.duration ?? "").trim(),
          })).filter((m: MedicineRow) => m.name)
        : [],
      warning: typeof parsed.warning === "string" && parsed.warning.trim() ? parsed.warning.trim() : undefined,
    };

    return NextResponse.json({ suggestion });
  } catch (err) {
    log.error("ai prescription failed", err);
    return NextResponse.json(
      { error: "AI service unreachable. Falling back to local suggestions." },
      { status: 502 },
    );
  }
}

// Gemini free tier: 15 RPM / 1,500 RPD on gemini-2.0-flash via AI Studio.
// JSON mode via responseMimeType keeps the output tight.
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
    log.error("gemini api error", { status: res.status, body: errText });
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
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
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
    log.error("openai api error", { status: res.status, body: errText });
    throw new Error(`openai ${res.status}`);
  }
  const payload = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
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
    log.error("anthropic api error", { status: res.status, body: errText });
    throw new Error(`anthropic ${res.status}`);
  }
  const payload = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  return payload.content?.find((c) => c.type === "text")?.text ?? "";
}

// Models sometimes wrap JSON in markdown fences even when told not to —
// pull the first {...} block out defensively.
function extractJson(text: string): Record<string, unknown> | null {
  if (!text) return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through to regex */
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}
