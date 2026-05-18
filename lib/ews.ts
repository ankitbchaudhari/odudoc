// Early Warning Score (NEWS2). Spec v6.0 §31 Vitals & EWS.
//
// NEWS2 is the Royal College of Physicians' validated track-and-
// trigger score. Six physiological parameters → integer subscore
// 0-3 each → total 0-20+. Higher = sicker. Drives auto-escalation:
//
//   total 0–4   green   monitor 12-hourly
//   total 5–6   amber   monitor 1-hourly, nurse review, consider
//                       MET (medical emergency team) review
//   total 7+    red     continuous monitoring, urgent intensivist
//                       call. Auto-fires Code Blue at 9+.
//   any single 3 amber  even with low total — escalate.
//
// Reference: NICE NG51 + RCP NEWS2 specification.

export type EwsVerdict = "green" | "amber" | "red" | "critical";

export interface VitalSnapshot {
  /** Respiratory rate (breaths/min). */
  rr: number;
  /** SpO2 (%). Scale 1 = standard. We don't model Scale 2 (COPD)
   *  here — clinician overrides via the EMR. */
  spo2: number;
  /** Whether the patient is on supplemental O2 (any device). */
  onOxygen: boolean;
  /** Systolic BP (mmHg). */
  sbp: number;
  /** Heart rate (bpm). */
  hr: number;
  /** Consciousness level on ACVPU scale. Alert / Confusion / Voice
   *  / Pain / Unresponsive. */
  consciousness: "A" | "C" | "V" | "P" | "U";
  /** Temperature (°C). */
  temp: number;
}

export interface EwsResult {
  total: number;
  subscores: {
    rr: number;
    spo2: number;
    oxygen: number;
    sbp: number;
    hr: number;
    consciousness: number;
    temp: number;
  };
  /** Highest single subscore — drives the "any single 3" rule. */
  maxSubscore: number;
  verdict: EwsVerdict;
  /** Human-readable monitor cadence + escalation hint. */
  recommendation: string;
}

function rrScore(rr: number): number {
  if (rr <= 8) return 3;
  if (rr <= 11) return 1;
  if (rr <= 20) return 0;
  if (rr <= 24) return 2;
  return 3;
}
function spo2Score(spo2: number): number {
  if (spo2 <= 91) return 3;
  if (spo2 <= 93) return 2;
  if (spo2 <= 95) return 1;
  return 0;
}
function sbpScore(sbp: number): number {
  if (sbp <= 90) return 3;
  if (sbp <= 100) return 2;
  if (sbp <= 110) return 1;
  if (sbp <= 219) return 0;
  return 3;
}
function hrScore(hr: number): number {
  if (hr <= 40) return 3;
  if (hr <= 50) return 1;
  if (hr <= 90) return 0;
  if (hr <= 110) return 1;
  if (hr <= 130) return 2;
  return 3;
}
function tempScore(t: number): number {
  if (t <= 35) return 3;
  if (t <= 36) return 1;
  if (t <= 38) return 0;
  if (t <= 39) return 1;
  return 2;
}

export function calculateEws(v: VitalSnapshot): EwsResult {
  const subscores = {
    rr: rrScore(v.rr),
    spo2: spo2Score(v.spo2),
    oxygen: v.onOxygen ? 2 : 0,
    sbp: sbpScore(v.sbp),
    hr: hrScore(v.hr),
    consciousness: v.consciousness === "A" ? 0 : 3,
    temp: tempScore(v.temp),
  };
  const total =
    subscores.rr +
    subscores.spo2 +
    subscores.oxygen +
    subscores.sbp +
    subscores.hr +
    subscores.consciousness +
    subscores.temp;
  const maxSubscore = Math.max(...Object.values(subscores));

  let verdict: EwsVerdict;
  let recommendation: string;
  if (total >= 9) {
    verdict = "critical";
    recommendation = "Code Blue. Continuous monitoring. ICU transfer + intensivist immediately.";
  } else if (total >= 7) {
    verdict = "red";
    recommendation = "Urgent intensivist review. Continuous monitoring. Consider ICU.";
  } else if (total >= 5 || maxSubscore === 3) {
    verdict = "amber";
    recommendation = "Hourly observations. Nurse-in-charge review. Consider MET.";
  } else {
    verdict = "green";
    recommendation = "12-hourly observations. Continue routine care.";
  }
  return { total, subscores, maxSubscore, verdict, recommendation };
}
