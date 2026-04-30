// AI differential-diagnosis helper.
//
// Given chief complaint + history of present illness + objective findings,
// returns a ranked list of plausible diagnoses with:
//
//   probability      — model's confidence 0..1
//   rationale        — 1 sentence on why this fits the presentation
//   rulingOutQuestions — 1-3 questions that would move the doctor's
//                         confidence up or down on this Dx
//   urgency          — "routine" | "today" | "urgent"
//
// Strictly doctor-side decision support. Never shown to patients. The
// system prompt is intentionally cautious — false-negatives on dangerous
// presentations are worse than false-positives. When the audio/notes
// suggest an emergency we expect the model to surface "urgent" in the
// top result and recommend escalation.

import { generateJson } from "./gemini";

export type Urgency = "routine" | "today" | "urgent";

export interface Differential {
  diagnosis: string;
  probability: number;
  urgency: Urgency;
  rationale: string;
  rulingOutQuestions: string[];
}

export interface DifferentialResult {
  differentials: Differential[];
  /** Set when the presentation has at least one "urgent" Dx — the UI
   *  shows a banner urging in-person referral. */
  emergencyFlag: boolean;
  generatedAt: string;
}

export interface DifferentialInput {
  chiefComplaint: string;
  subjective?: string;
  objective?: string;
  vitals?: string;
  patientAge?: string;
  patientSex?: string;
  patientAllergies?: string;
  patientChronicConditions?: string;
  callerEmail?: string;
}

const SYSTEM_PROMPT = `You are a clinical reasoning assistant supporting a licensed physician at the assessment stage of a SOAP note. The doctor will look at your differential, decide what to test/treat, and document their own assessment.

Rules:
- Output 3-6 plausible differentials, ranked by probability.
- Each Dx must include a clinical rationale tying it to the presented findings.
- For each Dx, give 1-3 yes/no or short-answer questions that would meaningfully shift the probability.
- Use ICD-style diagnosis names (not codes — those come from a separate tool). E.g. "Acute pharyngitis" not "J02.9".
- Probability is your raw clinical likelihood, 0.0–1.0. Sum need not equal 1.
- Set urgency:
  - "urgent" — emergency / time-critical (MI, stroke, anaphylaxis, sepsis, ectopic, suicidal ideation, severe bleeding, DKA)
  - "today" — should be addressed in the next 24 hours but not necessarily ED
  - "routine" — outpatient workup is fine
- If ANY differential reaches "urgent", the response is communicating to the doctor that escalation/in-person assessment is warranted.
- Do not include "rule-out everything" Dx — only those genuinely fitting the presentation.
- Be honest about uncertainty when the input is sparse — fewer Dx is better than padded ones.`;

const SCHEMA = {
  type: "object" as const,
  properties: {
    differentials: {
      type: "array",
      items: {
        type: "object",
        properties: {
          diagnosis: { type: "string" },
          probability: { type: "number" },
          urgency: { type: "string", enum: ["routine", "today", "urgent"] },
          rationale: { type: "string" },
          rulingOutQuestions: { type: "array", items: { type: "string" } },
        },
        required: ["diagnosis", "probability", "urgency", "rationale", "rulingOutQuestions"],
      },
    },
  },
  required: ["differentials"],
};

function buildPrompt(input: DifferentialInput): string {
  const lines: string[] = [];
  if (input.patientAge) lines.push(`Age: ${input.patientAge}`);
  if (input.patientSex) lines.push(`Sex: ${input.patientSex}`);
  if (input.patientAllergies) lines.push(`Allergies: ${input.patientAllergies}`);
  if (input.patientChronicConditions) lines.push(`Chronic conditions: ${input.patientChronicConditions}`);
  lines.push("");
  lines.push(`Chief complaint: ${input.chiefComplaint}`);
  if (input.subjective) lines.push(`Subjective (HPI): ${input.subjective}`);
  if (input.objective) lines.push(`Objective: ${input.objective}`);
  if (input.vitals) lines.push(`Vitals: ${input.vitals}`);
  lines.push("");
  lines.push("Produce the JSON differential now.");
  return lines.join("\n");
}

export async function suggestDifferentials(
  input: DifferentialInput
): Promise<DifferentialResult> {
  if (!input.chiefComplaint?.trim() && !input.subjective?.trim()) {
    return {
      differentials: [],
      emergencyFlag: false,
      generatedAt: new Date().toISOString(),
    };
  }

  const result = await generateJson<{
    differentials: Differential[];
  }>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildPrompt(input),
    schema: SCHEMA,
    temperature: 0.3,
    maxOutputTokens: 1500,
    tag: "ai-differential",
    callerEmail: input.callerEmail,
  });

  const cleaned = (result.differentials || [])
    .slice(0, 6)
    .map((d) => ({
      diagnosis: (d.diagnosis || "").trim(),
      probability: Math.max(0, Math.min(1, Number(d.probability) || 0)),
      urgency: (["routine", "today", "urgent"] as const).includes(d.urgency as Urgency)
        ? (d.urgency as Urgency)
        : "routine",
      rationale: (d.rationale || "").trim(),
      rulingOutQuestions: (d.rulingOutQuestions || []).map((q) => q.trim()).filter(Boolean),
    }))
    .filter((d) => d.diagnosis)
    .sort((a, b) => b.probability - a.probability);

  return {
    differentials: cleaned,
    emergencyFlag: cleaned.some((d) => d.urgency === "urgent"),
    generatedAt: new Date().toISOString(),
  };
}
