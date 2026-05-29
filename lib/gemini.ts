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
import { recordAiUsage } from "./ai-usage";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const GEMINI_FALLBACKS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

function apiUrl(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

function streamApiUrl(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;
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
  /** Tag for log lines + ai_usage row (e.g. "ai-prescription"). */
  tag?: string;
  /** Doctor / clinician email — written to ai_usage so admins can
   *  show clinics who used how much. Optional but strongly preferred. */
  callerEmail?: string;
  /** Patient email when relevant (post-visit Q&A, scribe). */
  patientEmail?: string;
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
  let chosenModel = "";
  const startedAt = Date.now();

  // Per-request timeout. Gemini occasionally takes 30+s under load,
  // and the user just sees a spinner. Force-abort at 22s so we can
  // either retry the same model or fall through to a faster fallback
  // before they give up. Total worst-case (2 attempts × 4 models) is
  // ~3 min, but the very first ok result short-circuits.
  const REQUEST_TIMEOUT_MS = 22_000;
  outer: for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
      let r: Response;
      try {
        r = await fetch(
          `${apiUrl(model)}?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: requestBody,
            signal: ctrl.signal,
          }
        );
      } catch (err) {
        clearTimeout(t);
        const aborted = (err as { name?: string })?.name === "AbortError";
        lastStatus = aborted ? 504 : 0;
        lastErrBody = aborted ? "request timed out" : (err instanceof Error ? err.message : String(err));
        // Treat timeouts and network errors as transient — try next
        // attempt or fall through to the next model in the chain.
        if (attempt < 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        continue;
      }
      clearTimeout(t);
      if (r.ok) {
        res = r;
        chosenModel = model;
        break outer;
      }
      lastStatus = r.status;
      lastErrBody = await r.text().catch(() => "");
      const transient = r.status === 503 || r.status === 429 || r.status >= 500;
      if (!transient) break; // non-transient — skip to next model
      if (attempt < 1) {
        // Tighter retry: 400ms vs the old 800ms × 2^n. Two attempts
        // per model is enough to dodge a momentary 503; longer waits
        // just compound the perceived slowness.
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }
  }

  if (!res) {
    void recordAiUsage({
      route: tag,
      callerEmail: opts.callerEmail,
      patientEmail: opts.patientEmail,
      latencyMs: Date.now() - startedAt,
      ok: false,
      errorTag: `http_${lastStatus}`,
    });
    throw new Error(
      `Gemini API error ${lastStatus} (all models exhausted). ${lastErrBody.slice(0, 200)}`
    );
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  };
  const usage = data.usageMetadata;
  const candidate = data.candidates?.[0];
  const raw = candidate?.content?.parts?.[0]?.text?.trim();
  const finishReason = candidate?.finishReason;
  if (!raw) {
    throw new Error(
      `Model returned no text content (finishReason: ${finishReason || "unknown"})`
    );
  }

  const cleaned = stripJsonFence(raw);
  const recordSuccess = () =>
    void recordAiUsage({
      route: tag,
      callerEmail: opts.callerEmail,
      patientEmail: opts.patientEmail,
      model: chosenModel,
      promptTokens: usage?.promptTokenCount,
      outputTokens: usage?.candidatesTokenCount,
      totalTokens: usage?.totalTokenCount,
      latencyMs: Date.now() - startedAt,
      ok: true,
    });
  try {
    const parsed = JSON.parse(cleaned) as T;
    recordSuccess();
    return parsed;
  } catch {
    const repaired = tryRepairTruncatedJson(cleaned);
    if (repaired) {
      recordSuccess();
      return repaired as T;
    }
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]) as T;
        recordSuccess();
        return parsed;
      } catch {
        const r2 = tryRepairTruncatedJson(match[0]);
        if (r2) {
          recordSuccess();
          return r2 as T;
        }
      }
    }
    log.error(`${tag}.non_json`, undefined, {
      preview: raw.slice(0, 500),
      finishReason,
    });
    void recordAiUsage({
      route: tag,
      callerEmail: opts.callerEmail,
      patientEmail: opts.patientEmail,
      model: chosenModel,
      promptTokens: usage?.promptTokenCount,
      outputTokens: usage?.candidatesTokenCount,
      totalTokens: usage?.totalTokenCount,
      latencyMs: Date.now() - startedAt,
      ok: false,
      errorTag: "non_json",
    });
    throw new Error(
      `Model output was not JSON (finishReason: ${finishReason || "unknown"})`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────
// Streaming variant.
//
// generateJsonStream yields raw text fragments as Gemini emits them.
// The route handler accumulates them and forwards each as an SSE event
// to the browser; the browser parses partial JSON to update fields
// (specialty, urgency, reasoning, …) the moment each value lands.
//
// No model fallback / retry here — for an interactive UI a single
// stream from gemini-flash is the right tradeoff. Falls back to the
// non-streaming generateJson() if the caller wants resilience.
// ─────────────────────────────────────────────────────────────────────

export interface JsonStreamChunk {
  /** Cumulative text emitted so far. Lets the consumer re-parse
   *  without buffering on their side. */
  text: string;
  /** Just-arrived delta — the tokens emitted in this chunk. */
  delta: string;
  /** True on the final chunk. */
  done: boolean;
}

export async function* generateJsonStream(
  opts: GenerateJsonOptions,
): AsyncGenerator<JsonStreamChunk, void, unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const requestBody = JSON.stringify({
    ...(opts.systemPrompt
      ? { systemInstruction: { parts: [{ text: opts.systemPrompt }] } }
      : {}),
    contents: [{ role: "user", parts: [{ text: opts.userPrompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.6,
      maxOutputTokens: opts.maxOutputTokens ?? 4096,
      responseMimeType: "application/json",
      responseSchema: opts.schema,
    },
  });

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 22_000);
  let res: Response;
  try {
    res = await fetch(
      `${streamApiUrl(GEMINI_MODEL)}&key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
        signal: ctrl.signal,
      },
    );
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
  if (!res.ok || !res.body) {
    clearTimeout(timeout);
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini stream HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";

  try {
    // Gemini's SSE response is `data: {json}\n\n` lines.
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Process complete SSE events terminated by blank line.
      let sep;
      while ((sep = buffer.indexOf("\n\n")) >= 0) {
        const eventBlock = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        for (const line of eventBlock.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload) as {
              candidates?: Array<{
                content?: { parts?: Array<{ text?: string }> };
              }>;
            };
            const part = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (part) {
              accumulated += part;
              yield { text: accumulated, delta: part, done: false };
            }
          } catch {
            // Ignore malformed SSE payloads — the next one usually
            // parses fine.
          }
        }
      }
    }
  } finally {
    clearTimeout(timeout);
    reader.releaseLock();
  }
  yield { text: accumulated, delta: "", done: true };
}
