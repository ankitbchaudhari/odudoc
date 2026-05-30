// Post-visit WhatsApp Q&A.
//
// When the patient replies to a follow_up_after_visit message with
// something the deterministic chatbot can't classify — e.g. "is it
// normal that the swelling came back?" — we route the question
// through Gemini, scoped to the patient's most recent consultation
// notes. This is the "WhatsApp ambient care" capability: patients
// get useful follow-up answers without opening the app, and the
// model is grounded in the specific visit context (drugs, dx, the
// doctor's notes) instead of hallucinating from generic priors.
//
// Guardrails baked in:
//   - We always lead with "I'm an AI, not your doctor." Patients
//     hear this in the first sentence so they don't mistake the bot
//     for medical advice.
//   - The system prompt forbids diagnosing, prescribing dose changes,
//     and overruling the doctor's plan. When the question is risky
//     (worsening symptom, allergic reaction, severe pain) we route
//     to escalation instead of answering.
//   - Token budget is small (300 out, ~1500 in) so a runaway loop
//     can't drain credit.
//   - Used only when WA_AI_POST_VISIT_ENABLED is "1" on the env, so
//     deployments that haven't approved the feature stay deterministic.
//
// The webhook calls answerPostVisitQuestion() ONLY when the
// deterministic chatbot classified the inbound as "unknown" AND we
// were able to resolve a recent visit for the sender's phone. Both
// conditions are checked in lib/whatsapp-chatbot.ts.

import { generateJson } from "./gemini";
import { findUserByPhone } from "./users-store";
import { listConsultations } from "./consultations-store";
import { log } from "./log";
import { recordAiUsage } from "./ai-usage";

const POST_VISIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface PostVisitContext {
  patientName: string;
  doctorName: string;
  scheduledFor: string;
  /** Doctor's free-text notes, or "" if missing. */
  notes: string;
  /** Comma-separated medication names for grounding. */
  medications: string;
}

interface PostVisitAnswer {
  /** "answer" — Gemini produced a useful reply.
   *  "escalate" — the question signalled a red flag (severe symptom,
   *  allergic reaction, suicidal ideation) and we should NOT
   *  attempt to answer; route to a clinician instead.
   *  "off_topic" — the question isn't about the visit; let the
   *  deterministic fallback take over. */
  type: "answer" | "escalate" | "off_topic";
  body: string;
}

/** Resolve the most recent eligible consultation for a sender's
 *  phone. Returns null when:
 *   - the phone doesn't map to a registered user
 *   - the user has no consultations within the last 7 days
 *   - the most recent visit was more than 7 days ago (the 24h WA
 *     customer-service window is long gone anyway by that point, but
 *     we also don't want the bot answering month-old visit questions
 *     with stale context). */
export function findRecentVisitContextForPhone(
  phone: string,
): PostVisitContext | null {
  const user = findUserByPhone(phone);
  if (!user?.email) return null;

  const visits = listConsultations({ patientEmail: user.email });
  if (!visits.length) return null;

  // Sort by scheduledFor desc and pick the most recent one within the
  // post-visit window. Older visits are skipped — answering questions
  // about a 3-month-old visit with current state would be misleading.
  const sorted = [...visits].sort(
    (a, b) =>
      new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime(),
  );
  const recent = sorted.find((c) => {
    const ts = new Date(c.scheduledFor).getTime();
    return Number.isFinite(ts) && Date.now() - ts < POST_VISIT_WINDOW_MS;
  });
  if (!recent) return null;

  const notes =
    (recent as { doctorNotes?: string }).doctorNotes ||
    (recent as { notes?: string }).notes ||
    "";
  const medications =
    ((recent as { prescriptionMedications?: Array<{ name?: string }> })
      .prescriptionMedications || [])
      .map((m) => m.name)
      .filter(Boolean)
      .join(", ") || "";

  return {
    patientName: recent.patientName || user.name || "Patient",
    doctorName: recent.doctorName || "Doctor",
    scheduledFor: recent.scheduledFor,
    notes: String(notes).slice(0, 1500),
    medications,
  };
}

interface AnswerSchema {
  type: "answer" | "escalate" | "off_topic";
  body: string;
}

const RESPONSE_SCHEMA = {
  type: "object" as const,
  required: ["type", "body"],
  properties: {
    type: { type: "string", enum: ["answer", "escalate", "off_topic"] },
    body: { type: "string" },
  },
};

export async function answerPostVisitQuestion(
  question: string,
  ctx: PostVisitContext,
): Promise<PostVisitAnswer> {
  if (process.env.WA_AI_POST_VISIT_ENABLED !== "1") {
    return { type: "off_topic", body: "" };
  }
  if (!process.env.GEMINI_API_KEY) {
    log.warn("post_visit.no_gemini_key");
    return { type: "off_topic", body: "" };
  }

  try {
    const result = await generateJson<AnswerSchema>({
      tag: "wa-post-visit",
      systemPrompt:
        "Post-visit WhatsApp assistant on OduDoc. Patient asked a question after seeing a doctor. " +
        "ALWAYS start your answer with 'I'm an AI, not your doctor.' Do NOT diagnose, change dosages, or " +
        "overrule the doctor's plan. If the question signals a red flag (severe chest pain, sudden vision " +
        "loss, allergic reaction, suicidal ideation, severe bleeding) set type='escalate' and write a " +
        "short body telling the patient to call emergency services and reply DOCTOR to reach a clinician. " +
        "If the question isn't about the visit (e.g. asking for an unrelated booking) set type='off_topic' " +
        "with body=''. Otherwise type='answer' and give 1-3 sentences, calm, plain language, in English.",
      userPrompt:
        `Visit context\n` +
        `- Patient: ${ctx.patientName}\n` +
        `- Doctor: ${ctx.doctorName}\n` +
        `- Visited on: ${ctx.scheduledFor}\n` +
        `- Prescribed meds: ${ctx.medications || "(none recorded)"}\n` +
        `- Doctor notes (excerpt): ${ctx.notes || "(none recorded)"}\n\n` +
        `Patient's WhatsApp message:\n"""${question.slice(0, 500)}"""\n\n` +
        "Answer or escalate.",
      schema: RESPONSE_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 300,
      patientEmail: undefined,
    });
    return {
      type: result.type,
      body: result.body || "",
    };
  } catch (err) {
    log.warn("post_visit.gemini_failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
    void recordAiUsage({
      route: "wa-post-visit",
      ok: false,
      errorTag: "exception",
      latencyMs: 0,
    });
    return { type: "off_topic", body: "" };
  }
}
