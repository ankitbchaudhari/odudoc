// Slot generation & validation — the single source of truth for "which
// 15-minute appointment slots can this doctor take on this date?".
//
// Rules (product spec):
//   1. Slots are 15 minutes apart (09:00, 09:15, 09:30, …).
//   2. For *today*, slots within the next 30 minutes are hidden. So at
//      09:59 the next visible slot is 10:30. At 10:00 the 10:30 slot
//      disappears (30-minute lead becomes 10:30 exactly → still allowed;
//      strictly > 30 min). Use this same rule for reschedules.
//   3. Slots already booked (awaiting_doctor / approved / in_progress /
//      rescheduled) are removed so two patients can't double-book.
//   4. Doctors without an explicit working window fall back to the
//      hospital-standard 09:00 – 19:00 (with a 13:00–14:00 lunch gap).
//
// The same helper runs on the client (to render the slot grid) and the
// server (to validate bookings + reschedules). Keep the logic framework-
// free so it imports cleanly either side.
//
// Time format: all slot strings are 24-hour "HH:MM". The UI formats them
// into 12-hour labels for display; the wire format stays 24-hour so
// string comparison == chronological comparison.

import type { Consultation } from "./consultations-store";

export const SLOT_INTERVAL_MIN = 15;
export const BOOKING_LEAD_MIN = 30;

// Default clinic hours when a doctor hasn't pinned their own window.
// [start, end) half-open. Lunch gap punched out between `breakStart` and
// `breakEnd` (exclusive end).
export const DEFAULT_WINDOW = {
  start: "09:00",
  end: "19:00",
  breakStart: "13:00",
  breakEnd: "14:00",
};

/** Parse "HH:MM" → minutes-since-midnight. Returns null on bad input. */
export function parseHHMM(s: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** minutes-since-midnight → "HH:MM". */
export function formatHHMM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "HH:MM" → "hh:mm AM/PM" for display. Accepts 24-hour OR legacy
 *  12-hour like "02:00 PM" (pass-through). */
export function toDisplay(s: string): string {
  if (/AM|PM/i.test(s)) return s;
  const mins = parseHHMM(s);
  if (mins === null) return s;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")}\u00A0${suffix}`;
}

/** Is `dateStr` (YYYY-MM-DD) today in the server's local timezone? */
export function isToday(dateStr: string, now: Date = new Date()): boolean {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return dateStr === `${y}-${m}-${d}`;
}

/** Current time as minutes-since-midnight. */
export function currentMinutes(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

/** Slot is "too close to now" and must be hidden per the 30-min lead rule.
 *  Only applies when `dateStr` is today. */
export function isTooClose(
  dateStr: string,
  slotHHMM: string,
  now: Date = new Date()
): boolean {
  if (!isToday(dateStr, now)) return false;
  const slotMin = parseHHMM(slotHHMM);
  if (slotMin === null) return true; // garbage → treat as invalid
  return slotMin - currentMinutes(now) < BOOKING_LEAD_MIN;
}

/** Build the full slot ladder [start, end) stepping by SLOT_INTERVAL_MIN,
 *  minus the lunch gap. Returned strings are 24-hour "HH:MM". */
export function buildSlotLadder(
  window = DEFAULT_WINDOW
): string[] {
  const start = parseHHMM(window.start) ?? 9 * 60;
  const end = parseHHMM(window.end) ?? 19 * 60;
  const bStart = parseHHMM(window.breakStart);
  const bEnd = parseHHMM(window.breakEnd);
  const out: string[] = [];
  for (let t = start; t < end; t += SLOT_INTERVAL_MIN) {
    if (bStart !== null && bEnd !== null && t >= bStart && t < bEnd) continue;
    out.push(formatHHMM(t));
  }
  return out;
}

/** Normalize whatever timeSlot string is stored on a booking/consultation
 *  back to "HH:MM" so we can compare against the ladder. Accepts:
 *    "14:30"        → "14:30"
 *    "02:30 PM"     → "14:30"
 *    "2:30 PM"      → "14:30"
 *  Returns null on anything unrecognizable.
 */
export function normalizeSlot(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  // Already "HH:MM"
  const direct = parseHHMM(s);
  if (direct !== null) return formatHHMM(direct);
  // "hh:mm AM/PM"
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(s);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  const min = Number(m[2]);
  if (/PM/i.test(m[3])) h += 12;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return formatHHMM(h * 60 + min);
}

// Consultation statuses that actively occupy a slot. Cancelled / rejected
// / refunded / completed don't block a future booking for the same slot.
const BLOCKING_STATUSES = new Set([
  "awaiting_doctor",
  "approved",
  "in_progress",
  "rescheduled",
  "pending_payment", // still holds the slot until payment times out
]);

/** Given a list of consultations for a doctor, return the set of
 *  "HH:MM" slots they have already committed for `dateStr`. */
export function bookedSlotsForDate(
  consultations: Consultation[],
  dateStr: string
): Set<string> {
  const taken = new Set<string>();
  for (const c of consultations) {
    if (!BLOCKING_STATUSES.has(c.status)) continue;
    // scheduledFor may be full ISO or YYYY-MM-DD. Accept both.
    const day = (c.scheduledFor || "").slice(0, 10);
    if (day !== dateStr) continue;
    const norm = normalizeSlot(c.timeSlot);
    if (norm) taken.add(norm);
  }
  return taken;
}

export interface SlotView {
  /** Wire format "HH:MM" — send this back to the server when booking. */
  value: string;
  /** Display format "hh:mm AM/PM" — pretty for humans. */
  label: string;
  /** True when a booking on the ladder collided with another record. */
  booked: boolean;
}

/** The main helper: given a doctor's window + their current consultations
 *  + the date the patient wants, return the slots to *show*. Already-
 *  booked and too-close slots are filtered out entirely — spec says they
 *  should "disappear from view", not be greyed out.
 */
export function availableSlots(args: {
  dateStr: string; // YYYY-MM-DD
  consultations: Consultation[];
  window?: typeof DEFAULT_WINDOW;
  now?: Date;
}): SlotView[] {
  const ladder = buildSlotLadder(args.window ?? DEFAULT_WINDOW);
  const taken = bookedSlotsForDate(args.consultations, args.dateStr);
  const now = args.now ?? new Date();

  const out: SlotView[] = [];
  for (const v of ladder) {
    if (taken.has(v)) continue;
    if (isTooClose(args.dateStr, v, now)) continue;
    out.push({ value: v, label: toDisplay(v), booked: false });
  }
  return out;
}

/** Server-side validator run on /api/bookings POST and the reschedule
 *  endpoint. Returns null if valid, or a short human message if not.
 *  Keeps the UI and backend in lockstep — a slot the grid won't render
 *  cannot be accepted via an inspected request either. */
export function validateSlot(args: {
  dateStr: string;
  slot: string; // accepts either format
  consultations: Consultation[];
  window?: typeof DEFAULT_WINDOW;
  now?: Date;
  /** When rescheduling, ignore this consultation's own hold on the slot. */
  ignoreConsultationId?: string;
}): string | null {
  const norm = normalizeSlot(args.slot);
  if (!norm) return "Invalid time format.";

  const ladder = new Set(buildSlotLadder(args.window ?? DEFAULT_WINDOW));
  if (!ladder.has(norm)) return "That time is outside clinic hours.";

  if (isTooClose(args.dateStr, norm, args.now))
    return "Slots within the next 30 minutes are not bookable. Please pick a later time.";

  const others = args.ignoreConsultationId
    ? args.consultations.filter((c) => c.id !== args.ignoreConsultationId)
    : args.consultations;
  const taken = bookedSlotsForDate(others, args.dateStr);
  if (taken.has(norm)) return "That slot was just taken. Please choose another.";

  return null;
}
