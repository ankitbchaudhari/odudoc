// Care plans for chronic conditions.
//
// One row per (userId, condition). The plan carries clinical
// targets the patient is working toward — BP < 130/80 for hypertension,
// fasting glucose 80-130 for diabetes, etc. — plus a free-text
// goals list and lifestyle notes.
//
// We intentionally store targets as flat min/max numbers rather
// than ranges-per-context (fasting vs post-prandial) because the
// patient's engagement budget for "is this number good?" is shallow.
// One number, one verdict.

import { bindPersistentArray } from "../persistent-array";

export type Condition =
  | "diabetes_t2"
  | "diabetes_t1"
  | "hypertension"
  | "hyperlipidemia"
  | "asthma"
  | "copd"
  | "ckd"
  | "thyroid_hypo"
  | "thyroid_hyper"
  | "obesity"
  | "anxiety_depression"
  | "post_mi"
  | "pregnancy"
  | "other";

export interface VitalTarget {
  /** matches VitalKind from /lib/vitals */
  kind: "bp" | "weight" | "glucose" | "heart_rate" | "spo2" | "temperature";
  min?: number;
  max?: number;
  /** For BP — diastolic max. */
  max2?: number;
  unit: string;
  label: string;
}

export interface CarePlan {
  id: string;
  userId: string;
  condition: Condition;
  /** Patient-readable name. Auto-derived from condition but can
   *  be overridden ("Pregnancy — Q2"). */
  title: string;
  diagnosedOn?: string;
  /** Owning doctor — optional; demo plans may be patient-self-set. */
  doctorEmail?: string;
  targets: VitalTarget[];
  /** Free-text goals — "walk 30 min daily", "no added sugar". */
  goals: string[];
  /** Patient-private notes. */
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const plans: CarePlan[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<CarePlan>(
  "care_plans",
  plans,
  () => []
);
await hydrate();

/** Default target presets per condition. Editing these in the UI
 *  overrides — the preset just bootstraps. */
export function defaultTargets(c: Condition): VitalTarget[] {
  switch (c) {
    case "diabetes_t2":
    case "diabetes_t1":
      return [
        { kind: "glucose", min: 80, max: 130, unit: "mg/dL", label: "Fasting glucose" },
        { kind: "weight", unit: "kg", label: "Weight (track only)" },
      ];
    case "hypertension":
      return [
        { kind: "bp", max: 130, max2: 80, unit: "mmHg", label: "Blood pressure" },
        { kind: "heart_rate", min: 60, max: 100, unit: "bpm", label: "Resting heart rate" },
      ];
    case "hyperlipidemia":
      return [
        { kind: "weight", unit: "kg", label: "Weight (track only)" },
      ];
    case "asthma":
    case "copd":
      return [
        { kind: "spo2", min: 95, unit: "%", label: "Oxygen saturation" },
      ];
    case "ckd":
      return [
        { kind: "bp", max: 130, max2: 80, unit: "mmHg", label: "Blood pressure" },
      ];
    case "post_mi":
      return [
        { kind: "bp", max: 130, max2: 80, unit: "mmHg", label: "Blood pressure" },
        { kind: "heart_rate", min: 50, max: 80, unit: "bpm", label: "Resting heart rate" },
      ];
    case "obesity":
      return [
        { kind: "weight", unit: "kg", label: "Weight" },
      ];
    case "pregnancy":
      return [
        { kind: "bp", max: 140, max2: 90, unit: "mmHg", label: "Blood pressure (gestational)" },
        { kind: "weight", unit: "kg", label: "Weight (gestational gain)" },
      ];
    default:
      return [];
  }
}

export const CONDITION_LABEL: Record<Condition, string> = {
  diabetes_t2: "Type 2 Diabetes",
  diabetes_t1: "Type 1 Diabetes",
  hypertension: "Hypertension",
  hyperlipidemia: "High cholesterol",
  asthma: "Asthma",
  copd: "COPD",
  ckd: "Chronic kidney disease",
  thyroid_hypo: "Hypothyroidism",
  thyroid_hyper: "Hyperthyroidism",
  obesity: "Obesity / weight management",
  anxiety_depression: "Anxiety / depression",
  post_mi: "Post-MI / cardiac",
  pregnancy: "Pregnancy",
  other: "Other condition",
};

export interface CreatePlanInput {
  userId: string;
  condition: Condition;
  title?: string;
  diagnosedOn?: string;
  doctorEmail?: string;
  targets?: VitalTarget[];
  goals?: string[];
  notes?: string;
}

export function createPlan(input: CreatePlanInput): CarePlan {
  const at = new Date().toISOString();
  const p: CarePlan = {
    id: `cp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId: input.userId,
    condition: input.condition,
    title: input.title?.trim() || CONDITION_LABEL[input.condition],
    diagnosedOn: input.diagnosedOn,
    doctorEmail: input.doctorEmail,
    targets: input.targets && input.targets.length ? input.targets : defaultTargets(input.condition),
    goals: input.goals?.filter((g) => g.trim().length > 0) || [],
    notes: input.notes?.trim() || undefined,
    active: true,
    createdAt: at,
    updatedAt: at,
  };
  plans.unshift(p);
  flush();
  return p;
}

export function listPlans(userId: string, opts: { activeOnly?: boolean } = {}): CarePlan[] {
  let list = plans.filter((p) => p.userId === userId);
  if (opts.activeOnly) list = list.filter((p) => p.active);
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getPlan(id: string, userId: string): CarePlan | null {
  return plans.find((p) => p.id === id && p.userId === userId) || null;
}

export function updatePlan(id: string, userId: string, patch: Partial<Omit<CarePlan, "id" | "userId" | "createdAt">>): CarePlan | null {
  const p = plans.find((x) => x.id === id && x.userId === userId);
  if (!p) return null;
  Object.assign(p, patch);
  p.updatedAt = new Date().toISOString();
  flush();
  return p;
}

export function deletePlan(id: string, userId: string): boolean {
  const i = plans.findIndex((p) => p.id === id && p.userId === userId);
  if (i < 0) return false;
  tombstone(plans[i].id);
  plans.splice(i, 1);
  flush();
  return true;
}

export function deletePlansForUser(userId: string): number {
  let n = 0;
  for (let i = plans.length - 1; i >= 0; i--) {
    if (plans[i].userId === userId) {
      tombstone(plans[i].id);
      plans.splice(i, 1);
      n++;
    }
  }
  if (n) flush();
  return n;
}

export interface TargetCompliance {
  target: VitalTarget;
  /** Number of relevant readings in the window. */
  count: number;
  /** % within target range. */
  inRangePct: number;
  /** Most recent value (formatted). */
  latest?: string;
  latestAt?: string;
}

interface VitalSlim { kind: VitalTarget["kind"]; value: number; value2?: number; takenAt: string }

/** Score a target against a list of vital readings (any kind). */
export function evaluateTarget(target: VitalTarget, readings: VitalSlim[]): TargetCompliance {
  const matched = readings.filter((r) => r.kind === target.kind);
  if (matched.length === 0) {
    return { target, count: 0, inRangePct: 0 };
  }
  matched.sort((a, b) => (a.takenAt < b.takenAt ? 1 : -1));
  const inRange = matched.filter((r) => isInRange(target, r));
  const latest = matched[0];
  return {
    target,
    count: matched.length,
    inRangePct: Math.round((inRange.length / matched.length) * 100),
    latest: target.kind === "bp" ? `${latest.value}/${latest.value2 ?? "?"}` : String(latest.value),
    latestAt: latest.takenAt,
  };
}

function isInRange(t: VitalTarget, r: VitalSlim): boolean {
  if (t.min !== undefined && r.value < t.min) return false;
  if (t.max !== undefined && r.value > t.max) return false;
  if (t.kind === "bp" && t.max2 !== undefined && r.value2 !== undefined && r.value2 > t.max2) return false;
  return true;
}
