// AI blog-post generator.
//
// Uses Google Gemini (free tier, ~1500 req/day) via fetch. No SDK needed.
// Rotates across three topic strategies so content stays varied:
//   - A) Broad general-health evergreen topics
//   - B) Specialty-aligned (pulls from our actual doctor specialties so every
//        article can naturally link to booking that specialist)
//   - C) Local/seasonal/regional — India-focused, month-aware
//
// Strict safety guardrails are baked into the prompt:
//   - No dosages, no specific treatment recommendations, no diagnosis
//   - Every article ends with a "not medical advice" disclaimer
//   - Output MUST be a JSON object; we parse + validate before saving

// `gemini-flash-latest` alias points to the newest Flash model with the
// most generous free-tier quota. Overridable via env for future model
// swaps without a redeploy.
import { log } from "./log";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
// Fallback chain — if the primary model is overloaded (503) or rate limited
// (429), try these in order before giving up.
const GEMINI_FALLBACKS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
function apiUrl(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

// Pulled from our doctors list in lib/data.ts so the specialist CTA matches
// real bookable doctors.
const SPECIALTIES = [
  "General Physician",
  "Dermatologist",
  "Gynecologist",
  "Pediatrician",
  "Dentist",
  "Orthopedist",
  "Psychiatrist",
  "Cardiologist",
];

const BROAD_TOPICS = [
  "understanding blood pressure numbers and what's healthy",
  "signs of vitamin D deficiency and why it matters",
  "how much water you actually need per day (myths vs science)",
  "why sleep quality matters more than sleep quantity",
  "the link between gut health and immunity",
  "what your cholesterol numbers really mean",
  "when a headache is more than just a headache",
  "how stress silently damages your health — and how to spot it",
  "the truth about intermittent fasting for general health",
  "daily habits that protect your heart long-term",
  "why posture affects your whole body, not just your back",
  "5 early signs of diabetes most people ignore",
  "how to read a nutrition label like a doctor",
  "the science of hydration: electrolytes vs water",
  "why morning sunlight matters for your body clock",
];

// Rotates month-aware so content feels timely. ~15 themes.
function seasonalTopicsFor(date: Date): string[] {
  const month = date.getMonth(); // 0=Jan
  // India seasonal cycle
  const winter = [0, 1, 11]; // Dec–Feb
  const summer = [2, 3, 4, 5]; // Mar–Jun
  const monsoon = [6, 7, 8]; // Jul–Sep
  const post = [9, 10]; // Oct–Nov festive/pollution

  if (winter.includes(month)) {
    return [
      "staying healthy through winter in India",
      "preventing cold and flu during seasonal change",
      "why joint pain flares up in cold weather",
      "winter skincare that actually works for Indian skin",
      "the best warming foods for immunity this winter",
    ];
  }
  if (summer.includes(month)) {
    return [
      "preventing heat stroke during an Indian summer",
      "dehydration warning signs you shouldn't ignore",
      "why summer is the worst time for skin infections",
      "safe outdoor activity when temperatures cross 40°C",
      "cooling foods that don't just taste good — they help",
    ];
  }
  if (monsoon.includes(month)) {
    return [
      "monsoon illnesses every Indian family should prepare for",
      "preventing dengue and malaria at home",
      "why waterborne infections spike in monsoon",
      "fungal skin infections — why they thrive in humidity",
      "foods that boost immunity during monsoon season",
    ];
  }
  if (post.includes(month)) {
    return [
      "protecting your lungs during high pollution months",
      "festive season eating without hurting your heart",
      "managing diabetes during Diwali and festivals",
      "why air quality matters even indoors",
      "post-festival detox — what actually works vs marketing",
    ];
  }
  return BROAD_TOPICS;
}

type TopicStrategy = "broad" | "specialty" | "seasonal";

function pickStrategy(date: Date): TopicStrategy {
  // Rotate A/B/C across the week: Mon/Thu broad, Tue/Fri specialty, Wed/Sat/Sun seasonal
  const day = date.getDay(); // 0=Sun
  if (day === 1 || day === 4) return "broad";
  if (day === 2 || day === 5) return "specialty";
  return "seasonal";
}

function pickTopic(date: Date): { topic: string; category: string; linkedSpecialty?: string } {
  const strategy = pickStrategy(date);
  if (strategy === "broad") {
    const t = BROAD_TOPICS[Math.floor(Math.random() * BROAD_TOPICS.length)];
    return { topic: t, category: "Wellness" };
  }
  if (strategy === "specialty") {
    const spec = SPECIALTIES[Math.floor(Math.random() * SPECIALTIES.length)];
    const topicBySpec: Record<string, string> = {
      "General Physician": "the annual health check-up — what tests actually matter",
      "Dermatologist": "acne in adults — causes that aren't just hormones",
      "Gynecologist": "what a normal menstrual cycle actually looks like",
      "Pediatrician": "when a child's fever needs a doctor vs home care",
      "Dentist": "gum bleeding is never normal — here's what it means",
      "Orthopedist": "chronic back pain — when to see a specialist",
      "Psychiatrist": "the difference between sadness and clinical depression",
      "Cardiologist": "early signs your heart is under stress",
    };
    return {
      topic: topicBySpec[spec] || "common health issues we see every week",
      category: categoryForSpecialty(spec),
      linkedSpecialty: spec,
    };
  }
  // seasonal
  const pool = seasonalTopicsFor(date);
  const t = pool[Math.floor(Math.random() * pool.length)];
  return { topic: t, category: "Medical Tips" };
}

function categoryForSpecialty(spec: string): string {
  if (spec === "Psychiatrist") return "Mental Health";
  if (spec === "General Physician") return "Wellness";
  return "Medical Tips";
}

export interface GeneratedArticle {
  title: string;
  excerpt: string;
  content: string; // HTML
  category: string;
  tags: string[];
  author: string;
  topicStrategy: TopicStrategy;
  linkedSpecialty?: string;
}

function buildSystemPrompt(): string {
  return `You are a senior medical content editor writing for OduDoc, an Indian healthcare platform where patients book doctors and consult online.

You write clear, accurate, patient-friendly health articles. Your audience is educated adults without medical training.

HARD SAFETY RULES — violating these is unacceptable:
- Never give specific drug dosages
- Never recommend specific medications by name for a reader to take
- Never give diagnostic conclusions (do not say "if you have X symptoms you have Y disease")
- Never recommend skipping professional care
- Always encourage readers to consult a doctor for anything symptomatic
- Every article must end with this exact disclaimer paragraph: "<p><em>This article is for informational purposes only and is not a substitute for professional medical advice. Always consult a qualified doctor for concerns about your health.</em></p>"

STYLE RULES:
- Warm, calm, direct — like a doctor explaining to a friend
- Short paragraphs (2–4 sentences)
- No fluff, no filler, no "in today's fast-paced world" openings
- Use concrete numbers and ranges when they're standard/safe (e.g. "normal BP is under 120/80")
- No emojis. No first-person ("I", "we") unless referring to the OduDoc platform
- British or American English is fine, be consistent within the article

SEO STRUCTURE RULES — every article must follow these:
- Open with a single <p> "TL;DR / what this article covers" summary (2-3 sentences) before any heading. Search engines surface this as the featured snippet.
- Use 3-5 <h2> section headings that each target a natural question or sub-topic. Prefer question-style headings ("How is … diagnosed?", "When should you see a doctor?") — they win AI Overview placements.
- Use <h3> sub-headings inside long <h2> sections when helpful.
- Include at least one <ul> bulleted list (checklist of symptoms, causes, or steps). Lists are heavily favoured by Google's featured snippets.
- Mention the relevant medical specialty, condition, or symptom by its common name naturally in the body — our auto-linker converts those phrases to internal links, which strengthens topic authority. Do not hand-write <a> tags.
- Include a <strong>key stat or range</strong> near the top (e.g. "Normal fasting glucose is 70–99 mg/dL") — improves rich-snippet eligibility.
- End the body with a <h2>Frequently asked questions</h2> section containing 3-5 question/answer pairs. Use <h3> for each question and <p> for the answer (2-3 sentences). This section will be parsed into FAQPage schema.
- Disclaimer paragraph is the VERY LAST element, after the FAQ section.

OUTPUT FORMAT — respond with ONLY a valid JSON object, no markdown fences, no commentary:
{
  "title": "SEO-friendly headline, 50-65 chars, sentence case, ideally includes the primary keyword near the start",
  "excerpt": "1-2 sentence meta description, 140-155 chars, includes primary keyword, designed to earn clicks from SERPs",
  "content": "Full article as clean HTML. Use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> only — never <h1>, <div>, <span>, <img>, <a>, or inline styles. Target 700-900 words. Must follow the SEO STRUCTURE RULES above.",
  "tags": ["primary-keyword", "secondary-keyword", "related-term-1", "related-term-2", "related-term-3"],
  "author": "Dr. <realistic Indian doctor name>"
}`;
}

function buildUserPrompt(topic: string, category: string, linkedSpecialty?: string): string {
  const ctaHint = linkedSpecialty
    ? `Near the end of the article, include a single natural sentence suggesting the reader can consult a ${linkedSpecialty} on OduDoc if they have concerns. Do not make it salesy.`
    : `Near the end, include a single natural sentence suggesting the reader can consult a doctor on OduDoc if they want personalised guidance. Do not make it salesy.`;

  return `Write today's article.

TOPIC: ${topic}
CATEGORY: ${category}
${ctaHint}

Return only the JSON object. No explanations before or after.`;
}

function stripJsonFence(text: string): string {
  return text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

interface ParsedArticle {
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  author: string;
}

// Trim a string to at most `max` characters without cutting mid-word.
function truncateAtWord(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = (lastSpace > 40 ? cut.slice(0, lastSpace) : s.slice(0, max)).replace(
    /[.,;:—–-]+$/,
    ""
  );
  return base.trimEnd();
}

// Sanitise HTML Gemini returns — strip disallowed tags (h1, a, img, div, span,
// inline styles, script). Anchors are intentionally removed because our
// `autolinkBlogHtml` adds internal links post-save, and hand-written links
// from the model often point to fabricated URLs.
function sanitiseArticleHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(h1|div|span|section|article|main|header|footer|aside|img|iframe|form|input|button)[^>]*>/gi, "")
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/\sstyle="[^"]*"/gi, "")
    .replace(/\sclass="[^"]*"/gi, "")
    .replace(/\son[a-z]+="[^"]*"/gi, "");
}

function validateArticle(obj: unknown): ParsedArticle {
  if (!obj || typeof obj !== "object") throw new Error("Model did not return an object");
  const o = obj as Record<string, unknown>;
  let title = typeof o.title === "string" ? o.title.trim() : "";
  let excerpt = typeof o.excerpt === "string" ? o.excerpt.trim() : "";
  let content = typeof o.content === "string" ? o.content.trim() : "";
  const author = typeof o.author === "string" ? o.author.trim() : "Dr. OduDoc Editorial";
  const tags = Array.isArray(o.tags)
    ? o.tags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  if (!title) throw new Error("Missing title");
  if (!excerpt) throw new Error("Missing excerpt");
  if (!content || content.length < 200) throw new Error("Content too short");

  // SEO hard caps: Google truncates titles > ~60 chars and meta descriptions
  // > ~160 chars. Trim at a word boundary so we never publish "how to r…".
  title = truncateAtWord(title, 65);
  excerpt = truncateAtWord(excerpt, 155);

  content = sanitiseArticleHtml(content);

  if (!/informational purposes only/i.test(content)) {
    // Disclaimer missing — append it
    content +=
      `\n<p><em>This article is for informational purposes only and is not a substitute for professional medical advice. Always consult a qualified doctor for concerns about your health.</em></p>`;
  }
  return { title, excerpt, content, tags, author };
}

export interface GenerateOptions {
  /** Override the auto-picked topic. */
  topic?: string;
  /** Override the auto-picked category. */
  category?: string;
  /** Force a strategy (for admin manual generation). */
  strategy?: TopicStrategy;
  /** Date to base seasonal/rotation logic on. Defaults to now. */
  date?: Date;
}

// Best-effort repair for JSON truncated mid-string (hit MAX_TOKENS). Gemini
// sometimes cuts off inside the "content" field — we close the string and
// braces so we can at least salvage title/excerpt and whatever content made it
// through. The admin can polish the draft before publishing anyway.
function tryRepairTruncatedJson(text: string): Record<string, unknown> | null {
  // Walk the string, tracking whether we're inside a string and escaped state,
  // and brace depth. Then append whatever's needed to close cleanly.
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
  // Close trailing comma before brace if present.
  repaired = repaired.replace(/,\s*$/, "");
  while (depth > 0) {
    repaired += "}";
    depth--;
  }
  try {
    return JSON.parse(repaired) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function generateBlogArticle(opts: GenerateOptions = {}): Promise<GeneratedArticle> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const date = opts.date || new Date();
  let topic = opts.topic;
  let category = opts.category;
  let strategy: TopicStrategy;
  let linkedSpecialty: string | undefined;

  if (topic) {
    strategy = opts.strategy || "broad";
    if (!category) category = "Wellness";
  } else {
    if (opts.strategy) {
      // honour forced strategy
      const fakeDate = new Date(date);
      if (opts.strategy === "broad") fakeDate.setDate(fakeDate.getDate() - ((fakeDate.getDay() - 1 + 7) % 7));
      if (opts.strategy === "specialty") fakeDate.setDate(fakeDate.getDate() - ((fakeDate.getDay() - 2 + 7) % 7));
      if (opts.strategy === "seasonal") fakeDate.setDate(fakeDate.getDate() - ((fakeDate.getDay() - 3 + 7) % 7));
      const picked = pickTopic(fakeDate);
      topic = picked.topic;
      category = picked.category;
      linkedSpecialty = picked.linkedSpecialty;
      strategy = opts.strategy;
    } else {
      const picked = pickTopic(date);
      topic = picked.topic;
      category = picked.category;
      linkedSpecialty = picked.linkedSpecialty;
      strategy = pickStrategy(date);
    }
  }

  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
    contents: [
      {
        role: "user",
        parts: [{ text: buildUserPrompt(topic, category!, linkedSpecialty) }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          excerpt: { type: "string" },
          content: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          author: { type: "string" },
        },
        required: ["title", "excerpt", "content", "tags", "author"],
      },
    },
  });

  // Try the primary model with 2 retries (exp backoff) for transient 503/429,
  // then fall through to fallback models. Total budget ~12s worst case.
  const modelsToTry = [GEMINI_MODEL, ...GEMINI_FALLBACKS.filter((m) => m !== GEMINI_MODEL)];
  let res: Response | null = null;
  let lastErrBody = "";
  let lastStatus = 0;

  outer: for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await fetch(`${apiUrl(model)}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: requestBody,
      });
      if (r.ok) {
        res = r;
        break outer;
      }
      lastStatus = r.status;
      lastErrBody = await r.text().catch(() => "");
      // Only retry on transient errors; bail immediately on 4xx (except 429).
      const transient = r.status === 503 || r.status === 429 || r.status >= 500;
      if (!transient) break; // move to next model
      if (attempt < 2) {
        const delay = 800 * Math.pow(2, attempt); // 800ms, 1600ms
        await new Promise((resolve) => setTimeout(resolve, delay));
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
  if (!raw) throw new Error(`Model returned no text content (finishReason: ${finishReason || "unknown"})`);

  let parsed: unknown;
  const cleaned = stripJsonFence(raw);
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try repairing truncated JSON (hit MAX_TOKENS mid-string).
    const repaired = tryRepairTruncatedJson(cleaned);
    if (repaired) {
      parsed = repaired;
    } else {
      // Lenient fallback — find the outermost {...} block in the text
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        log.error("console.error", undefined, { args: ["[ai-blog-generator] non-JSON model output:", raw.slice(0, 500), "finishReason:", finishReason] });
        throw new Error(
          `Model output was not JSON (finishReason: ${finishReason || "unknown"}). Preview: ${raw.slice(0, 200)}`
        );
      }
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        const repaired2 = tryRepairTruncatedJson(match[0]);
        if (!repaired2) {
          log.error("console.error", undefined, { args: ["[ai-blog-generator] failed to parse extracted JSON block:", match[0].slice(0, 500), "finishReason:", finishReason] });
          throw new Error(
            `Could not parse JSON (finishReason: ${finishReason || "unknown"}). Preview: ${match[0].slice(0, 200)}`
          );
        }
        parsed = repaired2;
      }
    }
  }

  const article = validateArticle(parsed);

  return {
    ...article,
    category: category!,
    topicStrategy: strategy,
    linkedSpecialty,
  };
}
