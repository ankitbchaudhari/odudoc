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

import { reloadAiFeedback, getFeedbackStats } from "./ai-feedback-store";
import { bindPersistentArray } from "./persistent-array";
import type { AiFeedbackRow } from "./ai-feedback-store";

interface FeedbackSnapshot {
  suggestionLower: string;
  surface: string;
  accepts: number;
  rejects: number;
}

let cache: { at: number; data: FeedbackSnapshot[] } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 min — this data is stable

// Mirror the same persistent-array binding so we can read raw
// feedback rows here without a circular import. Hydration is
// idempotent — if ai-feedback-store has already loaded the same
// table, this just reads back the already-populated array.
const feedbackMirror: AiFeedbackRow[] = [];
const { hydrate: hydrateMirror } = bindPersistentArray<AiFeedbackRow>(
  "ai-feedback",
  feedbackMirror,
  () => [],
);

async function loadFeedback(): Promise<FeedbackSnapshot[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL) return cache.data;
  await reloadAiFeedback();
  await hydrateMirror();
  // Aggregate into per-(surface, suggestion) accept/reject counts.
  const map = new Map<string, FeedbackSnapshot>();
  for (const r of feedbackMirror) {
    const sLower = r.suggestion.toLowerCase().trim();
    if (!sLower) continue;
    const key = `${r.surface}::${sLower}`;
    const existing = map.get(key) || {
      suggestionLower: sLower,
      surface: r.surface,
      accepts: 0,
      rejects: 0,
    };
    if (r.verdict === "accepted" || r.verdict === "edited") existing.accepts += 1;
    if (r.verdict === "rejected") existing.rejects += 1;
    map.set(key, existing);
  }
  const data = Array.from(map.values());
  cache = { at: Date.now(), data };
  return data;
}

/** Force-invalidate the cache. Call after a feedback row is recorded
 *  if you want subsequent reranks to pick it up immediately. */
export function invalidateRerankerCache() {
  cache = null;
}

/** Quick health stat — exposed so the admin dashboard can show whether
 *  the re-ranker is operating with enough data to be meaningful. */
export async function rerankerHealth() {
  const stats = await getFeedbackStats();
  return {
    totalSignals: stats.total,
    acceptanceRate: stats.acceptanceRate,
    enoughData: stats.total >= 50, // arbitrary minimum
  };
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
