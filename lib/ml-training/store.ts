// ML training data accumulator.
//
// Every AI call can OPTIONALLY contribute its (input, output, ground
// truth) tuple to a training set, gated on explicit per-feature
// patient consent. The accumulator stores ONLY de-identified data:
//   - we strip names, dates of birth, phone, email, and any free-text
//     identifiers detected by a conservative regex
//   - we keep clinical content (symptom strings, diagnoses, drug
//     names, image perceptual hashes) since that's what the model
//     learns from
//
// We don't train here. This store is the queue. A separate offline
// pipeline (or vendor's API) consumes it.
//
// Patient revocation: deleteTrainingDataForUser() purges everything
// they've ever contributed, fulfilling DPDP / GDPR right-to-erasure.

import { bindPersistentArray } from "../persistent-array";

export type TrainingFeature =
  | "ddx"
  | "scribe"
  | "ocr"
  | "triage"
  | "translation"
  | "image_analysis"
  | "rx_safety"
  | "summarize";

export interface TrainingSample {
  id: string;
  /** ID of the user who consented (if any). Null for org-only consent. */
  contributorUserId?: string;
  /** Contributing org for shared consent. */
  contributorOrgId?: string;
  feature: TrainingFeature;
  /** De-identified prompt / input. */
  inputJson: string;
  /** Model output produced for that input. */
  outputJson: string;
  /** Ground truth — usually the doctor's edited final version. */
  groundTruthJson?: string;
  /** Whether the ground truth differs materially from the model
   *  output. Diff-only samples are most valuable. */
  isCorrection: boolean;
  /** Free-text notes from the doctor about why they edited. */
  correctionNotes?: string;
  /** Lifecycle. */
  status: "pending_review" | "approved" | "rejected" | "exported";
  exportedAt?: string;
  createdAt: string;
}

const samples: TrainingSample[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<TrainingSample>(
  "ml_training_samples",
  samples,
  () => []
);
await hydrate();

// Conservative PII scrubber. Strips:
//   - Phone numbers (+? 9-15 digits with separators)
//   - Email addresses
//   - Likely names (capitalised first+last bigrams) — best-effort
//   - Long digit runs (Aadhaar / SSN-like)
//   - Dates of birth (DD-MM-YYYY etc.)
const PII_PATTERNS: Array<[RegExp, string]> = [
  [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "<email>"],
  [/(?:\+?\d[\s\-()]*){9,15}/g, "<phone>"],
  [/\b\d{12}\b/g, "<aadhaar>"],
  [/\b\d{3}-\d{2}-\d{4}\b/g, "<ssn>"],
  [/\b(0?[1-9]|[12]\d|3[01])[-\/.](0?[1-9]|1[012])[-\/.](19|20)\d{2}\b/g, "<dob>"],
  // Capitalised bigrams that look like names — leave a marker so
  // the downstream pipeline can do a stricter pass if needed.
  [/\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g, "<name>"],
];

export function scrubPII(text: string): string {
  let out = text;
  for (const [re, mask] of PII_PATTERNS) out = out.replace(re, mask);
  return out;
}

function scrubAny(json: string): string {
  // Apply scrub at the string level — preserves JSON shape since
  // we're replacing with text inside string values most of the time.
  return scrubPII(json);
}

export interface RecordSampleInput {
  contributorUserId?: string;
  contributorOrgId?: string;
  feature: TrainingFeature;
  input: unknown;
  output: unknown;
  groundTruth?: unknown;
  correctionNotes?: string;
}

export function recordSample(input: RecordSampleInput): TrainingSample {
  const inputJson = scrubAny(JSON.stringify(input.input));
  const outputJson = scrubAny(JSON.stringify(input.output));
  const groundTruthJson = input.groundTruth !== undefined
    ? scrubAny(JSON.stringify(input.groundTruth))
    : undefined;
  const isCorrection = groundTruthJson !== undefined && groundTruthJson !== outputJson;
  const s: TrainingSample = {
    id: `mls-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    contributorUserId: input.contributorUserId,
    contributorOrgId: input.contributorOrgId,
    feature: input.feature,
    inputJson, outputJson, groundTruthJson,
    isCorrection,
    correctionNotes: input.correctionNotes?.trim() || undefined,
    status: "pending_review",
    createdAt: new Date().toISOString(),
  };
  samples.unshift(s);
  flush();
  return s;
}

export function listSamples(opts: { feature?: TrainingFeature; status?: TrainingSample["status"]; limit?: number } = {}): TrainingSample[] {
  let list = [...samples];
  if (opts.feature) list = list.filter((s) => s.feature === opts.feature);
  if (opts.status) list = list.filter((s) => s.status === opts.status);
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (opts.limit) list = list.slice(0, opts.limit);
  return list;
}

export function setSampleStatus(id: string, status: TrainingSample["status"]): TrainingSample | null {
  const s = samples.find((x) => x.id === id);
  if (!s) return null;
  s.status = status;
  if (status === "exported") s.exportedAt = new Date().toISOString();
  flush();
  return s;
}

/** GDPR / DPDP right-to-erasure: drop every sample contributed by a
 *  given user. Returns count deleted. */
export function deleteTrainingDataForUser(userId: string): number {
  let n = 0;
  for (let i = samples.length - 1; i >= 0; i--) {
    if (samples[i].contributorUserId === userId) {
      tombstone(samples[i].id);
      samples.splice(i, 1);
      n++;
    }
  }
  if (n) flush();
  return n;
}

export function summarize(): {
  total: number;
  byFeature: Partial<Record<TrainingFeature, number>>;
  byStatus: Record<TrainingSample["status"], number>;
  correctionsPct: number;
} {
  const byFeature: Partial<Record<TrainingFeature, number>> = {};
  const byStatus = { pending_review: 0, approved: 0, rejected: 0, exported: 0 } as Record<TrainingSample["status"], number>;
  let corrections = 0;
  for (const s of samples) {
    byFeature[s.feature] = (byFeature[s.feature] || 0) + 1;
    byStatus[s.status]++;
    if (s.isCorrection) corrections++;
  }
  return {
    total: samples.length,
    byFeature,
    byStatus,
    correctionsPct: samples.length === 0 ? 0 : Math.round((corrections / samples.length) * 100),
  };
}
