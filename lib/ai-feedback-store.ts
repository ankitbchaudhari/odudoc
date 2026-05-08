// AI feedback collection — the foundation for a self-improving
// suggestion ranker.
//
// Every time an AI surface (diagnosis suggester, treatment suggester,
// AI prescription, drug interaction checker, scribe, etc.) produces
// a recommendation, the doctor's accept/reject signal lands here.
// Until we have enough rows, the data sits idle. Once volume
// is sufficient, a weekly batch can train a lightweight re-ranker
// that tunes Gemini's raw output to your patient population.
//
// Schema is intentionally generic so adding new AI surfaces doesn't
// require a migration.

import { bindPersistentArray } from "./persistent-array";

export type AiFeedbackSurface =
  | "ai-prescription.diagnosis"
  | "ai-prescription.treatment"
  | "ai-emr.summary"
  | "ai-drug-check"
  | "ai-scribe"
  | "ai-blog-generator"
  | "other";

export type AiFeedbackVerdict =
  | "accepted"           // doctor used the suggestion as-is
  | "edited"             // accepted but tweaked
  | "rejected"           // doctor explicitly thumbs-down'd
  | "ignored";           // doctor did nothing — soft signal

export interface AiFeedbackRow {
  id: string;
  surface: AiFeedbackSurface;
  /** Doctor / clinician email who saw the suggestion. */
  callerEmail?: string;
  /** Free-form patient identifier (id or hashed key) for grouping. */
  patientRef?: string;
  /** A short hash of the prompt context so similar inputs cluster
   *  together for analysis. */
  contextHash?: string;
  /** What the model said (truncated). */
  suggestion: string;
  /** What the doctor did about it. */
  verdict: AiFeedbackVerdict;
  /** Optional free-text note ("wrong dose", "missed allergy", etc). */
  note?: string;
  /** The model+version that produced the suggestion (e.g. gemini-flash-latest). */
  model?: string;
  createdAt: string;
}

const feedback: AiFeedbackRow[] = [];
const {
  hydrate: hydrateFeedback,
  reload: reloadFeedbackInternal,
  flush: flushFeedback,
} = bindPersistentArray<AiFeedbackRow>("ai-feedback", feedback, () => []);

await hydrateFeedback();

export async function reloadAiFeedback() { await reloadFeedbackInternal(); }

function nowIso() { return new Date().toISOString(); }
function id() {
  return `aif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export interface RecordFeedbackInput {
  surface: AiFeedbackSurface;
  callerEmail?: string;
  patientRef?: string;
  contextHash?: string;
  suggestion: string;
  verdict: AiFeedbackVerdict;
  note?: string;
  model?: string;
}

export async function recordAiFeedback(input: RecordFeedbackInput): Promise<AiFeedbackRow> {
  const row: AiFeedbackRow = {
    id: id(),
    surface: input.surface,
    callerEmail: input.callerEmail?.toLowerCase(),
    patientRef: input.patientRef,
    contextHash: input.contextHash,
    suggestion: input.suggestion.slice(0, 500),
    verdict: input.verdict,
    note: input.note?.slice(0, 500),
    model: input.model,
    createdAt: nowIso(),
  };
  feedback.push(row);
  flushFeedback();
  return row;
}

export interface FeedbackStats {
  total: number;
  accepted: number;
  edited: number;
  rejected: number;
  ignored: number;
  acceptanceRate: number;   // accepted / total
  bySurface: Record<string, number>;
}

export async function getFeedbackStats(opts: { since?: string } = {}): Promise<FeedbackStats> {
  await hydrateFeedback();
  let rows = feedback.slice();
  if (opts.since) rows = rows.filter((r) => r.createdAt >= opts.since!);
  const total = rows.length;
  const accepted = rows.filter((r) => r.verdict === "accepted").length;
  const edited = rows.filter((r) => r.verdict === "edited").length;
  const rejected = rows.filter((r) => r.verdict === "rejected").length;
  const ignored = rows.filter((r) => r.verdict === "ignored").length;
  const bySurface: Record<string, number> = {};
  for (const r of rows) {
    bySurface[r.surface] = (bySurface[r.surface] || 0) + 1;
  }
  return {
    total,
    accepted,
    edited,
    rejected,
    ignored,
    acceptanceRate: total > 0 ? (accepted + edited) / total : 0,
    bySurface,
  };
}
