// Medical staff & shift roster. Tenant-scoped.
//
// Two entities:
// - StaffMember: person-level record (role, department, qualifications,
//   contact). Distinct from auth users — staff can exist without login.
// - ShiftAssignment: staffId × date × shift-type × (optional) ward/OT
//   anchor. Overlap within the same person on the same day is blocked.
//
// Shift types are templated (morning/evening/night/on_call) but we also
// allow explicit start/end times for custom slots.

import { bindPersistentArray } from "../persistent-array";

// StaffRole now lives in ./staff-roles so client components can
// import it cleanly. Re-export here so existing server-side imports
// from this file keep working.
export type { StaffRole } from "./staff-roles";
export { STAFF_ROLES } from "./staff-roles";
import type { StaffRole } from "./staff-roles";

export type StaffStatus = "active" | "on_leave" | "inactive";

// Module-access catalog lives in its own file so client components
// (notably /admin/staff which is a "use client" page) can import the
// types and constants without dragging the Postgres / persistent-
// array dependency chain into the client bundle. Re-export the
// public surface here so legacy server imports from
// "@/lib/hospital/staff-store" keep working.
export type {
  StaffModuleAccess,
} from "./staff-modules";
export {
  STAFF_MODULE_LABELS,
  STAFF_ROLE_DEFAULT_ACCESS,
  effectiveModuleAccess,
  sanitizeModuleAccess,
} from "./staff-modules";
import type { StaffModuleAccess } from "./staff-modules";
import { sanitizeModuleAccess, STAFF_ROLE_DEFAULT_ACCESS } from "./staff-modules";

export interface StaffMember {
  id: string;
  organizationId: string;
  employeeCode: string; // per-org human-readable ID
  firstName: string;
  lastName: string;
  role: StaffRole;
  specialty?: string; // "Cardiology", "ER", etc.
  department?: string;
  phone?: string;
  email?: string;
  qualifications?: string; // free text: "MBBS, MD (Medicine)"
  licenseNumber?: string;
  dateOfJoining?: string;
  status: StaffStatus;
  notes?: string;
  // Per-module access flags. When omitted (legacy records), treat as
  // STAFF_ROLE_DEFAULT_ACCESS[role] so existing rows behave sensibly.
  moduleAccess?: StaffModuleAccess[];
  createdAt: string;
  updatedAt: string;
}

export type ShiftType = "morning" | "evening" | "night" | "on_call" | "custom";

// Default time windows for templated shift types (local wall-clock).
// Real hospitals vary; these are sensible defaults that the UI can override
// on a per-assignment basis via start/end.
export const SHIFT_DEFAULTS: Record<
  Exclude<ShiftType, "custom">,
  { start: string; end: string }
> = {
  morning: { start: "08:00", end: "14:00" },
  evening: { start: "14:00", end: "20:00" },
  night: { start: "20:00", end: "08:00" }, // crosses midnight
  on_call: { start: "00:00", end: "23:59" },
};

export interface ShiftAssignment {
  id: string;
  organizationId: string;
  staffId: string;
  date: string; // YYYY-MM-DD (shift's primary date)
  shiftType: ShiftType;
  start: string; // HH:mm (wall-clock)
  end: string; // HH:mm
  wardId?: string;
  otId?: string;
  role?: string; // override role for this shift ("Charge nurse", "OT anesthetist")
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const staff: StaffMember[] = [];
const shifts: ShiftAssignment[] = [];

const { hydrate: hydrateStaff, flush: flushStaff } =
  bindPersistentArray<StaffMember>("hospital-staff", staff, () => []);
const { hydrate: hydrateShifts, flush: flushShifts } =
  bindPersistentArray<ShiftAssignment>(
    "hospital-shift-assignments",
    shifts,
    () => []
  );
await hydrateStaff();
await hydrateShifts();

// ──────────────────────────────────────────── staff

function nextEmployeeCode(organizationId: string): string {
  const orgSuffix = organizationId
    .replace(/^org-/, "")
    .slice(0, 4)
    .toUpperCase();
  const n =
    staff.filter((s) => s.organizationId === organizationId).length + 1;
  return `EMP-${orgSuffix}-${String(n).padStart(4, "0")}`;
}

export function listStaff(opts: {
  organizationId: string;
  role?: StaffRole;
  department?: string;
  status?: StaffStatus;
  search?: string;
}): StaffMember[] {
  let list = staff.filter((s) => s.organizationId === opts.organizationId);
  if (opts.role) list = list.filter((s) => s.role === opts.role);
  if (opts.department) list = list.filter((s) => s.department === opts.department);
  if (opts.status) list = list.filter((s) => s.status === opts.status);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.employeeCode.toLowerCase().includes(q) ||
        (s.specialty && s.specialty.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q))
    );
  }
  return list.sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
  );
}

export function getStaffById(
  id: string,
  organizationId: string
): StaffMember | null {
  const s = staff.find((x) => x.id === id);
  if (!s || s.organizationId !== organizationId) return null;
  return s;
}

export interface StaffInput {
  firstName: string;
  lastName: string;
  role: StaffRole;
  specialty?: string;
  department?: string;
  phone?: string;
  email?: string;
  qualifications?: string;
  licenseNumber?: string;
  dateOfJoining?: string;
  status?: StaffStatus;
  notes?: string;
  moduleAccess?: StaffModuleAccess[];
}

export function createStaff(
  organizationId: string,
  input: StaffInput
): StaffMember {
  const now = new Date().toISOString();
  const s: StaffMember = {
    id: `stf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    employeeCode: nextEmployeeCode(organizationId),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    role: input.role,
    specialty: input.specialty?.trim() || undefined,
    department: input.department?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    qualifications: input.qualifications?.trim() || undefined,
    licenseNumber: input.licenseNumber?.trim() || undefined,
    dateOfJoining: input.dateOfJoining,
    status: input.status || "active",
    notes: input.notes?.trim() || undefined,
    // Persist explicit picks; fall back to role-default so a freshly
    // created staff member can immediately use the modules their role
    // would naturally need.
    moduleAccess: Array.isArray(input.moduleAccess)
      ? sanitizeModuleAccess(input.moduleAccess)
      : STAFF_ROLE_DEFAULT_ACCESS[input.role] ?? [],
    createdAt: now,
    updatedAt: now,
  };
  staff.push(s);
  flushStaff();
  return s;
}

export function updateStaff(
  id: string,
  organizationId: string,
  patch: Partial<StaffInput>
): StaffMember | null {
  const s = staff.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!s) return null;
  if (patch.firstName !== undefined) s.firstName = patch.firstName.trim();
  if (patch.lastName !== undefined) s.lastName = patch.lastName.trim();
  if (patch.role !== undefined) s.role = patch.role;
  if (patch.specialty !== undefined) s.specialty = patch.specialty?.trim() || undefined;
  if (patch.department !== undefined) s.department = patch.department?.trim() || undefined;
  if (patch.phone !== undefined) s.phone = patch.phone?.trim() || undefined;
  if (patch.email !== undefined) s.email = patch.email?.trim() || undefined;
  if (patch.qualifications !== undefined) s.qualifications = patch.qualifications?.trim() || undefined;
  if (patch.licenseNumber !== undefined) s.licenseNumber = patch.licenseNumber?.trim() || undefined;
  if (patch.dateOfJoining !== undefined) s.dateOfJoining = patch.dateOfJoining;
  if (patch.status !== undefined) s.status = patch.status;
  if (patch.notes !== undefined) s.notes = patch.notes;
  if (patch.moduleAccess !== undefined) {
    s.moduleAccess = sanitizeModuleAccess(patch.moduleAccess || []);
  }
  s.updatedAt = new Date().toISOString();
  flushStaff();
  return s;
}

export function deleteStaff(id: string, organizationId: string): boolean {
  const i = staff.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  staff.splice(i, 1);
  // Also purge their shifts.
  let removed = 0;
  for (let j = shifts.length - 1; j >= 0; j--) {
    if (
      shifts[j].staffId === id &&
      shifts[j].organizationId === organizationId
    ) {
      shifts.splice(j, 1);
      removed++;
    }
  }
  flushStaff();
  if (removed) flushShifts();
  return true;
}

// ──────────────────────────────────────────── shifts

// Convert HH:mm on a given date to a comparable timestamp. Night shifts
// that "end" earlier than they start are treated as crossing midnight —
// the end is pushed to the next day for overlap math.
function shiftWindow(a: {
  date: string;
  start: string;
  end: string;
}): { from: number; to: number } {
  const from = new Date(`${a.date}T${a.start}:00`).getTime();
  let to = new Date(`${a.date}T${a.end}:00`).getTime();
  if (to <= from) to += 24 * 60 * 60 * 1000;
  return { from, to };
}

function shiftsOverlap(
  a: Pick<ShiftAssignment, "date" | "start" | "end">,
  b: Pick<ShiftAssignment, "date" | "start" | "end">
): boolean {
  const A = shiftWindow(a);
  const B = shiftWindow(b);
  return A.from < B.to && A.to > B.from;
}

export function listShifts(opts: {
  organizationId: string;
  staffId?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;
  shiftType?: ShiftType;
  wardId?: string;
  otId?: string;
}): ShiftAssignment[] {
  let list = shifts.filter((s) => s.organizationId === opts.organizationId);
  if (opts.staffId) list = list.filter((s) => s.staffId === opts.staffId);
  if (opts.shiftType) list = list.filter((s) => s.shiftType === opts.shiftType);
  if (opts.wardId) list = list.filter((s) => s.wardId === opts.wardId);
  if (opts.otId) list = list.filter((s) => s.otId === opts.otId);
  if (opts.dateFrom) list = list.filter((s) => s.date >= opts.dateFrom!);
  if (opts.dateTo) list = list.filter((s) => s.date <= opts.dateTo!);
  return list.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.start.localeCompare(b.start);
  });
}

export interface ShiftInput {
  staffId: string;
  date: string; // YYYY-MM-DD
  shiftType: ShiftType;
  start?: string; // HH:mm; defaults per shiftType
  end?: string;
  wardId?: string;
  otId?: string;
  role?: string;
  notes?: string;
}

export type ShiftResult =
  | { ok: true; shift: ShiftAssignment }
  | { ok: false; error: string };

function resolveWindow(
  shiftType: ShiftType,
  start?: string,
  end?: string
): { start: string; end: string } | null {
  if (shiftType === "custom") {
    if (!start || !end) return null;
    return { start, end };
  }
  const def = SHIFT_DEFAULTS[shiftType];
  return { start: start || def.start, end: end || def.end };
}

export function createShift(
  organizationId: string,
  input: ShiftInput
): ShiftResult {
  const staffMember = staff.find(
    (s) => s.id === input.staffId && s.organizationId === organizationId
  );
  if (!staffMember) return { ok: false, error: "staff_not_found" };
  const win = resolveWindow(input.shiftType, input.start, input.end);
  if (!win) return { ok: false, error: "missing_times" };

  // Overlap check across neighbouring dates (night shifts span midnight).
  const relevantDates = new Set<string>([input.date]);
  // Also check day-before so its possibly-crossing-midnight shift is caught.
  const prev = new Date(`${input.date}T00:00:00`);
  prev.setUTCDate(prev.getUTCDate() - 1);
  relevantDates.add(prev.toISOString().slice(0, 10));

  const candidate = { date: input.date, start: win.start, end: win.end };
  const conflict = shifts.find(
    (s) =>
      s.organizationId === organizationId &&
      s.staffId === input.staffId &&
      relevantDates.has(s.date) &&
      shiftsOverlap(candidate, s)
  );
  if (conflict) return { ok: false, error: "shift_conflict" };

  const now = new Date().toISOString();
  const sh: ShiftAssignment = {
    id: `sh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    staffId: input.staffId,
    date: input.date,
    shiftType: input.shiftType,
    start: win.start,
    end: win.end,
    wardId: input.wardId,
    otId: input.otId,
    role: input.role?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  shifts.push(sh);
  flushShifts();
  return { ok: true, shift: sh };
}

export function updateShift(
  id: string,
  organizationId: string,
  patch: Partial<ShiftInput>
): ShiftResult {
  const sh = shifts.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!sh) return { ok: false, error: "not_found" };

  const shiftType = patch.shiftType ?? sh.shiftType;
  const win = resolveWindow(shiftType, patch.start ?? sh.start, patch.end ?? sh.end);
  if (!win) return { ok: false, error: "missing_times" };
  const date = patch.date ?? sh.date;
  const staffId = patch.staffId ?? sh.staffId;

  const candidate = { date, start: win.start, end: win.end };
  const prev = new Date(`${date}T00:00:00`);
  prev.setUTCDate(prev.getUTCDate() - 1);
  const relevant = new Set<string>([date, prev.toISOString().slice(0, 10)]);
  const conflict = shifts.find(
    (s) =>
      s.id !== id &&
      s.organizationId === organizationId &&
      s.staffId === staffId &&
      relevant.has(s.date) &&
      shiftsOverlap(candidate, s)
  );
  if (conflict) return { ok: false, error: "shift_conflict" };

  sh.staffId = staffId;
  sh.date = date;
  sh.shiftType = shiftType;
  sh.start = win.start;
  sh.end = win.end;
  if (patch.wardId !== undefined) sh.wardId = patch.wardId || undefined;
  if (patch.otId !== undefined) sh.otId = patch.otId || undefined;
  if (patch.role !== undefined) sh.role = patch.role?.trim() || undefined;
  if (patch.notes !== undefined) sh.notes = patch.notes;
  sh.updatedAt = new Date().toISOString();
  flushShifts();
  return { ok: true, shift: sh };
}

export function deleteShift(id: string, organizationId: string): boolean {
  const i = shifts.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  shifts.splice(i, 1);
  flushShifts();
  return true;
}

// On-call lookup: who's on_call today?
export function onCallForDate(
  organizationId: string,
  date: string
): ShiftAssignment[] {
  return shifts.filter(
    (s) =>
      s.organizationId === organizationId &&
      s.date === date &&
      s.shiftType === "on_call"
  );
}
