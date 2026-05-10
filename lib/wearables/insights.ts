// Wearable insights — pure aggregation over time-series readings.
//
// Given a window of readings, returns:
//   - 30-day KPI strip (resting HR, SpO2 floor, BP averages, glucose
//     control, daily steps, sleep)
//   - Daily-bucket trend lines for chart rendering
//   - Anomaly flags worth surfacing to the doctor
//   - A clinical summary string that drops straight into the
//     encounter context as "patient's wearable showed X"
//
// The thresholds are deliberately conservative — clinically
// significant findings only. Source citations live alongside each
// rule so a reviewer can audit.

import type { WearableReading, ReadingKind } from "./store";

export interface DailyBucket {
  date: string;             // YYYY-MM-DD
  values: number[];         // raw values for the day
  count: number;
  avg: number;
  min: number;
  max: number;
}

export interface KpiTile {
  kind: ReadingKind;
  label: string;
  /** Headline value for the tile (avg / latest / sum depending on kind). */
  value: number;
  unit: string;
  /** % change vs the previous comparable window. Positive = up. */
  trendPct?: number;
  /** Tone for the UI to colour the tile. */
  status: "good" | "warn" | "critical" | "neutral";
  note?: string;
}

export interface AnomalyFlag {
  /** Short label, e.g. "Possible AFib episode". */
  label: string;
  severity: "info" | "warn" | "critical";
  /** ISO date the flag relates to. */
  occurredAt: string;
  detail: string;
  /** Suggested clinical follow-up. */
  recommendation: string;
}

export interface InsightsBundle {
  windowDays: number;
  kpis: KpiTile[];
  daily: Partial<Record<ReadingKind, DailyBucket[]>>;
  anomalies: AnomalyFlag[];
  /** One-paragraph summary to drop into the encounter form. */
  clinicalSummary: string;
}

const READING_LABELS: Record<ReadingKind, { label: string; unit: string }> = {
  hr_resting: { label: "Resting HR", unit: "bpm" },
  hr_walking: { label: "Walking HR", unit: "bpm" },
  hr_max: { label: "Peak HR", unit: "bpm" },
  spo2: { label: "SpO₂", unit: "%" },
  bp_systolic: { label: "BP — systolic", unit: "mmHg" },
  bp_diastolic: { label: "BP — diastolic", unit: "mmHg" },
  blood_glucose: { label: "Blood glucose", unit: "mg/dL" },
  weight_kg: { label: "Weight", unit: "kg" },
  steps: { label: "Daily steps", unit: "steps" },
  calories_active: { label: "Active calories", unit: "kcal" },
  sleep_minutes: { label: "Sleep", unit: "min" },
  stress_score: { label: "Stress", unit: "/100" },
  vo2_max: { label: "VO₂ max", unit: "" },
  ecg_rhythm: { label: "ECG rhythm class", unit: "" },
  temperature_c: { label: "Skin temp", unit: "°C" },
  respiratory_rate: { label: "Respiratory rate", unit: "/min" },
};

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function bucketByDay(readings: WearableReading[]): DailyBucket[] {
  const map = new Map<string, DailyBucket>();
  for (const r of readings) {
    const d = dateKey(r.takenAt);
    let b = map.get(d);
    if (!b) {
      b = { date: d, values: [], count: 0, avg: 0, min: Infinity, max: -Infinity };
      map.set(d, b);
    }
    b.values.push(r.value);
    b.count++;
    if (r.value < b.min) b.min = r.value;
    if (r.value > b.max) b.max = r.value;
  }
  for (const b of map.values()) {
    b.avg = b.count > 0 ? b.values.reduce((a, n) => a + n, 0) / b.count : 0;
    if (!isFinite(b.min)) b.min = 0;
    if (!isFinite(b.max)) b.max = 0;
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function avg(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, n) => a + n, 0) / arr.length;
}

export interface InsightsInput {
  readings: WearableReading[];
  windowDays?: number;
}

export function computeInsights(input: InsightsInput): InsightsBundle {
  const windowDays = input.windowDays ?? 30;
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const inWindow = input.readings.filter(
    (r) => new Date(r.takenAt).getTime() >= cutoff,
  );
  const priorCutoff = Date.now() - 2 * windowDays * 24 * 60 * 60 * 1000;
  const inPriorWindow = input.readings.filter((r) => {
    const t = new Date(r.takenAt).getTime();
    return t >= priorCutoff && t < cutoff;
  });

  const daily: Partial<Record<ReadingKind, DailyBucket[]>> = {};
  const byKind = new Map<ReadingKind, WearableReading[]>();
  for (const r of inWindow) {
    if (!byKind.has(r.kind)) byKind.set(r.kind, []);
    byKind.get(r.kind)!.push(r);
  }
  for (const [k, rs] of byKind) daily[k] = bucketByDay(rs);

  // ── KPIs ─────────────────────────────────────────────────────
  const kpis: KpiTile[] = [];
  function buildTile(kind: ReadingKind, agg: "avg" | "max" | "min" | "sum_per_day", warnRange: [number | null, number | null], goodRange: [number | null, number | null], note?: string) {
    const cur = inWindow.filter((r) => r.kind === kind);
    if (cur.length === 0) return;
    let value = 0;
    if (agg === "avg") value = avg(cur.map((r) => r.value));
    else if (agg === "max") value = Math.max(...cur.map((r) => r.value));
    else if (agg === "min") value = Math.min(...cur.map((r) => r.value));
    else if (agg === "sum_per_day") {
      const buckets = bucketByDay(cur);
      value = avg(buckets.map((b) => b.values.reduce((a, n) => a + n, 0)));
    }
    const prior = inPriorWindow.filter((r) => r.kind === kind);
    let trendPct: number | undefined;
    if (prior.length > 0) {
      const priorVal = agg === "avg" || agg === "sum_per_day"
        ? avg(prior.map((r) => r.value))
        : agg === "max" ? Math.max(...prior.map((r) => r.value)) : Math.min(...prior.map((r) => r.value));
      if (priorVal !== 0) trendPct = Math.round(((value - priorVal) / Math.abs(priorVal)) * 100);
    }
    let status: KpiTile["status"] = "neutral";
    const inRange = (n: number, [lo, hi]: [number | null, number | null]) =>
      (lo === null || n >= lo) && (hi === null || n <= hi);
    if (inRange(value, goodRange)) status = "good";
    else if (inRange(value, warnRange)) status = "warn";
    else status = "critical";
    const meta = READING_LABELS[kind];
    kpis.push({
      kind, label: meta.label, value: Math.round(value * 10) / 10,
      unit: meta.unit, trendPct, status, note,
    });
  }
  // Resting HR: 50–80 good; 80–100 warn; >100 critical (per AHA)
  buildTile("hr_resting", "avg", [80, 100], [50, 80]);
  // SpO2: ≥95 good; 92–95 warn; <92 critical
  buildTile("spo2", "min", [92, 95], [95, 100]);
  // BP systolic: <130 good; 130–140 warn; >140 critical
  buildTile("bp_systolic", "avg", [130, 140], [90, 130]);
  buildTile("bp_diastolic", "avg", [85, 90], [60, 85]);
  // Glucose: 80–140 good; 140–180 warn; >180 critical (post-prandial mix)
  buildTile("blood_glucose", "avg", [140, 180], [80, 140]);
  // Steps: ≥7500 good; 5000-7500 warn; <5000 critical (WHO benchmarks)
  buildTile("steps", "sum_per_day", [5000, 7500], [7500, 30000]);
  // Sleep: 360–540 min good (6–9h); 300–360 warn; <300 critical
  buildTile("sleep_minutes", "avg", [300, 360], [360, 540]);

  // ── Anomalies ────────────────────────────────────────────────
  const anomalies: AnomalyFlag[] = [];

  // AFib episodes from ECG class 1
  for (const r of inWindow) {
    if (r.kind === "ecg_rhythm" && r.value === 1) {
      anomalies.push({
        label: "Possible atrial fibrillation",
        severity: "warn",
        occurredAt: r.takenAt,
        detail: "Wearable ECG classified the rhythm as AFib (class 1). Consumer ECGs have a positive predictive value of ~84% — confirm with a 12-lead.",
        recommendation: "Schedule a 12-lead ECG within 7 days. Consider Holter monitoring if multiple episodes.",
      });
    }
  }

  // Sustained tachycardia at rest (>110 bpm avg over a day)
  const restHr = daily.hr_resting || [];
  for (const b of restHr) {
    if (b.avg > 110) {
      anomalies.push({
        label: "Sustained tachycardia",
        severity: "warn",
        occurredAt: b.date,
        detail: `Resting HR averaged ${Math.round(b.avg)} bpm on ${b.date}. >110 bpm sustained warrants workup.`,
        recommendation: "Check for thyroid, dehydration, anaemia. ECG if symptomatic.",
      });
    }
  }

  // Hypoxic episodes
  const spo2Daily = daily.spo2 || [];
  for (const b of spo2Daily) {
    if (b.min < 90) {
      anomalies.push({
        label: "Significant SpO₂ drop",
        severity: b.min < 85 ? "critical" : "warn",
        occurredAt: b.date,
        detail: `SpO₂ dropped to ${b.min}% on ${b.date}.`,
        recommendation: "Rule out OSA, COPD, cardiac causes. Sleep study if recurrent overnight.",
      });
    }
  }

  // Hypertension trend
  const sysDaily = daily.bp_systolic || [];
  const high = sysDaily.filter((b) => b.avg >= 140).length;
  if (high >= 7) {
    anomalies.push({
      label: "Persistent hypertension",
      severity: "warn",
      occurredAt: sysDaily[sysDaily.length - 1]?.date || new Date().toISOString().slice(0, 10),
      detail: `Systolic BP ≥ 140 on ${high} days in the last ${windowDays} days.`,
      recommendation: "Confirm with clinic-grade cuff. Consider initiating / titrating antihypertensive.",
    });
  }

  // Glucose excursions
  const gluc = inWindow.filter((r) => r.kind === "blood_glucose");
  const high300 = gluc.filter((r) => r.value > 300).length;
  const lows = gluc.filter((r) => r.value < 70).length;
  if (high300 > 0) {
    anomalies.push({
      label: `Hyperglycaemia (${high300} reading${high300 === 1 ? "" : "s"} > 300)`,
      severity: "critical",
      occurredAt: gluc.find((r) => r.value > 300)!.takenAt,
      detail: "Severe hyperglycaemia events suggest poor glycaemic control or insulin omission.",
      recommendation: "Same-day clinic visit. Consider DKA workup if symptomatic.",
    });
  }
  if (lows > 0) {
    anomalies.push({
      label: `Hypoglycaemia events (${lows})`,
      severity: "warn",
      occurredAt: gluc.find((r) => r.value < 70)!.takenAt,
      detail: "Wearable / glucometer flagged glucose < 70 mg/dL.",
      recommendation: "Review medication timing + dose. Confirm with venous sample if persistent.",
    });
  }

  // ── Clinical summary ─────────────────────────────────────────
  const summaryParts: string[] = [];
  const restingHrTile = kpis.find((k) => k.kind === "hr_resting");
  const sysTile = kpis.find((k) => k.kind === "bp_systolic");
  const diaTile = kpis.find((k) => k.kind === "bp_diastolic");
  const spo2Tile = kpis.find((k) => k.kind === "spo2");
  const glucTile = kpis.find((k) => k.kind === "blood_glucose");
  const stepsTile = kpis.find((k) => k.kind === "steps");
  const sleepTile = kpis.find((k) => k.kind === "sleep_minutes");
  if (restingHrTile) summaryParts.push(`resting HR ${restingHrTile.value} bpm`);
  if (sysTile && diaTile) summaryParts.push(`BP avg ${sysTile.value}/${diaTile.value}`);
  if (spo2Tile) summaryParts.push(`SpO₂ floor ${spo2Tile.value}%`);
  if (glucTile) summaryParts.push(`glucose avg ${glucTile.value} mg/dL`);
  if (stepsTile) summaryParts.push(`${Math.round(stepsTile.value).toLocaleString()} steps/day`);
  if (sleepTile) summaryParts.push(`${(sleepTile.value / 60).toFixed(1)}h sleep`);
  let clinicalSummary = summaryParts.length > 0
    ? `Wearable trends (${windowDays}d): ${summaryParts.join("; ")}.`
    : `No wearable data in last ${windowDays} days.`;
  if (anomalies.length > 0) {
    const criticalCount = anomalies.filter((a) => a.severity === "critical").length;
    const warnCount = anomalies.filter((a) => a.severity === "warn").length;
    clinicalSummary += ` ${criticalCount} critical + ${warnCount} warning flags — see Anomalies.`;
  }

  return { windowDays, kpis, daily, anomalies, clinicalSummary };
}
