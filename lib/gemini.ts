// Shared Gemini JSON-mode client.
//
// Extracted from lib/ai-blog-generator.ts so other AI features (AI
// prescription assistant, etc.) can reuse the same model + fallback chain
// and JSON repair logic without duplicating the HTTP code.
//
// Minimal surface: generateJson({systemPrompt, userPrompt, schema}) → parsed
// object. Retries + model fallback are baked in. Missing GEMINI_API_KEY is
// a thrown error — callers decide what to do with it.

import { log } from "./log";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const GEMINI_FALLBACKS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

function apiUrl(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

function stripJsonFence(text: string): string {
  return text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

// Best-effort repair for JSON truncated mid-string (hit MAX_TOKENS).
function tryRepairTruncatedJson(text: string): unknown | null {
  let inString = false;
  let escaped = false;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (c === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") depth--;
  }
  let repaired = text;
  if (inString) repaired += '"';
  repaired = repaired.replace(/,\s*$/, "");
  while (depth > 0) {
    repaired += "}";
    depth--;
  }
  try {
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}

export interface JsonSchema {
  type: "object" | "array" | "string" | "number" | "boolean";
  properties?: Record<string, unknown>;
  items?: unknown;
  required?: string[];
  [key: string]: unknown;
}

export interface GenerateJsonOptions {
  systemPrompt?: string;
  userPrompt: string;
  schema: JsonSchema;
  temperature?: number;
  maxOutputTokens?: number;
  /** Tag for log lines (e.g. "ai-prescription"). */
  tag?: string;
}

export async function generateJson<T = unknown>(
  opts: GenerateJsonOptions
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const tag = opts.tag || "gemini";
  const requestBody = JSON.stringify({
    ...(opts.systemPrompt
      ? { systemInstruction: { parts: [{ text: opts.systemPrompt }] } }
      : {}),
    contents: [
      {
        role: "user",
        parts: [{ text: opts.userPrompt }],
      },
    ],
    generationConfig: {
      temperature: opts.temperature ?? 0.6,
      maxOutputTokens: opts.maxOutputTokens ?? 4096,
      responseMimeType: "application/json",
      responseSchema: opts.schema,
    },
  });

  const modelsToTry = [GEMINI_MODEL, ...GEMINI_FALLBACKS.filter((m) => m !== GEMINI_MODEL)];
  let res: Response | null = null;
  let lastErrBody = "";
  let lastStatus = 0;

  outer: for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await fetch(
        `${apiUrl(model)}?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: requestBody,
        }
      );
      if (r.ok) {
        res = r;
        break outer;
      }
      lastStatus = r.status;
      lastErrBody = await r.text().catch(() => "");
      const transient = r.status === 503 || r.status === 429 || r.status >= 500;
      if (!transient) break; // non-transient — skip to next model
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 800 * Math.pow(2, attempt)));
      }
    }
  }

  if (!res) {
    throw new Error(
      `Gemini API error ${lastStatus} (all models exhausted). ${lastErrBody.slice(0, 200)}`
    );
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };
  const candidate = data.candidates?.[0];
  const raw = candidate?.content?.parts?.[0]?.text?.trim();
  const finishReason = candidate?.finishReason;
  if (!raw) {
    throw new Error(
      `Model returned no text content (finishReason: ${finishReason || "unknown"})`
    );
  }

  const cleaned = stripJsonFence(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const repaired = tryRepairTruncatedJson(cleaned);
    if (repaired) return repaired as T;
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        const r2 = tryRepairTruncatedJson(match[0]);
        if (r2) return r2 as T;
      }
    }
    log.error(`${tag}.non_json`, undefined, {
      preview: raw.slice(0, 500),
      finishReason,
    });
    throw new Error(
      `Model output was not JSON (finishReason: ${finishReason || "unknown"})`
    );
  }
}
