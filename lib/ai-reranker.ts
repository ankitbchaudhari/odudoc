// Lightweight AI suggestion re-ranker, backed by the persisted
// `ai-feedback-aggregates` table (a small materialised view of
// (surface, suggestion) → accept/reject counts).
//
// Until we have enough data to train a real model, this deterministic
// ranker boosts suggestions doctors have historically accepted and
// de-prioritises ones they've rejected. Reading from the aggregates
// table makes it cross-Lambda consistent and O(distinct-suggestions)
// per call instead of O(all-feedback).

import {
  getAggregatesForSurface,
  reloadFeedbackAggregates,
  type FeedbackAggregate,
} from "./ai-feedback-aggregates";
import { getFeedbackStats } from "./ai-feedback-store";

interface CacheEntry {
  at: number;
  rows: FeedbackAggregate[];
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min — aggregates change slowly

async function loadAggregates(surface: string): Promise<FeedbackAggregate[]> {
  const hit = cache.get(surface);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.rows;
  // Force the persistent-array reload so this Lambda picks up writes
  // from sibling Lambdas. Cheap; aggregates table is small.
  await reloadFeedbackAggregates();
  const rows = await getAggregatesForSurface(surface);
  cache.set(surface, { at: Date.now(), rows });
  return rows;
}

/** Force-invalidate the cache. Called after a feedback row is
 *  recorded so the next rerank reflects the bump. */
export function invalidateRerankerCache(surface?: string) {
  if (surface) cache.delete(surface);
  else cache.clear();
}

/** Quick health stat — exposed so the admin dashboard can show
 *  whether the re-ranker is operating with enough data to be
 *  meaningful. */
export async function rerankerHealth() {
  const stats = await getFeedbackStats();
  return {
    totalSignals: stats.total,
    acceptanceRate: stats.acceptanceRate,
    enoughData: stats.total >= 50, // arbitrary minimum
  };
}

/** Bayesian-smoothed score for one (surface, suggestion). Higher =
 *  more likely to be accepted. Untouched suggestions return 0 so
 *  they keep their original Gemini ordering relative to peers. */
function score(rows: FeedbackAggregate[], suggestion: string): number {
  const sLower = suggestion.toLowerCase().trim();
  const row = rows.find((r) => r.suggestionLower === sLower);
  if (!row) return 0;
  const positives = row.accepts + row.edits;
  const negatives = row.rejects;
  // Smoothed acceptance rate, centred at 0.5 so neutral history
  // → score 0. Add 1/2 to numerator and denominator (Laplace smoothing).
  return (positives + 1) / (positives + negatives + 2) - 0.5;
}

/** Re-rank an array of items by historical acceptance for this
 *  surface. Stable for items with no history. */
export async function rerankSuggestions<T>(
  surface: string,
  items: T[],
  toText: (item: T) => string,
): Promise<T[]> {
  if (items.length <= 1) return items;
  const rows = await loadAggregates(surface);
  if (rows.length === 0) return items;
  return items
    .map((item, originalIdx) => ({
      item,
      originalIdx,
      score: score(rows, toText(item)),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.originalIdx - b.originalIdx;
    })
    .map((x) => x.item);
}

/** Manual cache prime — only used by tests / scripts. */
export function prime(_snapshots: unknown[]): void {
  // Aggregates live in the persistent table now; priming an
  // in-process cache no longer makes sense. Kept as a no-op so
  // older callers don't break.
  void _snapshots;
}
