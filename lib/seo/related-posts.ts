// Pick blog posts relevant to a given specialty / symptom / condition.
// Used to inject a "Related reading" section into the respective landing
// pages so search equity flows from SEO pages into posts and back.

import { listPosts } from "@/lib/blog-store";
import type { AdminBlogPost } from "@/lib/blog-store";

export interface RelatedPostQuery {
  // Keywords + tags to match against (lowercased comparison).
  terms: string[];
  limit?: number;
}

export async function getRelatedPosts(q: RelatedPostQuery): Promise<AdminBlogPost[]> {
  const { terms, limit = 3 } = q;
  let posts: AdminBlogPost[] = [];
  try {
    posts = await listPosts({ onlyPublished: true });
  } catch {
    return [];
  }
  if (!posts.length || !terms.length) return [];

  const needles = terms.map((t) => t.toLowerCase());

  // Score posts by how many needles appear in title + excerpt + tags. Higher
  // score wins. Ties broken by recency (listPosts already sorts DESC).
  const scored = posts.map((p) => {
    const haystack = [
      p.title,
      p.excerpt,
      ...(p.tags || []),
      p.category,
    ]
      .join(" ")
      .toLowerCase();
    let score = 0;
    for (const n of needles) {
      if (haystack.includes(n)) score++;
    }
    return { p, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}
