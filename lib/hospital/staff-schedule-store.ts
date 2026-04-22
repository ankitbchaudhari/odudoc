// Staff scheduling / rosters. Tenant-scoped.
// StaffMember (master) + Shift (assignment block). Status: scheduled/confirmed/swap_requested/completed/absent/cancelled.

import { bindPersistentArray } from "../persistent-array";

export type StaffRole =
  | "physician" | "resident" | "nurse" | "charge_nurse" | "cna"
  | "tech" | "pharmacist" | "therapist" | "admin" | "support" | "other";

export type Department =
  | "ed" | "icu" | "or" | "ward" | "maternity" | "pediatrics" | "pharmacy"
  | "lab" | "radiology" | "outpatient" | "admin" | "other";

export type ShiftStatus = "scheduled" | "confirmed" | "swap_requested" | "completed" | "absent" | "cancelled";
export type ShiftType = "day" | "evening" | "night" | "on_call" | "standby";

export interface StaffMember {
  id: string;                          // STF-{suffix}-{seq}
  organizationId: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  department: Department;
  employeeCode?: string;
  phone?: string;
  email?: string;
  license?: string;
  maxHoursPerWeek?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Shift {
  id: string;                          // SHF-{suffix}-{seq}
  organizationId: string;
  staffId: string;
  staffName: string;
  role: StaffRole;
  department: Department;
  shiftType: ShiftType;
  startAt: string;
  endAt: string;
  status: ShiftStatus;
  location?: string;
  note?: string;
  swapWithId?: string;                 // candidate swap partner
  clockIn?: string;
  clockOut?: string;
  createdAt: string;
  updatedAt: string;
}

const staff: StaffMember[] = [];
const shifts: Shift[] = [];

const hS = bindPersistentArray<StaffMember>("staff-members", staff, () => []);
const hF = bindPersistentArray<Shift>("staff-shifts", shifts, () => []);
await hS; await hF;

export const ROLE_LABEL: Record<StaffRole, string> = {
  physician: "Physician", resident: "Resident", nurse: "Nurse", charge_nurse: "Charge nurse",
  cna: "CNA / aide", tech: "Technician", pharmacist: "Pharmacist", therapist: "Therapist",
  admin: "Administrative", support: "Support", other: "Other",
};

export const DEPT_LABEL: Record<Department, string> = {
  ed: "Emergency", icu: "ICU", or: "OR / surgery", ward: "Inpatient ward",
  maternity: "Maternity", pediatrics: "Pediatrics", pharmacy: "Pharmacy",
  lab: "Lab", radiology: "Radiology", outpatient: "Outpatient", admin: "Admin", other: "Other",
};

export const SHIFT_TYPE_LABEL: Record<ShiftType, string> = {
  day: "Day", evening: "Evening", night: "Night", on_call: "On call", standby: "Standby",
};

function suffix(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextStaffId(orgId: string) {
  const p = `STF-${suffix(orgId)}-`;
  const m = staff.filter((x) => x.id.startsWith(p)).reduce((mx, x) => Math.max(mx, Number(x.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}
function nextShiftId(orgId: string) {
  const p = `SHF-${suffix(orgId)}-`;
  const m = shifts.filter((x) => x.id.startsWith(p)).reduce((mx, x) => Math.max(mx, Number(x.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

// ---------- Staff ----------

export function listStaff(opts: { organizationId: string; role?: StaffRole; department?: Department; isActive?: boolean; search?: string }): StaffMember[] {
  const s = opts.search?.toLowerCase();
  return staff.filter((m) => m.organizationId === opts.organizationId)
    .filter((m) => (opts.role ? m.role === opts.role : true))
    .filter((m) => (opts.department ? m.department === opts.department : true))
    .filter((m) => (opts.isActive == null ? true : m.isActive === opts.isActive))
    .filter((m) => (s ? `${m.firstName} ${m.lastName} ${m.employeeCode || ""}`.toLowerCase().includes(s) : true))
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
}

export function createStaff(orgId: string, input: Partial<StaffMember>): { ok: true; staff: StaffMember } | { ok: false; error: string } {
  if (!input.firstName || !input.lastName || !input.role || !input.department) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const m: StaffMember = {
    id: nextStaffId(orgId),
    organizationId: orgId,
    firstName: input.firstName, lastName: input.lastName,
    role: input.role as StaffRole, department: input.department as Department,
    employeeCode: input.employeeCode, phone: input.phone, email: input.email, license: input.license,
    maxHoursPerWeek: input.maxHoursPerWeek, isActive: input.isActive ?? true,
    createdAt: now, updatedAt: now,
  };
  staff.push(m);
  return { ok: true, staff: m };
}

export function updateStaff(id: string, orgId: string, patch: Partial<StaffMember>): StaffMember | null {
  const i = staff.findIndex((m) => m.id === id && m.organizationId === orgId);
  if (i < 0) return null;
  staff.splice(i, 1, { ...staff[i], ...patch, id: staff[i].id, organizationId: staff[i].organizationId, updatedAt: new Date().toISOString() });
  // propagate rename to future shifts
  for (const s of shifts) {
    if (s.organizationId === orgId && s.staffId === id) {
      s.staffName = `${staff[i].firstName} ${staff[i].lastName}`;
    }
  }
  return staff[i];
}

export function deleteStaff(id: string, orgId: string): boolean {
  const i = staff.findIndex((m) => m.id === id && m.organizationId === orgId);
  if (i < 0) return false;
  staff.splice(i, 1);
  // cancel future shifts
  const now = new Date().toISOString();
  for (const s of shifts) {
    if (s.organizationId === orgId && s.staffId === id && s.startAt > now && s.status !== "completed") {
      s.status = "cancelled"; s.updatedAt = now;
    }
  }
  return true;
}

// ---------- Shifts ----------

export function listShifts(opts: { organizationId: string; staffId?: string; department?: Department; status?: ShiftStatus; from?: string; to?: string }): Shift[] {
  return shifts.filter((s) => s.organizationId === opts.organizationId)
    .filter((s) => (opts.staffId ? s.staffId === opts.staffId : true))
    .filter((s) => (opts.department ? s.department === opts.department : true))
    .filter((s) => (opts.status ? s.status === opts.status : true))
    .filter((s) => (opts.from ? s.startAt >= opts.from : true))
    .filter((s) => (opts.to ? s.startAt <= opts.to : true))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function createShift(orgId: string, input: Partial<Shift>): { ok: true; shift: Shift } | { ok: false; error: string } {
  if (!input.staffId || !input.startAt || !input.endAt) return { ok: false, error: "missing_required" };
  const m = staff.find((x) => x.id === input.staffId && x.organizationId === orgId);
  if (!m) return { ok: false, error: "staff_not_found" };
  if (input.endAt <= input.startAt) return { ok: false, error: "invalid_range" };
  // overlap detection
  const conflict = shifts.find((s) =>
    s.organizationId === orgId && s.staffId === input.staffId &&
    s.status !== "cancelled" && s.status !== "absent" &&
    !(s.endAt <= input.startAt! || s.startAt >= input.endAt!)
  );
  if (conflict) return { ok: false, error: `conflict_with_${conflict.id}` };
  const now = new Date().toISOString();
  const sh: Shift = {
    id: nextShiftId(orgId),
    organizationId: orgId,
    staffId: input.staffId!,
    staffName: `${m.firstName} ${m.lastName}`,
    role: m.role, department: input.department || m.department,
    shiftType: (input.shiftType || "day") as ShiftType,
    startAt: input.startAt!, endAt: input.endAt!,
    status: "scheduled",
    location: input.location, note: input.note,
    createdAt: now, updatedAt: now,
  };
  shifts.push(sh);
  return { ok: true, shift: sh };
}

export function updateShift(id: string, orgId: string, patch: Partial<Shift>): Shift | null {
  const i = shifts.findIndex((s) => s.id === id && s.organizationId === orgId);
  if (i < 0) return null;
  const prev = shifts[i];
  const now = new Date().toISOString();
  const next: Shift = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.status === "completed" && prev.status !== "completed" && !next.clockOut) next.clockOut = now;
  shifts[i] = next;
  return next;
}

export function deleteShift(id: string, orgId: string): boolean {
  const i = shifts.findIndex((s) => s.id === id && s.organizationId === orgId);
  if (i < 0) return false;
  shifts.splice(i, 1);
  return true;
}

// ---------- Derived ----------

export function shiftDurationHours(s: Shift): number {
  const ms = new Date(s.endAt).getTime() - new Date(s.startAt).getTime();
  return Math.max(0, Math.round((ms / 3_600_000) * 10) / 10);
}

export function weeklyHours(staffId: string, orgId: string, weekStart: string): number {
  const start = new Date(weekStart).getTime();
  const end = start + 7 * 86_400_000;
  return shifts.filter((s) =>
    s.organizationId === orgId && s.staffId === staffId &&
    s.status !== "cancelled" && s.status !== "absent" &&
    new Date(s.startAt).getTime() >= start && new Date(s.startAt).getTime() < end
  ).reduce((h, s) => h + shiftDurationHours(s), 0);
}

export function computeStats(orgId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - now.getDay())).toISOString();
  const activeStaff = staff.filter((s) => s.organizationId === orgId && s.isActive).length;
  const my = shifts.filter((s) => s.organizationId === orgId);
  const todays = my.filter((s) => s.startAt >= todayStart && s.startAt < todayEnd);
  const onNow = my.filter((s) => s.startAt <= now.toISOString() && s.endAt > now.toISOString() && s.status !== "cancelled" && s.status !== "absent").length;
  const weekShifts = my.filter((s) => s.startAt >= weekStart && s.startAt < weekEnd && s.status !== "cancelled");
  const weekHours = weekShifts.reduce((h, s) => h + shiftDurationHours(s), 0);
  const swapRequests = my.filter((s) => s.status === "swap_requested" && s.startAt >= now.toISOString()).length;
  const absencesWeek = my.filter((s) => s.status === "absent" && s.startAt >= weekStart && s.startAt < weekEnd).length;
  const onCallNow = my.filter((s) => s.shiftType === "on_call" && s.startAt <= now.toISOString() && s.endAt > now.toISOString()).length;

  // overtime: staff with >50h this week
  const perStaff = new Map<string, number>();
  for (const s of weekShifts) perStaff.set(s.staffId, (perStaff.get(s.staffId) || 0) + shiftDurationHours(s));
  let overtime = 0;
  for (const [, h] of perStaff) if (h > 50) overtime++;

  return {
    activeStaff, shiftsToday: todays.length, onNow, onCallNow, weekHours: Math.round(weekHours),
    swapRequests, absencesWeek, overtime,
  };
}
