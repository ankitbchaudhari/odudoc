// AI pre-visit intake.
//
// The booking form already captures structured medical history fields
// (chief complaint, symptoms, duration, severity, allergies, meds, past
// conditions, family history, lifestyle, free-text additional notes).
// Patients fill these in their own words — sometimes detailed,
// sometimes one-line.
//
// This helper takes that raw history and produces a clinician-friendly
// pre-read so the doctor walks into the consultation already knowing
// what to focus on:
//
//   headline           — single sentence in clinical tone
//   redFlags           — symptoms or hints in the history that warrant
//                         urgent attention or in-person referral
//   suggestedQuestions — 3-5 things the doctor should ask to narrow
//                         the differential efficiently
//   suggestedExams     — 0-3 physical exams or quick checks that
//                         would help today
//
// The patient never sees this output — it's purely doctor-side
// decision support.

import { generateJson } from "./gemini";

export interface PreVisitIntake {
  headline: string;
  redFlags: string[];
  suggestedQuestions: string[];
  suggestedExams: string[];
  generatedAt: string;
}

export interface IntakeMedicalHistory {
  chiefComplaint?: string;
  symptoms?: string;
  duration?: string;
  severity?: string;
  allergies?: string;
  currentMedications?: string;
  pastConditions?: string;
  surgeries?: string;
  familyHistory?: string;
  smoker?: string;
  alcohol?: string;
  pregnant?: string;
  additional?: string;
}

export interface IntakeInput {
  history: IntakeMedicalHistory;
  patientAge?: string;
  patientSex?: string;
  specialty?: string;
  callerEmail?: string;
}

const SYSTEM_PROMPT = `You are a clinical triage assistant. A patient has filled in a pre-visit history form before their telemedicine appointment. The doctor will read your output 30 seconds before the call starts. Your job:

1. Distil the history into a single-sentence headline a doctor can absorb at a glance.
2. Flag genuine red flags — symptoms or combinations that suggest a serious condition, urgent care need, or possible in-person referral. Empty array if none.
3. Suggest 3-5 targeted questions to narrow the working diagnosis efficiently. These are questions the doctor should ASK, not statements about the patient.
4. Suggest 0-3 quick physical exams or focused observations relevant for today.

Rules:
- Use clinical language. The patient never sees this output.
- Be concise. Doctors read this in seconds.
- Never invent symptoms or facts not in the history. If the history is sparse, say so honestly via a short headline; don't pad lists.
- Decision support only. The doctor diagnoses; you suggest.`;

const SCHEMA = {
  type: "object" as const,
  properties: {
    headline: { type: "string" },
    redFlags: { type: "array", items: { type: "string" } },
    suggestedQuestions: { type: "array", items: { type: "string" } },
    suggestedExams: { type: "array", items: { type: "string" } },
  },
  required: ["headline", "redFlags", "suggestedQuestions", "suggestedExams"],
};

function describe(h: IntakeMedicalHistory): string {
  const lines: string[] = [];
  if (h.chiefComplaint) lines.push(`Chief complaint: ${h.chiefComplaint}`);
  if (h.symptoms) lines.push(`Symptoms: ${h.symptoms}`);
  if (h.duration) lines.push(`Duration: ${h.duration}`);
  if (h.severity) lines.push(`Severity (patient-reported): ${h.severity}`);
  if (h.allergies) lines.push(`Allergies: ${h.allergies}`);
  if (h.currentMedications) lines.push(`Current medications: ${h.currentMedications}`);
  if (h.pastConditions) lines.push(`Past conditions: ${h.pastConditions}`);
  if (h.surgeries) lines.push(`Past surgeries: ${h.surgeries}`);
  if (h.familyHistory) lines.push(`Family history: ${h.familyHistory}`);
  if (h.smoker) lines.push(`Smoking: ${h.smoker}`);
  if (h.alcohol) lines.push(`Alcohol: ${h.alcohol}`);
  if (h.pregnant && h.pregnant !== "na") lines.push(`Pregnancy: ${h.pregnant}`);
  if (h.additional) lines.push(`Additional notes: ${h.additional}`);
  return lines.join("\n");
}

export async function buildPreVisitIntake(input: IntakeInput): Promise<PreVisitIntake> {
  const desc = describe(input.history);
  if (!desc.trim()) {
    return {
      headline: "Patient submitted no pre-visit history.",
      redFlags: [],
      suggestedQuestions: ["Open with: what brings you in today?"],
      suggestedExams: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const userPrompt = [
    input.specialty ? `Booking specialty: ${input.specialty}` : "",
    input.patientAge ? `Age: ${input.patientAge}` : "",
    input.patientSex ? `Sex: ${input.patientSex}` : "",
    "",
    "PATIENT-SUBMITTED HISTORY:",
    desc,
    "",
    "Produce the JSON pre-visit intake now.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await generateJson<{
    headline: string;
    redFlags: string[];
    suggestedQuestions: string[];
    suggestedExams: string[];
  }>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    schema: SCHEMA,
    temperature: 0.3,
    maxOutputTokens: 1024,
    tag: "ai-intake",
    callerEmail: input.callerEmail,
  });

  return {
    headline: (result.headline || "").trim() || "No headline available.",
    redFlags: (result.redFlags || []).map((s) => s.trim()).filter(Boolean),
    suggestedQuestions: (result.suggestedQuestions || []).map((s) => s.trim()).filter(Boolean),
    suggestedExams: (result.suggestedExams || []).map((s) => s.trim()).filter(Boolean),
    generatedAt: new Date().toISOString(),
  };
}
