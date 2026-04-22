// Curated Unsplash photo pool for blog cover images.
//
// We keep a small vetted list per category — same ID → same image forever,
// so no broken CDNs. Each call returns a deterministic pick based on slug
// so the same post always shows the same image (no flicker on refresh).
//
// All URLs use `images.unsplash.com/photo-<id>` which is Unsplash's
// long-lived CDN (vs. the deprecated `source.unsplash.com` redirector).

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

// Generic fallback pool — used when category isn't recognized.
const DEFAULT_POOL = [
  "1505576399279-565b52d4ac71",
  "1532938911079-1b06ac7ceec7",
  "1576091160399-112ba8d25d1d",
  "1579684385127-1ef15d508118",
  "1559757175-5700dde675bc",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function buildUrl(photoId: string, width: number): string {
  return `https://images.unsplash.com/photo-${photoId}?w=${width}&q=80&auto=format&fit=crop`;
}

/**
 * Pick a cover image for a blog post.
 * Deterministic: same (category, seed) always returns the same URL.
 */
export function pickBlogImage(category: string, seed: string, width = 1200): string {
  const pool = IMAGE_POOLS[category] || DEFAULT_POOL;
  const idx = hashString(seed || category) % pool.length;
  return buildUrl(pool[idx], width);
}
