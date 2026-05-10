// NEWS2 — Royal College of Physicians National Early Warning Score 2.
//
// Computes a single integer (0–20) representing how unwell a patient
// is right now, based on six vital signs. Aggregate score thresholds
// drive the alert engine:
//
//   0       routine monitoring
//   1–4     low risk — nurse-led check
//   5–6     medium risk — escalate to doctor within an hour
//   ≥7      high risk — emergency response, intensivist on-call
//
// Any single parameter scoring 3 also triggers a "single-parameter
// alarm" regardless of total. Source: RCP NEWS2 reference card.
//
// We accept partial inputs — missing parameters score 0 by
// convention but the result carries a `coverage` % so the UI can flag
// "score may be under-stated".

export interface News2Input {
  /** Respiratory rate /min */
  rr?: number;
  /** SpO2 % — Scale 1 (normal patients). For COPD use spo2Scale2. */
  spo2?: number;
  /** Set true when patient is on O2; bumps score by 2. */
  onOxygen?: boolean;
  /** Systolic blood pressure mmHg. */
  systolic?: number;
  /** Heart rate bpm. */
  hr?: number;
  /** Body temperature °C. */
  tempC?: number;
  /** Consciousness — A (alert) / V (voice) / P (pain) / U (unresponsive). */
  acvpu?: "A" | "V" | "P" | "U";
  /** Use Scale 2 for hypercapnic respiratory failure (COPD). */
  spo2Scale2?: boolean;
}

export interface News2Result {
  total: number;
  /** Risk band derived from total + single-parameter rule. */
  band: "none" | "low" | "medium" | "high";
  /** Per-parameter contributions so the UI can show "RR contributed 3". */
  components: Array<{ kind: string; value: number | string | undefined; score: number }>;
  /** True when any single parameter scored 3. */
  singleParam3: boolean;
  /** Fraction of the 6 parameters that were available [0,1]. */
  coverage: number;
  recommendation: string;
}

function rrScore(rr?: number): number {
  if (rr === undefined) return 0;
  if (rr <= 8) return 3;
  if (rr <= 11) return 1;
  if (rr <= 20) return 0;
  if (rr <= 24) return 2;
  return 3;
}
function spo2ScaleOne(spo2?: number): number {
  if (spo2 === undefined) return 0;
  if (spo2 <= 91) return 3;
  if (spo2 <= 93) return 2;
  if (spo2 <= 95) return 1;
  return 0;
}
function spo2ScaleTwo(spo2?: number, onO2?: boolean): number {
  // Scale 2 (RCP table for COPD targets 88–92%).
  if (spo2 === undefined) return 0;
  if (spo2 <= 83) return 3;
  if (spo2 <= 85) return 2;
  if (spo2 <= 87) return 1;
  if (spo2 <= 92) return 0;
  if (!onO2) return 0;
  if (spo2 <= 94) return 1;
  if (spo2 <= 96) return 2;
  return 3;
}
function bpScore(sbp?: number): number {
  if (sbp === undefined) return 0;
  if (sbp <= 90) return 3;
  if (sbp <= 100) return 2;
  if (sbp <= 110) return 1;
  if (sbp <= 219) return 0;
  return 3;
}
function hrScore(hr?: number): number {
  if (hr === undefined) return 0;
  if (hr <= 40) return 3;
  if (hr <= 50) return 1;
  if (hr <= 90) return 0;
  if (hr <= 110) return 1;
  if (hr <= 130) return 2;
  return 3;
}
function tempScore(tempC?: number): number {
  if (tempC === undefined) return 0;
  if (tempC <= 35) return 3;
  if (tempC <= 36) return 1;
  if (tempC <= 38) return 0;
  if (tempC <= 39) return 1;
  return 2;
}
function acvpuScore(acvpu?: News2Input["acvpu"]): number {
  return !acvpu || acvpu === "A" ? 0 : 3;
}

export function computeNews2(input: News2Input): News2Result {
  const components: News2Result["components"] = [];
  let total = 0;

  const sRr = rrScore(input.rr);
  components.push({ kind: "RR", value: input.rr, score: sRr });
  total += sRr;

  const sSpo2 = input.spo2Scale2 ? spo2ScaleTwo(input.spo2, input.onOxygen) : spo2ScaleOne(input.spo2);
  components.push({ kind: input.spo2Scale2 ? "SpO2 (scale 2)" : "SpO2", value: input.spo2, score: sSpo2 });
  total += sSpo2;

  const sO2 = input.onOxygen ? 2 : 0;
  components.push({ kind: "Air/O2", value: input.onOxygen ? "O2" : "Air", score: sO2 });
  total += sO2;

  const sBp = bpScore(input.systolic);
  components.push({ kind: "SBP", value: input.systolic, score: sBp });
  total += sBp;

  const sHr = hrScore(input.hr);
  components.push({ kind: "HR", value: input.hr, score: sHr });
  total += sHr;

  const sTemp = tempScore(input.tempC);
  components.push({ kind: "Temp", value: input.tempC, score: sTemp });
  total += sTemp;

  const sAcvpu = acvpuScore(input.acvpu);
  components.push({ kind: "ACVPU", value: input.acvpu || "A", score: sAcvpu });
  total += sAcvpu;

  const singleParam3 = components.some((c) => c.score >= 3);
  const provided = [input.rr, input.spo2, input.systolic, input.hr, input.tempC, input.acvpu].filter((v) => v !== undefined).length;
  const coverage = provided / 6;

  let band: News2Result["band"];
  if (total === 0) band = "none";
  else if (singleParam3) band = "high"; // single-param 3 escalates regardless of total
  else if (total >= 7) band = "high";
  else if (total >= 5) band = "medium";
  else band = "low";

  let recommendation: string;
  switch (band) {
    case "none":
      recommendation = "Routine monitoring (every 12 hours).";
      break;
    case "low":
      recommendation = "Minimum 4-6 hourly observations. Nurse-led review.";
      break;
    case "medium":
      recommendation = "Urgent doctor review within 1 hour. Hourly observations. Consider IV fluids + senior input.";
      break;
    case "high":
      recommendation = "EMERGENCY response. Critical-care team activation. Continuous monitoring. Consider HDU/ICU transfer.";
      break;
  }

  return { total, band, components, singleParam3, coverage, recommendation };
}
