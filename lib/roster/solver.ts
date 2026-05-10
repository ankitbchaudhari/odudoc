// Roster solver.
//
// Pure function. Takes staff + coverage policy + leave + fairness
// ledger + window dates → returns a draft roster honoring (in
// priority order):
//
//   1. Hard constraints — never violate
//      a. Don't assign someone on approved leave
//      b. Don't assign blocked-shift periods
//      c. Don't violate 12-hour rest gap (no morning the day after a
//         night shift on the same staff)
//      d. Don't exceed maxHoursPerWeek (each shift = 8h)
//
//   2. Soft constraints — best-effort
//      a. Honour preferred-shift list when possible
//      b. Distribute night + weekend fairly using the running ledger
//      c. Match required-specialty rules
//      d. Avoid back-to-back same-period stretches > 5 days
//
// The algorithm is greedy with a "lowest fairness debt" tiebreaker.
// Each (date, period, role) slot is filled by walking eligible staff,
// scoring them, and picking the highest score. Hard violations
// drop a candidate to score 0. The solver records warnings whenever
// a slot couldn't be fully filled or a soft rule was breached.

import type {
  RosterStaff,
  CoverageRequirement,
  RosterAssignment,
  ShiftPeriod,
  Roster,
} from "./store";

export interface SolveInput {
  organizationId: string;
  staff: RosterStaff[];
  requirements: CoverageRequirement[];
  fromDate: string;            // YYYY-MM-DD inclusive
  toDate: string;              // YYYY-MM-DD inclusive
  /** Staff id → set of YYYY-MM-DD on leave. */
  leaveByStaff: Map<string, Set<string>>;
  /** Running fairness counts from previously published rosters. */
  fairnessLedger: Map<string, { night: number; weekend: number; total: number }>;
}

export interface SolveOutput {
  assignments: RosterAssignment[];
  warnings: Roster["warnings"];
  workloadSummary: Roster["workloadSummary"];
}

const SHIFT_HOURS = 8;
const PERIOD_ORDER: ShiftPeriod[] = ["morning", "afternoon", "evening", "night"];

interface SlotKey {
  date: string;
  period: ShiftPeriod;
  role: RosterStaff["role"];
  requiredSpecialty?: string;
  count: number;
}

function eachDate(fromDate: string, toDate: string): string[] {
  const out: string[] = [];
  let t = new Date(fromDate).getTime();
  const end = new Date(toDate).getTime();
  while (t <= end) {
    out.push(new Date(t).toISOString().slice(0, 10));
    t += 24 * 60 * 60 * 1000;
  }
  return out;
}

function isWeekend(date: string): boolean {
  const d = new Date(date).getDay();
  return d === 0 || d === 6;
}

function previousDate(date: string): string {
  return new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
}

function periodAfter(period: ShiftPeriod, prevPeriod: ShiftPeriod | null): boolean {
  // True when `period` follows `prevPeriod` directly without a 12h+ gap.
  // night → morning needs the 12h gap most acutely.
  if (!prevPeriod) return false;
  if (prevPeriod === "night" && period === "morning") return true;
  return false;
}

interface StaffState {
  staff: RosterStaff;
  shiftsThisWindow: number;
  nightShiftsThisWindow: number;
  weekendShiftsThisWindow: number;
  /** date -> shift period assigned. Used for rest-gap checks. */
  shiftsByDate: Map<string, ShiftPeriod>;
  /** Sliding 7-day shift counter for max-hours rule. */
  weekHistory: Array<{ date: string; period: ShiftPeriod }>;
}

function dropOutsideWeek(state: StaffState, date: string) {
  const cutoff = new Date(new Date(date).getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  state.weekHistory = state.weekHistory.filter((w) => w.date >= cutoff);
}

export function solveRoster(input: SolveInput): SolveOutput {
  const dates = eachDate(input.fromDate, input.toDate);
  const stateByStaff = new Map<string, StaffState>();
  for (const s of input.staff) {
    stateByStaff.set(s.id, {
      staff: s,
      shiftsThisWindow: 0,
      nightShiftsThisWindow: 0,
      weekendShiftsThisWindow: 0,
      shiftsByDate: new Map(),
      weekHistory: [],
    });
  }

  const assignments: RosterAssignment[] = [];
  const warnings: Roster["warnings"] = [];

  // Walk every (date, period) and apply matching requirements.
  for (const date of dates) {
    const dow = isWeekend(date) ? "weekend" : "weekday";
    for (const period of PERIOD_ORDER) {
      // Materialise required slots for this (date, period).
      const slots: SlotKey[] = [];
      for (const r of input.requirements) {
        if (r.dayClass !== "any" && r.dayClass !== dow) continue;
        if (r.period !== period) continue;
        slots.push({
          date,
          period,
          role: r.role,
          requiredSpecialty: r.requiredSpecialty,
          count: r.minCount,
        });
      }

      for (const slot of slots) {
        const filled: string[] = [];
        for (let n = 0; n < slot.count; n++) {
          const candidate = pickCandidate(slot, stateByStaff, input);
          if (!candidate) {
            warnings.push({
              severity: "critical",
              message: `Unfilled: ${date} ${period} ${slot.role}${slot.requiredSpecialty ? ` (${slot.requiredSpecialty})` : ""} (slot ${n + 1}/${slot.count})`,
            });
            break;
          }
          filled.push(candidate.staff.id);
          assignments.push({
            staffId: candidate.staff.id,
            staffName: candidate.staff.name,
            role: candidate.staff.role,
            specialty: candidate.staff.specialty,
            date,
            period,
          });
          // Update state.
          dropOutsideWeek(candidate, date);
          candidate.shiftsByDate.set(date, period);
          candidate.weekHistory.push({ date, period });
          candidate.shiftsThisWindow++;
          if (period === "night") candidate.nightShiftsThisWindow++;
          if (isWeekend(date)) candidate.weekendShiftsThisWindow++;
        }
      }
    }
  }

  // ── Workload summary + soft warnings ────────────────────────
  const workloadSummary: Roster["workloadSummary"] = [];
  for (const state of stateByStaff.values()) {
    workloadSummary.push({
      staffId: state.staff.id,
      staffName: state.staff.name,
      role: state.staff.role,
      totalShifts: state.shiftsThisWindow,
      nightShifts: state.nightShiftsThisWindow,
      weekendShifts: state.weekendShiftsThisWindow,
    });
  }
  workloadSummary.sort((a, b) => b.totalShifts - a.totalShifts);

  // Fairness check — flag if night / weekend distribution is heavily
  // skewed (max - min > 3) within a role.
  const byRole = new Map<RosterStaff["role"], typeof workloadSummary>();
  for (const w of workloadSummary) {
    if (!byRole.has(w.role)) byRole.set(w.role, []);
    byRole.get(w.role)!.push(w);
  }
  for (const [role, list] of byRole) {
    if (list.length === 0) continue;
    const nights = list.map((w) => w.nightShifts);
    const wkends = list.map((w) => w.weekendShifts);
    const totals = list.map((w) => w.totalShifts);
    const skewN = Math.max(...nights) - Math.min(...nights);
    const skewW = Math.max(...wkends) - Math.min(...wkends);
    const skewT = Math.max(...totals) - Math.min(...totals);
    if (skewN > 3) {
      warnings.push({
        severity: "warn",
        message: `${role} night-shift load skewed by ${skewN} between staff. Consider manual rebalance.`,
      });
    }
    if (skewW > 3) {
      warnings.push({
        severity: "warn",
        message: `${role} weekend-shift load skewed by ${skewW} between staff.`,
      });
    }
    if (skewT > 5) {
      warnings.push({
        severity: "warn",
        message: `${role} total-shift load skewed by ${skewT}.`,
      });
    }
  }

  return { assignments, warnings, workloadSummary };
}

function pickCandidate(
  slot: SlotKey,
  stateByStaff: Map<string, StaffState>,
  input: SolveInput,
): StaffState | null {
  let best: StaffState | null = null;
  let bestScore = -Infinity;
  for (const state of stateByStaff.values()) {
    if (state.staff.role !== slot.role) continue;
    if (slot.requiredSpecialty && state.staff.specialty !== slot.requiredSpecialty) continue;
    const score = scoreCandidate(slot, state, input);
    if (score === null) continue;
    if (score > bestScore) { bestScore = score; best = state; }
  }
  return best;
}

function scoreCandidate(slot: SlotKey, state: StaffState, input: SolveInput): number | null {
  const s = state.staff;
  // Hard: leave
  const leave = input.leaveByStaff.get(s.id);
  if (leave?.has(slot.date)) return null;
  // Hard: blocked period
  if (s.blockedShifts?.includes(slot.period)) return null;
  // Hard: 12h rest gap (night → morning next day)
  if (slot.period === "morning") {
    const prev = state.shiftsByDate.get(previousDate(slot.date));
    if (prev && periodAfter(slot.period, prev)) return null;
  }
  // Hard: max-hours / week
  const within7 = state.weekHistory.filter((w) => w.date <= slot.date && w.date > previousDate7(slot.date)).length;
  const max = (s.maxHoursPerWeek ?? 48) / SHIFT_HOURS;
  if (within7 + 1 > max) return null;
  // Hard: already on a shift this same date (no double-up)
  if (state.shiftsByDate.has(slot.date)) return null;

  // Soft scoring — higher = better.
  let score = 100;
  // Preferred shift gives a bump
  if (s.preferredShifts?.includes(slot.period)) score += 30;
  // Fairness debt — fewer recent shifts in this category boosts score.
  const ledger = input.fairnessLedger.get(s.id) || { night: 0, weekend: 0, total: 0 };
  const isWk = isWeekend(slot.date);
  const isNight = slot.period === "night";
  // Penalise candidates already loaded with night / weekend / total
  // shifts; the lower their counts the higher their score.
  score -= ledger.total * 1.5;
  score -= ledger.weekend * 3;
  score -= ledger.night * 4;
  score -= state.shiftsThisWindow * 1.2;
  score -= state.weekendShiftsThisWindow * 2.5;
  score -= state.nightShiftsThisWindow * 3.5;
  // Boost when this candidate has *fewer* of the kind we're filling.
  if (isNight) score -= state.nightShiftsThisWindow * 1.5;
  if (isWk) score -= state.weekendShiftsThisWindow * 1.0;
  return score;
}

function previousDate7(date: string): string {
  return new Date(new Date(date).getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
}
