// AI prescription assistant.
//
// Two-phase flow:
//   1. mode="diagnosis"  — doctor enters patient age/sex/symptoms etc.
//      and gets a ranked list of likely diagnoses with confidence and
//      red flags to watch for.
//   2. mode="treatment"  — doctor picks a diagnosis; we return
//      suggested investigations, medications, and advice.
//
// All output is AI-assisted and must be reviewed by the doctor before
// being written into a prescription. We never auto-save anything here.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateJson } from "@/lib/gemini";
import { log } from "@/lib/log";

export const runtime = "nodejs";

interface DiagnosisInput {
  mode: "diagnosis";
  patient: {
    name?: string;
    age?: string | number;
    sex?: string;
    symptoms?: string;
    duration?: string;
    history?: string;
    allergies?: string;
    medications?: string;
    vitals?: string;
  };
}

interface TreatmentInput {
  mode: "treatment";
  diagnosis: string;
  patient: DiagnosisInput["patient"];
}

type Input = DiagnosisInput | TreatmentInput;

const DIAGNOSIS_SCHEMA = {
  type: "object" as const,
  properties: {
    diagnoses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          confidence: { type: "string", description: "Low / Medium / High" },
          rationale: { type: "string" },
          redFlags: { type: "array", items: { type: "string" } },
        },
        required: ["name", "confidence", "rationale"],
      },
    },
    generalNotes: { type: "string" },
  },
  required: ["diagnoses"],
};

const TREATMENT_SCHEMA = {
  type: "object" as const,
  properties: {
    investigations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          why: { type: "string" },
        },
        required: ["name"],
      },
    },
    medications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          dose: { type: "string" },
          frequency: { type: "string" },
          duration: { type: "string" },
          instructions: { type: "string" },
        },
        required: ["name"],
      },
    },
    advice: { type: "array", items: { type: "string" } },
    followUp: { type: "string" },
    redFlags: { type: "array", items: { type: "string" } },
  },
  required: ["investigations", "medications"],
};

const SYSTEM_PROMPT = `You are a clinical decision-support assistant helping a licensed doctor.
Your suggestions are advisory only — the doctor will review and approve
everything before prescribing. Be concise, evidence-based, and flag any
red-flag symptoms requiring urgent referral. Never invent drug doses; if
unsure, say so and suggest the doctor verify. Always reply as valid JSON
matching the provided schema.`;

function formatPatient(p: DiagnosisInput["patient"]): string {
  const bits: string[] = [];
  if (p.age) bits.push(`Age: ${p.age}`);
  if (p.sex) bits.push(`Sex: ${p.sex}`);
  if (p.symptoms) bits.push(`Symptoms: ${p.symptoms}`);
  if (p.duration) bits.push(`Duration: ${p.duration}`);
  if (p.history) bits.push(`History: ${p.history}`);
  if (p.allergies) bits.push(`Allergies: ${p.allergies}`);
  if (p.medications) bits.push(`Current medications: ${p.medications}`);
  if (p.vitals) bits.push(`Vitals: ${p.vitals}`);
  return bits.join("\n");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "doctor" && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Input;
  try {
    body = (await req.json()) as Input;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || (body.mode !== "diagnosis" && body.mode !== "treatment")) {
    return NextResponse.json({ error: "mode must be 'diagnosis' or 'treatment'" }, { status: 400 });
  }

  const patient = body.patient || {};
  const patientBlock = formatPatient(patient);

  try {
    if (body.mode === "diagnosis") {
      if (!patient.symptoms || String(patient.symptoms).trim().length < 3) {
        return NextResponse.json({ error: "Symptoms are required" }, { status: 400 });
      }
      const userPrompt =
        `Given the following patient details, suggest up to 5 most likely differential diagnoses, ranked by probability. For each: name, a confidence label (Low/Medium/High), one short sentence (under 25 words) of clinical rationale, and up to 3 red-flag symptoms specific to that diagnosis. Keep each diagnosis terse — the doctor reviews quickly.\n\n${patientBlock}`;
      const result = await generateJson({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt,
        schema: DIAGNOSIS_SCHEMA,
        temperature: 0.4,
        // 1500 tokens. Earlier we tried 800 as a latency optimisation
        // but Gemini's schema mode regularly hits MAX_TOKENS at that
        // ceiling — the model produces verbose rationales that don't
        // truncate cleanly back into valid JSON. 1500 still trims a
        // big slice off the original 2048 cap; the rest of the speedup
        // comes from prompt tightening + client-side prefetch.
        maxOutputTokens: 1500,
        tag: "ai-prescription.diagnosis",
      });
      return NextResponse.json({ ok: true, ...(result as object) });
    }

    // mode === "treatment"
    const diagnosis = (body.diagnosis || "").trim();
    if (!diagnosis) {
      return NextResponse.json({ error: "diagnosis is required" }, { status: 400 });
    }
    const userPrompt =
      `Patient details:\n${patientBlock || "(not provided)"}\n\nWorking diagnosis: ${diagnosis}\n\nSuggest concisely: (a) up to 4 investigations with one-line reason; (b) up to 4 first-line medications with adult dose, frequency, duration, brief instructions; (c) up to 4 advice bullets; (d) one-line follow-up; (e) up to 4 red-flag symptoms.`;
    const result = await generateJson({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      schema: TREATMENT_SCHEMA,
      temperature: 0.4,
      // Treatment output is richer (meds + investigations + advice) but
      // capping at 4 items each keeps it well under 1500 tokens.
      maxOutputTokens: 1500,
      tag: "ai-prescription.treatment",
    });
    return NextResponse.json({ ok: true, ...(result as object) });
  } catch (err) {
    log.error("ai-prescription.failed", err);
    const msg = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
