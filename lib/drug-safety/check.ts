// Rx safety-check engine.
//
// Pure function. Takes a candidate prescription + patient context and
// returns a structured warning list. Caller (the API + UI) decides
// what to do with the warnings; the engine never blocks on its own.
//
// Categories of checks:
//   1. Drug-drug interactions (new vs new, new vs current med)
//   2. Allergy match (new vs allergy list, fuzzy on cross-reactivity)
//   3. Pregnancy contraindication (vs trimester)
//   4. Renal dose advisory (eGFR vs threshold)
//   5. Paediatric / geriatric Beers-style avoid lists
//   6. Duplicate-class warning (same drug prescribed twice in one Rx)
//
// Each warning carries enough metadata that the UI can render a
// styled chip with severity colour, expand to detail/recommendation,
// and pass an "override reason" back to the audit log.

import {
  INTERACTIONS,
  PREGNANCY_CONTRAINDICATED,
  RENAL_RISK,
  PAEDIATRIC_AVOID,
  GERIATRIC_AVOID,
  normaliseDrug,
  type InteractionSeverity,
} from "./interactions-db";
import type {
  PatientSafetyContext,
  PatientAllergy,
} from "./patient-context-store";
import { ageYears } from "./patient-context-store";

export type WarningSeverity = InteractionSeverity;

export type WarningCode =
  | "ddi"            // drug-drug interaction
  | "allergy"        // patient allergy match
  | "cross_reactive" // close-relative allergy match (penicillin → amoxicillin)
  | "pregnancy"      // teratogen / trimester risk
  | "renal"          // dose adjust for eGFR
  | "paediatric"     // age-band avoid
  | "geriatric"      // Beers list avoid
  | "duplicate";     // same drug twice in this Rx

export interface SafetyWarning {
  code: WarningCode;
  severity: WarningSeverity;
  drugs: string[];           // generic names involved
  effect: string;            // short label
  detail: string;            // full explanation
  recommendation: string;    // what to do
  source?: string;
}

export interface RxCheckInput {
  /** Drugs the doctor is about to prescribe. Free-text names allowed
   *  — the engine normalises to generic. */
  newDrugs: Array<{ name: string; strength?: string }>;
  context?: Pick<
    PatientSafetyContext,
    | "dateOfBirth"
    | "weightKg"
    | "egfr"
    | "pregnancyStatus"
    | "pregnancyTrimester"
    | "allergies"
    | "currentMeds"
  >;
}

export interface RxCheckResult {
  warnings: SafetyWarning[];
  /** Highest-severity warning across all checks; null if no issues. */
  worst: WarningSeverity | null;
  /** Count by severity bucket — UI uses this for the summary chip. */
  counts: Record<WarningSeverity, number>;
}

/** Penicillin / cephalosporin-style cross-reactivity classes. Exact
 *  match on the patient's allergy already triggers an "allergy"
 *  warning; this catches "patient is allergic to penicillin and the
 *  doctor just wrote amoxicillin". */
const CROSS_REACT_CLASSES: Record<string, string[]> = {
  penicillin: ["amoxicillin", "ampicillin", "piperacillin", "augmentin", "co-amoxiclav"],
  cephalosporin: ["cefixime", "cefuroxime", "ceftriaxone", "cefpodoxime", "cefotaxime"],
  sulfa: ["cotrimoxazole", "sulfamethoxazole", "sulfasalazine"],
  nsaid: ["ibuprofen", "diclofenac", "naproxen", "nimesulide", "aceclofenac", "ketorolac"],
  macrolide: ["azithromycin", "clarithromycin", "erythromycin", "roxithromycin"],
  quinolone: ["ciprofloxacin", "levofloxacin", "ofloxacin", "moxifloxacin", "norfloxacin"],
  statin: ["atorvastatin", "rosuvastatin", "simvastatin", "pravastatin"],
};

function normaliseAllergyKey(s: string): string {
  return normaliseDrug(s).toLowerCase().trim();
}

function findInteraction(a: string, b: string) {
  for (const rule of INTERACTIONS) {
    if (
      (rule.a === a && rule.b === b) ||
      (rule.a === b && rule.b === a)
    ) {
      return rule;
    }
  }
  return null;
}

function severityRank(s: WarningSeverity): number {
  return { critical: 4, major: 3, moderate: 2, minor: 1 }[s];
}

export function checkRxSafety(input: RxCheckInput): RxCheckResult {
  const warnings: SafetyWarning[] = [];
  const newGenerics = input.newDrugs
    .map((d) => normaliseDrug(d.name))
    .filter(Boolean);
  const currentGenerics = (input.context?.currentMeds || [])
    .map((m) => normaliseDrug(m.drugName))
    .filter(Boolean);
  const allGenerics = Array.from(new Set([...newGenerics, ...currentGenerics]));

  // ── 1. DDI within new + new vs current ──────────────────────────
  for (let i = 0; i < newGenerics.length; i++) {
    for (let j = i + 1; j < newGenerics.length; j++) {
      const r = findInteraction(newGenerics[i], newGenerics[j]);
      if (r) {
        warnings.push({
          code: "ddi",
          severity: r.severity,
          drugs: [newGenerics[i], newGenerics[j]],
          effect: r.effect,
          detail: r.detail,
          recommendation: r.recommendation,
          source: r.source,
        });
      }
    }
    for (const cur of currentGenerics) {
      if (cur === newGenerics[i]) continue;
      const r = findInteraction(newGenerics[i], cur);
      if (r) {
        warnings.push({
          code: "ddi",
          severity: r.severity,
          drugs: [newGenerics[i], cur],
          effect: `${r.effect} (with current med)`,
          detail: r.detail,
          recommendation: r.recommendation,
          source: r.source,
        });
      }
    }
  }

  // ── 2. Allergy match + 2b. cross-reactivity ─────────────────────
  const allergies: PatientAllergy[] = input.context?.allergies || [];
  for (const drug of newGenerics) {
    for (const a of allergies) {
      const aKey = normaliseAllergyKey(a.drugName);
      if (!aKey) continue;
      if (drug === aKey) {
        warnings.push({
          code: "allergy",
          severity: a.severity === "severe" ? "critical" : a.severity === "moderate" ? "major" : "moderate",
          drugs: [drug],
          effect: `Patient allergic to ${drug}`,
          detail: `Documented ${a.severity} reaction${a.reaction ? ` (${a.reaction})` : ""}${a.notes ? `: ${a.notes}` : ""}.`,
          recommendation: "Substitute with a different drug class. Confirm with patient before any rechallenge.",
          source: "Patient record",
        });
        continue;
      }
      // Cross-reactivity: patient says "penicillin"; doctor prescribes "amoxicillin"
      for (const [cls, members] of Object.entries(CROSS_REACT_CLASSES)) {
        const aIsClass = aKey === cls || members.includes(aKey);
        const drugInClass = drug === cls || members.includes(drug);
        if (aIsClass && drugInClass && drug !== aKey) {
          warnings.push({
            code: "cross_reactive",
            severity: a.severity === "severe" ? "major" : "moderate",
            drugs: [drug, aKey],
            effect: `Cross-reactivity risk (${cls} class)`,
            detail: `Patient has documented ${a.severity} reaction to ${aKey}. ${drug} is in the same ${cls} class — cross-reactivity rate is non-trivial.`,
            recommendation: "Confirm tolerance via desensitisation protocol or pick a non-class alternative.",
            source: "Class cross-reactivity heuristic",
          });
        }
      }
    }
  }

  // ── 3. Pregnancy contraindications ──────────────────────────────
  if (input.context?.pregnancyStatus === "pregnant") {
    const tri = input.context.pregnancyTrimester;
    for (const drug of newGenerics) {
      const r = PREGNANCY_CONTRAINDICATED[drug];
      if (!r) continue;
      const trimesterMatches =
        r.trimester === "any" || (tri !== undefined && r.trimester === tri);
      if (!trimesterMatches) continue;
      warnings.push({
        code: "pregnancy",
        severity: r.trimester === "any" ? "critical" : "major",
        drugs: [drug],
        effect: `Pregnancy contraindication${tri ? ` (T${tri})` : ""}`,
        detail: r.note,
        recommendation: "Pick a pregnancy-safe alternative or escalate to obstetrician.",
        source: "FDA / NICE pregnancy categorisation",
      });
    }
  }

  // ── 4. Renal dose advisory ──────────────────────────────────────
  if (typeof input.context?.egfr === "number") {
    for (const drug of newGenerics) {
      const r = RENAL_RISK[drug];
      if (!r) continue;
      if (input.context.egfr <= r.eGFRThreshold) {
        warnings.push({
          code: "renal",
          severity: "major",
          drugs: [drug],
          effect: `Renal impairment — eGFR ${input.context.egfr}`,
          detail: `${drug} requires adjustment when eGFR ≤ ${r.eGFRThreshold}.`,
          recommendation: r.advice,
          source: "Renal dosing guidance",
        });
      }
    }
  }

  // ── 5. Age-band avoid lists ─────────────────────────────────────
  const age = ageYears(input.context?.dateOfBirth);
  if (age !== null) {
    if (age >= 65) {
      for (const drug of newGenerics) {
        const reason = GERIATRIC_AVOID[drug];
        if (!reason) continue;
        warnings.push({
          code: "geriatric",
          severity: "moderate",
          drugs: [drug],
          effect: `Beers list — avoid in ≥65y`,
          detail: reason,
          recommendation: "Pick a safer alternative or document override rationale.",
          source: "AGS Beers Criteria 2023",
        });
      }
    }
    for (const drug of newGenerics) {
      const r = PAEDIATRIC_AVOID[drug];
      if (!r) continue;
      if (age < r.ageYearsBelow) {
        warnings.push({
          code: "paediatric",
          severity: "major",
          drugs: [drug],
          effect: `Avoid in <${r.ageYearsBelow}y (age ${age})`,
          detail: r.reason,
          recommendation: "Use age-appropriate alternative.",
          source: "FDA paediatric label",
        });
      }
    }
  }

  // ── 6. Duplicate-drug check inside the new Rx ───────────────────
  const seen = new Map<string, number>();
  for (const drug of newGenerics) {
    seen.set(drug, (seen.get(drug) || 0) + 1);
  }
  for (const [drug, n] of seen) {
    if (n > 1) {
      warnings.push({
        code: "duplicate",
        severity: "moderate",
        drugs: [drug],
        effect: `${drug} prescribed ${n}× in this Rx`,
        detail: "Duplicate entries are usually a typo — verify the second is intended (e.g. different formulation).",
        recommendation: "Remove the duplicate or rename one entry to differentiate.",
        source: "Engine heuristic",
      });
    }
  }
  // Suppress unused warning on the arg list type.
  void allGenerics;

  // ── Aggregate ───────────────────────────────────────────────────
  const counts: Record<WarningSeverity, number> = {
    critical: 0, major: 0, moderate: 0, minor: 0,
  };
  let worst: WarningSeverity | null = null;
  for (const w of warnings) {
    counts[w.severity]++;
    if (worst === null || severityRank(w.severity) > severityRank(worst)) {
      worst = w.severity;
    }
  }
  // Sort warnings worst-first so the UI renders in priority order.
  warnings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  return { warnings, worst, counts };
}
