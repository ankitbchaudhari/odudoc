// AI ICD-10 / billing-code suggester.
//
// Given the SOAP fields of a visit (chief complaint, subjective, objective,
// assessment, plan), returns up to 5 ICD-10 codes ranked by clinical
// relevance. The doctor reviews + accepts; nothing is auto-saved.
//
// Why ICD-10 (and not ICD-11 / SNOMED): ICD-10-CM is what insurance and
// statutory billing systems still consume in 2026. ICD-11 adoption is
// patchy and SNOMED is too granular for billing. Doctors can edit the
// codes by hand if they want a more specific variant.
//
// Confidence is a hint, not gospel. We display it as a percentage, but
// ranking is what matters most.

import { generateJson } from "./gemini";

export interface IcdSuggestion {
  /** ICD-10-CM code, e.g. "J44.1" */
  code: string;
  /** Official short description, e.g. "COPD with acute exacerbation" */
  description: string;
  /** Model's confidence 0..1 */
  confidence: number;
  /** Why this code fits this visit (1 sentence). */
  rationale: string;
}

export interface IcdResult {
  suggestions: IcdSuggestion[];
  generatedAt: string;
}

export interface IcdInput {
  chiefComplaint: string;
  subjective?: string;
  objective?: string;
  assessment: string;
  plan?: string;
  vitals?: string;
  patientAge?: string;
  patientSex?: string;
  callerEmail?: string;
}

const SYSTEM_PROMPT = `You are a clinical coder helping a doctor pick the best ICD-10-CM codes for a SOAP note. The doctor will review and accept; you suggest.

Rules:
- Output up to 5 codes, ranked most-likely first.
- Use valid ICD-10-CM codes only (e.g. "J44.1", "E11.9", "M54.50"). Do NOT invent codes.
- Prefer specific codes over unspecified ones when the note supports specificity. If detail is missing, fall back to the more generic code rather than guessing.
- One-sentence rationale per code referring to the actual SOAP content.
- Confidence is 0.0–1.0. Reserve >0.85 for codes with strong textual evidence; use 0.4–0.7 when the assessment is ambiguous.
- If the assessment doesn't support any specific diagnosis, return an empty suggestions array.`;

const SCHEMA = {
  type: "object" as const,
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { type: "string" },
          description: { type: "string" },
          confidence: { type: "number" },
          rationale: { type: "string" },
        },
        required: ["code", "description", "confidence", "rationale"],
      },
    },
  },
  required: ["suggestions"],
};

function buildPrompt(input: IcdInput): string {
  const lines: string[] = [];
  lines.push("VISIT NOTE:");
  if (input.patientAge) lines.push(`Patient age: ${input.patientAge}`);
  if (input.patientSex) lines.push(`Patient sex: ${input.patientSex}`);
  lines.push(`Chief complaint: ${input.chiefComplaint}`);
  if (input.subjective) lines.push(`Subjective: ${input.subjective}`);
  if (input.objective) lines.push(`Objective: ${input.objective}`);
  if (input.vitals) lines.push(`Vitals: ${input.vitals}`);
  lines.push(`Assessment: ${input.assessment}`);
  if (input.plan) lines.push(`Plan: ${input.plan}`);
  lines.push("");
  lines.push("Suggest the best ICD-10-CM codes now.");
  return lines.join("\n");
}

export async function suggestIcd10(input: IcdInput): Promise<IcdResult> {
  if (!input.chiefComplaint?.trim() && !input.assessment?.trim()) {
    return { suggestions: [], generatedAt: new Date().toISOString() };
  }
  const result = await generateJson<{
    suggestions: Array<{
      code: string;
      description: string;
      confidence: number;
      rationale: string;
    }>;
  }>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildPrompt(input),
    schema: SCHEMA,
    temperature: 0.2,
    maxOutputTokens: 1024,
    tag: "ai-icd10",
    callerEmail: input.callerEmail,
  });

  return {
    suggestions: (result.suggestions || [])
      .slice(0, 5)
      .map((s) => ({
        code: (s.code || "").trim(),
        description: (s.description || "").trim(),
        confidence: Math.max(0, Math.min(1, Number(s.confidence) || 0)),
        rationale: (s.rationale || "").trim(),
      }))
      .filter((s) => s.code && s.description),
    generatedAt: new Date().toISOString(),
  };
}
