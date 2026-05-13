// Wearable → vitals merge.
//
// The /dashboard/vitals page is the patient's "health-snapshot at a
// glance" view. When a patient links a Fitbit/Apple Watch/Mi Band on
// /dashboard/wearables, we want those readings to surface here too
// without a separate UI — so the page shows ONE timeline of vitals
// regardless of source (manual log vs wearable sync).
//
// This module reads from lib/wearables/store and projects the raw
// wearable readings into the VitalReading shape that the vitals API
// returns. The projection is read-only: synthetic ids are prefixed
// with `w-` so the DELETE endpoint can refuse to remove them (you
// delete wearable data by unlinking the device, not by tapping
// "Remove" on a single sparkline point).
//
// Pairing note: BP comes off most wearables as two separate streams
// (bp_systolic + bp_diastolic). We pair them up by exact takenAt
// timestamp before projecting — that's how the cuff devices we've
// integrated against report (same write, two kinds, same timestamp).
// If they're off by even a second they appear as two unpaired
// readings, which still classify correctly even if value2 is
// missing.

import { listReadings as listWearableReadings, type ReadingKind, type WearableReading } from "../wearables/store";
import type { VitalReading, VitalKind } from "./store";
import { VITAL_UNIT } from "./store";

/** Map a wearable reading kind to a vitals kind, or null if it has
 *  no analog in the self-reported vitals world (e.g. steps, sleep
 *  duration — those live on /dashboard/wearables only). */
function kindFor(k: ReadingKind): VitalKind | null {
  switch (k) {
    case "hr_resting":
    case "hr_walking":
    case "hr_max":
      return "heart_rate";
    case "spo2":
      return "spo2";
    case "blood_glucose":
      return "glucose";
    case "weight_kg":
      return "weight";
    case "temperature_c":
      return "temperature";
    case "respiratory_rate":
      return "respiration";
    // bp_systolic / bp_diastolic are handled in the BP pairing pass.
    default:
      return null;
  }
}

/** Returns wearable-sourced readings projected into the VitalReading
 *  shape. The `id` is prefixed `w-<originalId>` so callers can
 *  detect provenance and so DELETE on the vitals API can reject
 *  removal cleanly. */
export function wearableVitalsFor(userId: string): VitalReading[] {
  const raw = listWearableReadings({ userId });
  if (raw.length === 0) return [];

  const out: VitalReading[] = [];

  // Pair BP readings by exact takenAt timestamp. Most cuffs write
  // systolic + diastolic at the same ISO instant.
  const bpByTime = new Map<string, { sys?: WearableReading; dia?: WearableReading }>();
  for (const r of raw) {
    if (r.kind === "bp_systolic" || r.kind === "bp_diastolic") {
      const slot = bpByTime.get(r.takenAt) || {};
      if (r.kind === "bp_systolic") slot.sys = r;
      else slot.dia = r;
      bpByTime.set(r.takenAt, slot);
    }
  }
  for (const [takenAt, pair] of bpByTime.entries()) {
    // Need at least systolic — diastolic is optional (some wrist BP
    // devices only report MAP-derived systolic).
    if (!pair.sys && !pair.dia) continue;
    const primary = pair.sys ?? pair.dia!;
    out.push({
      id: `w-${primary.id}`,
      userId,
      kind: "bp",
      value: pair.sys ? pair.sys.value : pair.dia!.value,
      value2: pair.dia ? pair.dia.value : undefined,
      unit: VITAL_UNIT.bp,
      takenAt,
      createdAt: primary.ingestedAt,
    });
  }

  // Everything else projects 1:1.
  for (const r of raw) {
    if (r.kind === "bp_systolic" || r.kind === "bp_diastolic") continue;
    const vk = kindFor(r.kind);
    if (!vk) continue;
    out.push({
      id: `w-${r.id}`,
      userId,
      kind: vk,
      value: r.value,
      unit: VITAL_UNIT[vk],
      takenAt: r.takenAt,
      createdAt: r.ingestedAt,
    });
  }

  // Newest first to match the manual-vitals ordering.
  out.sort((a, b) => (a.takenAt < b.takenAt ? 1 : -1));
  return out;
}

/** `true` if this id came from a wearable projection. Used by the
 *  vitals DELETE handler to refuse removal. */
export function isWearableVitalId(id: string): boolean {
  return id.startsWith("w-");
}
