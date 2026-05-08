// Lightweight AI suggestion re-ranker.
//
// Until we have enough labelled data to train a real model, this is a
// deterministic ranker that boosts suggestions which doctors have
// historically accepted (and de-prioritises ones they've rejected) on
// the same surface. Pure heuristic — no ML libraries needed.
//
// Usage:
//   const ranked = rerankSuggestions("ai-prescription.diagnosis",
//     dxList, (d) => d.name);

import { reloadAiFeedback } from "./ai-feedback-store";

interface FeedbackSnapshot {
  suggestionLower: string;
  surface: string;
  accepts: number;
  rejects: number;
}

let cache: { at: number; data: FeedbackSnapshot[] } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 min — this data is stable

async function loadFeedback(): Promise<FeedbackSnapshot[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL) return cache.data;
  await reloadAiFeedback();
  // Pull rows lazily to avoid circular imports — read direct from
  // the same module's hydrate in the future. For now, fetch the
  // store's exported array via require() at runtime would couple
  // tightly; we keep the snapshot simple and let downstream code
  // pre-populate via prime() if needed.
  cache = { at: Date.now(), data: [] };
  return cache.data;
}

/** Allow callers to seed the snapshot from outside (e.g. an admin
 *  endpoint that already has the feedback rows loaded). */
export function prime(snapshots: Array<{ surface: string; suggestion: string; verdict: "accepted" | "edited" | "rejected" | "ignored" }>) {
  const map = new Map<string, FeedbackSnapshot>();
  for (const s of snapshots) {
    const key = `${s.surface}::${s.suggestion.toLowerCase().trim()}`;
    const existing = map.get(key) || {
      suggestionLower: s.suggestion.toLowerCase().trim(),
      surface: s.surface,
      accepts: 0,
      rejects: 0,
    };
    if (s.verdict === "accepted" || s.verdict === "edited") existing.accepts += 1;
    if (s.verdict === "rejected") existing.rejects += 1;
    map.set(key, existing);
  }
  cache = { at: Date.now(), data: Array.from(map.values()) };
}

/** Score a single suggestion. Higher = more likely to be accepted.
 *  Bayesian smoothing keeps suggestions with no history neutral. */
function score(surface: string, suggestion: string, snapshots: FeedbackSnapshot[]): number {
  const sLower = suggestion.toLowerCase().trim();
  const row = snapshots.find((r) => r.surface === surface && r.suggestionLower === sLower);
  if (!row) return 0;
  // Wilson-ish smoothed acceptance rate: (accepts + 1) / (accepts + rejects + 2)
  return (row.accepts + 1) / (row.accepts + row.rejects + 2) - 0.5;
}

/** Re-rank an array of items by historical acceptance for this
 *  surface. Stable for items with no history. */
export async function rerankSuggestions<T>(
  surface: string,
  items: T[],
  toText: (item: T) => string,
): Promise<T[]> {
  if (items.length <= 1) return items;
  const snapshots = await loadFeedback();
  if (snapshots.length === 0) return items;
  return items
    .map((item, i) => ({ item, originalIdx: i, score: score(surface, toText(item), snapshots) }))
    .sort((a, b) => {
      // Bigger boost first; ties keep original order so untouched
      // suggestions don't shuffle around.
      if (b.score !== a.score) return b.score - a.score;
      return a.originalIdx - b.originalIdx;
    })
    .map((x) => x.item);
}
