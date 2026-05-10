// Patient triage color grading.
//
// Single source of truth for how OduDoc renders urgency across the
// app — emergency dashboard, ward boards, ICU panels, OPD queue,
// lab status, pharmacy delivery, sample tracking. Anything that
// needs a "how urgent is this?" pill maps its severity into one of
// these five canonical levels and renders the same colors.
//
// Levels follow standard ED triage practice (4-color systems plus
// a "stable" baseline):
//   red    — immediate / life-threatening
//   yellow — urgent / monitor closely
//   blue   — elevated / non-urgent but escalating
//   green  — stable / routine
//   gray   — completed / discharged
//
// Avoid inventing new colors per surface. Add a level here instead.

export type TriageLevel = "red" | "yellow" | "blue" | "green" | "gray";

export interface TriagePalette {
  /** 1-line label shown on the pill. */
  label: string;
  /** Tailwind classes — light/dark surface for the pill itself. */
  pillClass: string;
  /** Tailwind class for a 8px dot — used in lists when space is
   *  too tight for a full pill. */
  dotClass: string;
  /** Hex stripe — used on Kanban / row borders. */
  hex: string;
}

export const TRIAGE_PALETTE: Record<TriageLevel, TriagePalette> = {
  red: {
    label: "Critical",
    pillClass: "bg-rose-600 text-white ring-rose-700",
    dotClass: "bg-rose-600 animate-pulse",
    hex: "#e11d48",
  },
  yellow: {
    label: "Urgent",
    pillClass: "bg-amber-500 text-white ring-amber-600",
    dotClass: "bg-amber-500",
    hex: "#f59e0b",
  },
  blue: {
    label: "Elevated",
    pillClass: "bg-sky-500 text-white ring-sky-600",
    dotClass: "bg-sky-500",
    hex: "#0ea5e9",
  },
  green: {
    label: "Stable",
    pillClass: "bg-emerald-500 text-white ring-emerald-600",
    dotClass: "bg-emerald-500",
    hex: "#10b981",
  },
  gray: {
    label: "Closed",
    pillClass: "bg-slate-400 text-white ring-slate-500",
    dotClass: "bg-slate-400",
    hex: "#94a3b8",
  },
};

/** Map a clinical context into a triage level. Add cases here as
 *  new surfaces wire up — the rest of the app just hands us a
 *  context object and gets a level back. */
export interface TriageContext {
  /** Latest news2 score (early warning). 0-3 green, 4-5 yellow,
   *  6 blue, ≥7 red. */
  news2?: number;
  /** Latest SpO2 in %. <90 red, <95 yellow. */
  spo2?: number;
  /** Latest systolic BP. ≥180 red, ≥160 yellow. */
  bpSystolic?: number;
  /** Latest heart rate. ≥130 red, ≥110 yellow, <40 red. */
  heartRate?: number;
  /** ICU admission. */
  icu?: boolean;
  /** Discharged. */
  discharged?: boolean;
}

export function classifyContext(c: TriageContext): TriageLevel {
  if (c.discharged) return "gray";
  if (c.icu) return "red";
  if (c.news2 !== undefined) {
    if (c.news2 >= 7) return "red";
    if (c.news2 === 6) return "blue";
    if (c.news2 >= 4) return "yellow";
    return "green";
  }
  if ((c.spo2 !== undefined && c.spo2 < 90) ||
      (c.bpSystolic !== undefined && c.bpSystolic >= 180) ||
      (c.heartRate !== undefined && (c.heartRate >= 130 || c.heartRate < 40))) {
    return "red";
  }
  if ((c.spo2 !== undefined && c.spo2 < 95) ||
      (c.bpSystolic !== undefined && c.bpSystolic >= 160) ||
      (c.heartRate !== undefined && c.heartRate >= 110)) {
    return "yellow";
  }
  return "green";
}
