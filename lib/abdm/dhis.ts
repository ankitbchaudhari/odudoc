// ABDM Digital Health Incentive Scheme (DHIS) calculator.
//
// The NHA pays a per-record incentive (₹20–₹40) to facilities that
// register / link care contexts to ABHA IDs through ABDM. Eligibility
// is determined by the care context's status — only "registered" and
// "linked" rows count. Drafts don't qualify; withdrawn rows are
// counted out (we treat them as never-eligible here).
//
// Reporting cadence is the Indian fiscal quarter (Apr–Jun = Q1, etc.)
// and the annual cap per facility is ₹4 crore. This module is a
// read-only consumer of lib/abdm/care-context-store — it never writes.
//
// Source: NHA "Digital Health Incentive Scheme" rate card, 2024.

import { listContextsForOrg, type CareContextType } from "./care-context-store";

export type DhisCategory =
  | "opd"
  | "ipd"
  | "diagnostic"
  | "immunization"
  | "discharge_summary";

export interface DhisRate {
  category: DhisCategory;
  perRecord: number; // INR
  // CareContext.type values that map to this DHIS category. Multiple
  // context types can map to one category if NHA later splits a row.
  contextTypes: CareContextType[];
}

// NOTE on IPD: the CareContext.type union in care-context-store.ts does
// not currently model a dedicated in-patient admission record. NHA pays
// the IPD incentive on the admission record itself, separate from the
// discharge summary. We keep the IPD row in the rate card (so the UI +
// CSV still surface the category) but with an empty contextTypes list —
// count will always be 0 until an "InPatientAdmission" type is added.
export const DHIS_RATES: DhisRate[] = [
  { category: "opd", perRecord: 20, contextTypes: ["OPDConsultation"] },
  { category: "ipd", perRecord: 40, contextTypes: [] },
  { category: "diagnostic", perRecord: 20, contextTypes: ["DiagnosticReport"] },
  { category: "immunization", perRecord: 20, contextTypes: ["ImmunizationRecord"] },
  { category: "discharge_summary", perRecord: 40, contextTypes: ["DischargeSummary"] },
];

export const DHIS_ANNUAL_CAP_INR = 4_00_00_000; // ₹4 crore

export interface DhisQuarter {
  fyYear: number;          // FY start year, e.g. 2026 means FY 2026-27
  q: 1 | 2 | 3 | 4;
  startIso: string;        // inclusive
  endIso: string;          // exclusive
  label: string;           // e.g. "FY 2026-27 Q1 (Apr–Jun 2026)"
}

const Q_MONTHS = {
  1: { startMonth: 3, label: "Apr–Jun" },
  2: { startMonth: 6, label: "Jul–Sep" },
  3: { startMonth: 9, label: "Oct–Dec" },
  4: { startMonth: 0, label: "Jan–Mar" }, // calendar year fyYear+1
} as const;

function fyLabel(year: number): string {
  const next = (year + 1).toString().slice(-2);
  return `FY ${year}-${next}`;
}

function buildQuarter(fyYear: number, q: 1 | 2 | 3 | 4): DhisQuarter {
  const { startMonth, label } = Q_MONTHS[q];
  // Q1-Q3 sit inside the calendar year fyYear; Q4 spills into fyYear+1.
  const calYear = q === 4 ? fyYear + 1 : fyYear;
  const start = new Date(Date.UTC(calYear, startMonth, 1));
  const end = new Date(Date.UTC(calYear, startMonth + 3, 1));
  const yearLabel = q === 4 ? `${calYear}` : `${calYear}`;
  return {
    fyYear,
    q,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    label: `${fyLabel(fyYear)} Q${q} (${label} ${yearLabel})`,
  };
}

export function quartersInFy(year: number): DhisQuarter[] {
  return [1, 2, 3, 4].map((q) => buildQuarter(year, q as 1 | 2 | 3 | 4));
}

/** Indian FY = Apr-1 to Mar-31. A date in Jan-Mar belongs to the FY
 *  that started the previous calendar year. */
export function fyYearForDate(d: Date): number {
  const m = d.getUTCMonth(); // 0-indexed
  return m >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
}

export function currentDhisQuarter(now: Date = new Date()): DhisQuarter {
  const fy = fyYearForDate(now);
  const m = now.getUTCMonth();
  const q: 1 | 2 | 3 | 4 =
    m >= 3 && m <= 5 ? 1 :
    m >= 6 && m <= 8 ? 2 :
    m >= 9 && m <= 11 ? 3 : 4;
  return buildQuarter(fy, q);
}

export interface DhisBreakdown {
  category: DhisCategory;
  count: number;
  rateInr: number;
  amountInr: number;
}

export interface DhisReport {
  organizationId: string;
  hfrFacilityId?: string;
  period: DhisQuarter;
  breakdown: DhisBreakdown[];
  totalRecords: number;
  totalAmountInr: number;
  /** True when the YTD running total exceeds the ₹4 cr annual cap on
   *  or before this quarter — UI surfaces a banner when this flips. */
  cappedByAnnual: boolean;
}

function emptyBreakdown(): DhisBreakdown[] {
  return DHIS_RATES.map((r) => ({
    category: r.category,
    count: 0,
    rateInr: r.perRecord,
    amountInr: 0,
  }));
}

function categoryFor(type: CareContextType): DhisCategory | null {
  for (const r of DHIS_RATES) {
    if (r.contextTypes.includes(type)) return r.category;
  }
  return null;
}

export function computeDhisReport(
  organizationId: string,
  period: DhisQuarter,
  hfrFacilityId?: string,
): DhisReport {
  const contexts = listContextsForOrg(organizationId);
  const breakdown = emptyBreakdown();
  const byCategory = new Map(breakdown.map((b) => [b.category, b]));
  for (const c of contexts) {
    if (c.status !== "registered" && c.status !== "linked") continue;
    if (c.recordDate < period.startIso || c.recordDate >= period.endIso) continue;
    const cat = categoryFor(c.type);
    if (!cat) continue;
    const row = byCategory.get(cat);
    if (!row) continue;
    row.count += 1;
    row.amountInr += row.rateInr;
  }
  const totalRecords = breakdown.reduce((s, b) => s + b.count, 0);
  const totalAmountInr = breakdown.reduce((s, b) => s + b.amountInr, 0);
  return {
    organizationId,
    hfrFacilityId,
    period,
    breakdown,
    totalRecords,
    totalAmountInr,
    cappedByAnnual: false,
  };
}

/** Compute every quarter of the FY, applying the ₹4 cr annual cap as a
 *  running total. Once cumulative spend crosses the cap, that quarter
 *  (and every subsequent one) is flagged cappedByAnnual = true and its
 *  totalAmountInr is clamped so the FY total never exceeds the cap. */
export function computeDhisYtdForFy(
  organizationId: string,
  fyYear: number,
  hfrFacilityId?: string,
): DhisReport[] {
  const reports = quartersInFy(fyYear).map((p) =>
    computeDhisReport(organizationId, p, hfrFacilityId),
  );
  let running = 0;
  for (const r of reports) {
    const remaining = Math.max(0, DHIS_ANNUAL_CAP_INR - running);
    if (r.totalAmountInr > remaining) {
      // Clamp to whatever cap headroom is left this FY.
      r.totalAmountInr = remaining;
      r.cappedByAnnual = true;
    } else if (running >= DHIS_ANNUAL_CAP_INR) {
      r.totalAmountInr = 0;
      r.cappedByAnnual = true;
    }
    running += r.totalAmountInr;
  }
  return reports;
}
