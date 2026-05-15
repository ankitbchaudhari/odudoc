// Medication adherence log.
//
// Patient sees today's dose schedule (derived from their active
// prescriptions) and marks each dose taken / skipped / late. Each
// row is one dose-event. We don't generate the schedule itself in
// the store — that's a derived view computed at request time off
// the prescription's frequency string ("BID", "TID", "QID", etc.).
// The store only persists the user-driven actions on those doses.

import { bindPersistentArray } from "../persistent-array";

export type DoseAction = "taken" | "skipped";

export interface DoseEvent {
  id: string;
  userId: string;
  rxId: string;
  medIndex: number;     // index into prescription.medications[]
  /** Day of the schedule, ISO date (YYYY-MM-DD). */
  scheduledDate: string;
  /** Slot key — "morning" | "noon" | "evening" | "night" — drives ordering. */
  slot: string;
  action: DoseAction;
  loggedAt: string;
  note?: string;
}

const events: DoseEvent[] = [];
const { hydrate, flush, tombstone, reload } = bindPersistentArray<DoseEvent>(
  "dose_events",
  events,
  () => []
);
await hydrate();

export async function reloadAdherence(): Promise<void> {
  await reload();
}

export interface LogDoseInput {
  userId: string;
  rxId: string;
  medIndex: number;
  scheduledDate: string;
  slot: string;
  action: DoseAction;
  note?: string;
}

export function logDose(input: LogDoseInput): DoseEvent {
  // Same (userId, rxId, medIndex, date, slot) tuple → update in
  // place so the user can flip "taken" → "skipped" without piling
  // duplicate rows.
  const existing = events.find((e) =>
    e.userId === input.userId && e.rxId === input.rxId &&
    e.medIndex === input.medIndex && e.scheduledDate === input.scheduledDate &&
    e.slot === input.slot
  );
  const at = new Date().toISOString();
  if (existing) {
    existing.action = input.action;
    existing.loggedAt = at;
    existing.note = input.note?.trim() || undefined;
    flush();
    return existing;
  }
  const e: DoseEvent = {
    id: `dose-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId: input.userId, rxId: input.rxId, medIndex: input.medIndex,
    scheduledDate: input.scheduledDate, slot: input.slot, action: input.action,
    loggedAt: at, note: input.note?.trim() || undefined,
  };
  events.unshift(e);
  flush();
  return e;
}

export function listDoseEvents(userId: string, opts: { since?: string; rxId?: string } = {}): DoseEvent[] {
  let list = events.filter((e) => e.userId === userId);
  if (opts.since) list = list.filter((e) => e.scheduledDate >= opts.since!);
  if (opts.rxId) list = list.filter((e) => e.rxId === opts.rxId);
  return list.sort((a, b) => (a.scheduledDate < b.scheduledDate ? 1 : -1));
}

export function clearDose(id: string, userId: string): boolean {
  const i = events.findIndex((e) => e.id === id && e.userId === userId);
  if (i < 0) return false;
  tombstone(events[i].id);
  events.splice(i, 1);
  flush();
  return true;
}

export function deleteDoseEventsForUser(userId: string): number {
  let n = 0;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].userId === userId) {
      tombstone(events[i].id);
      events.splice(i, 1);
      n++;
    }
  }
  if (n) flush();
  return n;
}

/**
 * Derive the slot list from a free-text frequency string. Doctors
 * write "BID" / "1-0-1" / "twice daily" / "morning + night" — we
 * normalize all of those into the canonical slot keys.
 */
export function slotsFor(frequency: string): string[] {
  const f = frequency.toLowerCase().trim();
  // 1-0-1 / 1-1-1 / 1-1-1-1 dose pattern (morning-noon-evening[-night])
  const dashed = f.match(/^(\d)\s*[-–]\s*(\d)\s*[-–]\s*(\d)(?:\s*[-–]\s*(\d))?$/);
  if (dashed) {
    const slots: string[] = [];
    if (Number(dashed[1]) > 0) slots.push("morning");
    if (Number(dashed[2]) > 0) slots.push("noon");
    if (Number(dashed[3]) > 0) slots.push("evening");
    if (dashed[4] && Number(dashed[4]) > 0) slots.push("night");
    return slots;
  }
  if (/\b(qid|four times)\b/.test(f)) return ["morning", "noon", "evening", "night"];
  if (/\b(tid|thrice|three times)\b/.test(f)) return ["morning", "noon", "evening"];
  if (/\b(bid|twice|2x|two times)\b/.test(f)) return ["morning", "night"];
  if (/\b(qd|od|once|daily|1x|one time)\b/.test(f)) return ["morning"];
  if (/\b(hs|bedtime|night)\b/.test(f)) return ["night"];
  if (/\b(am|morning)\b/.test(f)) return ["morning"];
  if (/\b(noon|midday)\b/.test(f)) return ["noon"];
  if (/\b(evening|pm)\b/.test(f)) return ["evening"];
  if (/\b(prn|as needed|when required|sos)\b/.test(f)) return [];
  // Default: assume daily morning dose so the row at least appears.
  return ["morning"];
}
