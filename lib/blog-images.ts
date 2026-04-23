// Cover-image picker for blog posts.
//
// Strategy, in order:
//   1. If UNSPLASH_ACCESS_KEY is set, query Unsplash /search/photos with the
//      article title (+ leading tag). Pick the first landscape result.
//   2. Otherwise, score the title + tags against a keyword→image map so a
//      "hydration" article gets a water/glass image instead of a random
//      wellness stock photo.
//   3. Fall back to the original per-category pool, seeded by title so the
//      same topic gets the same image but different topics differ.
//
// All returned URLs are stable, long-lived CDN links.

import { log } from "./log";

// ---------- curated topic pool ----------
// Each entry: keywords that might appear in a title/tag → a single good
// Unsplash photo. Searched first (higher priority than the category pool).
const TOPIC_POOL: { keywords: string[]; id: string }[] = [
  // Hydration / water
  { keywords: ["hydration", "dehydration", "water", "electrolyte", "thirst"], id: "1548839140-29a749e1cf4d" },
  { keywords: ["sleep", "insomnia", "rest", "bedtime"], id: "1511295742362-92c96b1cf484" },
  { keywords: ["meditation", "mindfulness", "calm", "breath", "yoga"], id: "1506126613408-eca07ce68773" },
  { keywords: ["running", "jog", "cardio", "marathon"], id: "1571008887538-b36bb32f4571" },
  { keywords: ["gym", "strength", "weight", "muscle", "workout"], id: "1534438327276-14e5300c3a48" },
  { keywords: ["fruit", "berries", "vitamin", "antioxidant"], id: "1490474418585-ba9bad8fd0ea" },
  { keywords: ["vegetable", "salad", "greens", "leafy", "broccoli", "spinach"], id: "1512621776951-a57141f2eefd" },
  { keywords: ["diet", "weight loss", "calorie", "nutrition plan"], id: "1490645935967-10de6ba17061" },
  { keywords: ["heart", "cardiovascular", "cardiology", "blood pressure", "hypertension"], id: "1584466977773-e625c37cdd50" },
  { keywords: ["diabetes", "sugar", "insulin", "glucose"], id: "1579154204601-01588f351e67" },
  { keywords: ["pregnancy", "prenatal", "maternity", "expectant"], id: "1519874179391-3ebc752241dd" },
  { keywords: ["child", "paediatric", "pediatric", "kid", "baby", "infant"], id: "1503454537195-1dcabb73ffb9" },
  { keywords: ["skin", "skincare", "acne", "derma", "rash"], id: "1556228720-195a672e8a03" },
  { keywords: ["dental", "teeth", "tooth", "dentist", "oral"], id: "1588776814546-ec7aaa5fef5a" },
  { keywords: ["eye", "vision", "ophthal"], id: "1523297220124-edadf3f23ef4" },
  { keywords: ["cancer", "oncology", "chemo", "tumor"], id: "1579154204601-01588f351e67" },
  { keywords: ["vaccine", "immun", "shot", "injection"], id: "1584515933487-779824d29309" },
  { keywords: ["cold", "flu", "cough", "fever", "sneeze", "virus"], id: "1584744646319-8b6b4cf9e6e4" },
  { keywords: ["covid", "corona", "pandemic", "mask"], id: "1584483766114-2cea6facdf57" },
  { keywords: ["stress", "anxiety", "depress", "burnout", "mental"], id: "1499209974431-9dddcece7f88" },
  { keywords: ["lung", "breath", "asthma", "respiratory", "pneumonia"], id: "1530026405186-ed1f139313f8" },
  { keywords: ["stomach", "digest", "gut", "ibs", "bloat", "gastric"], id: "1559757175-5700dde675bc" },
  { keywords: ["headache", "migraine"], id: "1512621776951-a57141f2eefd" },
  { keywords: ["bone", "joint", "arthritis", "back pain", "posture", "spine"], id: "1599447421416-3414500d18a5" },
  { keywords: ["monsoon", "rain", "dengue", "malaria", "mosquito"], id: "1534239697798-120952b76f2b" },
  { keywords: ["summer", "heat", "sun", "sunstroke"], id: "1473496169904-658ba7c44d8a" },
  { keywords: ["winter", "cold weather", "frost"], id: "1483921020237-2ff51e8e4b22" },
  { keywords: ["senior", "elderly", "aging", "geriatric"], id: "1447710441604-5bdc41bc6517" },
  { keywords: ["doctor", "hospital", "clinic", "consultation"], id: "1576091160399-112ba8d25d1d" },
  { keywords: ["medication", "pill", "pharmacy", "prescription"], id: "1584308666744-24d5c474f2ae" },
  { keywords: ["blood", "haemoglobin", "anemia"], id: "1582719471384-894fbb16e074" },
  { keywords: ["kidney", "renal", "dialysis"], id: "1530026405186-ed1f139313f8" },
  { keywords: ["liver", "hepatitis"], id: "1559757175-5700dde675bc" },
  { keywords: ["thyroid", "hormone"], id: "1576091160399-112ba8d25d1d" },
  { keywords: ["walk", "step", "daily activity"], id: "1571019613454-1cb2f99b2d8b" },
  { keywords: ["coffee", "caffeine", "tea"], id: "1447933601403-0c6688de566e" },
  { keywords: ["sugar", "dessert", "sweet"], id: "1488900128323-21503983a07e" },
];

// ---------- category fallback pool ----------
const IMAGE_POOLS: Record<string, string[]> = {
  Wellness: [
    "1505576399279-565b52d4ac71",
    "1506126613408-eca07ce68773",
    "1518611012118-696072aa579a",
    "1540206395-68808572332f",
    "1506126613408-eca07ce68773",
  ],
  Nutrition: [
    "1512621776951-a57141f2eefd",
    "1490645935967-10de6ba17061",
    "1498837167922-ddd27525d352",
    "1540420773420-3366772f4999",
    "1505253668822-42074d58a7c6",
  ],
  "Mental Health": [
    "1499209974431-9dddcece7f88",
    "1506905925346-21bda4d32df4",
    "1544367567-0f2fcb009e0b",
    "1518770660439-4636190af475",
    "1497491942041-a7d78a2f61ea",
  ],
  Fitness: [
    "1571019613454-1cb2f99b2d8b",
    "1517836357463-d25dfeac3438",
    "1534438327276-14e5300c3a48",
    "1518611012118-696072aa579a",
    "1571902943202-507ec2618e8f",
  ],
  "Medical Tips": [
    "1576091160399-112ba8d25d1d",
    "1579684385127-1ef15d508118",
    "1530026405186-ed1f139313f8",
    "1584982751601-97dcc096659c",
    "1559757148-5c350d0d3c56",
  ],
  News: [
    "1504868584819-f8e8b4b6d7e3",
    "1586773860418-d37222d8fce3",
    "1585435557343-3b092031a831",
    "1583912086096-8c60d75a53f9",
    "1530026405186-ed1f139313f8",
  ],
};

const DEFAULT_POOL = [
  "1505576399279-565b52d4ac71",
  "1532938911079-1b06ac7ceec7",
  "1576091160399-112ba8d25d1d",
  "1579684385127-1ef15d508118",
  "1559757175-5700dde675bc",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildUrl(photoId: string, width: number): string {
  return `https://images.unsplash.com/photo-${photoId}?w=${width}&q=80&auto=format&fit=crop`;
}

// Score title + tags against TOPIC_POOL and return the best match id (or null).
function pickFromTopicPool(title: string, tags?: string[]): string | null {
  const haystack = `${title} ${(tags || []).join(" ")}`.toLowerCase();
  let bestScore = 0;
  let bestId: string | null = null;
  for (const entry of TOPIC_POOL) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (haystack.includes(kw)) score += kw.length; // longer match wins ties
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = entry.id;
    }
  }
  return bestId;
}

// Unsplash search (requires UNSPLASH_ACCESS_KEY). Returns a usable photo URL
// sized to `width`, or null on any failure.
async function unsplashSearch(
  query: string,
  width: number
): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key || !query.trim()) return null;
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
      query
    )}&per_page=5&orientation=landscape&content_filter=high`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
      // Fail fast — we don't want this blocking article creation.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      results?: Array<{ urls?: { raw?: string; regular?: string } }>;
    };
    const first = json.results?.[0];
    const raw = first?.urls?.raw;
    if (raw) {
      // Unsplash "raw" URL accepts dynamic sizing params.
      return `${raw}&w=${width}&q=80&auto=format&fit=crop`;
    }
    return first?.urls?.regular || null;
  } catch (err) {
    log.error("blog-images.unsplash_search_failed", err);
    return null;
  }
}

export interface PickBlogImageInput {
  category: string;
  title: string;
  tags?: string[];
  seed?: string; // usually the slug — used as a stable tiebreaker
}

/**
 * Pick a cover image for a blog post.
 * Topic-aware: uses Unsplash search if configured, then a curated keyword
 * pool, then the per-category pool as a last resort.
 */
export async function pickBlogImage(
  input: PickBlogImageInput,
  width = 1200
): Promise<string> {
  const { category, title, tags, seed } = input;

  // 1. Unsplash search (if key configured)
  const remote = await unsplashSearch(
    [title, tags?.[0], category].filter(Boolean).join(" "),
    width
  );
  if (remote) return remote;

  // 2. Topic-keyword pool
  const topicId = pickFromTopicPool(title, tags);
  if (topicId) return buildUrl(topicId, width);

  // 3. Category pool, seeded by title so different topics → different images
  const pool = IMAGE_POOLS[category] || DEFAULT_POOL;
  const idx = hashString(seed || title || category) % pool.length;
  return buildUrl(pool[idx], width);
}

/**
 * Synchronous fallback used for one-off DB backfills where we don't want
 * to await a remote call per row.
 */
export function pickBlogImageSync(category: string, seed: string, width = 1200): string {
  const pool = IMAGE_POOLS[category] || DEFAULT_POOL;
  const idx = hashString(seed || category) % pool.length;
  return buildUrl(pool[idx], width);
}
