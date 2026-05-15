// Appointments store — Postgres-backed via bindPersistentArray.

import { bindPersistentArray } from "./persistent-array";
import { pushNotification } from "./notifications/store";
import { findUserByEmail } from "./users-store";

export type AppointmentStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";

export interface Appointment {
  id: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  doctorName: string;
  doctorId?: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const now = () => new Date().toISOString();

const appointments: Appointment[] = [];
const { hydrate, flush, tombstone, reload } = bindPersistentArray<Appointment>(
  "appointments",
  appointments,
  () => {
    const n = now();
    return [
      { id: "a1",  patientName: "John Smith",        doctorName: "Dr. Sarah Johnson", date: "2026-04-13", time: "9:00 AM",  status: "Confirmed", createdAt: n, updatedAt: n },
      { id: "a2",  patientName: "Emily Davis",       doctorName: "Dr. Michael Chen",  date: "2026-04-13", time: "10:30 AM", status: "Pending",   createdAt: n, updatedAt: n },
      { id: "a3",  patientName: "Robert Wilson",     doctorName: "Dr. Priya Patel",   date: "2026-04-13", time: "11:00 AM", status: "Completed", createdAt: n, updatedAt: n },
      { id: "a4",  patientName: "Maria Garcia",      doctorName: "Dr. James Wilson",  date: "2026-04-13", time: "2:00 PM",  status: "Confirmed", createdAt: n, updatedAt: n },
      { id: "a5",  patientName: "David Lee",         doctorName: "Dr. David Brown",   date: "2026-04-13", time: "3:30 PM",  status: "Pending",   createdAt: n, updatedAt: n },
      { id: "a6",  patientName: "Susan Clark",       doctorName: "Dr. Emily Zhang",   date: "2026-04-12", time: "10:00 AM", status: "Completed", createdAt: n, updatedAt: n },
      { id: "a7",  patientName: "James Brown",       doctorName: "Dr. Robert Kumar",  date: "2026-04-12", time: "11:30 AM", status: "Cancelled", createdAt: n, updatedAt: n },
      { id: "a8",  patientName: "Linda Martinez",    doctorName: "Dr. Sarah Johnson", date: "2026-04-12", time: "2:30 PM",  status: "Completed", createdAt: n, updatedAt: n },
      { id: "a9",  patientName: "Michael Taylor",    doctorName: "Dr. Anita Sharma",  date: "2026-04-11", time: "9:30 AM",  status: "Completed", createdAt: n, updatedAt: n },
      { id: "a10", patientName: "Jennifer Anderson", doctorName: "Dr. Michael Chen",  date: "2026-04-11", time: "4:00 PM",  status: "Cancelled", createdAt: n, updatedAt: n },
    ];
  }
);
await hydrate();

export async function reloadAppointments(): Promise<void> {
  await reload();
}

export function listAppointments(opts: { status?: AppointmentStatus | "All"; date?: string } = {}): Appointment[] {
  let list = [...appointments];
  if (opts.status && opts.status !== "All") list = list.filter((a) => a.status === opts.status);
  if (opts.date) list = list.filter((a) => a.date === opts.date);
  return list.sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date < b.date ? 1 : -1));
}

export function getAppointmentById(id: string): Appointment | null {
  return appointments.find((a) => a.id === id) || null;
}

export interface AppointmentInput {
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  doctorName: string;
  doctorId?: string;
  date: string;
  time: string;
  status?: AppointmentStatus;
  notes?: string;
}

export function createAppointment(input: AppointmentInput): Appointment {
  const a: Appointment = {
    id: `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    patientName: input.patientName.trim(),
    patientEmail: input.patientEmail?.trim().toLowerCase(),
    patientPhone: input.patientPhone?.trim(),
    doctorName: input.doctorName.trim(),
    doctorId: input.doctorId,
    date: input.date,
    time: input.time,
    status: input.status || "Pending",
    notes: input.notes,
    createdAt: now(),
    updatedAt: now(),
  };
  appointments.unshift(a);
  flush();
  // Patient-facing confirmation push. Email→userId resolution may
  // miss for unregistered patients (walk-ins / phone bookings) —
  // we silently no-op rather than fail the booking.
  if (a.patientEmail) {
    const u = findUserByEmail(a.patientEmail);
    if (u) {
      pushNotification({
        userId: u.id,
        kind: a.status === "Confirmed" ? "appointment_confirmed" : "appointment_reminder",
        severity: "info",
        title: a.status === "Confirmed" ? "Appointment confirmed" : "Appointment requested",
        body: `${a.doctorName} on ${a.date} at ${a.time}.`,
        link: "/dashboard/consultations",
        reference: `appt:${a.id}:${a.status}`,
      });
    }
  }
  return a;
}

export function updateAppointment(id: string, patch: Partial<AppointmentInput>): Appointment | null {
  const a = appointments.find((x) => x.id === id);
  if (!a) return null;
  if (patch.patientName !== undefined) a.patientName = patch.patientName.trim();
  if (patch.patientEmail !== undefined) a.patientEmail = patch.patientEmail.trim().toLowerCase();
  if (patch.patientPhone !== undefined) a.patientPhone = patch.patientPhone.trim();
  if (patch.doctorName !== undefined) a.doctorName = patch.doctorName.trim();
  if (patch.doctorId !== undefined) a.doctorId = patch.doctorId;
  if (patch.date !== undefined) a.date = patch.date;
  if (patch.time !== undefined) a.time = patch.time;
  const prevStatus = a.status;
  if (patch.status !== undefined) a.status = patch.status;
  if (patch.notes !== undefined) a.notes = patch.notes;
  a.updatedAt = now();
  flush();
  // Status-change notification.
  if (patch.status && patch.status !== prevStatus && a.patientEmail) {
    const u = findUserByEmail(a.patientEmail);
    if (u) {
      const kind = a.status === "Cancelled" ? "appointment_cancelled" : "appointment_confirmed";
      pushNotification({
        userId: u.id, kind,
        severity: a.status === "Cancelled" ? "warn" : "success",
        title: `Appointment ${a.status.toLowerCase()}`,
        body: `${a.doctorName} on ${a.date} at ${a.time}.`,
        link: "/dashboard/consultations",
        reference: `appt:${a.id}:${a.status}`,
      });
    }
  }
  return a;
}

export function setAppointmentStatus(id: string, status: AppointmentStatus): Appointment | null {
  return updateAppointment(id, { status });
}

export function deleteAppointment(id: string): boolean {
  const idx = appointments.findIndex((a) => a.id === id);
  if (idx < 0) return false;
  appointments.splice(idx, 1);
  // Tombstone so the anti-clobber merge in flush() doesn't resurrect
  // the row from Postgres and write it back.
  tombstone(id);
  flush();
  return true;
}
