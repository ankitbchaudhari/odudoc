// AI drug-interaction + safety checker.
//
// Given the medicines a doctor is about to prescribe, plus patient context
// (allergies, chronic conditions, age, existing meds), returns:
//   - severity bucket (none / minor / moderate / severe)
//   - issues array — each one a specific concern with the offending drug(s)
//   - safer alternatives (when severity >= moderate)
//
// This is decision support — the doctor still presses "Send" to commit
// the prescription. We err on the side of flagging too much rather than
// too little; a false-positive wastes 10 seconds of the doctor's time, a
// false-negative hurts the patient.
//
// Important: the `severity` field is what the UI keys off (no banner if
// "none", amber if "minor"/"moderate", red if "severe"). The model is
// instructed to be honest about uncertainty — empty issues + severity
// "none" is a valid output for "looks fine".

import { generateJson } from "./gemini";
import type { MedicineRow } from "./ai-prescription";

export type DrugSeverity = "none" | "minor" | "moderate" | "severe";

export interface DrugIssue {
  /** Short label e.g. "Bleeding risk" */
  title: string;
  /** Specific drugs implicated, generic names. */
  drugs: string[];
  /** One-sentence clinical explanation. */
  detail: string;
}

export interface DrugCheckResult {
  severity: DrugSeverity;
  issues: DrugIssue[];
  alternatives: string[];
  /** ISO timestamp the check was generated. */
  generatedAt: string;
}

export interface DrugCheckInput {
  medicines: MedicineRow[];
  allergies?: string;
  chronicConditions?: string;
  age?: string;
  sex?: string;
  callerEmail?: string;
}

const SYSTEM_PROMPT = `You are a clinical pharmacology assistant supporting a licensed doctor before they finalise a prescription. The doctor is the decision-maker; you flag concerns.

Examine the proposed medicine list against the patient's allergies, chronic conditions, age, and any potential drug-drug interactions WITHIN the list itself. Return a structured JSON response.

Severity guide:
- "none": no issues; the regimen looks reasonable.
- "minor": worth knowing but unlikely to cause harm (mild interaction, slight dosing concern).
- "moderate": should be addressed before prescribing — alternative drug or dose adjustment recommended.
- "severe": clear contraindication, allergy match, or dangerous interaction. Must not proceed without changes.

Rules:
- Only flag real concerns. Padding the list with trivia trains the doctor to ignore you.
- Use generic drug names. No brands.
- For severity moderate/severe, include 1-3 safer alternatives in the alternatives array (drug names only).
- If the medicine list is empty or unparseable, return severity "none" and empty arrays.
- Do NOT suggest dose changes — that's the doctor's call. Stick to interactions, allergies, contraindications.`;

const SCHEMA = {
  type: "object" as const,
  properties: {
    severity: {
      type: "string",
      enum: ["none", "minor", "moderate", "severe"],
    },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          drugs: { type: "array", items: { type: "string" } },
          detail: { type: "string" },
        },
        required: ["title", "drugs", "detail"],
      },
    },
    alternatives: { type: "array", items: { type: "string" } },
  },
  required: ["severity", "issues", "alternatives"],
};

function buildPrompt(input: DrugCheckInput): string {
  const lines: string[] = [];
  lines.push("PROPOSED PRESCRIPTION:");
  for (const m of input.medicines) {
    if (!m.name?.trim()) continue;
    lines.push(`- ${m.name}${m.dose ? ` ${m.dose}` : ""}${m.frequency ? ` (${m.frequency})` : ""}${m.duration ? ` for ${m.duration}` : ""}`);
  }
  lines.push("");
  lines.push("PATIENT CONTEXT:");
  if (input.age) lines.push(`Age: ${input.age}`);
  if (input.sex) lines.push(`Sex: ${input.sex}`);
  if (input.allergies?.trim()) lines.push(`Known allergies: ${input.allergies}`);
  if (input.chronicConditions?.trim()) lines.push(`Chronic conditions: ${input.chronicConditions}`);
  if (!input.allergies && !input.chronicConditions) {
    lines.push("(No allergies or chronic conditions on file.)");
  }
  lines.push("");
  lines.push("Produce the JSON safety check now.");
  return lines.join("\n");
}

export async function checkDrugInteractions(
  input: DrugCheckInput
): Promise<DrugCheckResult> {
  const validMeds = input.medicines.filter((m) => m.name?.trim());
  if (validMeds.length === 0) {
    return {
      severity: "none",
      issues: [],
      alternatives: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const result = await generateJson<{
    severity: DrugSeverity;
    issues: Array<{ title: string; drugs: string[]; detail: string }>;
    alternatives: string[];
  }>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildPrompt({ ...input, medicines: validMeds }),
    schema: SCHEMA,
    temperature: 0.2,
    maxOutputTokens: 1024,
    tag: "ai-drug-check",
    callerEmail: input.callerEmail,
  });

  return {
    severity: result.severity || "none",
    issues: (result.issues || [])
      .map((i) => ({
        title: (i.title || "").trim(),
        drugs: (i.drugs || []).map((d) => d.trim()).filter(Boolean),
        detail: (i.detail || "").trim(),
      }))
      .filter((i) => i.title || i.detail),
    alternatives: (result.alternatives || []).map((a) => a.trim()).filter(Boolean),
    generatedAt: new Date().toISOString(),
  };
}
