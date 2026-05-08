// AI feedback aggregates — persisted materialised view of
// (surface, suggestion) → accept/reject counts.
//
// The reranker used to read raw feedback rows from a per-Lambda
// mirror, which meant every fresh Lambda paid the cold-start cost
// of re-aggregating tens of thousands of rows in memory. This table
// shifts that aggregation to a single small persistent array that
// the reranker can scan in O(distinct-suggestions) instead of
// O(all-feedback). Every `recordAiFeedback` bumps the matching
// aggregate row (creating one if needed); reranker reads aggregates
// directly.

import { bindPersistentArray } from "./persistent-array";

export interface FeedbackAggregate {
  /** `${surface}::${suggestion_lower}` — primary key. */
  key: string;
  surface: string;
  suggestionLower: string;
  accepts: number;
  edits: number;
  rejects: number;
  ignores: number;
  /** ISO of the latest signal that touched this row — useful for
   *  decay logic ("ignore aggregates older than 90 days"). */
  lastSeen: string;
}

const aggregates: FeedbackAggregate[] = [];
const {
  hydrate: hydrateAgg,
  reload: reloadAggInternal,
  flush: flushAgg,
} = bindPersistentArray<FeedbackAggregate>(
  "ai-feedback-aggregates",
  aggregates,
  () => [],
);

await hydrateAgg();
export async function reloadFeedbackAggregates() { await reloadAggInternal(); }

const nowIso = () => new Date().toISOString();

function keyOf(surface: string, suggestion: string): string {
  return `${surface}::${suggestion.toLowerCase().trim()}`;
}

/** Bump the aggregate for a (surface, suggestion) pair. Called from
 *  recordAiFeedback after the raw row lands. Cheap — single in-memory
 *  index lookup + flush. */
export async function bumpAggregate(
  surface: string,
  suggestion: string,
  verdict: "accepted" | "edited" | "rejected" | "ignored",
): Promise<void> {
  await hydrateAgg();
  const key = keyOf(surface, suggestion);
  const sLower = suggestion.toLowerCase().trim();
  if (!sLower) return;
  let row = aggregates.find((r) => r.key === key);
  if (!row) {
    row = {
      key,
      surface,
      suggestionLower: sLower,
      accepts: 0, edits: 0, rejects: 0, ignores: 0,
      lastSeen: nowIso(),
    };
    aggregates.push(row);
  }
  if (verdict === "accepted") row.accepts += 1;
  else if (verdict === "edited") row.edits += 1;
  else if (verdict === "rejected") row.rejects += 1;
  else row.ignores += 1;
  row.lastSeen = nowIso();
  flushAgg();
}

/** Read the aggregates for a given surface. Used by the reranker. */
export async function getAggregatesForSurface(surface: string): Promise<FeedbackAggregate[]> {
  await hydrateAgg();
  return aggregates.filter((r) => r.surface === surface);
}

/** Read all aggregates. Used by the admin dashboard for surface-
 *  agnostic stats. */
export async function getAllAggregates(): Promise<FeedbackAggregate[]> {
  await hydrateAgg();
  return aggregates.slice();
}

/** Backfill from raw feedback rows. Use this once after deploying the
 *  aggregates table for the first time, or whenever the aggregates
 *  fall out of sync with the raw rows (operationally rare but the
 *  helper exists). Idempotent — recomputes counts from scratch. */
export async function rebuildAggregates(
  raw: Array<{ surface: string; suggestion: string; verdict: "accepted" | "edited" | "rejected" | "ignored" }>,
): Promise<number> {
  await hydrateAgg();
  // Wipe in place so the persistent layer's flush picks up the
  // delete — splice rather than reassign.
  aggregates.splice(0, aggregates.length);
  for (const r of raw) {
    const sLower = r.suggestion.toLowerCase().trim();
    if (!sLower) continue;
    const key = keyOf(r.surface, r.suggestion);
    let row = aggregates.find((x) => x.key === key);
    if (!row) {
      row = {
        key, surface: r.surface, suggestionLower: sLower,
        accepts: 0, edits: 0, rejects: 0, ignores: 0,
        lastSeen: nowIso(),
      };
      aggregates.push(row);
    }
    if (r.verdict === "accepted") row.accepts += 1;
    else if (r.verdict === "edited") row.edits += 1;
    else if (r.verdict === "rejected") row.rejects += 1;
    else row.ignores += 1;
  }
  flushAgg();
  return aggregates.length;
}
