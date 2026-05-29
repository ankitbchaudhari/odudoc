// POST /api/ai/symptom-triage  { text }
//
// AI free-text triage. Patient describes symptoms in their own
// words; Gemini classifies into a specialty + urgency + brief
// reasoning. Wraps lib/gemini.ts with a structured JSON schema so
// the response is always parseable without prompt-engineering
// gymnastics. Conservative — when in doubt the model is told to
// route to General Physician with "soon" urgency.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateJson, generateJsonStream } from "@/lib/gemini";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson } from "@/lib/api-validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  text: z.string().trim().min(8).max(2000),
});

// Specialty slugs the patient can be routed to. Kept in lockstep
// with lib/symptom-router.ts so the recommendation page can render
// any of them — Gemini gets the same enum to pick from.
const SPECIALTY_SLUGS = [
  "general-physician",
  "neurologist",
  "ophthalmologist",
  "ent",
  "dermatologist",
  "cardiologist",
  "pulmonologist",
  "gastroenterologist",
  "urologist",
  "orthopedist",
  "rheumatologist",
  "psychiatrist",
  "endocrinologist",
  "diabetologist",
  "gynecologist",
] as const;

interface TriageResult {
  specialty: typeof SPECIALTY_SLUGS[number];
  specialtyLabel: string;
  urgency: "routine" | "soon" | "urgent" | "emergency";
  reasoning: string;
  redFlags: string[];
  /** AI-detected condition guesses — surfaced only as "possibilities",
   *  never presented as a diagnosis. Empty when the model isn't
   *  confident. */
  possibleConditions: string[];
}

export async function POST(req: NextRequest) {
  // AI calls are expensive — cap 20 per hour per IP. Real users
  // hit this a handful of times; this rejects scrapers without
  // breaking the demo flow.
  const blocked = await enforceRateLimit(req, "ai-symptom-triage", 20, "1 h");
  if (blocked) return blocked;

  const parsed = await parseJson(req, Schema);
  if (!parsed.ok) return parsed.response;

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "ai_not_configured", message: "AI triage isn't configured on this deployment yet. Use the visual symptom checker instead." },
      { status: 503 },
    );
  }

  // Streaming SSE response. The client opens the stream, decodes
  // `data: {...}\n\n` events, and renders each partial field the
  // moment Gemini emits it. specialty + urgency typically land in the
  // first ~300ms; reasoning + bullets stream in over the next 1-2s,
  // making the wait feel a fraction of its actual length.
  const sharedOpts = {
    tag: "ai-symptom-triage",
    systemPrompt:
      "Medical triage assistant on a telemedicine platform. Do NOT diagnose. " +
      "Route patients to the right specialty; flag emergencies. Prefer General Physician when uncertain. " +
      "Always 'emergency': severe chest pain, sudden vision loss, loss of consciousness, " +
      "shortness of breath at rest, stroke symptoms, severe head injury, anaphylaxis. " +
      "Be concise: 1-2 sentences of reasoning.",
    userPrompt:
      `Patient symptoms:\n"${parsed.data.text}"\n\n` +
      "Pick specialty + urgency. List red flags (empty array if none). " +
      "List up to 3 possibilities (empty if uncertain). Keep it patient-friendly.",
    schema: {
      type: "object" as const,
      required: ["specialty", "specialtyLabel", "urgency", "reasoning", "redFlags", "possibleConditions"],
      properties: {
        specialty: { type: "string", enum: SPECIALTY_SLUGS },
        specialtyLabel: { type: "string" },
        urgency: { type: "string", enum: ["routine", "soon", "urgent", "emergency"] },
        reasoning: { type: "string" },
        redFlags: { type: "array", items: { type: "string" } },
        possibleConditions: { type: "array", items: { type: "string" } },
      },
    },
    temperature: 0.2,
    maxOutputTokens: 350,
  };

  // Old JSON callers can still ask for a one-shot response via
  // ?stream=0 — used by mobile clients that don't speak SSE.
  if (req.nextUrl.searchParams.get("stream") === "0") {
    try {
      const result = await generateJson<TriageResult>(sharedOpts);
      return NextResponse.json(result);
    } catch (err) {
      log.error("ai_symptom_triage.failed", err);
      return NextResponse.json(
        { error: "ai_failed", message: "Couldn't analyze right now. Please try the visual symptom checker." },
        { status: 502 },
      );
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      }
      try {
        let lastText = "";
        for await (const chunk of generateJsonStream(sharedOpts)) {
          // Forward only the cumulative text — the client extracts
          // fields from partial JSON. Tiny payload, fast to render.
          emit("chunk", { text: chunk.text });
          lastText = chunk.text;
          if (chunk.done) break;
        }
        // Final parse for callers that want the structured result.
        try {
          const parsedResult = JSON.parse(lastText) as TriageResult;
          emit("result", parsedResult);
        } catch (parseErr) {
          log.warn("ai_symptom_triage.final_parse_failed", {
            err: parseErr instanceof Error ? parseErr.message : String(parseErr),
          });
          emit("error", {
            message: "Couldn't parse the final result.",
          });
        }
        emit("done", {});
      } catch (err) {
        log.error("ai_symptom_triage.failed", err);
        emit("error", {
          message:
            "Couldn't analyze right now. Please try the visual symptom checker.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
