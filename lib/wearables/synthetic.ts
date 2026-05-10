// Synthetic wearable data generator.
//
// Produces ~30 days of plausible readings for each kind so the demo
// page and onboarding flows have something to render. Patterns are
// deterministic enough that a clinician demoing the product gets a
// consistent story, with a sprinkle of anomalies (one AFib episode,
// one SpO2 drop, a couple of hypertensive days) so the anomaly panel
// fires.
//
// Persona presets cover the three most demoable use cases:
//   - "diabetic_hypertensive" — older adult with poorly-controlled
//      T2DM + hypertension; high-impact for chronic-care narrative
//   - "athlete" — younger fitness user; clean trends
//   - "post_op" — recovering from surgery; sleep / steps gradient

import type { IngestReadingInput, ReadingKind } from "./store";

export type SyntheticPersona = "diabetic_hypertensive" | "athlete" | "post_op";

interface PersonaProfile {
  hr_resting: () => number;
  hr_walking: () => number;
  spo2: () => number;
  bp_systolic: () => number;
  bp_diastolic: () => number;
  blood_glucose: () => number;
  weight_kg: () => number;
  steps: () => number;
  sleep_minutes: () => number;
  anomalies: Array<{ kind: ReadingKind; valueOverride: number; daysAgo: number; context?: Record<string, string | number> }>;
}

function bell(mean: number, sd: number): number {
  // Box–Muller-ish sample. Rounded to 0.1 precision.
  const u1 = Math.random() || 0.0001;
  const u2 = Math.random();
  const r = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.round((mean + r * sd) * 10) / 10;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

const PROFILES: Record<SyntheticPersona, PersonaProfile> = {
  diabetic_hypertensive: {
    hr_resting: () => clamp(bell(82, 6), 65, 105),
    hr_walking: () => clamp(bell(115, 10), 90, 145),
    spo2: () => clamp(bell(95, 1.5), 88, 100),
    bp_systolic: () => clamp(bell(142, 8), 118, 175),
    bp_diastolic: () => clamp(bell(88, 5), 72, 105),
    blood_glucose: () => clamp(bell(168, 35), 70, 320),
    weight_kg: () => clamp(bell(82, 0.4), 78, 86),
    steps: () => Math.round(clamp(bell(4200, 1500), 800, 9000)),
    sleep_minutes: () => Math.round(clamp(bell(345, 45), 240, 480)),
    anomalies: [
      { kind: "ecg_rhythm", valueOverride: 1, daysAgo: 18, context: { class: "afib" } },
      { kind: "spo2", valueOverride: 86, daysAgo: 12 },
      { kind: "blood_glucose", valueOverride: 312, daysAgo: 9 },
      { kind: "blood_glucose", valueOverride: 64, daysAgo: 24 },
    ],
  },
  athlete: {
    hr_resting: () => clamp(bell(54, 4), 42, 68),
    hr_walking: () => clamp(bell(95, 8), 75, 120),
    spo2: () => clamp(bell(98, 0.8), 96, 100),
    bp_systolic: () => clamp(bell(118, 6), 105, 132),
    bp_diastolic: () => clamp(bell(76, 4), 65, 88),
    blood_glucose: () => clamp(bell(95, 12), 75, 120),
    weight_kg: () => clamp(bell(72, 0.3), 70, 74),
    steps: () => Math.round(clamp(bell(11200, 2200), 6000, 18000)),
    sleep_minutes: () => Math.round(clamp(bell(450, 30), 360, 540)),
    anomalies: [],
  },
  post_op: {
    hr_resting: () => clamp(bell(78, 8), 60, 110),
    hr_walking: () => clamp(bell(100, 10), 80, 130),
    spo2: () => clamp(bell(96, 1.2), 90, 100),
    bp_systolic: () => clamp(bell(126, 8), 105, 145),
    bp_diastolic: () => clamp(bell(80, 5), 65, 92),
    blood_glucose: () => clamp(bell(108, 18), 85, 160),
    weight_kg: () => clamp(bell(70, 0.5), 67, 73),
    // Steps gradient — start very low, ramp up over 30 days.
    steps: () => 0, // overridden below
    sleep_minutes: () => Math.round(clamp(bell(420, 50), 300, 540)),
    anomalies: [
      { kind: "hr_resting", valueOverride: 118, daysAgo: 28 },
    ],
  },
};

export interface GenerateInput {
  userId: string;
  dependentId?: string;
  deviceId: string;
  persona: SyntheticPersona;
  days?: number;
}

export function generateSyntheticReadings(input: GenerateInput): IngestReadingInput[] {
  const days = input.days ?? 30;
  const profile = PROFILES[input.persona];
  const readings: IngestReadingInput[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let d = days - 1; d >= 0; d--) {
    const dayStart = now - d * dayMs;
    // Base set per day — daily readings.
    const dailyKinds: Array<{ kind: ReadingKind; offsetH: number; gen: () => number }> = [
      { kind: "hr_resting", offsetH: 7, gen: profile.hr_resting },
      { kind: "spo2", offsetH: 7.5, gen: profile.spo2 },
      { kind: "bp_systolic", offsetH: 8, gen: profile.bp_systolic },
      { kind: "bp_diastolic", offsetH: 8, gen: profile.bp_diastolic },
      { kind: "weight_kg", offsetH: 7.25, gen: profile.weight_kg },
      { kind: "sleep_minutes", offsetH: 9, gen: profile.sleep_minutes },
      { kind: "hr_walking", offsetH: 18, gen: profile.hr_walking },
    ];
    // Steps gradient for post-op.
    let stepsValue: number;
    if (input.persona === "post_op") {
      const ramp = Math.min(1, (days - d) / days);
      stepsValue = Math.round(800 + ramp * 9000 + bell(0, 800));
    } else {
      stepsValue = profile.steps();
    }
    dailyKinds.push({ kind: "steps", offsetH: 23, gen: () => Math.max(0, stepsValue) });
    // Glucose: 3 readings/day for diabetics, 1/day for others.
    const glucCount = input.persona === "diabetic_hypertensive" ? 3 : 1;
    for (let g = 0; g < glucCount; g++) {
      readings.push({
        userId: input.userId,
        dependentId: input.dependentId,
        deviceId: input.deviceId,
        kind: "blood_glucose",
        value: profile.blood_glucose(),
        takenAt: new Date(dayStart + (7 + g * 5) * 60 * 60 * 1000).toISOString(),
      });
    }
    for (const dk of dailyKinds) {
      readings.push({
        userId: input.userId,
        dependentId: input.dependentId,
        deviceId: input.deviceId,
        kind: dk.kind,
        value: dk.gen(),
        takenAt: new Date(dayStart + dk.offsetH * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  // Stamp anomalies, overriding generated values where they collide.
  for (const a of profile.anomalies) {
    readings.push({
      userId: input.userId,
      dependentId: input.dependentId,
      deviceId: input.deviceId,
      kind: a.kind,
      value: a.valueOverride,
      context: a.context,
      takenAt: new Date(now - a.daysAgo * dayMs).toISOString(),
    });
  }

  return readings;
}
