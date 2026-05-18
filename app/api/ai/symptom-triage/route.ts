// POST /api/ai/symptom-triage  { text }
//
// AI free-text triage. Patient describes symptoms in their own
// words; Gemini classifies into a specialty + urgency + brief
// reasoning. Wraps lib/gemini.ts with a structured JSON schema so
// the response is always parseable without prompt-engineering
// gymnastics. Conservative — when in doubt the model is told to
// route to General Physician with "soon" urgency.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateJson } from "@/lib/gemini";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson } from "@/lib/api-validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const Schema = z.object({
  text: z.string().trim().min(8).max(2000),
});

// Specialty slugs the patient can be routed to. Kept in lockstep
// with lib/symptom-router.ts so the recommendation page can render
// any of them — Gemini gets the same enum to pick from.
const SPECIALTY_SLUGS = [
  "general-physician",
  "neurologist",
  "ophthalmologist",
  "ent",
  "dermatologist",
  "cardiologist",
  "pulmonologist",
  "gastroenterologist",
  "urologist",
  "orthopedist",
  "rheumatologist",
  "psychiatrist",
  "endocrinologist",
  "diabetologist",
  "gynecologist",
] as const;

interface TriageResult {
  specialty: typeof SPECIALTY_SLUGS[number];
  specialtyLabel: string;
  urgency: "routine" | "soon" | "urgent" | "emergency";
  reasoning: string;
  redFlags: string[];
  /** AI-detected condition guesses — surfaced only as "possibilities",
   *  never presented as a diagnosis. Empty when the model isn't
   *  confident. */
  possibleConditions: string[];
}

export async function POST(req: NextRequest) {
  // AI calls are expensive — cap 20 per hour per IP. Real users
  // hit this a handful of times; this rejects scrapers without
  // breaking the demo flow.
  const blocked = await enforceRateLimit(req, "ai-symptom-triage", 20, "1 h");
  if (blocked) return blocked;

  const parsed = await parseJson(req, Schema);
  if (!parsed.ok) return parsed.response;

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "ai_not_configured", message: "AI triage isn't configured on this deployment yet. Use the visual symptom checker instead." },
      { status: 503 },
    );
  }

  try {
    const result = await generateJson<TriageResult>({
      tag: "ai-symptom-triage",
      systemPrompt:
        "You are a careful medical triage assistant on a telemedicine platform. " +
        "You DO NOT diagnose. You route patients to the right specialty and " +
        "flag emergencies. When uncertain, prefer General Physician. " +
        "Severe chest pain, sudden vision loss, loss of consciousness, " +
        "shortness of breath at rest, stroke symptoms, severe head injury, " +
        "or signs of anaphylaxis are ALWAYS 'emergency' regardless of " +
        "duration. Be concise: 1-2 sentences of reasoning.",
      userPrompt:
        `A patient describes their symptoms in their own words:\n\n"${parsed.data.text}"\n\n` +
        "Classify them into the most appropriate specialty and urgency. " +
        "List any red flags you detected (concise bullets, empty list if none). " +
        "List up to 3 possible conditions, framed as possibilities not diagnoses (empty list if uncertain). " +
        "Keep reasoning conservative and patient-friendly.",
      schema: {
        type: "object",
        required: ["specialty", "specialtyLabel", "urgency", "reasoning", "redFlags", "possibleConditions"],
        properties: {
          specialty: { type: "string", enum: SPECIALTY_SLUGS },
          specialtyLabel: { type: "string" },
          urgency: { type: "string", enum: ["routine", "soon", "urgent", "emergency"] },
          reasoning: { type: "string" },
          redFlags: { type: "array", items: { type: "string" } },
          possibleConditions: { type: "array", items: { type: "string" } },
        },
      },
      temperature: 0.2,
      maxOutputTokens: 600,
    });
    return NextResponse.json(result);
  } catch (err) {
    log.error("ai_symptom_triage.failed", err);
    return NextResponse.json(
      { error: "ai_failed", message: "Couldn't analyze right now. Please try the visual symptom checker." },
      { status: 502 },
    );
  }
}
