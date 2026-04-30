// AI-powered EMR helpers — Phase 1: patient chart summary.
//
// Given a patient + their visit history + uploaded files, produces a short
// "TL;DR" the doctor reads at the top of the chart so they don't have to
// scroll through years of notes before a 10-minute consult.
//
// Output is structured (JSON-mode) so the UI can render it as a tidy card
// with sections rather than a wall of free text. Sections:
//
//   headline      — one sentence, clinical-tone, the *most* important
//                   thing about this patient right now.
//   keyPoints     — 3-5 bullet points: active conditions, recent
//                   significant findings, ongoing therapies.
//   redFlags      — anything safety-relevant: drug allergies that aren't
//                   captured in the allergies field yet, recurring
//                   symptoms suggestive of a missed Dx, missed follow-ups.
//   suggestedFocus — 1-2 sentences on what the doctor should pay
//                   attention to *today* given the context.
//
// Privacy: the prompt is built from the doctor's own clinic data only
// (resolveClinic scoping is enforced upstream by the route handler). We
// never include any PII beyond what the doctor already typed into the
// chart, and patient name is reduced to first-name + age + sex for the
// model — full identifiers don't help the clinical reasoning and limit
// the surface area if Gemini logs are ever subpoenaed.

import { generateJson } from "./gemini";
import type { EmrPatient, EmrVisit, EmrFile } from "./emr-store";

/** A claim made by the AI summary plus the visit date it came from
 *  (or "demographics" when the source is the chart header rather than
 *  a specific visit). The UI shows the source as a tiny chip next to
 *  each bullet so the doctor can verify quickly. */
export interface SourcedPoint {
  text: string;
  /** "YYYY-MM-DD" of the visit, or "demographics" / "files". */
  source?: string;
}

export interface PatientSummary {
  headline: string;
  keyPoints: SourcedPoint[];
  redFlags: SourcedPoint[];
  suggestedFocus: string;
  /** ISO timestamp of when this summary was generated. The UI shows
   *  "Generated X min ago" so the doctor knows it's not stale. */
  generatedAt: string;
}

const SYSTEM_PROMPT = `You are a clinical assistant helping a licensed doctor quickly review a patient's chart before a consultation. You MUST:

- Be concise. Doctors have 30 seconds to read this.
- Use clinical tone. No fluff, no marketing language, no patient-facing softening.
- Stay strictly within the data provided. NEVER invent diagnoses, lab values, medications, or history that isn't in the input.
- Flag genuine safety concerns (drug allergies, dangerous interactions, missed follow-ups) in redFlags.
- If the patient has very little history, say so plainly — don't pad keyPoints with filler like "no allergies recorded".
- This is decision support, not diagnosis. The doctor decides; you summarise.

CITING SOURCES:
- Each keyPoint and redFlag MUST include a "source" field that says where in the chart the claim came from.
- Allowed source values: a visit date in "YYYY-MM-DD" format (matching one of the visits provided), "demographics" (for facts pulled from the chart header — allergies, chronic conditions, blood group, free-text notes), or "files" (for things inferred from uploaded labs/scans).
- If a claim spans multiple visits, pick the most recent supporting one.
- Doctors use this to fact-check you in seconds — wrong sources are worse than no sources.`;

const POINT_ITEM_SCHEMA = {
  type: "object" as const,
  properties: {
    text: { type: "string" },
    source: { type: "string", description: "Visit date YYYY-MM-DD, or 'demographics' / 'files'." },
  },
  required: ["text", "source"],
};

const SCHEMA = {
  type: "object" as const,
  properties: {
    headline: { type: "string", description: "One sentence — the single most important clinical fact about this patient." },
    keyPoints: {
      type: "array",
      items: POINT_ITEM_SCHEMA,
      description: "3-5 short bullet points covering active conditions, recent findings, ongoing therapies.",
    },
    redFlags: {
      type: "array",
      items: POINT_ITEM_SCHEMA,
      description: "Safety-relevant concerns. Empty array if none.",
    },
    suggestedFocus: { type: "string", description: "1-2 sentences on what the doctor should focus on today." },
  },
  required: ["headline", "keyPoints", "redFlags", "suggestedFocus"],
};

function describePatient(p: EmrPatient): string {
  const bits: string[] = [];
  if (p.age) bits.push(`${p.age} yo`);
  if (p.sex) bits.push(p.sex.toLowerCase());
  bits.push(p.firstName || "Patient");
  return bits.join(" ");
}

function buildPrompt(input: {
  patient: EmrPatient;
  visits: EmrVisit[];
  files: EmrFile[];
}): string {
  const { patient, visits, files } = input;
  const lines: string[] = [];
  lines.push(`PATIENT: ${describePatient(patient)}`);
  if (patient.bloodGroup) lines.push(`Blood group: ${patient.bloodGroup}`);
  if (patient.allergies) lines.push(`Recorded allergies: ${patient.allergies}`);
  if (patient.chronicConditions) lines.push(`Chronic conditions: ${patient.chronicConditions}`);
  if (patient.notes) lines.push(`Doctor notes (free text): ${patient.notes}`);

  // Visits — newest first, capped to last 10. Each visit is rendered as a
  // compact SOAP block. We trim each section to ~400 chars so a verbose
  // patient doesn't blow the context budget.
  const sortedVisits = [...visits].sort((a, b) =>
    a.visitDate < b.visitDate ? 1 : -1
  );
  const recent = sortedVisits.slice(0, 10);
  if (recent.length === 0) {
    lines.push("\nNo prior visits recorded in OduDoc.");
  } else {
    lines.push(`\nLAST ${recent.length} VISIT(S) (newest first):`);
    for (const v of recent) {
      lines.push(`---`);
      lines.push(`Date: ${v.visitDate}`);
      if (v.chiefComplaint) lines.push(`CC: ${trim(v.chiefComplaint, 200)}`);
      if (v.subjective) lines.push(`S: ${trim(v.subjective, 400)}`);
      if (v.objective) lines.push(`O: ${trim(v.objective, 400)}`);
      if (v.assessment) lines.push(`A: ${trim(v.assessment, 400)}`);
      if (v.plan) lines.push(`P: ${trim(v.plan, 400)}`);
      if (v.vitals) lines.push(`Vitals: ${trim(v.vitals, 200)}`);
    }
  }

  // Files — names + categories only. We don't OCR PDFs in Phase 1; the
  // file list itself is signal (e.g. "3 chest x-rays in 6 months" is
  // worth flagging even without reading them).
  if (files.length > 0) {
    const sortedFiles = [...files].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1
    );
    lines.push(`\nUPLOADED FILES (${files.length} total):`);
    for (const f of sortedFiles.slice(0, 15)) {
      lines.push(`- [${f.category}] ${f.label} (${f.createdAt.slice(0, 10)})`);
    }
  }

  lines.push(
    `\nProduce the JSON summary now. If history is sparse, be honest about it — don't invent.`
  );
  return lines.join("\n");
}

function trim(s: string, n: number): string {
  if (!s) return s;
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1)}…`;
}

/** Build a chart summary for the given patient. Throws on Gemini failure
 *  (route handler decides how to surface to the user). */
export async function summarisePatientChart(input: {
  patient: EmrPatient;
  visits: EmrVisit[];
  files: EmrFile[];
  callerEmail?: string;
}): Promise<PatientSummary> {
  const userPrompt = buildPrompt(input);
  const result = await generateJson<{
    headline: string;
    keyPoints: SourcedPoint[];
    redFlags: SourcedPoint[];
    suggestedFocus: string;
  }>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    schema: SCHEMA,
    temperature: 0.3,           // low-temp — we want consistent clinical summaries, not creative writing
    maxOutputTokens: 1024,
    tag: "ai-emr.patient-summary",
    callerEmail: input.callerEmail,
    patientEmail: input.patient.email,
  });

  const cleanPoints = (arr: SourcedPoint[] | undefined): SourcedPoint[] =>
    (arr || [])
      .map((p) => ({
        text: (p?.text || "").trim(),
        source: (p?.source || "").trim() || undefined,
      }))
      .filter((p) => p.text);

  return {
    headline: result.headline?.trim() || "No summary available.",
    keyPoints: cleanPoints(result.keyPoints),
    redFlags: cleanPoints(result.redFlags),
    suggestedFocus: result.suggestedFocus?.trim() || "",
    generatedAt: new Date().toISOString(),
  };
}
