// Voice-to-prescription parser.
//
// The client records the doctor's voice using the browser SpeechRecognition
// API (free, no server cost) and POSTs the final transcript here. We ask
// Gemini to extract the structured fields that PrescriptionData expects
// (patient, symptoms, diagnosis, medications with dose/freq/duration,
// tests, advice, follow-up). The doctor reviews and edits before the
// prescription is actually saved — nothing is committed here.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateJson } from "@/lib/gemini";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const PRESCRIPTION_SCHEMA = {
  type: "object" as const,
  properties: {
    patientName: { type: "string" },
    patientAge: { type: "string" },
    patientGender: { type: "string" },
    symptoms: { type: "string" },
    diagnosis: { type: "string" },
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
    tests: { type: "array", items: { type: "string" } },
    advice: { type: "string" },
    followUp: { type: "string" },
    unclear: {
      type: "array",
      items: { type: "string" },
      description: "List of phrases from the transcript the model was unsure about.",
    },
  },
  required: ["medications"],
};

const SYSTEM_PROMPT = `You are a medical scribe. The input is a doctor
dictating a prescription. Extract the structured fields precisely.
Rules:
- Do NOT invent data. If a field isn't clearly stated, leave it as an
  empty string (or empty array for lists).
- For medications, normalise dose (e.g. "500 mg"), frequency (e.g. "BD",
  "TDS", "every 8 hours", "once daily"), and duration (e.g. "5 days").
  If only partial info is given, fill what you can and leave the rest
  blank — never guess a dose.
- Convert spoken numbers to digits ("five hundred milligrams" -> "500 mg").
- Preserve medical terminology exactly as spoken.
- List anything you could not confidently parse in "unclear".
- Reply as valid JSON matching the provided schema.`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "doctor" && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { transcript?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const transcript = (body.transcript || "").trim();
  if (transcript.length < 4) {
    return NextResponse.json(
      { error: "Transcript is empty or too short. Please dictate again." },
      { status: 400 }
    );
  }
  if (transcript.length > 8000) {
    return NextResponse.json(
      { error: "Transcript is too long. Please keep dictation under ~2 minutes." },
      { status: 400 }
    );
  }

  try {
    const result = await generateJson<{
      patientName?: string;
      patientAge?: string;
      patientGender?: string;
      symptoms?: string;
      diagnosis?: string;
      medications?: Array<{
        name?: string;
        dose?: string;
        frequency?: string;
        duration?: string;
        instructions?: string;
      }>;
      tests?: string[];
      advice?: string;
      followUp?: string;
      unclear?: string[];
    }>({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: `Doctor's dictation:\n\n"""${transcript}"""\n\nExtract the prescription fields as JSON.`,
      schema: PRESCRIPTION_SCHEMA,
      temperature: 0.1,
      maxOutputTokens: 2048,
      tag: "voice-prescription",
    });

    // Normalise — drop empty medications, cap list sizes, ensure strings.
    const medications = (result.medications || [])
      .map((m) => ({
        name: (m?.name || "").trim(),
        dose: (m?.dose || "").trim(),
        frequency: (m?.frequency || "").trim(),
        duration: (m?.duration || "").trim(),
        instructions: (m?.instructions || "").trim(),
      }))
      .filter((m) => m.name.length > 0)
      .slice(0, 25);

    const tests = (result.tests || [])
      .map((t) => String(t || "").trim())
      .filter(Boolean)
      .slice(0, 25);

    const unclear = (result.unclear || [])
      .map((u) => String(u || "").trim())
      .filter(Boolean)
      .slice(0, 10);

    return NextResponse.json({
      ok: true,
      parsed: {
        patientName: (result.patientName || "").trim(),
        patientAge: (result.patientAge || "").trim(),
        patientGender: (result.patientGender || "").trim(),
        symptoms: (result.symptoms || "").trim(),
        diagnosis: (result.diagnosis || "").trim(),
        medications,
        tests,
        advice: (result.advice || "").trim(),
        followUp: (result.followUp || "").trim(),
        unclear,
      },
    });
  } catch (err) {
    log.error("voice-prescription.failed", err);
    const msg = err instanceof Error ? err.message : "Parse failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
