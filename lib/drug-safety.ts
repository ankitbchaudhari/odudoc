// Drug safety checker — runs over a doctor's prescription medicines and
// returns a list of warnings the doctor must acknowledge before issuing.
//
// v1 strategy: a curated, hand-maintained rule library covering:
//   1. Common dangerous interactions (warfarin + NSAID, MAOI + SSRI, etc.)
//   2. Class-level contraindications (NSAIDs in CKD, beta-blockers in asthma)
//   3. Pregnancy category D/X drugs flagged when relevant
//   4. Allergy matches against the patient's stated allergies
//
// We deliberately avoid a third-party drug-interaction API for v1 — RxNav
// has no rate-limit-free tier for production traffic, OpenFDA's adverse-
// event endpoint isn't designed for prescription validation, and a small
// curated rule set catches the high-impact combinations our doctors are
// most likely to make. Adding RxNav later is a one-file change.
//
// Severity is advisory, not a hard block. The doctor still owns the
// decision; the UI just makes them tap-through a confirmation when
// `severity === "high"`.

export type Severity = "high" | "medium" | "low";

export interface SafetyWarning {
  id: string;            // stable id so the UI can dedupe + key
  severity: Severity;
  title: string;
  body: string;
  drugs: string[];       // the drug names (lowercase) involved
}

export interface SafetyInput {
  medicines: Array<{ name: string; dose?: string }>;
  patient?: {
    age?: number;
    sex?: "male" | "female" | "other";
    allergies?: string;       // free-text, comma-separated
    pregnant?: boolean;
    breastfeeding?: boolean;
    conditions?: string[];    // e.g. ["asthma", "ckd", "liver disease"]
  };
}

// ---------------------------------------------------------------------------
// Curated rule library. Each entry is a check function that returns 0+ warnings.
// Keep the names case-insensitive — we lowercase everything before matching.
// ---------------------------------------------------------------------------

interface InteractionRule {
  id: string;
  /** Both drug families must appear in the prescription for the warning to fire. */
  a: string[];
  b: string[];
  severity: Severity;
  title: string;
  body: string;
}

// Generic-name + common-brand keywords. Match is "name CONTAINS keyword".
const NSAID = ["ibuprofen", "naproxen", "diclofenac", "ketorolac", "aspirin", "celecoxib", "indomethacin"];
const ANTICOAGULANT = ["warfarin", "apixaban", "rivaroxaban", "dabigatran", "heparin", "enoxaparin"];
const ACE_INHIBITOR = ["lisinopril", "enalapril", "ramipril", "captopril", "perindopril"];
const ARB = ["losartan", "valsartan", "telmisartan", "olmesartan", "irbesartan"];
const SSRI = ["fluoxetine", "sertraline", "paroxetine", "citalopram", "escitalopram"];
const SNRI = ["venlafaxine", "duloxetine", "desvenlafaxine"];
const MAOI = ["phenelzine", "tranylcypromine", "selegiline", "isocarboxazid", "linezolid"];
const TRIPTAN = ["sumatriptan", "rizatriptan", "zolmitriptan", "almotriptan", "eletriptan"];
const STATIN = ["atorvastatin", "simvastatin", "rosuvastatin", "pravastatin", "lovastatin"];
const MACROLIDE = ["clarithromycin", "erythromycin", "azithromycin"];
const FLUOROQUINOLONE = ["ciprofloxacin", "levofloxacin", "moxifloxacin", "ofloxacin"];
const BETA_BLOCKER = ["propranolol", "metoprolol", "atenolol", "bisoprolol", "carvedilol"];
const QT_PROLONGING = [
  ...MACROLIDE, ...FLUOROQUINOLONE,
  "ondansetron", "haloperidol", "amiodarone", "sotalol", "methadone",
];

const INTERACTIONS: InteractionRule[] = [
  {
    id: "nsaid-anticoagulant",
    a: NSAID, b: ANTICOAGULANT,
    severity: "high",
    title: "NSAID + anticoagulant",
    body: "Combining NSAIDs with anticoagulants markedly raises bleeding risk. Prefer paracetamol; if NSAID is essential, consider gastroprotection and shortest course.",
  },
  {
    id: "ssri-snri-maoi",
    a: [...SSRI, ...SNRI], b: MAOI,
    severity: "high",
    title: "Serotonin syndrome risk",
    body: "SSRI/SNRI with MAOI (including linezolid) can cause life-threatening serotonin syndrome. Avoid; allow ≥14-day washout between agents.",
  },
  {
    id: "ssri-snri-triptan",
    a: [...SSRI, ...SNRI], b: TRIPTAN,
    severity: "medium",
    title: "Serotonin syndrome risk",
    body: "Triptans + SSRI/SNRI can trigger serotonin syndrome. Use lowest effective triptan dose; counsel on agitation, hyperthermia, tachycardia.",
  },
  {
    id: "ace-arb-double",
    a: ACE_INHIBITOR, b: ARB,
    severity: "high",
    title: "ACE inhibitor + ARB",
    body: "Dual RAAS blockade increases hyperkalaemia, hypotension, and AKI risk without proven benefit. Pick one.",
  },
  {
    id: "statin-macrolide",
    a: ["simvastatin", "lovastatin", "atorvastatin"],
    b: ["clarithromycin", "erythromycin"],
    severity: "medium",
    title: "Statin + macrolide",
    body: "Macrolides inhibit CYP3A4, raising statin levels and rhabdomyolysis risk. Hold the statin during the antibiotic course or switch to azithromycin.",
  },
  {
    id: "qt-double",
    a: QT_PROLONGING, b: QT_PROLONGING,
    severity: "medium",
    title: "QT prolongation risk",
    body: "Two QT-prolonging drugs together raise torsades-de-pointes risk. Consider alternatives or order an ECG / monitor electrolytes.",
  },
  {
    id: "beta-blocker-asthma",
    // Special-cased below via patient.conditions; rule still listed for completeness.
    a: BETA_BLOCKER, b: BETA_BLOCKER,
    severity: "low",
    title: "Beta-blocker review",
    body: "Confirm dose stacking is intentional.",
  },
];

interface ConditionRule {
  id: string;
  drugs: string[];
  condition: string;
  severity: Severity;
  title: string;
  body: string;
}

const CONDITION_RULES: ConditionRule[] = [
  {
    id: "nsaid-ckd",
    drugs: NSAID, condition: "ckd",
    severity: "high",
    title: "NSAID in CKD",
    body: "NSAIDs reduce renal perfusion. Avoid in CKD (especially eGFR <60); prefer paracetamol.",
  },
  {
    id: "betablocker-asthma",
    drugs: BETA_BLOCKER, condition: "asthma",
    severity: "high",
    title: "Beta-blocker in asthma",
    body: "Non-selective beta-blockers can precipitate bronchospasm. If essential, use a cardioselective agent (bisoprolol/metoprolol) cautiously.",
  },
  {
    id: "metformin-ckd",
    drugs: ["metformin"], condition: "ckd",
    severity: "medium",
    title: "Metformin in CKD",
    body: "Avoid metformin if eGFR <30; reduce dose if 30–45. Stop pre-contrast and during acute illness.",
  },
];

interface PregnancyRule {
  id: string;
  drugs: string[];
  severity: Severity;
  title: string;
  body: string;
}

const PREGNANCY_RULES: PregnancyRule[] = [
  {
    id: "preg-ace-arb",
    drugs: [...ACE_INHIBITOR, ...ARB],
    severity: "high",
    title: "ACE/ARB in pregnancy",
    body: "ACE inhibitors and ARBs are teratogenic — fetal renal failure, oligohydramnios. Switch to labetalol/methyldopa/nifedipine.",
  },
  {
    id: "preg-warfarin",
    drugs: ["warfarin"],
    severity: "high",
    title: "Warfarin in pregnancy",
    body: "Warfarin is teratogenic in the first trimester and causes fetal bleeding later. Switch to LMWH.",
  },
  {
    id: "preg-tetracycline",
    drugs: ["doxycycline", "tetracycline", "minocycline"],
    severity: "high",
    title: "Tetracycline in pregnancy",
    body: "Tetracyclines cause fetal tooth discoloration and inhibit bone growth. Avoid after week 16.",
  },
  {
    id: "preg-isotretinoin",
    drugs: ["isotretinoin"],
    severity: "high",
    title: "Isotretinoin in pregnancy",
    body: "Pregnancy category X — major teratogen. Two negative pregnancy tests + contraception required before any prescription.",
  },
  {
    id: "preg-nsaid-late",
    drugs: NSAID,
    severity: "medium",
    title: "NSAID in late pregnancy",
    body: "Avoid NSAIDs after 20 weeks (oligohydramnios) and especially after 30 weeks (premature ductus closure).",
  },
];

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

function lc(s: string | undefined): string {
  return (s || "").toLowerCase();
}

function matchesAny(name: string, keywords: string[]): boolean {
  const lower = name.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export function checkPrescriptionSafety(input: SafetyInput): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];
  const meds = input.medicines.filter((m) => m.name?.trim());
  const patient = input.patient || {};

  // 1. Pairwise interactions
  for (const rule of INTERACTIONS) {
    const aHits = meds.filter((m) => matchesAny(m.name, rule.a));
    const bHits = meds.filter((m) => matchesAny(m.name, rule.b));
    if (rule.id === "qt-double") {
      // Self-pair rule: needs at least 2 distinct drugs that hit the QT list.
      if (aHits.length >= 2) {
        warnings.push({
          id: rule.id,
          severity: rule.severity,
          title: rule.title,
          body: rule.body,
          drugs: aHits.map((m) => m.name),
        });
      }
      continue;
    }
    if (rule.id === "beta-blocker-asthma") continue; // handled by condition rule
    // For non-self rules, require at least one in A *and* one in B (and not the same drug both sides).
    const aSet = new Set(aHits.map((m) => lc(m.name)));
    const bSet = new Set(bHits.map((m) => lc(m.name)));
    const distinct = [...aSet].some((n) => ![...bSet].every((m) => m === n)) && bSet.size > 0;
    if (aSet.size > 0 && bSet.size > 0 && distinct) {
      warnings.push({
        id: rule.id,
        severity: rule.severity,
        title: rule.title,
        body: rule.body,
        drugs: [...new Set([...aHits, ...bHits].map((m) => m.name))],
      });
    }
  }

  // 2. Patient conditions
  const conditions = (patient.conditions || []).map((c) => c.toLowerCase());
  for (const rule of CONDITION_RULES) {
    if (!conditions.includes(rule.condition)) continue;
    const hits = meds.filter((m) => matchesAny(m.name, rule.drugs));
    if (hits.length > 0) {
      warnings.push({
        id: rule.id,
        severity: rule.severity,
        title: rule.title,
        body: rule.body,
        drugs: hits.map((m) => m.name),
      });
    }
  }

  // 3. Pregnancy / breastfeeding
  if (patient.pregnant) {
    for (const rule of PREGNANCY_RULES) {
      const hits = meds.filter((m) => matchesAny(m.name, rule.drugs));
      if (hits.length > 0) {
        warnings.push({
          id: rule.id,
          severity: rule.severity,
          title: rule.title,
          body: rule.body,
          drugs: hits.map((m) => m.name),
        });
      }
    }
  }

  // 4. Allergies — string-match each medicine name against each allergy token.
  if (patient.allergies?.trim()) {
    const tokens = patient.allergies
      .split(/[,;]/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length >= 3);
    for (const m of meds) {
      const lower = m.name.toLowerCase();
      const hit = tokens.find((t) => lower.includes(t));
      if (hit) {
        warnings.push({
          id: `allergy-${hit}`,
          severity: "high",
          title: "Allergy match",
          body: `Patient reports allergy to "${hit}". ${m.name} matches — confirm before prescribing.`,
          drugs: [m.name],
        });
      }
    }
  }

  return warnings;
}
