// Per-person scorecards — V13 §6 of the Master Spec.
//
// Aggregates accountability events + CAR closure data into a single
// "how is this staff member performing" score, computed on demand
// from existing event streams. No new ground-truth tables — the
// score is a projection over what already exists, so it stays
// truthful as the underlying logs flow in.
//
// V13 §6.2–§6.5 sketch role-specific score components. We start with
// a general scorer that works for any role and emits sub-component
// breakdowns; role-specific weight tuning lives in WEIGHTS_BY_ROLE.
//
// V13 §6.6 score bands:
//   90–100 : Exemplary       → recognition / mentor candidacy
//   80–89  : Strong          → standard performance, no action
//   70–79  : Watch           → quarterly review with manager
//   60–69  : Concern         → monthly review, training plan
//   <60    : Critical        → immediate intervention, suspension review

import { listEvents, type AccountabilityEvent } from "@/lib/accountability-store";
import { listCars, type CorrectiveActionRequest } from "@/lib/car-store";

export type ScoreBand = "exemplary" | "strong" | "watch" | "concern" | "critical";

export interface ScoreComponent {
  /** Component key — stable across runs so the UI can render a
   *  fixed set of bars. */
  key: string;
  /** Human-readable label shown in the UI. */
  label: string;
  /** 0..100 — higher is better. */
  score: number;
  /** Sample size feeding into the score, for transparency. */
  sampleSize: number;
  /** Optional human note about what dragged the score down. */
  note?: string;
}

export interface Scorecard {
  /** Subject — the email of the staff member being scored. */
  email: string;
  /** Role context — used to pick the V13 §6.x scoring weights. */
  role?: string;
  /** Lookback window — defaults to the last 30 days. */
  windowDays: number;
  /** Overall composite score 0..100. */
  overall: number;
  /** Band classification — drives the action callout in the UI. */
  band: ScoreBand;
  /** Sub-scores for each component (V13 §6 breaks scores into
   *  category buckets so improvement is targetable). */
  components: ScoreComponent[];
  /** Counts feeding into the score, kept for the detail drawer. */
  counts: {
    totalEvents: number;
    breaches: number;
    breachesAcknowledged: number;
    carsOpen: number;
    carsClosedOnTime: number;
    carsClosedLate: number;
  };
  generatedAt: string;
}

// Lookback default — V13 §6.7 calls out "monthly review" so a 30-day
// window matches the cadence of human conversations about scores.
const DEFAULT_WINDOW_DAYS = 30;

// Component weights when summing the overall score. Different roles
// stress different components per V13 §6.2–§6.5 — these are sensible
// defaults that work for any role; tune per-role if a tenant asks.
const WEIGHTS: Record<string, number> = {
  breach_rate: 35,        // Fewer breaches per action = higher score
  breach_response: 20,    // Acknowledged breaches quickly
  car_closure: 25,        // CARs closed on time
  consistency: 10,        // Activity is regular, not spiky
  data_hygiene: 10,       // No unauthorized data-access / export flags
};

const BANDS: Array<{ min: number; band: ScoreBand }> = [
  { min: 90, band: "exemplary" },
  { min: 80, band: "strong" },
  { min: 70, band: "watch" },
  { min: 60, band: "concern" },
  { min: 0,  band: "critical" },
];

function bandFor(score: number): ScoreBand {
  for (const b of BANDS) if (score >= b.min) return b.band;
  return "critical";
}

/**
 * Compute a scorecard for one staff member from the existing event +
 * CAR streams. Cheap: scans in-memory arrays — no DB round trips
 * beyond what the stores already do.
 */
export async function computeScorecard(email: string, opts?: { windowDays?: number; role?: string }): Promise<Scorecard> {
  const windowDays = opts?.windowDays || DEFAULT_WINDOW_DAYS;
  const since = new Date(Date.now() - windowDays * 24 * 3600_000).toISOString();

  const events = await listEvents({ actorEmail: email, from: since, limit: 500 });
  const cars = await listCars({ assignedToEmail: email, limit: 500 });

  // ── breach_rate ──
  const breaches = events.filter((e) => Boolean(e.breach));
  const breachRate = events.length === 0 ? 0 : breaches.length / events.length;
  // Convert rate to 0..100 with diminishing penalties: 0 breaches → 100,
  // 10% breach rate → 50, 20%+ → 0. Linear-clamp.
  const breachScore = Math.max(0, Math.round(100 - breachRate * 500));

  // ── breach_response ──
  const acknowledged = breaches.filter((e) => e.breach?.acknowledgedBy);
  const ackRate = breaches.length === 0 ? 1 : acknowledged.length / breaches.length;
  const respScore = Math.round(ackRate * 100);

  // ── car_closure ──
  const closed = cars.filter((c) => c.status === "closed" || c.status === "verified");
  const closedOnTime = closed.filter((c) => !c.closedLate);
  const closedLate = closed.filter((c) => c.closedLate);
  const openCars = cars.filter((c) => c.status !== "closed" && c.status !== "verified");
  const totalForClosureScore = closed.length + openCars.length;
  const closureScore = totalForClosureScore === 0
    ? 100
    : Math.round((closedOnTime.length / totalForClosureScore) * 100);

  // ── consistency ──
  // Reward steady activity, penalise long silences punctuated by
  // bursts (V13 §6 spec doesn't define this exactly; we proxy by
  // counting the number of active days in the window).
  const activeDays = new Set(events.map((e) => e.at.slice(0, 10))).size;
  const consistencyScore = Math.round(Math.min(activeDays / Math.max(windowDays / 2, 1), 1) * 100);

  // ── data_hygiene ──
  // Subtract for data_access category events that flagged a breach
  // (exporting outside scope, viewing records of patients not in your
  // ward, etc.).
  const dataEvents = events.filter((e) => e.category === "data_access");
  const dataBreaches = dataEvents.filter((e) => Boolean(e.breach));
  const hygieneScore = dataEvents.length === 0
    ? 100
    : Math.round((1 - dataBreaches.length / dataEvents.length) * 100);

  const components: ScoreComponent[] = [
    { key: "breach_rate",     label: "Protocol adherence", score: breachScore,      sampleSize: events.length, note: breaches.length ? `${breaches.length} breach${breaches.length === 1 ? "" : "es"} in ${events.length} actions.` : undefined },
    { key: "breach_response", label: "Breach response",    score: respScore,        sampleSize: breaches.length, note: breaches.length === 0 ? "No breaches in window." : `${acknowledged.length} of ${breaches.length} acknowledged.` },
    { key: "car_closure",     label: "CAR closure",        score: closureScore,     sampleSize: cars.length, note: closedLate.length ? `${closedLate.length} closed late.` : (openCars.length ? `${openCars.length} still open.` : undefined) },
    { key: "consistency",     label: "Activity consistency", score: consistencyScore, sampleSize: activeDays },
    { key: "data_hygiene",    label: "Data-access hygiene", score: hygieneScore,    sampleSize: dataEvents.length, note: dataBreaches.length ? `${dataBreaches.length} flagged access events.` : undefined },
  ];

  const overall = Math.round(
    components.reduce((sum, c) => sum + c.score * (WEIGHTS[c.key] / 100), 0),
  );

  return {
    email,
    role: opts?.role,
    windowDays,
    overall,
    band: bandFor(overall),
    components,
    counts: {
      totalEvents: events.length,
      breaches: breaches.length,
      breachesAcknowledged: acknowledged.length,
      carsOpen: openCars.length,
      carsClosedOnTime: closedOnTime.length,
      carsClosedLate: closedLate.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

/** Score everyone who has either an event or a CAR in the window —
 *  cheap roll-up used by the team-overview dashboard. */
export async function listAllScorecards(windowDays = DEFAULT_WINDOW_DAYS): Promise<Scorecard[]> {
  const since = new Date(Date.now() - windowDays * 24 * 3600_000).toISOString();
  const events = await listEvents({ from: since, limit: 5000 });
  const cars: CorrectiveActionRequest[] = await listCars({ limit: 5000 });
  const emails = new Set<string>();
  events.forEach((e: AccountabilityEvent) => emails.add(e.actorEmail));
  cars.forEach((c) => emails.add(c.assignedToEmail));

  const scorecards = await Promise.all(
    [...emails].map((email) => computeScorecard(email, { windowDays })),
  );
  return scorecards.sort((a, b) => a.overall - b.overall); // lowest first — worst surface first
}

export function bandLabel(band: ScoreBand): string {
  return ({
    exemplary: "Exemplary",
    strong:    "Strong",
    watch:     "Watch",
    concern:   "Concern",
    critical:  "Critical",
  } as const)[band];
}
