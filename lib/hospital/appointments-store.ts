// Appointments / OPD Scheduling. Tenant-scoped.
//
// An Appointment binds a patient to a provider (staff member) at a specific
// time window. Overlap with the same provider's existing appointments is
// blocked. Status machine:
//   scheduled → confirmed → checked_in → in_progress → completed
//   (cancelled or no_show at any point)
//
// Per-org sequential number: APT-{orgSuffix}-{seq}.

import { bindPersistentArray } from "../persistent-array";

export type AppointmentType =
  | "consultation"
  | "follow_up"
  | "procedure"
  | "telemedicine"
  | "vaccination"
  | "lab_review"
  | "other";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Appointment {
  id: string;
  organizationId: string;
  appointmentNumber: string;
  patientId: string;
  providerId: string; // staffId
  type: AppointmentType;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  reason?: string;
  room?: string;
  notes?: string;
  status: AppointmentStatus;
  checkedInAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

const appointments: Appointment[] = [];

const { hydrate, flush } = bindPersistentArray<Appointment>(
  "hospital-appointments",
  appointments,
  () => []
);
await hydrate();

function nextAppointmentNumber(orgId: string): string {
  const suffix = orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
  const n =
    appointments.filter((a) => a.organizationId === orgId).length + 1;
  return `APT-${suffix}-${String(n).padStart(5, "0")}`;
}

function toMillis(date: string, time: string): number {
  return new Date(`${date}T${time}:00`).getTime();
}

function overlapsExisting(
  orgId: string,
  providerId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): Appointment | null {
  const from = toMillis(date, startTime);
  const to = toMillis(date, endTime);
  for (const a of appointments) {
    if (a.organizationId !== orgId) continue;
    if (a.providerId !== providerId) continue;
    if (a.id === excludeId) continue;
    if (a.date !== date) continue;
    if (a.status === "cancelled" || a.status === "no_show") continue;
    const af = toMillis(a.date, a.startTime);
    const at = toMillis(a.date, a.endTime);
    if (from < at && to > af) return a;
  }
  return null;
}

export function listAppointments(opts: {
  organizationId: string;
  patientId?: string;
  providerId?: string;
  status?: AppointmentStatus;
  type?: AppointmentType;
  dateFrom?: string;
  dateTo?: string;
}): Appointment[] {
  let list = appointments.filter(
    (a) => a.organizationId === opts.organizationId
  );
  if (opts.patientId) list = list.filter((a) => a.patientId === opts.patientId);
  if (opts.providerId)
    list = list.filter((a) => a.providerId === opts.providerId);
  if (opts.status) list = list.filter((a) => a.status === opts.status);
  if (opts.type) list = list.filter((a) => a.type === opts.type);
  if (opts.dateFrom) list = list.filter((a) => a.date >= opts.dateFrom!);
  if (opts.dateTo) list = list.filter((a) => a.date <= opts.dateTo!);
  return list.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.startTime.localeCompare(b.startTime);
  });
}

export interface AppointmentInput {
  patientId: string;
  providerId: string;
  type?: AppointmentType;
  date: string;
  startTime: string;
  endTime?: string;
  durationMin?: number;
  reason?: string;
  room?: string;
  notes?: string;
}

function addMinutes(time: string, min: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + min;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export type CreateResult =
  | { ok: true; appointment: Appointment }
  | { ok: false; error: string; conflict?: Appointment };

export function createAppointment(
  organizationId: string,
  input: AppointmentInput
): CreateResult {
  if (!input.patientId || !input.providerId || !input.date || !input.startTime) {
    return { ok: false, error: "missing_fields" };
  }
  const endTime =
    input.endTime || addMinutes(input.startTime, input.durationMin || 15);
  if (toMillis(input.date, endTime) <= toMillis(input.date, input.startTime)) {
    return { ok: false, error: "invalid_time_range" };
  }
  const conflict = overlapsExisting(
    organizationId,
    input.providerId,
    input.date,
    input.startTime,
    endTime
  );
  if (conflict) return { ok: false, error: "slot_conflict", conflict };

  const now = new Date().toISOString();
  const a: Appointment = {
    id: `apt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    appointmentNumber: nextAppointmentNumber(organizationId),
    patientId: input.patientId,
    providerId: input.providerId,
    type: input.type || "consultation",
    date: input.date,
    startTime: input.startTime,
    endTime,
    reason: input.reason?.trim() || undefined,
    room: input.room?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    status: "scheduled",
    createdAt: now,
    updatedAt: now,
  };
  appointments.unshift(a);
  flush();
  return { ok: true, appointment: a };
}

export interface AppointmentPatch {
  type?: AppointmentType;
  date?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  room?: string;
  notes?: string;
  status?: AppointmentStatus;
  cancelReason?: string;
}

export type UpdateResult =
  | { ok: true; appointment: Appointment }
  | { ok: false; error: string; conflict?: Appointment };

export function updateAppointment(
  id: string,
  organizationId: string,
  patch: AppointmentPatch
): UpdateResult {
  const a = appointments.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!a) return { ok: false, error: "not_found" };
  const now = new Date().toISOString();

  const newDate = patch.date ?? a.date;
  const newStart = patch.startTime ?? a.startTime;
  const newEnd = patch.endTime ?? a.endTime;
  if (patch.date || patch.startTime || patch.endTime) {
    if (toMillis(newDate, newEnd) <= toMillis(newDate, newStart)) {
      return { ok: false, error: "invalid_time_range" };
    }
    const conflict = overlapsExisting(
      organizationId,
      a.providerId,
      newDate,
      newStart,
      newEnd,
      a.id
    );
    if (conflict) return { ok: false, error: "slot_conflict", conflict };
    a.date = newDate;
    a.startTime = newStart;
    a.endTime = newEnd;
  }

  if (patch.type !== undefined) a.type = patch.type;
  if (patch.reason !== undefined) a.reason = patch.reason?.trim() || undefined;
  if (patch.room !== undefined) a.room = patch.room?.trim() || undefined;
  if (patch.notes !== undefined) a.notes = patch.notes;
  if (patch.cancelReason !== undefined) a.cancelReason = patch.cancelReason;

  if (patch.status !== undefined) {
    a.status = patch.status;
    if (patch.status === "checked_in" && !a.checkedInAt) a.checkedInAt = now;
    if (patch.status === "in_progress" && !a.startedAt) a.startedAt = now;
    if (patch.status === "completed" && !a.completedAt) a.completedAt = now;
    if (patch.status === "cancelled" && !a.cancelledAt) a.cancelledAt = now;
  }

  a.updatedAt = now;
  flush();
  return { ok: true, appointment: a };
}

export function deleteAppointment(id: string, organizationId: string): boolean {
  const i = appointments.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  appointments.splice(i, 1);
  flush();
  return true;
}

export function deleteAppointmentsForPatient(
  patientId: string,
  organizationId: string
): number {
  let removed = 0;
  for (let i = appointments.length - 1; i >= 0; i--) {
    const a = appointments[i];
    if (a.patientId === patientId && a.organizationId === organizationId) {
      appointments.splice(i, 1);
      removed++;
    }
  }
  if (removed) flush();
  return removed;
}

export function deleteAppointmentsForStaff(
  staffId: string,
  organizationId: string
): number {
  let removed = 0;
  for (let i = appointments.length - 1; i >= 0; i--) {
    const a = appointments[i];
    if (a.providerId === staffId && a.organizationId === organizationId) {
      appointments.splice(i, 1);
      removed++;
    }
  }
  if (removed) flush();
  return removed;
}
