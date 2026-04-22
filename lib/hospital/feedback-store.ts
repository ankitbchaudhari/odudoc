// Patient Feedback & NPS. Tenant-scoped.
//
// Captures post-visit / post-discharge patient satisfaction across multiple
// dimensions (doctor, nursing, cleanliness, billing, food, overall) plus a
// classic 0-10 Net Promoter Score prompt.
//
// Status workflow:
//   pending → submitted → reviewed → closed
//
// Any submission with overall ≤ 2 OR nps ≤ 6 auto-flags `followupNeeded`
// so complaint handling / service-recovery can pick it up.
//
// NPS formula: %promoters (9-10) - %detractors (0-6). Range -100 to +100.

import { bindPersistentArray } from "../persistent-array";

export type FeedbackSource =
  | "opd"
  | "ipd"
  | "ed"
  | "lab"
  | "radiology"
  | "pharmacy"
  | "ambulance"
  | "portal"
  | "other";

export type FeedbackStatus = "pending" | "submitted" | "reviewed" | "closed";

export type FeedbackTag = "compliment" | "complaint" | "suggestion" | "none";

export interface FeedbackSurvey {
  id: string;
  organizationId: string;
  feedbackNumber: string; // FB-{suffix}-{seq}

  patientId?: string;
  patientName?: string;
  encounterId?: string;
  department?: string;
  source: FeedbackSource;
  visitDate?: string;

  // Per-dimension ratings 1-5 (0 = not answered)
  ratingDoctor: number;
  ratingNursing: number;
  ratingCleanliness: number;
  ratingBilling: number;
  ratingFood: number;
  ratingOverall: number;

  // Classic NPS 0-10
  nps: number;

  comments?: string;
  tag: FeedbackTag;

  status: FeedbackStatus;
  followupNeeded: boolean;
  followupOwner?: string;
  followupResolution?: string;

  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  closedAt?: string;

  createdAt: string;
  updatedAt: string;
}

const surveys: FeedbackSurvey[] = [];
const { hydrate, flush } = bindPersistentArray<FeedbackSurvey>(
  "hospital-feedback",
  surveys,
  () => []
);
await hydrate();

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}

function nextFeedbackNumber(orgId: string): string {
  const n = surveys.filter((s) => s.organizationId === orgId).length + 1;
  return `FB-${orgSuffix(orgId)}-${String(n).padStart(5, "0")}`;
}

export const SOURCE_LABEL: Record<FeedbackSource, string> = {
  opd: "OPD",
  ipd: "IPD / Admission",
  ed: "Emergency",
  lab: "Laboratory",
  radiology: "Radiology",
  pharmacy: "Pharmacy",
  ambulance: "Ambulance",
  portal: "Patient Portal",
  other: "Other",
};

export const TAG_LABEL: Record<FeedbackTag, string> = {
  compliment: "Compliment",
  complaint: "Complaint",
  suggestion: "Suggestion",
  none: "—",
};

function clampRating(n: unknown, max: number): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(max, Math.round(v)));
}

function computeFollowup(s: FeedbackSurvey): boolean {
  if (s.status === "pending") return false;
  if (s.ratingOverall > 0 && s.ratingOverall <= 2) return true;
  if (s.nps > 0 && s.nps <= 6) return true;
  if (s.tag === "complaint") return true;
  return false;
}

export function listFeedback(opts: {
  organizationId: string;
  patientId?: string;
  source?: FeedbackSource;
  status?: FeedbackStatus;
  tag?: FeedbackTag;
  followupOnly?: boolean;
  from?: string;
  to?: string;
}): FeedbackSurvey[] {
  let list = surveys.filter((s) => s.organizationId === opts.organizationId);
  if (opts.patientId) list = list.filter((s) => s.patientId === opts.patientId);
  if (opts.source) list = list.filter((s) => s.source === opts.source);
  if (opts.status) list = list.filter((s) => s.status === opts.status);
  if (opts.tag) list = list.filter((s) => s.tag === opts.tag);
  if (opts.followupOnly) list = list.filter((s) => s.followupNeeded);
  if (opts.from) {
    const f = new Date(opts.from).getTime();
    list = list.filter((s) => new Date(s.createdAt).getTime() >= f);
  }
  if (opts.to) {
    const t = new Date(opts.to).getTime();
    list = list.filter((s) => new Date(s.createdAt).getTime() <= t);
  }

  const statusOrder: Record<FeedbackStatus, number> = {
    submitted: 0,
    pending: 1,
    reviewed: 2,
    closed: 3,
  };
  return list.sort((a, b) => {
    // followup-needed first
    if (a.followupNeeded !== b.followupNeeded) return a.followupNeeded ? -1 : 1;
    const s = statusOrder[a.status] - statusOrder[b.status];
    if (s !== 0) return s;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export interface FeedbackAnalytics {
  total: number;
  submitted: number;
  pendingReview: number;
  openComplaints: number;
  avgOverall: number;
  avgDoctor: number;
  avgNursing: number;
  avgCleanliness: number;
  avgBilling: number;
  avgFood: number;
  promoters: number;
  passives: number;
  detractors: number;
  nps: number; // -100..+100, 0 if no data
}

export function computeAnalytics(organizationId: string): FeedbackAnalytics {
  const list = surveys.filter((s) => s.organizationId === organizationId);
  const submitted = list.filter((s) => s.status !== "pending");
  const avg = (arr: number[]): number => {
    const nums = arr.filter((n) => n > 0);
    if (!nums.length) return 0;
    const sum = nums.reduce((a, b) => a + b, 0);
    return Math.round((sum / nums.length) * 10) / 10;
  };
  const npsAnswered = submitted.filter((s) => s.nps > 0);
  const promoters = npsAnswered.filter((s) => s.nps >= 9).length;
  const detractors = npsAnswered.filter((s) => s.nps <= 6).length;
  const passives = npsAnswered.length - promoters - detractors;
  const nps =
    npsAnswered.length > 0
      ? Math.round(((promoters - detractors) / npsAnswered.length) * 100)
      : 0;

  return {
    total: list.length,
    submitted: submitted.length,
    pendingReview: submitted.filter((s) => s.status === "submitted").length,
    openComplaints: submitted.filter((s) => s.followupNeeded && s.status !== "closed").length,
    avgOverall: avg(submitted.map((s) => s.ratingOverall)),
    avgDoctor: avg(submitted.map((s) => s.ratingDoctor)),
    avgNursing: avg(submitted.map((s) => s.ratingNursing)),
    avgCleanliness: avg(submitted.map((s) => s.ratingCleanliness)),
    avgBilling: avg(submitted.map((s) => s.ratingBilling)),
    avgFood: avg(submitted.map((s) => s.ratingFood)),
    promoters,
    passives,
    detractors,
    nps,
  };
}

export interface FeedbackInput {
  patientId?: string;
  patientName?: string;
  encounterId?: string;
  department?: string;
  source?: FeedbackSource;
  visitDate?: string;
  ratingDoctor?: number;
  ratingNursing?: number;
  ratingCleanliness?: number;
  ratingBilling?: number;
  ratingFood?: number;
  ratingOverall?: number;
  nps?: number;
  comments?: string;
  tag?: FeedbackTag;
  status?: FeedbackStatus;
  followupOwner?: string;
  followupResolution?: string;
  reviewedBy?: string;
}

export function createFeedback(
  organizationId: string,
  input: FeedbackInput
): FeedbackSurvey {
  const now = new Date().toISOString();
  const status = input.status || "submitted";
  const s: FeedbackSurvey = {
    id: `fb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    feedbackNumber: nextFeedbackNumber(organizationId),
    patientId: input.patientId || undefined,
    patientName: input.patientName?.trim() || undefined,
    encounterId: input.encounterId || undefined,
    department: input.department?.trim() || undefined,
    source: input.source || "opd",
    visitDate: input.visitDate || undefined,
    ratingDoctor: clampRating(input.ratingDoctor, 5),
    ratingNursing: clampRating(input.ratingNursing, 5),
    ratingCleanliness: clampRating(input.ratingCleanliness, 5),
    ratingBilling: clampRating(input.ratingBilling, 5),
    ratingFood: clampRating(input.ratingFood, 5),
    ratingOverall: clampRating(input.ratingOverall, 5),
    nps: clampRating(input.nps, 10),
    comments: input.comments?.trim() || undefined,
    tag: input.tag || "none",
    status,
    followupNeeded: false,
    followupOwner: input.followupOwner?.trim() || undefined,
    followupResolution: input.followupResolution?.trim() || undefined,
    submittedAt: status !== "pending" ? now : undefined,
    createdAt: now,
    updatedAt: now,
  };
  s.followupNeeded = computeFollowup(s);
  surveys.unshift(s);
  flush();
  return s;
}

export function updateFeedback(
  id: string,
  organizationId: string,
  patch: Partial<FeedbackInput>
): FeedbackSurvey | null {
  const s = surveys.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!s) return null;
  const now = new Date().toISOString();

  if (patch.patientId !== undefined) s.patientId = patch.patientId || undefined;
  if (patch.patientName !== undefined)
    s.patientName = patch.patientName?.trim() || undefined;
  if (patch.encounterId !== undefined)
    s.encounterId = patch.encounterId || undefined;
  if (patch.department !== undefined)
    s.department = patch.department?.trim() || undefined;
  if (patch.source !== undefined) s.source = patch.source;
  if (patch.visitDate !== undefined) s.visitDate = patch.visitDate || undefined;
  if (patch.ratingDoctor !== undefined)
    s.ratingDoctor = clampRating(patch.ratingDoctor, 5);
  if (patch.ratingNursing !== undefined)
    s.ratingNursing = clampRating(patch.ratingNursing, 5);
  if (patch.ratingCleanliness !== undefined)
    s.ratingCleanliness = clampRating(patch.ratingCleanliness, 5);
  if (patch.ratingBilling !== undefined)
    s.ratingBilling = clampRating(patch.ratingBilling, 5);
  if (patch.ratingFood !== undefined)
    s.ratingFood = clampRating(patch.ratingFood, 5);
  if (patch.ratingOverall !== undefined)
    s.ratingOverall = clampRating(patch.ratingOverall, 5);
  if (patch.nps !== undefined) s.nps = clampRating(patch.nps, 10);
  if (patch.comments !== undefined)
    s.comments = patch.comments?.trim() || undefined;
  if (patch.tag !== undefined) s.tag = patch.tag;
  if (patch.followupOwner !== undefined)
    s.followupOwner = patch.followupOwner?.trim() || undefined;
  if (patch.followupResolution !== undefined)
    s.followupResolution = patch.followupResolution?.trim() || undefined;
  if (patch.reviewedBy !== undefined)
    s.reviewedBy = patch.reviewedBy?.trim() || undefined;

  if (patch.status !== undefined && patch.status !== s.status) {
    const prev = s.status;
    s.status = patch.status;
    if (patch.status !== "pending" && !s.submittedAt) s.submittedAt = now;
    if (patch.status === "reviewed" && prev !== "reviewed") s.reviewedAt = now;
    if (patch.status === "closed" && prev !== "closed") s.closedAt = now;
    if (prev === "closed" && patch.status !== "closed") s.closedAt = undefined;
  }

  s.followupNeeded = computeFollowup(s);
  s.updatedAt = now;
  flush();
  return s;
}

export function deleteFeedback(id: string, organizationId: string): boolean {
  const idx = surveys.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (idx < 0) return false;
  surveys.splice(idx, 1);
  flush();
  return true;
}

// Patient cascade: unlink rather than delete (retain for org-level analytics).
export function unlinkFeedbackForPatient(
  patientId: string,
  organizationId: string
): number {
  let n = 0;
  for (const s of surveys) {
    if (s.patientId === patientId && s.organizationId === organizationId) {
      s.patientId = undefined;
      n++;
    }
  }
  if (n) flush();
  return n;
  // flush:auto-unlink
  surveys.splice(surveys.length, 0);
}
