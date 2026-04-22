// NABH Quality Indicators. Tenant-scoped. Two entities:
//  QualityIndicator (definition: name, numerator/denominator formula, target, category)
//  QualityMeasurement (monthly/periodic reported value)
// Not linked to patients — no cascade needed.

import { bindPersistentArray } from "../persistent-array";

export type IndicatorCategory =
  | "clinical"          // e.g. HAI rate, medication errors, pressure ulcers
  | "patient_safety"    // incidents, falls, RCA
  | "service_quality"   // OT start delay, discharge TAT
  | "operational"       // bed occupancy, ALOS
  | "financial"         // denial rate
  | "hr_nursing"        // nurse turnover, staff satisfaction
  | "infection_control" // SSI, CLABSI, CAUTI, VAP rates
  | "medication"        // med error rate, reconciliation
  | "nabh_mandatory";   // NABH chapter-mandated

export type Direction = "lower_better" | "higher_better" | "on_target";
export type Frequency = "daily" | "weekly" | "monthly" | "quarterly" | "annual";
export type IndicatorStatus = "active" | "retired" | "draft";

export interface QualityIndicator {
  id: string;                     // QI-{suffix}-{seq}
  organizationId: string;
  code: string;                   // NABH code e.g. "IPSG-1", "AAC-5" or custom
  name: string;
  description?: string;
  category: IndicatorCategory;
  numeratorDef: string;           // textual formula
  denominatorDef: string;
  unit: string;                   // %, per 1000, days
  direction: Direction;
  targetValue: number;            // numeric target / benchmark
  benchmarkSource?: string;       // e.g. NABH, JCI, internal
  frequency: Frequency;
  responsibleOwner?: string;
  status: IndicatorStatus;
  createdAt: string;
  updatedAt: string;
}

export interface QualityMeasurement {
  id: string;                     // QM-{suffix}-{seq}
  organizationId: string;
  indicatorId: string;
  indicatorCode: string;          // denormalized for display stability
  indicatorName: string;
  periodLabel: string;            // e.g. "2026-04" or "2026-Q2"
  periodStart: string;            // ISO
  periodEnd: string;              // ISO
  numerator: number;
  denominator: number;
  value: number;                  // computed
  target: number;                 // snapshot of target at measurement time
  direction: Direction;
  met: boolean;                   // target achieved?
  rootCauseNote?: string;         // required if missed
  actionPlan?: string;
  reportedBy?: string;
  reportedAt: string;
  createdAt: string;
  updatedAt: string;
}

const indicators: QualityIndicator[] = [];
const measurements: QualityMeasurement[] = [];
const hI = bindPersistentArray<QualityIndicator>("quality-indicators", indicators, () => []);
const hM = bindPersistentArray<QualityMeasurement>("quality-measurements", measurements, () => []);
await hI;
await hM;

export const CATEGORY_LABEL: Record<IndicatorCategory, string> = {
  clinical: "Clinical",
  patient_safety: "Patient safety",
  service_quality: "Service quality",
  operational: "Operational",
  financial: "Financial",
  hr_nursing: "HR / Nursing",
  infection_control: "Infection control",
  medication: "Medication",
  nabh_mandatory: "NABH mandatory",
};
export const FREQ_LABEL: Record<Frequency, string> = {
  daily: "Daily", weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", annual: "Annual",
};
export const DIRECTION_LABEL: Record<Direction, string> = {
  lower_better: "Lower is better", higher_better: "Higher is better", on_target: "On target",
};
export const STATUS_LABEL: Record<IndicatorStatus, string> = {
  active: "Active", retired: "Retired", draft: "Draft",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextIndId(o: string) {
  const p = `QI-${suf(o)}-`;
  const m = indicators.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}
function nextMeasId(o: string) {
  const p = `QM-${suf(o)}-`;
  const m = measurements.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

function computeMet(value: number, target: number, dir: Direction): boolean {
  if (dir === "lower_better") return value <= target;
  if (dir === "higher_better") return value >= target;
  // on_target ± 5% window
  const window = Math.max(target * 0.05, 0.5);
  return Math.abs(value - target) <= window;
}

// Indicators
export function listIndicators(opts: { organizationId: string; category?: IndicatorCategory; status?: IndicatorStatus }): QualityIndicator[] {
  return indicators.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.category ? r.category === opts.category : true))
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .sort((a, b) => a.code.localeCompare(b.code));
}
export function createIndicator(orgId: string, input: Partial<QualityIndicator>): { ok: true; record: QualityIndicator } | { ok: false; error: string } {
  if (!input.code || !input.name || !input.category || !input.numeratorDef || !input.denominatorDef) return { ok: false, error: "missing_required" };
  if (indicators.some((r) => r.organizationId === orgId && r.code.toLowerCase() === String(input.code).toLowerCase())) return { ok: false, error: "duplicate_code" };
  const now = new Date().toISOString();
  const r: QualityIndicator = {
    id: nextIndId(orgId), organizationId: orgId,
    code: input.code, name: input.name, description: input.description,
    category: input.category as IndicatorCategory,
    numeratorDef: input.numeratorDef, denominatorDef: input.denominatorDef,
    unit: input.unit || "%",
    direction: (input.direction || "lower_better") as Direction,
    targetValue: Number(input.targetValue ?? 0),
    benchmarkSource: input.benchmarkSource,
    frequency: (input.frequency || "monthly") as Frequency,
    responsibleOwner: input.responsibleOwner,
    status: (input.status || "active") as IndicatorStatus,
    createdAt: now, updatedAt: now,
  };
  indicators.push(r);
  return { ok: true, record: r };
}
export function updateIndicator(id: string, orgId: string, patch: Partial<QualityIndicator>): QualityIndicator | null {
  const i = indicators.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = indicators[i];
  if (patch.code && patch.code !== prev.code && indicators.some((r) => r.organizationId === orgId && r.id !== id && r.code.toLowerCase() === String(patch.code).toLowerCase())) return null;
  const next: QualityIndicator = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: new Date().toISOString() };
  indicators[i] = next;
  return next;
}
export function deleteIndicator(id: string, orgId: string): boolean {
  const i = indicators.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  indicators.splice(i, 1);
  return true;
}

// Measurements
export function listMeasurements(opts: { organizationId: string; indicatorId?: string; missedOnly?: boolean }): QualityMeasurement[] {
  return measurements.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.indicatorId ? r.indicatorId === opts.indicatorId : true))
    .filter((r) => (opts.missedOnly ? !r.met : true))
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
}
export function createMeasurement(orgId: string, input: Partial<QualityMeasurement>): { ok: true; record: QualityMeasurement } | { ok: false; error: string } {
  if (!input.indicatorId || !input.periodLabel || input.numerator == null || input.denominator == null) return { ok: false, error: "missing_required" };
  const ind = indicators.find((r) => r.id === input.indicatorId && r.organizationId === orgId);
  if (!ind) return { ok: false, error: "indicator_not_found" };
  const denom = Number(input.denominator);
  if (denom <= 0) return { ok: false, error: "denominator_must_be_positive" };
  const num = Number(input.numerator);
  const raw = num / denom;
  // Convert to unit scale. If unit starts with "%", multiply by 100. If contains "per 1000", multiply by 1000 etc.
  let value = raw;
  const u = ind.unit.toLowerCase();
  if (u.includes("%")) value = raw * 100;
  else if (u.includes("per 1000") || u.includes("/1000")) value = raw * 1000;
  else if (u.includes("per 100") || u.includes("/100")) value = raw * 100;
  else if (u.includes("per 10000") || u.includes("/10000")) value = raw * 10000;
  value = Math.round(value * 100) / 100;
  const now = new Date().toISOString();
  const r: QualityMeasurement = {
    id: nextMeasId(orgId), organizationId: orgId,
    indicatorId: ind.id,
    indicatorCode: ind.code,
    indicatorName: ind.name,
    periodLabel: input.periodLabel,
    periodStart: input.periodStart || now,
    periodEnd: input.periodEnd || now,
    numerator: num,
    denominator: denom,
    value,
    target: ind.targetValue,
    direction: ind.direction,
    met: computeMet(value, ind.targetValue, ind.direction),
    rootCauseNote: input.rootCauseNote,
    actionPlan: input.actionPlan,
    reportedBy: input.reportedBy,
    reportedAt: now,
    createdAt: now, updatedAt: now,
  };
  measurements.push(r);
  return { ok: true, record: r };
}
export function updateMeasurement(id: string, orgId: string, patch: Partial<QualityMeasurement>): QualityMeasurement | null {
  const i = measurements.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = measurements[i];
  const next: QualityMeasurement = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: new Date().toISOString() };
  // If numerator/denominator changed, recompute value + met
  if (patch.numerator != null || patch.denominator != null) {
    const ind = indicators.find((r) => r.id === prev.indicatorId && r.organizationId === orgId);
    if (ind) {
      const denom = Number(next.denominator);
      const num = Number(next.numerator);
      if (denom > 0) {
        let value = num / denom;
        const u = ind.unit.toLowerCase();
        if (u.includes("%")) value *= 100;
        else if (u.includes("per 1000") || u.includes("/1000")) value *= 1000;
        else if (u.includes("per 100") || u.includes("/100")) value *= 100;
        else if (u.includes("per 10000") || u.includes("/10000")) value *= 10000;
        next.value = Math.round(value * 100) / 100;
        next.target = ind.targetValue;
        next.direction = ind.direction;
        next.met = computeMet(next.value, next.target, next.direction);
      }
    }
  }
  measurements[i] = next;
  return next;
}
export function deleteMeasurement(id: string, orgId: string): boolean {
  const i = measurements.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  measurements.splice(i, 1);
  return true;
}

export function computeStats(orgId: string) {
  const myI = indicators.filter((r) => r.organizationId === orgId);
  const myM = measurements.filter((r) => r.organizationId === orgId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString();
  const activeIndicators = myI.filter((r) => r.status === "active").length;
  const mandatoryIndicators = myI.filter((r) => r.status === "active" && r.category === "nabh_mandatory").length;
  const measurementsMonth = myM.filter((r) => r.reportedAt >= monthStart).length;
  const missedMonth = myM.filter((r) => r.reportedAt >= monthStart && !r.met).length;
  const missedQuarter = myM.filter((r) => r.reportedAt >= quarterStart && !r.met).length;
  const missedMissingRca = myM.filter((r) => !r.met && !r.rootCauseNote).length;
  const performancePct = measurementsMonth > 0 ? Math.round(((measurementsMonth - missedMonth) / measurementsMonth) * 100) : 0;
  return {
    activeIndicators, mandatoryIndicators,
    measurementsMonth, missedMonth, missedQuarter, missedMissingRca,
    performancePct,
  };
}
