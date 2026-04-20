// Timetable store — Postgres-backed weekly on-duty schedule.
// Admin-managed, independent of each doctor's individual timeSlots.

import { bindPersistentArray } from "./persistent-array";

export type WeekDay =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type TimetableSlot = "morning" | "afternoon" | "evening";

export interface TimetableEntry {
  id: string;
  doctorName: string;
  department: string;
  day: WeekDay;
  timeSlot: TimetableSlot;
  time: string;
  color: string;
  createdAt: string;
}

const entries: TimetableEntry[] = [];
const { hydrate, flush } = bindPersistentArray<TimetableEntry>(
  "timetable",
  entries,
  () => []
);
await hydrate();

const DAY_ORDER: Record<WeekDay, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};
const SLOT_ORDER: Record<TimetableSlot, number> = {
  morning: 0,
  afternoon: 1,
  evening: 2,
};

export function listTimetable(): TimetableEntry[] {
  return [...entries].sort((a, b) => {
    const d = DAY_ORDER[a.day] - DAY_ORDER[b.day];
    if (d !== 0) return d;
    return SLOT_ORDER[a.timeSlot] - SLOT_ORDER[b.timeSlot];
  });
}

export function getTimetableEntryById(id: string): TimetableEntry | null {
  return entries.find((e) => e.id === id) || null;
}

export interface TimetableInput {
  doctorName: string;
  department: string;
  day: WeekDay;
  timeSlot: TimetableSlot;
  time: string;
  color?: string;
}

export function createTimetableEntry(input: TimetableInput): TimetableEntry {
  const e: TimetableEntry = {
    id: `tt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    doctorName: input.doctorName.trim(),
    department: input.department.trim(),
    day: input.day,
    timeSlot: input.timeSlot,
    time: input.time.trim(),
    color: (input.color || "bg-gray-100 text-gray-700 border-gray-200").trim(),
    createdAt: new Date().toISOString(),
  };
  entries.push(e);
  flush();
  return e;
}

export function updateTimetableEntry(id: string, patch: Partial<TimetableInput>): TimetableEntry | null {
  const e = entries.find((x) => x.id === id);
  if (!e) return null;
  if (patch.doctorName !== undefined) e.doctorName = patch.doctorName.trim();
  if (patch.department !== undefined) e.department = patch.department.trim();
  if (patch.day !== undefined) e.day = patch.day;
  if (patch.timeSlot !== undefined) e.timeSlot = patch.timeSlot;
  if (patch.time !== undefined) e.time = patch.time.trim();
  if (patch.color !== undefined) e.color = patch.color.trim();
  flush();
  return e;
}

export function deleteTimetableEntry(id: string): boolean {
  const idx = entries.findIndex((e) => e.id === id);
  if (idx < 0) return false;
  entries.splice(idx, 1);
  flush();
  return true;
}
