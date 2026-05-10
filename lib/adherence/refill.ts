// Refill-due engine.
//
// Given a patient's active prescriptions and their dose-event log,
// estimate days remaining for each medication and push a refill_due
// notification when supply drops below the threshold.
//
// Estimation model (deliberately rough — reality is a pharmacist's
// call, not the app's):
//   1. Parse prescription duration ("7 days", "1 month", "30 tabs",
//      "2 weeks") into target days.
//   2. days_elapsed = days since rx.createdAt.
//   3. days_remaining = max(0, target - elapsed).
//   4. If days_remaining <= 3 and we haven't fired refill_due for
//      this (rxId, medIndex) in the last 5 days, push.
//
// We don't try to back-out doses-actually-taken because patients
// rarely log every dose perfectly; the calendar-based estimate
// matches what a pharmacy reminder app would do.

import type { PrescriptionRecord } from "../prescriptions-store";
import { pushNotification } from "../notifications/store";
import { findUserByEmail } from "../users-store";
import { listForUser } from "../notifications/store";

const REFILL_THRESHOLD_DAYS = 3;
const REFILL_RENOTIFY_DAYS = 5;

export function parseDurationToDays(s: string): number | null {
  if (!s) return null;
  const t = s.toLowerCase().trim();
  // "30 tabs" / "60 caps" — assume one dose/day if no frequency
  // info; the caller can refine. Keep simple.
  const tabs = t.match(/(\d+)\s*(tabs?|caps?|pills?)/);
  if (tabs) return Number(tabs[1]);

  const num = (m: RegExpMatchArray): number => Number(m[1]);
  let m;
  if ((m = t.match(/(\d+)\s*day/))) return num(m);
  if ((m = t.match(/(\d+)\s*week/))) return num(m) * 7;
  if ((m = t.match(/(\d+)\s*month/))) return num(m) * 30;
  if ((m = t.match(/(\d+)\s*year/))) return num(m) * 365;
  return null;
}


export function daysRemainingForMed(rx: PrescriptionRecord, medIndex: number, now = new Date()): number | null {
  const med = rx.data.medications?.[medIndex];
  if (!med) return null;
  const total = parseDurationToDays(med.duration || "");
  if (total === null) return null;
  const start = new Date(rx.createdAt).getTime();
  const elapsed = Math.floor((now.getTime() - start) / 86400_000);
  return Math.max(0, total - elapsed);
}

/**
 * Walk active prescriptions for one user and fire refill_due
 * notifications where supply is short. Idempotent across the renotify
 * window — if we pushed within the last 5 days, we don't push again.
 */
export async function runRefillCheck(rx: PrescriptionRecord): Promise<number> {
  if (rx.status !== "active") return 0;
  if (!rx.patientEmail) return 0;
  const u = findUserByEmail(rx.patientEmail);
  if (!u) return 0;

  let pushed = 0;
  const now = new Date();
  const recent = listForUser(u.id, { limit: 200 })
    .filter((n) => n.kind === "refill_due");

  rx.data.medications?.forEach((med, i) => {
    const remaining = daysRemainingForMed(rx, i, now);
    if (remaining === null) return;
    if (remaining > REFILL_THRESHOLD_DAYS) return;
    // Have we pushed for this rx+med within the last 5 days?
    const key = `refill:${rx.id}:${i}`;
    const lastPush = recent.find((n) => n.reference === key);
    if (lastPush) {
      const ageDays = (now.getTime() - new Date(lastPush.createdAt).getTime()) / 86400_000;
      if (ageDays < REFILL_RENOTIFY_DAYS) return;
    }
    pushNotification({
      userId: u.id,
      kind: "refill_due",
      severity: remaining === 0 ? "warn" : "info",
      title: remaining === 0
        ? `${med.name} — refill needed`
        : `${med.name} runs out in ${remaining} day${remaining === 1 ? "" : "s"}`,
      body: `Originally prescribed ${med.duration || "for a fixed course"}. Tap to reorder via your pharmacy.`,
      link: "/dashboard/rx-fulfillment",
      reference: key,
    });
    pushed++;
  });
  return pushed;
}
