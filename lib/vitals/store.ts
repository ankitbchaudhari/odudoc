// Vital signs log.
//
// Patient self-reports vitals between visits. Keep the schema flat —
// one row per reading, the kind tag drives interpretation. Avoids a
// per-metric table explosion when we later add hbA1c, lipid panel
// home-tests, peak flow, etc.
//
// Range hints are deliberately conservative — anything that flips
// "warn" or "critical" surfaces a banner on the dashboard but does
// NOT alert a doctor. Self-reported readings are unreliable; we
// don't want to spam the doctor inbox with patient-side noise.

import { bindPersistentArray } from "../persistent-array";

export type VitalKind =
  | "bp"             // blood pressure: stored as systolic/diastolic
  | "weight"         // kg
  | "glucose"        // mg/dL
  | "heart_rate"     // bpm
  | "temperature"    // °C
  | "spo2"           // %
  | "respiration";   // breaths/min

export type VitalSeverity = "ok" | "warn" | "critical";

export interface VitalReading {
  id: string;
  userId: string;
  kind: VitalKind;
  /** Primary numeric value. For BP, the systolic. */
  value: number;
  /** Secondary value for two-component readings (BP diastolic). */
  value2?: number;
  /** Normalised unit string for display ("mmHg", "kg", "mg/dL", ...). */
  unit: string;
  context?: "fasting" | "post_meal" | "morning" | "evening" | "before_med" | "after_med";
  note?: string;
  takenAt: string;
  createdAt: string;
}

const readings: VitalReading[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<VitalReading>(
  "vitals",
  readings,
  () => []
);
await hydrate();

export const VITAL_LABEL: Record<VitalKind, string> = {
  bp: "Blood pressure",
  weight: "Weight",
  glucose: "Blood glucose",
  heart_rate: "Heart rate",
  temperature: "Temperature",
  spo2: "Oxygen saturation",
  respiration: "Respiration",
};
export const VITAL_UNIT: Record<VitalKind, string> = {
  bp: "mmHg", weight: "kg", glucose: "mg/dL", heart_rate: "bpm",
  temperature: "°C", spo2: "%", respiration: "br/min",
};
export const VITAL_EMOJI: Record<VitalKind, string> = {
  bp: "🩺", weight: "⚖️", glucose: "🩸", heart_rate: "❤️",
  temperature: "🌡️", spo2: "🫁", respiration: "💨",
};

/** Conservative ranges for an adult at rest. Use to flag — not to
 *  diagnose. Pediatrics, athletes, and known-condition patients all
 *  fall outside these and should not be alarmed. */
export function classify(reading: VitalReading): VitalSeverity {
  const v = reading.value;
  const v2 = reading.value2;
  switch (reading.kind) {
    case "bp": {
      // Stage 2 hypertension or hypotensive shock thresholds.
      if (v >= 180 || (v2 !== undefined && v2 >= 120)) return "critical";
      if (v >= 140 || (v2 !== undefined && v2 >= 90)) return "warn";
      if (v < 90 || (v2 !== undefined && v2 < 60)) return "warn";
      return "ok";
    }
    case "glucose": {
      // Random glucose. Fasting/PP context shifts the cut, but we
      // skip that nuance here — the goal is "should I worry?".
      if (v >= 250 || v < 54) return "critical";
      if (v >= 180 || v < 70) return "warn";
      return "ok";
    }
    case "heart_rate": {
      if (v >= 130 || v < 40) return "critical";
      if (v > 100 || v < 50) return "warn";
      return "ok";
    }
    case "temperature": {
      if (v >= 39.5 || v <= 35) return "critical";
      if (v >= 38 || v < 36) return "warn";
      return "ok";
    }
    case "spo2": {
      if (v < 90) return "critical";
      if (v < 95) return "warn";
      return "ok";
    }
    case "respiration": {
      if (v >= 30 || v < 8) return "critical";
      if (v > 20 || v < 12) return "warn";
      return "ok";
    }
    case "weight":
      // No universal range — defer to BMI on the UI side, not here.
      return "ok";
  }
}

export interface AddReadingInput {
  userId: string;
  kind: VitalKind;
  value: number;
  value2?: number;
  context?: VitalReading["context"];
  note?: string;
  takenAt?: string;
}

export function addReading(input: AddReadingInput): VitalReading {
  const at = new Date().toISOString();
  const r: VitalReading = {
    id: `vit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId: input.userId,
    kind: input.kind,
    value: input.value,
    value2: input.value2,
    unit: VITAL_UNIT[input.kind],
    context: input.context,
    note: input.note?.trim() || undefined,
    takenAt: input.takenAt || at,
    createdAt: at,
  };
  readings.unshift(r);
  flush();
  return r;
}

export function listReadings(userId: string, opts: { kind?: VitalKind; limit?: number } = {}): VitalReading[] {
  let list = readings.filter((r) => r.userId === userId);
  if (opts.kind) list = list.filter((r) => r.kind === opts.kind);
  list.sort((a, b) => (a.takenAt < b.takenAt ? 1 : -1));
  if (opts.limit) list = list.slice(0, opts.limit);
  return list;
}

export function deleteReading(id: string, userId: string): boolean {
  const i = readings.findIndex((r) => r.id === id && r.userId === userId);
  if (i < 0) return false;
  tombstone(readings[i].id);
  readings.splice(i, 1);
  flush();
  return true;
}

export function deleteReadingsForUser(userId: string): number {
  let n = 0;
  for (let i = readings.length - 1; i >= 0; i--) {
    if (readings[i].userId === userId) {
      tombstone(readings[i].id);
      readings.splice(i, 1);
      n++;
    }
  }
  if (n) flush();
  return n;
}

/** Latest reading per kind — drives the dashboard summary card. */
export function latestPerKind(userId: string): Record<VitalKind, VitalReading | undefined> {
  const out = {} as Record<VitalKind, VitalReading | undefined>;
  for (const r of readings) {
    if (r.userId !== userId) continue;
    const cur = out[r.kind];
    if (!cur || new Date(r.takenAt) > new Date(cur.takenAt)) out[r.kind] = r;
  }
  return out;
}
