// Triage chatbot engine.
//
// Pure deterministic rule engine. Patient lands on /doctors/[id],
// taps "Should I see this doctor?", answers a short symptom flow.
// The engine maps their answers to:
//
//   1. Specialty-fit score for THIS doctor (booking confidence)
//   2. Urgency level (book now / book soon / book routine /
//      go to ER instead)
//   3. Suggested specialty if mismatch (e.g. they thought they had
//      indigestion but the symptoms read cardiac)
//   4. Optional pre-visit notes the patient can hand the doctor
//
// Composes with the differential-Dx copilot we already shipped:
// triage runs the same complaint-bucket lookup but interprets the
// result for a non-clinician audience.

import { findBucket, type ComplaintBucket } from "../clinical-ai/differential-db";

export interface TriageQuestion {
  id: string;
  prompt: string;
  options: Array<{ value: string; label: string; redFlag?: boolean }>;
}

export interface TriageInput {
  /** What the patient is worried about. Free-form. */
  chiefComplaint: string;
  /** Symptom modifiers selected from follow-up questions. */
  modifiers: string[];
  /** Patient-provided context. */
  ageBand?: "child" | "adult" | "elderly";
  durationDays?: number;
  /** Self-reported severity 1-5. */
  severity?: number;
  /** Doctor the patient is currently looking at. */
  doctorSpecialty?: string;
}

export type Urgency = "ER_NOW" | "TODAY" | "WITHIN_3_DAYS" | "ROUTINE";

export interface TriageResult {
  /** Plain-language summary the patient sees up top. */
  recommendation: string;
  urgency: Urgency;
  /** True if the patient should see THIS doctor; false → suggested
   *  specialty fits better. */
  doctorIsGoodFit: boolean;
  /** Suggested specialty when doctorIsGoodFit is false. */
  suggestedSpecialty?: string;
  /** Red flags that fired during the flow — surfaced verbatim. */
  redFlags: string[];
  /** Pre-visit summary the patient can copy-paste into the booking
   *  notes field. */
  preVisitNote: string;
  /** Confidence 0-1; very low confidence triggers "see a doctor in
   *  person rather than tele" recommendation. */
  confidence: number;
  /** Resolved complaint bucket id when the engine matched one. */
  matchedBucketId?: string;
}

const SPECIALTY_FOR_BUCKET: Record<string, string> = {
  chest_pain: "Cardiology",
  headache: "Neurology",
  abdominal_pain: "Gastroenterology",
  dyspnoea: "Pulmonology",
  fever: "General medicine",
};

const ER_REDFLAG_PHRASES = [
  "thunderclap", "worst headache", "sudden severe", "chest pain", "crushing",
  "difficulty breathing", "shortness of breath", "blood in", "loss of consciousness",
  "stroke", "facial droop", "slurred speech", "uncontrolled bleeding",
];

export function buildFollowUps(bucket: ComplaintBucket | null): TriageQuestion[] {
  if (!bucket) return [];
  // We pull modifier candidates from the boostIfAny list of the
  // top 3-4 DDx candidates. Plus any red-flag triggers as
  // explicit yes/no questions.
  const modifiers = new Set<string>();
  for (const c of bucket.ddx.slice(0, 4)) {
    for (const b of c.boostIfAny || []) modifiers.add(b);
  }
  const out: TriageQuestion[] = [];
  // Question 1: pick all that apply from the top modifiers.
  out.push({
    id: "modifiers",
    prompt: "Which of these are you experiencing?",
    options: Array.from(modifiers).slice(0, 8).map((m) => ({ value: m, label: cap(m) })),
  });
  // Question 2: red-flag yes/no for the worst flag in the bucket.
  const topFlag = bucket.redFlags[0];
  if (topFlag) {
    out.push({
      id: "redflag",
      prompt: `Have you noticed any of: ${topFlag.triggers.slice(0, 4).join(", ")}?`,
      options: [
        { value: "yes", label: "Yes, one or more", redFlag: true },
        { value: "no", label: "No" },
      ],
    });
  }
  return out;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function runTriage(input: TriageInput): TriageResult {
  const bucket = findBucket(input.chiefComplaint);
  const lower = input.chiefComplaint.toLowerCase();
  const modifiersLower = input.modifiers.map((m) => m.toLowerCase());

  // Red-flag scan over chief complaint + modifier set. Hits → ER_NOW.
  const redFlags: string[] = [];
  for (const phrase of ER_REDFLAG_PHRASES) {
    if (lower.includes(phrase) || modifiersLower.some((m) => m.includes(phrase))) {
      redFlags.push(phrase);
    }
  }
  if (bucket) {
    for (const rf of bucket.redFlags) {
      const hit = rf.triggers.find((t) => lower.includes(t.toLowerCase()) || modifiersLower.some((m) => m.includes(t.toLowerCase())));
      if (hit) redFlags.push(rf.label);
    }
  }

  // Urgency triage.
  let urgency: Urgency = "ROUTINE";
  if (redFlags.length > 0) urgency = "ER_NOW";
  else if (input.severity && input.severity >= 4) urgency = "TODAY";
  else if (input.durationDays !== undefined && input.durationDays >= 14) urgency = "WITHIN_3_DAYS";
  else if (input.severity && input.severity >= 3) urgency = "WITHIN_3_DAYS";

  // Specialty-fit.
  const suggestedSpecialty = bucket ? SPECIALTY_FOR_BUCKET[bucket.id] : undefined;
  const docSp = (input.doctorSpecialty || "").toLowerCase();
  let doctorIsGoodFit = true;
  if (suggestedSpecialty && docSp) {
    const ss = suggestedSpecialty.toLowerCase();
    // Soft match — "general medicine" / "internal medicine" /
    // "family medicine" all count as good-fit fallbacks.
    const isGeneralist = /general|internal|family|gp/.test(docSp);
    doctorIsGoodFit = docSp.includes(ss.split(" ")[0]) || isGeneralist;
  }

  // Confidence — modifier hits + duration sanity.
  let confidence = bucket ? 0.6 : 0.3;
  if (input.modifiers.length >= 2) confidence += 0.2;
  if (input.durationDays !== undefined) confidence += 0.05;
  if (input.severity !== undefined) confidence += 0.05;
  confidence = Math.min(0.95, confidence);

  // Build the human-readable recommendation.
  let recommendation: string;
  switch (urgency) {
    case "ER_NOW":
      recommendation = "Your symptoms include red flags that need emergency-room evaluation right now. Don't wait for an appointment — go to the nearest ER or call an ambulance.";
      break;
    case "TODAY":
      recommendation = doctorIsGoodFit
        ? "See a doctor today. The symptoms you've described fit this specialty — book the next available slot."
        : `See a ${suggestedSpecialty || "doctor"} today. The symptoms you've described fit a different specialty than this doctor.`;
      break;
    case "WITHIN_3_DAYS":
      recommendation = doctorIsGoodFit
        ? "Book within the next 3 days. Symptoms aren't an emergency but warrant attention."
        : `Book a ${suggestedSpecialty || "doctor"} within the next 3 days.`;
      break;
    case "ROUTINE":
    default:
      recommendation = doctorIsGoodFit
        ? "A routine appointment with this doctor should work. Bring the notes below to the visit."
        : `A routine visit with a ${suggestedSpecialty || "doctor"} would fit better. We can suggest one.`;
  }

  // Pre-visit note — copy-paste-ready summary.
  const noteParts: string[] = [];
  noteParts.push(`Chief complaint: ${input.chiefComplaint}`);
  if (input.durationDays !== undefined) noteParts.push(`Duration: ${input.durationDays} day${input.durationDays === 1 ? "" : "s"}`);
  if (input.severity !== undefined) noteParts.push(`Severity (self-rated): ${input.severity}/5`);
  if (input.modifiers.length > 0) noteParts.push(`Associated symptoms: ${input.modifiers.join(", ")}`);
  if (redFlags.length > 0) noteParts.push(`Red flags noted: ${redFlags.join(", ")}`);
  const preVisitNote = noteParts.join("\n");

  return {
    recommendation,
    urgency,
    doctorIsGoodFit,
    suggestedSpecialty: doctorIsGoodFit ? undefined : suggestedSpecialty,
    redFlags,
    preVisitNote,
    confidence,
    matchedBucketId: bucket?.id,
  };
}
