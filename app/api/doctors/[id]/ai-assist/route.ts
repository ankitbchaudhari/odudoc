// Public doctor-profile AI helper.
//
// Two modes driven by the same endpoint so the client can swap tabs
// without new routes:
//
//   mode="fit"   — patient describes a symptom / concern. Gemini checks
//                  whether this doctor's specialty is the right fit
//                  and suggests alternatives if not. Also returns a
//                  one-line urgency flag (routine / soon / urgent).
//
//   mode="prep"  — patient is about to book. Gemini generates a
//                  pre-visit checklist tailored to the doctor's
//                  specialty + the patient's concern: questions to
//                  ask the doctor, records / tests to bring, symptoms
//                  to track before the visit.
//
// Public route — no auth required; patients on the profile page use
// this before booking. We throttle implicitly via Gemini's own limits
// and keep prompts short (≤1200 chars of user input).
//
// Nothing is stored. Output is advisory only — we include a short
// disclaimer in every response so the UI can surface it.
//
// This is NOT medical advice. It only orients the patient towards the
// right specialist / prepared visit.
//
// Shape:
//   POST /api/doctors/[id]/ai-assist
//   body: { mode: "fit", concern: string }
//       | { mode: "prep", concern: string }
//   resp: { ok: true, ...result }

import { NextRequest, NextResponse } from "next/server";
import { getPublicDoctorByIdFresh } from "@/lib/public-doctors";
import { generateJson } from "@/lib/gemini";
import { log } from "@/lib/log";

export const runtime = "nodejs";

interface FitInput { mode: "fit"; concern: string }
interface PrepInput { mode: "prep"; concern: string }
type Input = FitInput | PrepInput;

const FIT_SCHEMA = {
  type: "object" as const,
  properties: {
    fit: { type: "string", description: "Good fit / Possible fit / Not ideal" },
    fitRationale: { type: "string" },
    urgency: { type: "string", description: "Routine / Soon / Urgent" },
    urgencyReason: { type: "string" },
    alternativeSpecialties: { type: "array", items: { type: "string" } },
    suggestedQuestions: { type: "array", items: { type: "string" } },
  },
  required: ["fit", "fitRationale", "urgency"],
};

const PREP_SCHEMA = {
  type: "object" as const,
  properties: {
    questions: { type: "array", items: { type: "string" } },
    recordsToBring: { type: "array", items: { type: "string" } },
    trackBeforeVisit: { type: "array", items: { type: "string" } },
    redFlags: { type: "array", items: { type: "string" } },
  },
  required: ["questions", "recordsToBring"],
};

const SYSTEM_PROMPT = `You are a friendly healthcare navigation assistant on a
doctor's public profile page. You help patients figure out whether this
doctor's specialty matches their concern and prepare for a productive
visit. You are NOT a medical professional and you never diagnose, name
medications, or give dosing. Always use plain, warm, non-alarming
language. If the concern is life-threatening (chest pain, stroke signs,
severe bleeding, suicidal thoughts, anaphylaxis), mark urgency="Urgent"
and tell the patient to call emergency services instead of waiting for
a booking. Reply only as valid JSON matching the provided schema.`;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const doctor = await getPublicDoctorByIdFresh(params.id);
  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  let body: Input;
  try {
    body = (await req.json()) as Input;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || (body.mode !== "fit" && body.mode !== "prep")) {
    return NextResponse.json({ error: "mode must be 'fit' or 'prep'" }, { status: 400 });
  }

  const concern = (body.concern || "").trim().slice(0, 1200);
  if (concern.length < 4) {
    return NextResponse.json({ error: "Please describe your concern in a bit more detail." }, { status: 400 });
  }

  const doctorBlock =
    `Doctor: ${doctor.name}\n` +
    `Specialty: ${doctor.specialty}\n` +
    `Qualifications: ${doctor.qualifications || "(unspecified)"}\n` +
    `Years of experience: ${doctor.experience ?? "(unspecified)"}\n` +
    `Services offered: ${(doctor.services || []).join(", ") || "(unspecified)"}`;

  try {
    if (body.mode === "fit") {
      const userPrompt =
        `A patient is viewing this doctor's profile and describes their concern. Tell them whether booking THIS doctor is a good fit, a possible fit, or not ideal, based on the specialty and services. Give a one-line urgency label (Routine / Soon / Urgent) and a short reason. If not a good fit, suggest 1–3 alternative specialties. Also list 2–4 short questions the patient should ask in the consultation.\n\n` +
        `${doctorBlock}\n\nPatient concern:\n${concern}`;
      const result = await generateJson({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt,
        schema: FIT_SCHEMA,
        temperature: 0.3,
        maxOutputTokens: 1200,
        tag: "doctor-profile.fit",
      });
      return NextResponse.json({
        ok: true,
        disclaimer: "AI guidance only — not a medical diagnosis.",
        ...(result as object),
      });
    }

    // mode === "prep"
    const userPrompt =
      `The patient is about to book this doctor. Give a short, specific pre-visit prep list tailored to the doctor's specialty and the patient's concern. Include: (a) 3–6 questions the patient should ask; (b) records / reports / medication lists to bring; (c) things to track or note in the days before the visit (e.g. symptom diary, pain scale, triggers); (d) any red-flag symptoms that would mean not waiting for the appointment and going to urgent care instead. Keep each item one short sentence.\n\n` +
      `${doctorBlock}\n\nPatient concern:\n${concern}`;
    const result = await generateJson({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      schema: PREP_SCHEMA,
      temperature: 0.3,
      maxOutputTokens: 1400,
      tag: "doctor-profile.prep",
    });
    return NextResponse.json({
      ok: true,
      disclaimer: "AI-generated checklist — your doctor's advice always takes priority.",
      ...(result as object),
    });
  } catch (err) {
    log.error("doctor-profile.ai.failed", err);
    const msg = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
