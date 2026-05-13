// POST /api/care-plan/ai-generate
//
// Patient picks a condition (and optionally a diagnosis date / free
// note) on /dashboard/care-plan, taps "Generate with AI", and gets a
// suggested title + lifestyle goals + brief notes back. The patient
// reviews and edits before saving — AI here is decision-support, not
// medical advice.
//
// Provider precedence mirrors the prescription helper: GEMINI →
// OPENAI → ANTHROPIC. Falls through to 503 so the client can let the
// patient know AI is unavailable and they can fill the form manually.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { log } from "@/lib/log";

export const runtime = "nodejs";

interface AIPlan {
  title: string;
  goals: string[];
  notes: string;
}

const SYSTEM_PROMPT = `You are a patient-facing health coach helping someone draft a personal care plan for a chronic condition. A licensed clinician will review the plan at the next visit — you are NOT prescribing.

Given a condition (and optional diagnosis date or note), produce a friendly, realistic starter plan:
- title: a short, encouraging plan name (max 60 chars). Example: "Living well with Type 2 Diabetes".
- goals: 4–7 specific, measurable lifestyle goals the patient can do at home. Each goal must be a single line, action-oriented, and concrete (include numbers/duration where it helps). Avoid medical jargon. Examples: "Walk 30 minutes after dinner, 5 days a week", "Check fasting blood sugar every Monday morning".
- notes: 1–2 short sentences of context — why this plan matters and a gentle red-flag reminder (e.g. when to call a doctor).

Rules:
- Tone: warm, second-person, motivating. Not preachy.
- Never name specific medicines or dosages.
- Never diagnose, just support the stated condition.
- If the condition is unknown or unsafe to coach on (e.g. cancer, pregnancy complications, mental-health crisis), set goals=[] and put a single sentence in notes asking them to book a consult.
- Respond with ONLY a single JSON object matching the schema. No prose, no markdown fences.`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Sign in to use the AI helper." }, { status: 401 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !openaiKey && !anthropicKey) {
    return NextResponse.json(
      { error: "AI helper not configured." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const condition = typeof body.condition === "string" ? body.condition.trim() : "";
  const conditionLabel = typeof body.conditionLabel === "string" ? body.conditionLabel.trim() : "";
  const diagnosedOn = typeof body.diagnosedOn === "string" ? body.diagnosedOn.trim() : "";
  const context = typeof body.context === "string" ? body.context.trim().slice(0, 500) : "";

  if (!condition && !conditionLabel) {
    return NextResponse.json({ error: "Pick a condition first." }, { status: 400 });
  }

  const userPrompt = [
    `Condition: ${conditionLabel || condition}`,
    diagnosedOn && `Diagnosed on: ${diagnosedOn}`,
    context && `Patient note: ${context}`,
    "",
    "Respond with a single JSON object: { \"title\": string, \"goals\": string[], \"notes\": string }",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    let text = "";
    let provider = "";
    if (geminiKey) {
      provider = "gemini";
      text = await callGemini(geminiKey, userPrompt);
    } else if (openaiKey) {
      provider = "openai";
      text = await callOpenAI(openaiKey, userPrompt);
    } else {
      provider = "anthropic";
      text = await callAnthropic(anthropicKey!, userPrompt);
    }

    const parsed = extractJson(text);
    if (!parsed) {
      log.error("care-plan ai response not json", { provider, text: text.slice(0, 300) });
      return NextResponse.json({ error: "AI response was not valid JSON." }, { status: 502 });
    }

    const plan: AIPlan = {
      title: String(parsed.title ?? "").trim().slice(0, 80),
      goals: Array.isArray(parsed.goals)
        ? parsed.goals.slice(0, 10).map((s: unknown) => String(s).trim()).filter(Boolean)
        : [],
      notes: String(parsed.notes ?? "").trim().slice(0, 400),
    };

    return NextResponse.json({ plan });
  } catch (err) {
    log.error("care-plan ai failed", err);
    return NextResponse.json(
      { error: "AI service unreachable. Try again or fill the form manually." },
      { status: 502 },
    );
  }
}

async function callGemini(key: string, userPrompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    log.error("gemini api error", { status: res.status, body: errText });
    throw new Error(`gemini ${res.status}`);
  }
  const payload = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callOpenAI(key: string, userPrompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    log.error("openai api error", { status: res.status, body: errText });
    throw new Error(`openai ${res.status}`);
  }
  const payload = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(key: string, userPrompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    log.error("anthropic api error", { status: res.status, body: errText });
    throw new Error(`anthropic ${res.status}`);
  }
  const payload = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  return payload.content?.find((c) => c.type === "text")?.text ?? "";
}

function extractJson(text: string): Record<string, unknown> | null {
  if (!text) return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through */
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}
