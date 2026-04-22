// Auto-linker for blog HTML.
//
// Takes already-rendered HTML and, for each term in our internal-link
// dictionary, wraps the *first* case-insensitive, whole-word occurrence in an
// <a href="..."> pointing at the canonical page. Skips content inside existing
// anchors, headings, pre/code blocks, and HTML tag attributes.
//
// Used to quietly sprinkle internal links into blog posts without editing
// their source content.

import { SPECIALTIES } from "./specialties";
import { SYMPTOMS } from "./symptoms";
import { CONDITIONS } from "./conditions";

interface LinkEntry {
  // Display phrase to match in text (case-insensitive, whole word).
  phrase: string;
  // Target URL.
  href: string;
  // Priority — higher matched first. Specific multi-word phrases rank above
  // generic single words to avoid partial-match collisions.
  priority: number;
}

function buildDictionary(): LinkEntry[] {
  const entries: LinkEntry[] = [];

  // Specialties — match by display name (e.g. "Cardiologist"). Plural variant
  // adds a lightweight catch for "Cardiologists".
  for (const s of SPECIALTIES) {
    entries.push({ phrase: s.displayName, href: `/specialty/${s.slug}`, priority: 5 });
    entries.push({ phrase: `${s.displayName}s`, href: `/specialty/${s.slug}`, priority: 6 });
  }

  // Symptoms — "headache", "fatigue", etc.
  for (const s of SYMPTOMS) {
    entries.push({ phrase: s.name, href: `/symptoms/${s.slug}`, priority: 4 });
  }

  // Conditions — full names (with parenthetical) go up to higher priority so
  // "Hypertension (High Blood Pressure)" can be matched partially by the
  // plain label we also register below.
  for (const c of CONDITIONS) {
    // Try a couple of aliases for robustness without over-linking.
    const plain = c.name.replace(/\s*\(.*?\)\s*$/, "").trim();
    entries.push({ phrase: plain, href: `/conditions/${c.slug}`, priority: 7 });
    if (plain !== c.name) {
      entries.push({ phrase: c.name, href: `/conditions/${c.slug}`, priority: 8 });
    }
  }

  // A few hand-picked brand/product concept links.
  entries.push({ phrase: "video consultation", href: "/consult", priority: 3 });
  entries.push({ phrase: "video consultations", href: "/consult", priority: 3 });
  entries.push({ phrase: "online consultation", href: "/consult", priority: 3 });
  entries.push({ phrase: "lab tests", href: "/tests", priority: 3 });
  entries.push({ phrase: "hospital software", href: "/for-clinics", priority: 3 });

  // Sort longest/most-specific phrase first for stable matching.
  entries.sort((a, b) => b.priority - a.priority || b.phrase.length - a.phrase.length);
  return entries;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Blocks whose content must not be autolinked (preserve code, prevent nested
// anchors, don't over-link titles).
const SKIP_BLOCK_RE = /^\s*<(a|h1|h2|h3|h4|h5|h6|pre|code|button|script|style)(\s|>|\/)/i;
const SKIP_CLOSE_RE = /^\s*<\/(a|h1|h2|h3|h4|h5|h6|pre|code|button|script|style)(\s|>)/i;

export function autolinkBlogHtml(html: string): string {
  if (!html) return html;

  const dict = buildDictionary();
  // Tokens alternate between HTML tags and text runs. Use a simple split on
  // '<...>' to separate them.
  const parts = html.split(/(<[^>]+>)/g);

  // Track whether we're inside a skip block (nested depth).
  let skipDepth = 0;
  // Track whether a given phrase has already been linked anywhere in the doc.
  const used = new Set<string>();

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    // If the token looks like an HTML tag, update skip-depth tracking and
    // leave it untouched.
    if (part.startsWith("<") && part.endsWith(">")) {
      if (SKIP_BLOCK_RE.test(part) && !part.endsWith("/>")) {
        skipDepth++;
      } else if (SKIP_CLOSE_RE.test(part) && skipDepth > 0) {
        skipDepth--;
      }
      continue;
    }

    // Inside a skip block — don't modify.
    if (skipDepth > 0) continue;

    // Try each dictionary entry, first-match-wins per phrase.
    let text = part;
    for (const entry of dict) {
      const key = entry.phrase.toLowerCase();
      if (used.has(key)) continue;

      const re = new RegExp(`\\b(${escapeRegex(entry.phrase)})\\b`, "i");
      const m = text.match(re);
      if (!m || m.index === undefined) continue;

      const before = text.slice(0, m.index);
      const matched = m[1];
      const after = text.slice(m.index + matched.length);
      const anchor = `<a href="${entry.href}" class="text-primary-600 underline hover:text-primary-700">${matched}</a>`;
      text = `${before}${anchor}${after}`;
      used.add(key);
    }
    parts[i] = text;
  }

  return parts.join("");
}
