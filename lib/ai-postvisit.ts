// AI post-visit Q&A helper.
//
// After a consultation is complete and a prescription has been issued, the
// patient may have follow-up questions: "what was the dose again?", "can
// I take this with food?", "side effects?". Calling the clinic for these
// is friction; nobody is around at 11pm.
//
// This helper takes the consultation context (chief complaint, doctor's
// assessment + plan, prescribed medicines) plus a question from the
// patient and returns a safe, conservative answer with two important
// behaviours:
//
//   1. Refers the patient back to their doctor for anything that's not
//      a literal restatement of advice in the chart.
//   2. Recognises emergency phrases ("chest pain", "can't breathe",
//      "passing out") and redirects to local emergency services
//      regardless of context.
//
// We surface a tiny disclaimer in every response so patients never
// confuse this with a doctor's diagnosis.

import { generateJson } from "./gemini";

export interface PostVisitContext {
  chiefComplaint?: string;
  diagnosis?: string;          // assessment from the visit
  treatmentPlan?: string;      // plan from the visit
  prescribedMedicines?: Array<{
    name: string;
    dose?: string;
    frequency?: string;
    duration?: string;
  }>;
  doctorName?: string;
  visitDate?: string;
  patientAge?: string;
  patientSex?: string;
}

export interface PostVisitAnswer {
  /** Plain-language answer, 1-3 short paragraphs. */
  answer: string;
  /** True when the model thinks the question warrants escalation. */
  escalate: boolean;
  /** When escalate=true, a one-line reason. */
  escalationReason?: string;
  /** True when the question contained emergency language; UI overlays
   *  a hard "call emergency" CTA. */
  emergency: boolean;
  generatedAt: string;
}

const SYSTEM_PROMPT = `You are a careful patient-facing health assistant in a telemedicine app. The patient just finished a consultation and has a follow-up question. You have:
- the doctor's working diagnosis
- the treatment plan they prescribed
- the list of medicines (name, dose, frequency, duration)

Your job:
1. Answer questions that can be answered factually from the consultation context (e.g. "what was the dose?", "how long do I take it?", "can I take it with food?" — if food advice is in the plan).
2. For general drug-safety questions (interactions with common foods/OTC drugs) you MAY answer briefly using widely-known clinical knowledge, but always end with: "Confirm with your doctor or pharmacist before relying on this."
3. Refuse to diagnose new symptoms, change doses, or recommend new medications. Politely redirect to the doctor.
4. If the question contains emergency signs (chest pain, severe shortness of breath, passing out, severe bleeding, suicidal thoughts, signs of stroke/anaphylaxis), set "emergency": true and tell the patient to seek emergency care immediately.
5. If the question is outside your remit, set "escalate": true with a one-line reason.

Tone:
- Warm, plain language. Avoid jargon. Use "you" not "the patient".
- 1-3 short paragraphs. Doctors hate when patients screenshot AI walls of text.
- No diagnosis. No new prescriptions. No dose changes.
- If the consultation context is missing or sparse, say so honestly and recommend calling the clinic.`;

const SCHEMA = {
  type: "object" as const,
  properties: {
    answer: { type: "string" },
    escalate: { type: "boolean" },
    escalationReason: { type: "string" },
    emergency: { type: "boolean" },
  },
  required: ["answer", "escalate", "emergency"],
};

function describeContext(ctx: PostVisitContext): string {
  const lines: string[] = [];
  if (ctx.visitDate) lines.push(`Visit date: ${ctx.visitDate}`);
  if (ctx.doctorName) lines.push(`Doctor: ${ctx.doctorName}`);
  if (ctx.patientAge) lines.push(`Patient age: ${ctx.patientAge}`);
  if (ctx.patientSex) lines.push(`Patient sex: ${ctx.patientSex}`);
  if (ctx.chiefComplaint) lines.push(`Chief complaint: ${ctx.chiefComplaint}`);
  if (ctx.diagnosis) lines.push(`Diagnosis: ${ctx.diagnosis}`);
  if (ctx.treatmentPlan) lines.push(`Plan: ${ctx.treatmentPlan}`);
  if (ctx.prescribedMedicines && ctx.prescribedMedicines.length > 0) {
    lines.push("Prescribed medicines:");
    for (const m of ctx.prescribedMedicines) {
      lines.push(
        `- ${m.name}${m.dose ? ` ${m.dose}` : ""}${m.frequency ? ` (${m.frequency})` : ""}${m.duration ? ` for ${m.duration}` : ""}`
      );
    }
  }
  return lines.join("\n") || "(no consultation context provided)";
}

export async function answerPostVisitQuestion(input: {
  question: string;
  context: PostVisitContext;
  callerEmail?: string;
  patientEmail?: string;
}): Promise<PostVisitAnswer> {
  const q = input.question?.trim() || "";
  if (!q) {
    return {
      answer: "Type your question and I'll do my best to help.",
      escalate: false,
      emergency: false,
      generatedAt: new Date().toISOString(),
    };
  }

  const userPrompt = [
    "CONSULTATION CONTEXT:",
    describeContext(input.context),
    "",
    "PATIENT QUESTION:",
    q,
    "",
    "Produce the JSON answer now.",
  ].join("\n");

  const result = await generateJson<{
    answer: string;
    escalate: boolean;
    escalationReason?: string;
    emergency: boolean;
  }>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    schema: SCHEMA,
    temperature: 0.3,
    maxOutputTokens: 1024,
    tag: "ai-postvisit",
    callerEmail: input.callerEmail,
    patientEmail: input.patientEmail,
  });

  return {
    answer: (result.answer || "").trim() || "I couldn't produce an answer. Please contact your doctor.",
    escalate: !!result.escalate,
    escalationReason: result.escalationReason?.trim() || undefined,
    emergency: !!result.emergency,
    generatedAt: new Date().toISOString(),
  };
}
