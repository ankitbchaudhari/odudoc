// Clinical pathways — standardised care bundles by diagnosis.
// Spec v6.0 §4 Clinical operations + §7 Quality.
//
// A pathway is a doctor-curated sequence of orders + checkpoints
// for a common diagnosis (CAP, acute MI, AKI, sepsis, stroke).
// When a doctor assigns a pathway to an admission, the EMR
// pre-populates the order set, schedules the checkpoints (e.g.
// "Repeat lactate at 6 h", "Re-image at 24 h"), and surfaces
// deviations on the quality dashboard — drives M&M review.
//
// Seed library covers the highest-volume IPD diagnoses. Hospitals
// can clone + tweak via /admin/clinical-pathways (UI not in this
// MVP — store-only ships in this commit).

export type PathwayDomain = "cardiology" | "pulmonary" | "neurology" | "infectious" | "renal" | "endocrine" | "trauma" | "obstetric" | "general";

export interface PathwayStep {
  /** Time offset from pathway start (hours). 0 = on admission. */
  hours: number;
  /** Human-readable instruction. */
  label: string;
  /** Type of action. UI + automation hook off this. */
  kind: "order" | "vital_check" | "lab" | "imaging" | "drug" | "consult" | "reassess";
  /** Optional canonical ref — drug name / LOINC code / RxNorm. */
  ref?: string;
}

export interface ClinicalPathway {
  id: string;
  title: string;
  diagnosis: string;
  /** ICD-10 hint — used to suggest the pathway on diagnosis entry. */
  icd10?: string;
  domain: PathwayDomain;
  /** One-line description shown on the picker. */
  summary: string;
  /** Step-by-step plan. */
  steps: PathwayStep[];
  /** Optional inclusion / exclusion checks shown before assignment. */
  inclusion?: string[];
  exclusion?: string[];
}

export const PATHWAYS: ClinicalPathway[] = [
  {
    id: "sepsis-3h-1h",
    title: "Sepsis — 1-hour bundle (Surviving Sepsis 2021)",
    diagnosis: "Sepsis / septic shock",
    icd10: "A41.9",
    domain: "infectious",
    summary: "1-hour bundle: lactate, cultures, broad-spectrum antibiotic, IV fluid, vasopressor if MAP <65 after fluid.",
    inclusion: ["Suspected infection + organ dysfunction (qSOFA ≥ 2 or SOFA ≥ 2)"],
    exclusion: ["Comfort-care-only"],
    steps: [
      { hours: 0,    label: "Lactate level",                      kind: "lab",        ref: "2524-7" },
      { hours: 0,    label: "Blood cultures × 2 (before antibiotic)", kind: "lab",     ref: "600-7" },
      { hours: 0,    label: "Broad-spectrum antibiotic IV",        kind: "drug" },
      { hours: 0,    label: "30 mL/kg crystalloid if hypotensive or lactate ≥ 4", kind: "drug" },
      { hours: 1,    label: "Vasopressor (norepinephrine) if MAP < 65 after fluid", kind: "drug" },
      { hours: 6,    label: "Repeat lactate if initial > 2",       kind: "lab",        ref: "2524-7" },
      { hours: 6,    label: "Reassess perfusion",                  kind: "reassess" },
    ],
  },
  {
    id: "ami-stemi",
    title: "Acute MI — STEMI",
    diagnosis: "ST-elevation MI",
    icd10: "I21",
    domain: "cardiology",
    summary: "Aspirin + P2Y12 loading dose, anticoagulation, primary PCI within 90 min (door-to-balloon).",
    inclusion: ["ST elevation ≥ 1 mm in 2 contiguous leads or new LBBB"],
    steps: [
      { hours: 0,    label: "12-lead ECG",                          kind: "vital_check" },
      { hours: 0,    label: "Aspirin 325 mg chew",                  kind: "drug" },
      { hours: 0,    label: "P2Y12 loading (ticagrelor 180 mg or clopidogrel 600 mg)", kind: "drug" },
      { hours: 0,    label: "Unfractionated heparin 60 U/kg IV bolus", kind: "drug" },
      { hours: 0,    label: "Activate cath lab — door-to-balloon < 90 min", kind: "consult" },
      { hours: 0.5,  label: "Troponin (baseline)",                  kind: "lab",        ref: "10839-9" },
      { hours: 6,    label: "Troponin (6 h)",                       kind: "lab",        ref: "10839-9" },
      { hours: 24,   label: "Echo for LV function",                 kind: "imaging" },
    ],
  },
  {
    id: "stroke-ischaemic",
    title: "Acute ischaemic stroke — IV thrombolysis pathway",
    diagnosis: "Acute ischaemic stroke",
    icd10: "I63",
    domain: "neurology",
    summary: "tPA within 4.5 h of onset if no contraindications. Door-to-needle target < 60 min.",
    inclusion: ["Onset < 4.5 h", "NIHSS measured", "Non-contrast CT excludes haemorrhage"],
    exclusion: ["Active bleeding", "Recent major surgery", "Anticoagulant with elevated INR"],
    steps: [
      { hours: 0,    label: "Non-contrast CT brain (STAT)",         kind: "imaging" },
      { hours: 0,    label: "NIHSS scoring",                        kind: "reassess" },
      { hours: 0,    label: "Glucose + INR + PT/aPTT + platelets",  kind: "lab" },
      { hours: 0.75, label: "tPA bolus + infusion if eligible",     kind: "drug" },
      { hours: 1,    label: "BP check q15 min × 2 h",               kind: "vital_check" },
      { hours: 24,   label: "Repeat CT brain",                      kind: "imaging" },
    ],
  },
  {
    id: "cap-iv-2024",
    title: "Community-acquired pneumonia — IV pathway",
    diagnosis: "Community-acquired pneumonia",
    icd10: "J18",
    domain: "pulmonary",
    summary: "CURB-65 stratification, empiric beta-lactam + macrolide, oxygen titration, switch to oral when stable.",
    steps: [
      { hours: 0,    label: "Chest X-ray",                          kind: "imaging" },
      { hours: 0,    label: "Sputum + blood cultures",              kind: "lab" },
      { hours: 0,    label: "Ceftriaxone 2 g IV OD + azithromycin 500 mg IV OD", kind: "drug" },
      { hours: 0,    label: "Oxygen to SpO2 ≥ 94% (88-92% if COPD)", kind: "drug" },
      { hours: 24,   label: "Reassess — switch to oral if stable",  kind: "reassess" },
      { hours: 72,   label: "De-escalate based on cultures",        kind: "reassess" },
    ],
  },
  {
    id: "aki-stage1",
    title: "Acute kidney injury — Stage 1",
    diagnosis: "AKI Stage 1 (KDIGO)",
    icd10: "N17",
    domain: "renal",
    summary: "Stop nephrotoxins, optimise volume, daily creatinine + urine output, identify cause.",
    steps: [
      { hours: 0,    label: "Stop nephrotoxic drugs (NSAIDs, contrast, aminoglycosides)", kind: "drug" },
      { hours: 0,    label: "Volume assessment + balanced crystalloid challenge", kind: "drug" },
      { hours: 0,    label: "Urinalysis + urine electrolytes",      kind: "lab" },
      { hours: 0,    label: "Renal ultrasound to exclude obstruction", kind: "imaging" },
      { hours: 12,   label: "Repeat creatinine + electrolytes",     kind: "lab",       ref: "2160-0" },
      { hours: 24,   label: "Strict urine output charting",         kind: "vital_check" },
      { hours: 24,   label: "Nephrology consult if not improving",  kind: "consult" },
    ],
  },
  {
    id: "dka-adult",
    title: "Diabetic ketoacidosis — adult",
    diagnosis: "DKA",
    icd10: "E11.10",
    domain: "endocrine",
    summary: "IV fluids, insulin infusion, electrolyte correction (K+), hourly glucose + venous gas.",
    steps: [
      { hours: 0,    label: "0.9% NaCl 1 L over 1 h, then titrate", kind: "drug" },
      { hours: 1,    label: "Regular insulin 0.1 U/kg/h IV infusion (after K+ ≥ 3.3)", kind: "drug" },
      { hours: 1,    label: "K+ replacement if < 5.3",              kind: "drug" },
      { hours: 0,    label: "Venous blood gas",                     kind: "lab" },
      { hours: 1,    label: "Bedside glucose hourly",               kind: "vital_check" },
      { hours: 2,    label: "Repeat VBG + electrolytes",            kind: "lab" },
      { hours: 12,   label: "Reassess — anion gap closing",         kind: "reassess" },
    ],
  },
  {
    id: "pph-postpartum",
    title: "Postpartum haemorrhage (PPH)",
    diagnosis: "Postpartum haemorrhage",
    icd10: "O72",
    domain: "obstetric",
    summary: "Call for help, IV access, oxytocin, uterine massage, examine, escalate to surgical management if uncontrolled.",
    steps: [
      { hours: 0,    label: "Call for help — second IV access (16 G)", kind: "consult" },
      { hours: 0,    label: "Oxytocin 10 IU IM + 40 IU in 1 L NS infusion", kind: "drug" },
      { hours: 0,    label: "Uterine massage + bladder catheterisation", kind: "drug" },
      { hours: 0,    label: "Examine — atony, trauma, retained tissue, coagulopathy", kind: "reassess" },
      { hours: 0.25, label: "Carboprost / methergine if atony continues", kind: "drug" },
      { hours: 0.5,  label: "Surgical control if EBL > 1500 mL — bakri balloon / OT", kind: "consult" },
    ],
  },
];

export function listPathways(opts: { domain?: PathwayDomain } = {}): ClinicalPathway[] {
  return opts.domain ? PATHWAYS.filter((p) => p.domain === opts.domain) : PATHWAYS;
}

export function getPathway(id: string): ClinicalPathway | null {
  return PATHWAYS.find((p) => p.id === id) || null;
}

export function suggestPathwaysForDiagnosis(diagnosis: string): ClinicalPathway[] {
  const q = diagnosis.toLowerCase();
  return PATHWAYS.filter((p) =>
    p.diagnosis.toLowerCase().includes(q) ||
    p.title.toLowerCase().includes(q) ||
    (p.icd10 && q.includes(p.icd10.toLowerCase())),
  );
}
