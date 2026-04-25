// AI blog-post generator.
//
// Uses Google Gemini (free tier, ~1500 req/day) via fetch. No SDK needed.
// Rotates across six categories so the blog index stays balanced and every
// section ("Wellness", "Nutrition", "Mental Health", "Fitness", "Medical
// Tips", "News") fills up over time. The day-of-week rotation guarantees
// every category gets at least one fresh post per week.
//
// Audience is global — the prompt explicitly avoids India-specific framing
// so articles work for hospitals, clinics and patients in any country we
// serve. Local/seasonal angles still appear via a month-aware seasonal
// pool, but the seasons themselves are climate-neutral (cold-season vs
// hot-season vs rainy-season vs allergy-season) rather than India-bound.
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

const WELLNESS_TOPICS = [
  "understanding blood pressure numbers and what's healthy",
  "signs of vitamin D deficiency and why it matters",
  "how much water you actually need per day (myths vs science)",
  "why sleep quality matters more than sleep quantity",
  "the link between gut health and immunity",
  "what your cholesterol numbers really mean",
  "when a headache is more than just a headache",
  "how stress silently damages your health — and how to spot it",
  "daily habits that protect your heart long-term",
  "why posture affects your whole body, not just your back",
  "5 early signs of diabetes most people ignore",
  "the science of hydration: electrolytes vs water",
  "why morning sunlight matters for your body clock",
  "how alcohol affects sleep, weight and recovery",
  "preventive screenings every adult should know about",
];

const NUTRITION_TOPICS = [
  "how to read a nutrition label like a doctor",
  "the truth about intermittent fasting for general health",
  "ultra-processed foods — what the evidence actually shows",
  "protein needs by age — what's enough vs too much",
  "added sugars vs natural sugars — does your body care?",
  "the gut microbiome and what to eat to support it",
  "iron-rich foods for vegetarians and vegans",
  "the Mediterranean diet — why doctors keep recommending it",
  "fiber: the underrated nutrient most adults under-eat",
  "what 'plant-based' actually means (and how to start)",
  "are eggs good or bad? settling the cholesterol debate",
  "vitamin and mineral deficiencies hiding in modern diets",
  "how meal timing affects metabolism and weight",
  "salt in everyday foods — where it really comes from",
  "what to eat before, during, and after exercise",
];

const MENTAL_HEALTH_TOPICS = [
  "the difference between sadness and clinical depression",
  "anxiety vs panic attacks — how to tell them apart",
  "burnout at work — the warning signs and what helps",
  "why men under-report mental health struggles",
  "talking to a teenager about their mental health",
  "the science of meditation — what it actually changes",
  "sleep and mood: the bidirectional link",
  "post-partum mental health — what new parents should know",
  "social-media use and adolescent anxiety",
  "grief — what's normal and when to seek support",
  "ADHD in adults — late diagnosis and what changes",
  "loneliness as a clinical risk factor",
  "boundaries: a mental-health skill, not a personality trait",
  "talk therapy vs medication — how they're chosen",
  "trauma-informed care — what it means for patients",
];

const FITNESS_TOPICS = [
  "how much exercise is enough — current global guidelines",
  "strength training after 40 — why it matters more, not less",
  "walking vs running — what each one really does",
  "low-impact cardio for sore knees and stiff joints",
  "the 80/20 rule for endurance training",
  "why rest days are training, not the opposite",
  "post-workout recovery — what actually helps",
  "starting from scratch — a doctor's view on couch-to-fit",
  "exercise during pregnancy — what's safe and what's not",
  "warm-ups and cool-downs — what the research says",
  "exercise for heart-disease prevention",
  "is HIIT for everyone? a balanced look",
  "stretching myths and the truth about flexibility",
  "sitting all day — what to do besides 'stand more'",
  "exercise after illness or surgery — pacing the return",
];

// Health-news topics rotate to feel current. The model is told to
// frame these as evergreen explainers anchored in recent context, NOT
// as breaking news (we can't verify breaking facts at generation time).
const NEWS_TOPICS = [
  "what the latest WHO guidance on physical activity means for adults",
  "antibiotic resistance — why doctors keep raising the alarm",
  "GLP-1 weight-loss medications — separating facts from hype",
  "post-pandemic respiratory illness trends and what to watch",
  "wearable health trackers — what the evidence supports",
  "AI in clinical care — what is and isn't ready for patients",
  "rising cases of early-onset cancers in adults under 50",
  "global vaccination schedules — what changed this year",
  "climate change and emerging health risks",
  "telemedicine adoption five years on — what works",
  "sleep apnea — why diagnosis rates are rising",
  "long Covid — current understanding of who's affected",
  "cardiovascular disease in younger adults — recent data",
  "mental-health-first-aid programs spreading globally",
  "screen-time guidelines — what pediatric bodies now say",
];

// Climate-neutral seasonal cycle. Generic enough to land in any
// hemisphere — readers in Sydney in July see "cold-season tips" the
// same way readers in London do in January.
function seasonalTopicsFor(date: Date): string[] {
  const month = date.getMonth(); // 0=Jan
  const coldMonths = [10, 11, 0, 1, 2]; // Nov–Mar (northern winter / southern summer)
  const hotMonths = [5, 6, 7]; // Jun–Aug
  const allergyMonths = [3, 4]; // Apr–May
  const transitionMonths = [8, 9]; // Sep–Oct

  if (coldMonths.includes(month)) {
    return [
      "staying healthy through the cold and flu season",
      "why joint pain flares up when temperatures drop",
      "indoor air quality during heating-on months",
      "winter skin care backed by dermatology",
      "warming foods, immunity and what evidence supports",
    ];
  }
  if (hotMonths.includes(month)) {
    return [
      "preventing heat stroke and heat exhaustion",
      "dehydration warning signs you shouldn't ignore",
      "summer skin infections and how to avoid them",
      "exercising safely when it's over 35°C / 95°F",
      "sunscreen myths versus what dermatologists actually use",
    ];
  }
  if (allergyMonths.includes(month)) {
    return [
      "seasonal allergies — what works and what doesn't",
      "asthma flares during high-pollen months",
      "allergic conjunctivitis explained without jargon",
      "indoor allergens that get worse with windows open",
      "kids and allergy season — when to see a doctor",
    ];
  }
  if (transitionMonths.includes(month)) {
    return [
      "respiratory illnesses that surge at season change",
      "how seasonal change affects sleep and mood",
      "preparing your immune system for the cold months",
      "back-to-school season and family wellness",
      "vaccination timing as flu season approaches",
    ];
  }
  return WELLNESS_TOPICS;
}

type TopicStrategy =
  | "wellness"
  | "nutrition"
  | "mental_health"
  | "fitness"
  | "specialty"
  | "news"
  | "seasonal";

// Day-of-week rotation: every category gets at least one slot per
// week, plus seasonal/specialty wildcards on the weekend so content
// stays varied without leaving any tab empty for long.
//   Mon → Wellness
//   Tue → Nutrition
//   Wed → Mental Health
//   Thu → Fitness
//   Fri → Specialty (lands in Medical Tips / Wellness / Mental Health)
//   Sat → News
//   Sun → Seasonal (Medical Tips)
function pickStrategy(date: Date): TopicStrategy {
  const day = date.getDay(); // 0=Sun
  if (day === 1) return "wellness";
  if (day === 2) return "nutrition";
  if (day === 3) return "mental_health";
  if (day === 4) return "fitness";
  if (day === 5) return "specialty";
  if (day === 6) return "news";
  return "seasonal";
}

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function pickTopic(date: Date): { topic: string; category: string; linkedSpecialty?: string } {
  const strategy = pickStrategy(date);
  switch (strategy) {
    case "wellness":
      return { topic: randomFrom(WELLNESS_TOPICS), category: "Wellness" };
    case "nutrition":
      return { topic: randomFrom(NUTRITION_TOPICS), category: "Nutrition" };
    case "mental_health":
      return { topic: randomFrom(MENTAL_HEALTH_TOPICS), category: "Mental Health" };
    case "fitness":
      return { topic: randomFrom(FITNESS_TOPICS), category: "Fitness" };
    case "news":
      return { topic: randomFrom(NEWS_TOPICS), category: "News" };
    case "specialty": {
      const spec = randomFrom(SPECIALTIES);
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
    case "seasonal":
    default: {
      const pool = seasonalTopicsFor(date);
      return { topic: randomFrom(pool), category: "Medical Tips" };
    }
  }
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
  return `You are a senior medical content editor writing for OduDoc, a global healthcare platform where patients book doctors and consult online. Readers are spread across North America, Europe, the Middle East, Africa, South Asia, Southeast Asia, and Latin America — keep examples, units, and idioms region-neutral unless the topic itself is regional.

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
- When citing temperatures, weights, distances etc., give BOTH metric and US units (e.g. "35°C / 95°F", "70 kg / 154 lb") so readers in any country can use the article
- No emojis. No first-person ("I", "we") unless referring to the OduDoc platform
- Avoid country-specific framing ("in India", "for Americans") unless the topic explicitly requires it
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
  "author": "Dr. <realistic full doctor name — vary the country of origin across articles (e.g. Anjali Mehta, James Carter, Maria Rossi, Olu Adeyemi, Chen Wei, Sara Al-Mansoori). Always start with 'Dr. '.>"
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
    strategy = opts.strategy || "wellness";
    if (!category) category = "Wellness";
  } else {
    if (opts.strategy) {
      // Honour forced strategy: nudge the picker's date so its
      // day-of-week branch lands on the requested rotation slot.
      // Mon=wellness, Tue=nutrition, Wed=mental_health, Thu=fitness,
      // Fri=specialty, Sat=news, Sun=seasonal.
      const targetDay: Record<TopicStrategy, number> = {
        wellness: 1,
        nutrition: 2,
        mental_health: 3,
        fitness: 4,
        specialty: 5,
        news: 6,
        seasonal: 0,
      };
      const fakeDate = new Date(date);
      const delta = (fakeDate.getDay() - targetDay[opts.strategy] + 7) % 7;
      fakeDate.setDate(fakeDate.getDate() - delta);
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
        log.error("ai_blog_generator.non_json_model_output", undefined, { preview: raw.slice(0, 500), finishReason });
        throw new Error(
          `Model output was not JSON (finishReason: ${finishReason || "unknown"}). Preview: ${raw.slice(0, 200)}`
        );
      }
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        const repaired2 = tryRepairTruncatedJson(match[0]);
        if (!repaired2) {
          log.error("ai_blog_generator.failed_to_parse_extracted_json_block", undefined, { preview: match[0].slice(0, 500), finishReason });
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
