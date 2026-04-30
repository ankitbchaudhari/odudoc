// Translate an already-filled prescription draft into the patient's
// preferred language while preserving the schema. Used by the
// "Translate to <language>" button on DoctorNotesPanel — the doctor
// fills the form in English (their familiar workflow), then one click
// re-renders the natural-language fields in the patient's language.
//
// Drug names stay in English / Latin script (regulatory + safety
// requirement). Numeric doses stay numeric. Investigations may be
// localised when there's a common patient-facing term, otherwise kept
// in English (e.g. "CBC", "TSH" stay; "Chest X-ray" → "छाती का एक्स-रे").

import { generateJson } from "./gemini";
import type { Suggestion, MedicineRow } from "./ai-prescription";

export interface TranslateRxInput {
  language: string; // human name or ISO code; we send to Gemini as-is
  treatment: string;
  investigations: string[];
  medicines: MedicineRow[];
  warning?: string;
  callerEmail?: string;
}

const SYSTEM_PROMPT = `You are a clinical translator localising a prescription written by a doctor for the patient to read at home. Strict rules:

1. Translate ONLY the natural-language fields. Drug NAMES (the "name" field on each medicine) must stay in English / Latin script — generics with the exact spelling provided. Pharmacists fill prescriptions from these names and any change is unsafe.
2. The "dose" field's numeric portion stays numeric ("500 mg" → "500 mg" or the localised "500 मिलीग्राम" — keep the digits as Western numerals).
3. The "frequency" field — convert clinical shorthand ("BD", "TDS", "1-0-1") into a patient-readable phrase in the target language.
4. The "duration" field — translate naturally ("for 5 days" → patient-language equivalent).
5. The "treatment" and "warning" fields are full natural-language paragraphs — translate cleanly and preserve clinical meaning. Don't dumb down dosing math.
6. Investigations: keep abbreviations that a pharmacy / lab would print on a slip in English ("CBC", "FBS", "HbA1c", "TSH", "ECG", "MRI"). For longer phrases ("Chest X-ray", "Urine routine") translate.
7. NEVER add medicines, change doses, or invent advice. You are translating, not prescribing.
8. Respond ONLY with the JSON object — no prose, no fences.`;

const SCHEMA = {
  type: "object" as const,
  properties: {
    treatment: { type: "string" },
    investigations: { type: "array", items: { type: "string" } },
    medicines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          dose: { type: "string" },
          frequency: { type: "string" },
          duration: { type: "string" },
        },
        required: ["name", "dose", "frequency", "duration"],
      },
    },
    warning: { type: "string" },
  },
  required: ["treatment", "investigations", "medicines"],
};

export async function translatePrescription(
  input: TranslateRxInput
): Promise<Suggestion> {
  const language = input.language.trim();
  if (!language) {
    return {
      treatment: input.treatment,
      investigations: input.investigations,
      medicines: input.medicines,
      warning: input.warning,
    };
  }

  const userPrompt = [
    `Target language: ${language}.`,
    "",
    "Source prescription (English):",
    JSON.stringify(
      {
        treatment: input.treatment,
        investigations: input.investigations,
        medicines: input.medicines,
        warning: input.warning,
      },
      null,
      2
    ),
    "",
    `Translate into ${language} now, following all the rules. Output ONLY the JSON object.`,
  ].join("\n");

  const result = await generateJson<{
    treatment: string;
    investigations: string[];
    medicines: MedicineRow[];
    warning?: string;
  }>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    schema: SCHEMA,
    temperature: 0.2,
    maxOutputTokens: 2048,
    tag: "ai-translate-rx",
    callerEmail: input.callerEmail,
  });

  return {
    treatment: (result.treatment || "").trim() || input.treatment,
    investigations: Array.isArray(result.investigations) && result.investigations.length > 0
      ? result.investigations.map((s) => String(s).trim()).filter(Boolean)
      : input.investigations,
    medicines: Array.isArray(result.medicines) && result.medicines.length > 0
      ? result.medicines.map((m, i) => ({
          // Hard guarantee: medicine name comes from the source by index,
          // never the model. If Gemini accidentally translated a name
          // (e.g. "मेटफॉर्मिन") we ignore it and use the source. We also
          // never let the array length grow — if the model returned more
          // entries than we sent, anything past input.length gets the
          // last source name (extreme edge case; Gemini follows the
          // schema reliably).
          name: input.medicines[i]?.name || input.medicines[input.medicines.length - 1]?.name || "",
          dose: String(m.dose || input.medicines[i]?.dose || "").trim(),
          frequency: String(m.frequency || input.medicines[i]?.frequency || "").trim(),
          duration: String(m.duration || input.medicines[i]?.duration || "").trim(),
        })).filter((m) => m.name).slice(0, input.medicines.length)
      : input.medicines,
    warning: result.warning?.trim() || input.warning,
  };
}
