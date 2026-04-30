// AI-backed medical dictionary + drug catalog.
//
// Two lookups, one Gemini call each:
//
//   lookupTerm(query)
//     Clinical term / acronym / abbreviation → definition + ICD-10
//     candidates + plain-English summary for patients + pronunciation
//     hint + related terms. Covers basically anything a doctor would
//     ever look up — no static catalog to license or maintain.
//
//   lookupDrug(query)
//     Drug name (generic OR Indian brand) → generic name, drug class,
//     common Indian brand names, indications, contraindications, common
//     adult dose, common side effects, schedule (if controlled), and
//     pregnancy/lactation notes.
//
// Both return a "confidence" hint and a "needsReview" flag. We err on
// the side of showing the lookup with a "verify in your formulary"
// caveat rather than refusing — doctors hate AI features that bail
// out for edge cases.

import { generateJson } from "./gemini";

export interface TermLookup {
  term: string;                 // canonical term (might differ from query)
  pronunciation?: string;       // simplified IPA-ish or stress markers
  shortDefinition: string;      // 1-2 sentence clinical definition
  patientSummary: string;       // plain-English version, ≤2 sentences
  category?: string;            // e.g. "Cardiology", "Endocrinology"
  icd10?: string[];             // candidate codes when applicable
  relatedTerms?: string[];
  needsReview: boolean;
  confidence: number;
}

export interface DrugLookup {
  generic: string;              // e.g. "Metformin"
  drugClass: string;            // e.g. "Biguanide antihyperglycemic"
  commonIndianBrands: string[]; // e.g. ["Glycomet", "Glyciphage", "Obimet"]
  indications: string[];        // primary uses
  contraindications: string[];
  commonAdultDose: string;      // 1-line summary, e.g. "500-1000 mg PO BD with meals"
  pediatricNote?: string;       // when relevant
  commonSideEffects: string[];
  pregnancyCategory?: string;   // FDA-style A/B/C/D/X or short note
  schedule?: string;            // e.g. "Schedule H" (Indian) or null
  prescriberNotes?: string;     // 1-2 sentence prescribing pearls
  needsReview: boolean;
  confidence: number;
}

const TERM_SYSTEM_PROMPT = `You are a clinical reference assistant for a licensed doctor in India. Given a medical term, abbreviation, or acronym, return structured information for the doctor to glance at during a consultation.

Rules:
- Use clinical tone. The output is shown to a doctor, not a patient — the patientSummary field is the only one written for the patient.
- If the query is ambiguous (e.g. "MR" could be Mitral Regurgitation OR Mental Retardation), pick the most clinically common interpretation and set needsReview=true.
- icd10 codes — only include when the term maps to a billable Dx; an empty array is correct for terms that aren't diagnoses (anatomical structures, lab tests, procedures).
- If you genuinely don't know the term, return needsReview=true with confidence < 0.5 and a best-guess shortDefinition. Don't refuse.
- Keep shortDefinition to 1-2 sentences. Patients can't follow long paragraphs and neither can doctors mid-consult.`;

const DRUG_SYSTEM_PROMPT = `You are a clinical pharmacology reference for a licensed doctor in India about to prescribe. Given a drug name (generic or any Indian brand), return structured information.

Rules:
- generic: always the INN / international generic name in Latin script (e.g. "Paracetamol" not "Acetaminophen" since OduDoc is India-first; use "Acetaminophen" only as an alternative in prescriberNotes if relevant).
- commonIndianBrands: list 3-8 brand names that are actually sold in India. Skip if the drug isn't on the Indian market.
- commonAdultDose: ONE clinically reasonable starter regimen, not the whole dose range. Doctors will read this and decide.
- pregnancyCategory: prefer the FDA letter category (A/B/C/D/X) when widely accepted; fall back to a short prose note.
- schedule: Indian Drugs and Cosmetics Rules schedule classification — "Schedule H" / "Schedule H1" / "Schedule X" / "OTC" / null.
- If the input is misspelled, fix it silently and return the corrected generic name. Set needsReview=true if the correction is uncertain.
- Never invent doses, brands, or contraindications. Better to leave a field empty than wrong.
- If the input is a combination drug (e.g. "Augmentin" = amoxicillin + clavulanate), return information for the combination as a whole.`;

const TERM_SCHEMA = {
  type: "object" as const,
  properties: {
    term: { type: "string" },
    pronunciation: { type: "string" },
    shortDefinition: { type: "string" },
    patientSummary: { type: "string" },
    category: { type: "string" },
    icd10: { type: "array", items: { type: "string" } },
    relatedTerms: { type: "array", items: { type: "string" } },
    needsReview: { type: "boolean" },
    confidence: { type: "number" },
  },
  required: ["term", "shortDefinition", "patientSummary", "needsReview", "confidence"],
};

const DRUG_SCHEMA = {
  type: "object" as const,
  properties: {
    generic: { type: "string" },
    drugClass: { type: "string" },
    commonIndianBrands: { type: "array", items: { type: "string" } },
    indications: { type: "array", items: { type: "string" } },
    contraindications: { type: "array", items: { type: "string" } },
    commonAdultDose: { type: "string" },
    pediatricNote: { type: "string" },
    commonSideEffects: { type: "array", items: { type: "string" } },
    pregnancyCategory: { type: "string" },
    schedule: { type: "string" },
    prescriberNotes: { type: "string" },
    needsReview: { type: "boolean" },
    confidence: { type: "number" },
  },
  required: [
    "generic",
    "drugClass",
    "commonIndianBrands",
    "indications",
    "contraindications",
    "commonAdultDose",
    "commonSideEffects",
    "needsReview",
    "confidence",
  ],
};

export async function lookupTerm(opts: {
  query: string;
  callerEmail?: string;
}): Promise<TermLookup> {
  const q = opts.query.trim();
  if (!q) {
    return {
      term: "",
      shortDefinition: "Type a clinical term to look up.",
      patientSummary: "",
      needsReview: true,
      confidence: 0,
    };
  }
  const result = await generateJson<TermLookup>({
    systemPrompt: TERM_SYSTEM_PROMPT,
    userPrompt: `Look up: ${q}`,
    schema: TERM_SCHEMA,
    temperature: 0.2,
    maxOutputTokens: 1024,
    tag: "ai-dictionary.term",
    callerEmail: opts.callerEmail,
  });
  return {
    term: result.term?.trim() || q,
    pronunciation: result.pronunciation?.trim() || undefined,
    shortDefinition: result.shortDefinition?.trim() || "",
    patientSummary: result.patientSummary?.trim() || "",
    category: result.category?.trim() || undefined,
    icd10: (result.icd10 || []).map((s) => s.trim()).filter(Boolean),
    relatedTerms: (result.relatedTerms || []).map((s) => s.trim()).filter(Boolean),
    needsReview: !!result.needsReview,
    confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0)),
  };
}

export async function lookupDrug(opts: {
  query: string;
  callerEmail?: string;
}): Promise<DrugLookup> {
  const q = opts.query.trim();
  if (!q) {
    return {
      generic: "",
      drugClass: "",
      commonIndianBrands: [],
      indications: [],
      contraindications: [],
      commonAdultDose: "",
      commonSideEffects: [],
      needsReview: true,
      confidence: 0,
    };
  }
  const result = await generateJson<DrugLookup>({
    systemPrompt: DRUG_SYSTEM_PROMPT,
    userPrompt: `Look up the drug: ${q}`,
    schema: DRUG_SCHEMA,
    temperature: 0.15,
    maxOutputTokens: 1500,
    tag: "ai-dictionary.drug",
    callerEmail: opts.callerEmail,
  });
  return {
    generic: result.generic?.trim() || q,
    drugClass: result.drugClass?.trim() || "",
    commonIndianBrands: (result.commonIndianBrands || []).map((s) => s.trim()).filter(Boolean),
    indications: (result.indications || []).map((s) => s.trim()).filter(Boolean),
    contraindications: (result.contraindications || []).map((s) => s.trim()).filter(Boolean),
    commonAdultDose: result.commonAdultDose?.trim() || "",
    pediatricNote: result.pediatricNote?.trim() || undefined,
    commonSideEffects: (result.commonSideEffects || []).map((s) => s.trim()).filter(Boolean),
    pregnancyCategory: result.pregnancyCategory?.trim() || undefined,
    schedule: result.schedule?.trim() || undefined,
    prescriberNotes: result.prescriberNotes?.trim() || undefined,
    needsReview: !!result.needsReview,
    confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0)),
  };
}
