// Differential-diagnosis ranking engine.
//
// Pure function. Inputs:
//   - chiefComplaint  free text the doctor or triage entered
//   - modifiers       comma- or list-separated symptom keywords
//                     (radiation, diaphoresis, fever, cough, etc.)
//   - vitals          BP/HR/RR/SpO2/Temp snapshot
//   - patient         age, sex
//
// Output:
//   - matchedBucket  which complaint bucket fired (or null)
//   - candidates     ranked DDx with score + rationale
//   - redFlags       fired red flags (already filtered by triggers/vitals)

import {
  findBucket,
  type ComplaintBucket,
  type DDxCandidate,
  type RedFlag,
  type VitalsPredicate,
  type AgeBand,
} from "./differential-db";

export interface DDxVitals {
  systolic?: number;
  diastolic?: number;
  hr?: number;
  rr?: number;
  spo2?: number;
  tempC?: number;
}

export interface DDxInput {
  chiefComplaint: string;
  modifiers?: string[];
  vitals?: DDxVitals;
  ageYears?: number;
  sex?: "male" | "female" | "other";
}

export interface RankedCandidate extends DDxCandidate {
  score: number;
  matchedBoosts: string[];
  matchedPenalties: string[];
}

export interface DDxResult {
  matchedBucket: { id: string } | null;
  candidates: RankedCandidate[];
  redFlags: Array<RedFlag & { firedBy: string[] }>;
}

function ageToBand(years?: number): AgeBand {
  if (years === undefined) return "any";
  if (years < 1) return "infant";
  if (years < 12) return "child";
  if (years < 65) return "adult";
  return "elderly";
}

function vitalsTriggered(vitals: DDxVitals | undefined, preds: VitalsPredicate[] | undefined): string[] {
  if (!vitals || !preds) return [];
  const out: string[] = [];
  for (const p of preds) {
    if (p.kind === "systolic_below" && vitals.systolic !== undefined && vitals.systolic < p.value) {
      out.push(`SBP ${vitals.systolic} < ${p.value}`);
    } else if (p.kind === "systolic_above" && vitals.systolic !== undefined && vitals.systolic > p.value) {
      out.push(`SBP ${vitals.systolic} > ${p.value}`);
    } else if (p.kind === "spo2_below" && vitals.spo2 !== undefined && vitals.spo2 < p.value) {
      out.push(`SpO2 ${vitals.spo2}% < ${p.value}%`);
    } else if (p.kind === "hr_above" && vitals.hr !== undefined && vitals.hr > p.value) {
      out.push(`HR ${vitals.hr} > ${p.value}`);
    } else if (p.kind === "hr_below" && vitals.hr !== undefined && vitals.hr < p.value) {
      out.push(`HR ${vitals.hr} < ${p.value}`);
    } else if (p.kind === "temp_above_c" && vitals.tempC !== undefined && vitals.tempC > p.value) {
      out.push(`Temp ${vitals.tempC}°C > ${p.value}°C`);
    } else if (p.kind === "temp_below_c" && vitals.tempC !== undefined && vitals.tempC < p.value) {
      out.push(`Temp ${vitals.tempC}°C < ${p.value}°C`);
    } else if (p.kind === "rr_above" && vitals.rr !== undefined && vitals.rr > p.value) {
      out.push(`RR ${vitals.rr} > ${p.value}`);
    }
  }
  return out;
}

export function rankDifferential(input: DDxInput): DDxResult {
  const bucket: ComplaintBucket | null = findBucket(input.chiefComplaint);
  if (!bucket) {
    return { matchedBucket: null, candidates: [], redFlags: [] };
  }

  const ageBand = ageToBand(input.ageYears);
  const modSet = new Set(
    (input.modifiers || []).map((m) => m.toLowerCase().trim()).filter(Boolean),
  );
  // Treat modifiers + the complaint text together for boost matching:
  // "thunderclap headache" should boost SAH even if the doctor didn't
  // tag "thunderclap" as a separate modifier.
  const allText = (input.chiefComplaint + " " + Array.from(modSet).join(" ")).toLowerCase();

  const candidates: RankedCandidate[] = [];
  for (const c of bucket.ddx) {
    // Sex / age filters short-circuit.
    if (c.sex && input.sex && c.sex !== "any" && c.sex !== input.sex) continue;
    if (c.ageBand && c.ageBand.length && !c.ageBand.includes(ageBand) && !c.ageBand.includes("any")) continue;

    let score = c.baseScore;
    const matchedBoosts: string[] = [];
    const matchedPenalties: string[] = [];
    if (c.boostIfAny) {
      for (const tok of c.boostIfAny) {
        if (allText.includes(tok.toLowerCase())) {
          score += 15;
          matchedBoosts.push(tok);
        }
      }
    }
    if (c.penaliseIfAny) {
      for (const tok of c.penaliseIfAny) {
        if (allText.includes(tok.toLowerCase())) {
          score -= 25;
          matchedPenalties.push(tok);
        }
      }
    }
    candidates.push({ ...c, score, matchedBoosts, matchedPenalties });
  }
  candidates.sort((a, b) => b.score - a.score);

  // Red flags: a flag fires if any of its symptom triggers are in the
  // input text OR any of its vitals predicates is satisfied.
  const redFlags: Array<RedFlag & { firedBy: string[] }> = [];
  for (const rf of bucket.redFlags) {
    const symHits = (rf.triggers || []).filter((t) => allText.includes(t.toLowerCase()));
    const vitHits = vitalsTriggered(input.vitals, rf.vitalsTrigger);
    const firedBy = [...symHits, ...vitHits];
    if (firedBy.length > 0) {
      redFlags.push({ ...rf, firedBy });
    }
  }
  // Critical first.
  redFlags.sort((a, b) => (a.severity === "critical" ? -1 : 1) - (b.severity === "critical" ? -1 : 1));

  return { matchedBucket: { id: bucket.id }, candidates, redFlags };
}
