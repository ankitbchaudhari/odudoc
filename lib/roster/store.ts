// Shift roster — staff, requirements, leave, draft + published rosters,
// fairness ledger, swap requests.
//
// Designed so a single hospital admin can declare:
//   "Every weekday morning needs 2 doctors + 3 nurses + 1 receptionist;
//    weekends need 1 doctor + 2 nurses; nights need 1 doctor + 2 nurses"
//
// And the solver in lib/roster/solver.ts produces a 2-week draft
// roster respecting leave + fairness. Admin reviews, publishes, and
// the staff sees their shifts in /dashboard/my-roster.

import { bindPersistentArray } from "../persistent-array";

export type ShiftPeriod = "morning" | "afternoon" | "evening" | "night";

export type StaffRole =
  | "doctor"
  | "nurse"
  | "receptionist"
  | "lab_tech"
  | "pharmacist"
  | "radiology_tech"
  | "ot_tech";

export interface RosterStaff {
  id: string;
  organizationId: string;
  /** Optional userId — when the staff member also has an OduDoc User
   *  account, they can see their roster on the patient-side dashboard. */
  userId?: string;
  name: string;
  role: StaffRole;
  /** Specialty (cardiology / surgery / paeds) — drives mix rules. */
  specialty?: string;
  email?: string;
  phone?: string;
  /** Max hours/week — driver for rest rules. Default 48. */
  maxHoursPerWeek?: number;
  /** Preferred shifts. Soft constraint; the solver tries to honour. */
  preferredShifts?: ShiftPeriod[];
  /** Blocked shifts (won't even be considered). */
  blockedShifts?: ShiftPeriod[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CoverageRequirement {
  /** "weekday" | "weekend" | "any" — the day-class this rule applies to. */
  dayClass: "weekday" | "weekend" | "any";
  period: ShiftPeriod;
  role: StaffRole;
  /** Minimum staff of that role on duty during this slot. */
  minCount: number;
  /** Optional specialty constraint — at least one staff with this. */
  requiredSpecialty?: string;
}

export interface LeaveRequest {
  id: string;
  organizationId: string;
  staffId: string;
  staffName: string;
  fromDate: string;          // YYYY-MM-DD
  toDate: string;            // YYYY-MM-DD inclusive
  reason?: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewerEmail?: string;
  reviewedAt?: string;
  createdAt: string;
}

export type RosterStatus = "draft" | "published" | "archived";

export interface RosterAssignment {
  staffId: string;
  staffName: string;
  role: StaffRole;
  specialty?: string;
  date: string;               // YYYY-MM-DD
  period: ShiftPeriod;
}

export interface Roster {
  id: string;
  organizationId: string;
  /** Window covered (inclusive). */
  fromDate: string;
  toDate: string;
  status: RosterStatus;
  assignments: RosterAssignment[];
  /** Per-staff totals snapshotted at solve time so the UI can show
   *  "Dr Sharma worked 5 night shifts this 2-week period". */
  workloadSummary: Array<{
    staffId: string;
    staffName: string;
    role: StaffRole;
    totalShifts: number;
    nightShifts: number;
    weekendShifts: number;
  }>;
  /** Constraint-violation report — soft + hard. */
  warnings: Array<{
    severity: "info" | "warn" | "critical";
    message: string;
  }>;
  generatedAt: string;
  publishedAt?: string;
  publishedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SwapRequest {
  id: string;
  organizationId: string;
  rosterId: string;
  /** Originating shift owner. */
  fromStaffId: string;
  fromStaffName: string;
  fromDate: string;
  fromPeriod: ShiftPeriod;
  /** Specific colleague being asked to take it (optional — "open swap"
   *  goes to anyone in the same role pool). */
  toStaffId?: string;
  toStaffName?: string;
  reason?: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  reviewedAt?: string;
  createdAt: string;
}

// ── Persistence ──────────────────────────────────────────────────
const staff: RosterStaff[] = [];
const { hydrate: hydStaff, flush: flushStaff, tombstone: tombStaff } =
  bindPersistentArray<RosterStaff>("roster_staff", staff, () => []);
await hydStaff();

const requirements: CoverageRequirement[] = [];
// Requirements are scoped per org via the Roster row instead of a
// dedicated table, but we expose a per-org register helper. We keep
// requirements inside the Org's coverage policy stored as a
// JSON-backed singleton row in this store.
interface OrgCoveragePolicy {
  id: string;                // == organizationId
  organizationId: string;
  requirements: CoverageRequirement[];
  updatedAt: string;
}
const policies: OrgCoveragePolicy[] = [];
const { hydrate: hydPol, flush: flushPol } =
  bindPersistentArray<OrgCoveragePolicy>("roster_policies", policies, () => []);
await hydPol();

const leaves: LeaveRequest[] = [];
const { hydrate: hydLeave, flush: flushLeave, tombstone: tombLeave } =
  bindPersistentArray<LeaveRequest>("roster_leaves", leaves, () => []);
await hydLeave();

const rosters: Roster[] = [];
const { hydrate: hydRoster, flush: flushRoster, tombstone: tombRoster } =
  bindPersistentArray<Roster>("rosters", rosters, () => []);
await hydRoster();

const swaps: SwapRequest[] = [];
const { hydrate: hydSwap, flush: flushSwap } =
  bindPersistentArray<SwapRequest>("roster_swaps", swaps, () => []);
await hydSwap();

// ── Staff CRUD ───────────────────────────────────────────────────
export function listStaff(organizationId: string): RosterStaff[] {
  return staff
    .filter((s) => s.organizationId === organizationId && s.active)
    .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
}

export function getStaff(id: string): RosterStaff | null {
  return staff.find((s) => s.id === id) || null;
}

export interface UpsertStaffInput {
  organizationId: string;
  name: string;
  role: StaffRole;
  userId?: string;
  specialty?: string;
  email?: string;
  phone?: string;
  maxHoursPerWeek?: number;
  preferredShifts?: ShiftPeriod[];
  blockedShifts?: ShiftPeriod[];
}

export function addStaff(input: UpsertStaffInput): RosterStaff {
  const now = new Date().toISOString();
  const s: RosterStaff = {
    id: `rs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    userId: input.userId,
    name: input.name.trim(),
    role: input.role,
    specialty: input.specialty?.trim() || undefined,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    maxHoursPerWeek: input.maxHoursPerWeek ?? 48,
    preferredShifts: input.preferredShifts || [],
    blockedShifts: input.blockedShifts || [],
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  staff.push(s);
  flushStaff();
  return s;
}

export function updateStaff(id: string, patch: Partial<RosterStaff>): RosterStaff | null {
  const s = staff.find((x) => x.id === id);
  if (!s) return null;
  Object.assign(s, patch);
  s.updatedAt = new Date().toISOString();
  flushStaff();
  return s;
}

export function deactivateStaff(id: string): boolean {
  const s = staff.find((x) => x.id === id);
  if (!s) return false;
  s.active = false;
  s.updatedAt = new Date().toISOString();
  flushStaff();
  return true;
}

export function deleteStaffForOrg(orgId: string): number {
  let n = 0;
  for (let i = staff.length - 1; i >= 0; i--) {
    if (staff[i].organizationId === orgId) {
      tombStaff(staff[i].id);
      staff.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flushStaff();
  return n;
}

// ── Coverage policy ──────────────────────────────────────────────
export function getCoveragePolicy(orgId: string): OrgCoveragePolicy {
  let p = policies.find((x) => x.organizationId === orgId);
  if (!p) {
    p = {
      id: orgId,
      organizationId: orgId,
      requirements: defaultCoverage(),
      updatedAt: new Date().toISOString(),
    };
    policies.push(p);
    flushPol();
  }
  return p;
}

export function setCoveragePolicy(orgId: string, requirements: CoverageRequirement[]): OrgCoveragePolicy {
  const p = getCoveragePolicy(orgId);
  p.requirements = requirements;
  p.updatedAt = new Date().toISOString();
  flushPol();
  return p;
}

function defaultCoverage(): CoverageRequirement[] {
  return [
    // Weekday day shifts — ample staffing for OPD volume
    { dayClass: "weekday", period: "morning",   role: "doctor",       minCount: 2 },
    { dayClass: "weekday", period: "morning",   role: "nurse",        minCount: 3 },
    { dayClass: "weekday", period: "morning",   role: "receptionist", minCount: 1 },
    { dayClass: "weekday", period: "afternoon", role: "doctor",       minCount: 2 },
    { dayClass: "weekday", period: "afternoon", role: "nurse",        minCount: 2 },
    { dayClass: "weekday", period: "evening",   role: "doctor",       minCount: 1 },
    { dayClass: "weekday", period: "evening",   role: "nurse",        minCount: 2 },
    // Nights — leaner
    { dayClass: "any",     period: "night",     role: "doctor",       minCount: 1 },
    { dayClass: "any",     period: "night",     role: "nurse",        minCount: 2 },
    // Weekend day shifts — single doctor coverage
    { dayClass: "weekend", period: "morning",   role: "doctor",       minCount: 1 },
    { dayClass: "weekend", period: "morning",   role: "nurse",        minCount: 2 },
    { dayClass: "weekend", period: "afternoon", role: "doctor",       minCount: 1 },
    { dayClass: "weekend", period: "afternoon", role: "nurse",        minCount: 2 },
    { dayClass: "weekend", period: "evening",   role: "doctor",       minCount: 1 },
    { dayClass: "weekend", period: "evening",   role: "nurse",        minCount: 2 },
  ];
}

// ── Leave ────────────────────────────────────────────────────────
export function listLeaveForOrg(orgId: string): LeaveRequest[] {
  return leaves
    .filter((l) => l.organizationId === orgId)
    .sort((a, b) => b.fromDate.localeCompare(a.fromDate));
}

export function listLeaveForStaff(staffId: string): LeaveRequest[] {
  return leaves
    .filter((l) => l.staffId === staffId)
    .sort((a, b) => b.fromDate.localeCompare(a.fromDate));
}

export interface FileLeaveInput {
  organizationId: string;
  staffId: string;
  staffName: string;
  fromDate: string;
  toDate: string;
  reason?: string;
}

export function fileLeave(input: FileLeaveInput): LeaveRequest {
  const l: LeaveRequest = {
    id: `lv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    staffId: input.staffId,
    staffName: input.staffName,
    fromDate: input.fromDate,
    toDate: input.toDate,
    reason: input.reason?.trim() || undefined,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  leaves.push(l);
  flushLeave();
  return l;
}

export function reviewLeave(
  id: string,
  decision: "approved" | "rejected",
  reviewerEmail: string,
): LeaveRequest | null {
  const l = leaves.find((x) => x.id === id);
  if (!l) return null;
  l.status = decision;
  l.reviewerEmail = reviewerEmail;
  l.reviewedAt = new Date().toISOString();
  flushLeave();
  return l;
}

export function activeLeaveDates(staffId: string): Set<string> {
  const out = new Set<string>();
  for (const l of leaves) {
    if (l.staffId !== staffId) continue;
    if (l.status !== "approved") continue;
    const start = new Date(l.fromDate).getTime();
    const end = new Date(l.toDate).getTime();
    for (let t = start; t <= end; t += 24 * 60 * 60 * 1000) {
      out.add(new Date(t).toISOString().slice(0, 10));
    }
  }
  return out;
}

export function deleteLeavesForOrg(orgId: string): number {
  let n = 0;
  for (let i = leaves.length - 1; i >= 0; i--) {
    if (leaves[i].organizationId === orgId) {
      tombLeave(leaves[i].id);
      leaves.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flushLeave();
  return n;
}

// ── Rosters ──────────────────────────────────────────────────────
export function listRostersForOrg(orgId: string): Roster[] {
  return rosters
    .filter((r) => r.organizationId === orgId)
    .sort((a, b) => b.fromDate.localeCompare(a.fromDate));
}

export function getRoster(id: string): Roster | null {
  return rosters.find((r) => r.id === id) || null;
}

export function listShiftsForStaff(staffId: string): Array<{ rosterId: string; assignment: RosterAssignment; status: RosterStatus; toDate: string }> {
  const out: Array<{ rosterId: string; assignment: RosterAssignment; status: RosterStatus; toDate: string }> = [];
  for (const r of rosters) {
    if (r.status === "archived") continue;
    for (const a of r.assignments) {
      if (a.staffId === staffId) {
        out.push({ rosterId: r.id, assignment: a, status: r.status, toDate: r.toDate });
      }
    }
  }
  return out.sort((a, b) =>
    a.assignment.date.localeCompare(b.assignment.date) ||
    periodOrder(a.assignment.period) - periodOrder(b.assignment.period));
}

function periodOrder(p: ShiftPeriod): number {
  return { morning: 0, afternoon: 1, evening: 2, night: 3 }[p];
}

export interface SaveRosterInput {
  organizationId: string;
  fromDate: string;
  toDate: string;
  assignments: RosterAssignment[];
  warnings: Roster["warnings"];
  workloadSummary: Roster["workloadSummary"];
}

export function saveDraftRoster(input: SaveRosterInput): Roster {
  const now = new Date().toISOString();
  const r: Roster = {
    id: `rost-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    fromDate: input.fromDate,
    toDate: input.toDate,
    status: "draft",
    assignments: input.assignments,
    warnings: input.warnings,
    workloadSummary: input.workloadSummary,
    generatedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  rosters.unshift(r);
  flushRoster();
  return r;
}

export function publishRoster(id: string, publishedBy: string): Roster | null {
  const r = rosters.find((x) => x.id === id);
  if (!r) return null;
  if (r.status !== "draft") return r;
  r.status = "published";
  r.publishedAt = new Date().toISOString();
  r.publishedBy = publishedBy;
  r.updatedAt = r.publishedAt;
  flushRoster();
  return r;
}

export function archiveRoster(id: string): Roster | null {
  const r = rosters.find((x) => x.id === id);
  if (!r) return null;
  r.status = "archived";
  r.updatedAt = new Date().toISOString();
  flushRoster();
  return r;
}

export function deleteRostersForOrg(orgId: string): number {
  let n = 0;
  for (let i = rosters.length - 1; i >= 0; i--) {
    if (rosters[i].organizationId === orgId) {
      tombRoster(rosters[i].id);
      rosters.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flushRoster();
  return n;
}

// ── Swaps ────────────────────────────────────────────────────────
export function listSwapsForOrg(orgId: string): SwapRequest[] {
  return swaps
    .filter((s) => s.organizationId === orgId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listSwapsForStaff(staffId: string): SwapRequest[] {
  return swaps
    .filter((s) => s.fromStaffId === staffId || s.toStaffId === staffId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface RequestSwapInput {
  organizationId: string;
  rosterId: string;
  fromStaffId: string;
  fromStaffName: string;
  fromDate: string;
  fromPeriod: ShiftPeriod;
  toStaffId?: string;
  toStaffName?: string;
  reason?: string;
}

export function requestSwap(input: RequestSwapInput): SwapRequest {
  const s: SwapRequest = {
    id: `sw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    rosterId: input.rosterId,
    fromStaffId: input.fromStaffId,
    fromStaffName: input.fromStaffName,
    fromDate: input.fromDate,
    fromPeriod: input.fromPeriod,
    toStaffId: input.toStaffId,
    toStaffName: input.toStaffName,
    reason: input.reason?.trim() || undefined,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  swaps.push(s);
  flushSwap();
  return s;
}

export function decideSwap(
  id: string,
  decision: "accepted" | "declined" | "cancelled",
): SwapRequest | null {
  const s = swaps.find((x) => x.id === id);
  if (!s) return null;
  s.status = decision;
  s.reviewedAt = new Date().toISOString();
  flushSwap();
  return s;
}

/** Helper for the solver — counts already-stamped night/weekend
 *  shifts in published rosters so fairness picks lagging staff. */
export function fairnessLedger(orgId: string): Map<string, { night: number; weekend: number; total: number }> {
  const out = new Map<string, { night: number; weekend: number; total: number }>();
  for (const r of rosters) {
    if (r.organizationId !== orgId) continue;
    if (r.status === "archived") continue;
    for (const a of r.assignments) {
      const key = a.staffId;
      let ent = out.get(key);
      if (!ent) { ent = { night: 0, weekend: 0, total: 0 }; out.set(key, ent); }
      ent.total++;
      if (a.period === "night") ent.night++;
      const dow = new Date(a.date).getDay();
      if (dow === 0 || dow === 6) ent.weekend++;
    }
  }
  return out;
}
