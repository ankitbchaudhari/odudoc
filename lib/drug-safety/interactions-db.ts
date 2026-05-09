// Drug-drug interaction & contraindication database.
//
// Curated rule set covering the highest-impact interactions seen in
// the Indian + global outpatient/IPD pharmacopeia. Not exhaustive —
// the goal is to catch the worst-case "this combo can kill someone"
// patterns before a doctor hits Submit on an Rx, not to be a full
// pharmacology textbook. Easy to extend by adding rows below.
//
// Severity scale (mirrors Lexicomp / Micromedex conventions):
//   - "critical"  contraindicated; do not co-prescribe
//   - "major"     significant clinical risk; avoid or monitor closely
//   - "moderate"  meaningful risk; counsel patient or adjust
//   - "minor"     minimal risk; informational
//
// Drug names are stored in lowercase generic form. The matcher
// normalises trade names → generics via DRUG_ALIASES below.
//
// Source attribution lives next to each rule so the Rx-check UI can
// cite a reference back to the prescriber. We use generic citations
// (FDA label, Lexicomp, IPC) rather than fabricated specifics —
// improving citations is its own data project.

export type InteractionSeverity = "critical" | "major" | "moderate" | "minor";

export interface DrugInteraction {
  /** Generic name pair, lowercase. Order doesn't matter — matcher
   *  considers both directions. */
  a: string;
  b: string;
  severity: InteractionSeverity;
  /** Short label shown in the warning chip. */
  effect: string;
  /** Long-form explanation surfaced when the prescriber expands. */
  detail: string;
  /** Suggested mitigation: alternate drug, dose adjustment, monitor. */
  recommendation: string;
  /** Citation key — UI shows the friendly label. */
  source: string;
}

/** Trade name → generic. Keep lowercase. The matcher walks the alias
 *  table once at module load and normalises all rule lookups. */
export const DRUG_ALIASES: Record<string, string> = {
  // Common Indian brand names → generic
  "calpol": "paracetamol",
  "crocin": "paracetamol",
  "dolo": "paracetamol",
  "tylenol": "paracetamol",
  "panadol": "paracetamol",
  "brufen": "ibuprofen",
  "combiflam": "ibuprofen", // also paracetamol; worst-of pick
  "aspirin": "aspirin",
  "ecosprin": "aspirin",
  "disprin": "aspirin",
  "augmentin": "amoxicillin", // amox-clav
  "clavam": "amoxicillin",
  "azithral": "azithromycin",
  "azee": "azithromycin",
  "ciplox": "ciprofloxacin",
  "zifi": "cefixime",
  "taxim-o": "cefixime",
  "monocef": "ceftriaxone",
  "rantac": "ranitidine",
  "pan": "pantoprazole",
  "pantop": "pantoprazole",
  "pantocid": "pantoprazole",
  "omez": "omeprazole",
  "razo": "rabeprazole",
  "ondem": "ondansetron",
  "emeset": "ondansetron",
  "perinorm": "metoclopramide",
  "domstal": "domperidone",
  "ecotrin": "aspirin",
  "lipitor": "atorvastatin",
  "atorva": "atorvastatin",
  "rozat": "rosuvastatin",
  "rosuvas": "rosuvastatin",
  "amaryl": "glimepiride",
  "glycomet": "metformin",
  "glucophage": "metformin",
  "januvia": "sitagliptin",
  "concor": "bisoprolol",
  "metolar": "metoprolol",
  "amlodac": "amlodipine",
  "amlong": "amlodipine",
  "telmikind": "telmisartan",
  "telma": "telmisartan",
  "olmin": "olmesartan",
  "lasix": "furosemide",
  "dytor": "torsemide",
  "deriphyllin": "theophylline",
  "asthalin": "salbutamol",
  "ventolin": "salbutamol",
  "foracort": "formoterol",
  "seroflo": "salmeterol",
  "wikoryl": "paracetamol",
  "alex": "dextromethorphan",
  "ascoril": "ambroxol",
  "okacet": "cetirizine",
  "alerid": "cetirizine",
  "montair": "montelukast",
  "telekast": "montelukast",
  "thyronorm": "levothyroxine",
  "eltroxin": "levothyroxine",
  "sintrom": "warfarin",
  "warf": "warfarin",
  "coumadin": "warfarin",
  "eliquis": "apixaban",
  "xarelto": "rivaroxaban",
  "pradaxa": "dabigatran",
  "clopilet": "clopidogrel",
  "deplatt": "clopidogrel",
  "plavix": "clopidogrel",
  "valium": "diazepam",
  "alprax": "alprazolam",
  "restyl": "alprazolam",
  "xanax": "alprazolam",
  "etizola": "etizolam",
  "tramazac": "tramadol",
  "ultracet": "tramadol",
  "buscopan": "hyoscine",
  "voveran": "diclofenac",
  "diclonac": "diclofenac",
  "nimesulide": "nimesulide",
  "nise": "nimesulide",
  "septran": "cotrimoxazole",
  "bactrim": "cotrimoxazole",
  "flagyl": "metronidazole",
  "metrogyl": "metronidazole",
  "neeri": "neeri", // herbal — leave as-is
  "norflox": "norfloxacin",
  "ofla": "ofloxacin",
  "zithromax": "azithromycin",
  "augmentin duo": "amoxicillin",
};

/** Normalise a free-text drug name to canonical lowercase generic.
 *  Strips strength suffixes ("Crocin 500mg" → "crocin" → "paracetamol"). */
export function normaliseDrug(raw: string): string {
  if (!raw) return "";
  let s = raw.toLowerCase().trim();
  // Strip leading dosage form keywords ("tab.", "cap.", "inj.", "syp.").
  s = s.replace(/^(tab|cap|inj|syp|syrup|tablet|capsule|injection)\.?\s+/i, "");
  // Strip trailing strength like "500mg", "500 mg", "10mg/ml".
  s = s.replace(/\s+\d+(\.\d+)?\s*(mg|mcg|g|ml|iu|units?)(\/\w+)?$/i, "");
  // Collapse multi-spaces.
  s = s.replace(/\s+/g, " ").trim();
  if (DRUG_ALIASES[s]) return DRUG_ALIASES[s];
  // Try matching word-by-word for trade names with "duo" / "plus" / "xr" etc.
  const head = s.split(/\s/)[0];
  if (head && DRUG_ALIASES[head]) return DRUG_ALIASES[head];
  return s;
}

/** Canonical interaction rules. Add freely — duplicates by (a,b) are
 *  fine; the matcher returns all matches so a doctor sees every angle
 *  of risk for a given combo. */
export const INTERACTIONS: DrugInteraction[] = [
  // ── Bleeding-risk combos ────────────────────────────────────────
  {
    a: "warfarin", b: "aspirin", severity: "major",
    effect: "Markedly increased bleeding risk",
    detail: "Concurrent anticoagulant + antiplatelet roughly doubles the risk of major GI and intracranial haemorrhage compared to either alone.",
    recommendation: "Avoid co-prescription unless specifically indicated (recent ACS, mechanical valve). If unavoidable, target lower INR (2.0–2.5) and add PPI cover.",
    source: "FDA label / Chest 2018 antithrombotic guideline",
  },
  {
    a: "warfarin", b: "ibuprofen", severity: "major",
    effect: "GI bleeding risk + INR elevation",
    detail: "NSAIDs displace warfarin from albumin and inhibit platelet function. Bleeding risk rises sharply within 7 days.",
    recommendation: "Use paracetamol for analgesia. If NSAID truly needed, use shortest course + PPI + recheck INR at day 3.",
    source: "Lexicomp",
  },
  {
    a: "warfarin", b: "diclofenac", severity: "major",
    effect: "GI bleeding + INR elevation",
    detail: "Diclofenac shares the NSAID class effect on bleeding plus mild CYP2C9 inhibition.",
    recommendation: "Switch analgesic. Avoid systemic NSAIDs in chronic anticoagulation.",
    source: "Lexicomp",
  },
  {
    a: "clopidogrel", b: "aspirin", severity: "moderate",
    effect: "Additive bleeding risk",
    detail: "DAPT is appropriate after stenting / ACS but otherwise increases major bleeding ~2x vs monotherapy.",
    recommendation: "Confirm indication is current (within 12 months of stent). Avoid routine long-term DAPT.",
    source: "ACC/AHA 2021",
  },
  {
    a: "apixaban", b: "aspirin", severity: "major",
    effect: "Major bleeding risk",
    detail: "Combining a DOAC with an antiplatelet roughly doubles major bleeding compared with the DOAC alone.",
    recommendation: "Drop aspirin unless mandated by recent stent. Re-evaluate at 3 months.",
    source: "AUGUSTUS trial / NEJM 2019",
  },
  {
    a: "rivaroxaban", b: "aspirin", severity: "major",
    effect: "Major bleeding risk",
    detail: "Same DOAC + antiplatelet bleeding risk as apixaban combo.",
    recommendation: "Avoid unless stent-mandated. Add PPI if both required.",
    source: "AUGUSTUS / PIONEER-AF",
  },

  // ── QT prolongation cluster ─────────────────────────────────────
  {
    a: "azithromycin", b: "ondansetron", severity: "major",
    effect: "QT prolongation → torsade",
    detail: "Both drugs prolong QTc. Combined risk of torsades de pointes rises particularly in patients with hypokalaemia or pre-existing QTc > 450ms.",
    recommendation: "Use a non-QT antiemetic (metoclopramide). If unavoidable, ECG before + on day 3.",
    source: "FDA Drug Safety Communication 2013",
  },
  {
    a: "azithromycin", b: "amiodarone", severity: "critical",
    effect: "Severe QT prolongation",
    detail: "Amiodarone alone substantially extends QTc; macrolide on top is a documented torsade trigger.",
    recommendation: "Use doxycycline or amoxicillin-clavulanate for the bacterial indication. Do not co-prescribe.",
    source: "FDA black-box / Lexicomp",
  },
  {
    a: "ciprofloxacin", b: "ondansetron", severity: "moderate",
    effect: "QT prolongation",
    detail: "Fluoroquinolones add to ondansetron's QTc effect.",
    recommendation: "Limit ondansetron to 4mg PRN; consider metoclopramide.",
    source: "Lexicomp",
  },

  // ── ACE/ARB + K-sparing diuretics ───────────────────────────────
  {
    a: "telmisartan", b: "spironolactone", severity: "major",
    effect: "Hyperkalaemia",
    detail: "ACE/ARB + K-sparing diuretic raises serum K significantly, especially with CKD or in elderly.",
    recommendation: "Check baseline K+ + creatinine. Recheck at 1 week + 1 month. Avoid combo if eGFR < 30.",
    source: "RALES / NICE CG106",
  },
  {
    a: "ramipril", b: "spironolactone", severity: "major",
    effect: "Hyperkalaemia",
    detail: "Same mechanism as ARB+spironolactone.",
    recommendation: "Monitor K+; consider lower spironolactone dose (12.5mg).",
    source: "RALES",
  },
  {
    a: "ramipril", b: "potassium chloride", severity: "major",
    effect: "Hyperkalaemia",
    detail: "Direct addition of K-sparing effect + K supplementation can drive serum K above 6.0.",
    recommendation: "Reassess need for KCl supplementation. Consider stopping if no documented hypokalaemia.",
    source: "BNF",
  },

  // ── Statins + macrolides / azoles ───────────────────────────────
  {
    a: "atorvastatin", b: "clarithromycin", severity: "major",
    effect: "Rhabdomyolysis risk",
    detail: "Clarithromycin inhibits CYP3A4, raising statin levels 5-10x. Rhabdomyolysis is a documented outcome.",
    recommendation: "Hold statin for the antibiotic course (typically 5–7 days) or switch to azithromycin.",
    source: "FDA / NEJM 2013",
  },
  {
    a: "simvastatin", b: "clarithromycin", severity: "critical",
    effect: "Rhabdomyolysis",
    detail: "Simvastatin is the most CYP3A4-dependent statin; co-administration is contraindicated by FDA.",
    recommendation: "Do not co-prescribe. Hold simvastatin or use a non-3A4 antibiotic.",
    source: "FDA label",
  },
  {
    a: "atorvastatin", b: "fluconazole", severity: "moderate",
    effect: "Myopathy risk",
    detail: "Fluconazole is a moderate CYP3A4 inhibitor at >200mg/day.",
    recommendation: "Cap atorvastatin at 20mg/day during the antifungal course.",
    source: "Lexicomp",
  },

  // ── Serotonin syndrome ───────────────────────────────────────────
  {
    a: "tramadol", b: "fluoxetine", severity: "major",
    effect: "Serotonin syndrome",
    detail: "Tramadol is a weak SNRI and mu-opioid; combined with SSRIs it can trigger serotonin toxicity (clonus, hyperthermia, autonomic instability).",
    recommendation: "Use a different analgesic (paracetamol, ibuprofen if no contraindication) or pause SSRI.",
    source: "Lexicomp / FDA",
  },
  {
    a: "tramadol", b: "sertraline", severity: "major",
    effect: "Serotonin syndrome",
    detail: "Same mechanism as tramadol+fluoxetine.",
    recommendation: "Avoid co-prescription. Counsel patient on early symptoms (agitation, tremor).",
    source: "FDA Drug Safety Communication 2016",
  },
  {
    a: "linezolid", b: "fluoxetine", severity: "critical",
    effect: "Serotonin syndrome / hypertensive crisis",
    detail: "Linezolid is a reversible MAOI; combined with any SSRI/SNRI it can trigger life-threatening serotonin syndrome.",
    recommendation: "Hold SSRI for 14 days before linezolid (5 weeks for fluoxetine). Use a non-MAOI antibiotic if possible.",
    source: "FDA black-box",
  },

  // ── NSAIDs + ACE/ARB + diuretic (triple whammy → AKI) ────────────
  {
    a: "ibuprofen", b: "ramipril", severity: "moderate",
    effect: "Reduced antihypertensive effect + AKI risk",
    detail: "NSAIDs blunt prostaglandin-mediated renal vasodilation, attenuating ACE-inhibitor effect and risking acute kidney injury especially when combined with diuretics ('triple whammy').",
    recommendation: "Use paracetamol. If NSAID required, limit to <7 days, hydrate, recheck creatinine.",
    source: "BMJ 2013 cohort",
  },
  {
    a: "diclofenac", b: "telmisartan", severity: "moderate",
    effect: "AKI risk + reduced antihypertensive effect",
    detail: "NSAID + ARB shares the triple-whammy risk profile.",
    recommendation: "Switch analgesic; consider topical NSAID for localised pain.",
    source: "BMJ 2013",
  },
  {
    a: "ibuprofen", b: "furosemide", severity: "moderate",
    effect: "Reduced diuretic effect + AKI risk",
    detail: "NSAIDs attenuate loop-diuretic natriuresis and can precipitate decompensation in CHF.",
    recommendation: "Avoid NSAIDs in heart failure or volume-overload patients.",
    source: "Lexicomp",
  },

  // ── Hypoglycaemia ───────────────────────────────────────────────
  {
    a: "metformin", b: "alcohol", severity: "moderate",
    effect: "Lactic acidosis risk",
    detail: "Heavy alcohol with metformin increases the rare but fatal lactic acidosis risk; also potentiates hypoglycaemia.",
    recommendation: "Counsel patient. Hold metformin during binge episodes / acute illness with vomiting.",
    source: "FDA label",
  },
  {
    a: "glimepiride", b: "fluconazole", severity: "moderate",
    effect: "Hypoglycaemia",
    detail: "Fluconazole inhibits CYP2C9, raising sulfonylurea levels.",
    recommendation: "Reduce glimepiride dose by 50% during antifungal course; warn patient about hypo symptoms.",
    source: "Lexicomp",
  },

  // ── Theophylline + ciprofloxacin ─────────────────────────────────
  {
    a: "theophylline", b: "ciprofloxacin", severity: "major",
    effect: "Theophylline toxicity",
    detail: "Ciprofloxacin inhibits CYP1A2, raising theophylline levels 2-3x. Risk of seizures, arrhythmias.",
    recommendation: "Use levofloxacin or a non-quinolone instead. If unavoidable, halve theophylline + monitor levels.",
    source: "FDA label",
  },

  // ── PDE5 + nitrate ───────────────────────────────────────────────
  {
    a: "sildenafil", b: "isosorbide mononitrate", severity: "critical",
    effect: "Severe hypotension",
    detail: "PDE5 inhibitors potentiate nitrate-induced vasodilation; combination is contraindicated.",
    recommendation: "Do not co-prescribe. Wait 24h after sildenafil before any nitrate; 48h for tadalafil.",
    source: "FDA black-box",
  },
  {
    a: "tadalafil", b: "isosorbide mononitrate", severity: "critical",
    effect: "Severe hypotension",
    detail: "Same mechanism; tadalafil's longer half-life (~17h) extends the window of risk.",
    recommendation: "Do not co-prescribe.",
    source: "FDA black-box",
  },

  // ── Methotrexate + cotrimoxazole ─────────────────────────────────
  {
    a: "methotrexate", b: "cotrimoxazole", severity: "major",
    effect: "Pancytopenia",
    detail: "Both drugs are antifolates; combination markedly raises the risk of bone-marrow suppression.",
    recommendation: "Avoid co-prescription. Use a non-sulpha antibiotic.",
    source: "Lexicomp",
  },

  // ── Digoxin pump-tickers ─────────────────────────────────────────
  {
    a: "digoxin", b: "amiodarone", severity: "major",
    effect: "Digoxin toxicity",
    detail: "Amiodarone roughly doubles serum digoxin levels.",
    recommendation: "Halve the digoxin dose at amiodarone initiation; recheck level at day 7.",
    source: "Lexicomp",
  },
  {
    a: "digoxin", b: "verapamil", severity: "major",
    effect: "Digoxin toxicity + bradycardia",
    detail: "Verapamil raises digoxin levels and adds AV-nodal blockade.",
    recommendation: "Halve digoxin dose or pick a different rate-control strategy.",
    source: "Lexicomp",
  },

  // ── Lithium + NSAID / ACE / thiazide ────────────────────────────
  {
    a: "lithium", b: "ibuprofen", severity: "major",
    effect: "Lithium toxicity",
    detail: "NSAIDs reduce renal lithium clearance, raising levels 25-60%.",
    recommendation: "Use paracetamol. Recheck lithium level if NSAID unavoidable.",
    source: "Lexicomp",
  },
  {
    a: "lithium", b: "hydrochlorothiazide", severity: "major",
    effect: "Lithium toxicity",
    detail: "Thiazides reduce lithium excretion; toxic levels can develop within days.",
    recommendation: "Avoid thiazide if possible. If both needed, reduce lithium 25–50% + monitor.",
    source: "Lexicomp",
  },
];

/** Drugs absolutely contraindicated in pregnancy (FDA category X
 *  equivalents + Indian PPI guidance). */
export const PREGNANCY_CONTRAINDICATED: Record<string, { trimester?: 1 | 2 | 3 | "any"; note: string }> = {
  warfarin: { trimester: "any", note: "Teratogenic (warfarin embryopathy). Switch to LMWH." },
  isotretinoin: { trimester: "any", note: "Severe teratogen (X). Pregnancy test before + iPLEDGE." },
  methotrexate: { trimester: "any", note: "Abortifacient + teratogen." },
  ramipril: { trimester: 2, note: "ACE inhibitors cause renal dysgenesis in T2/T3." },
  telmisartan: { trimester: 2, note: "ARB causes oligohydramnios + renal dysgenesis." },
  losartan: { trimester: 2, note: "ARB — same as telmisartan." },
  atorvastatin: { trimester: "any", note: "Statins contraindicated; cholesterol needed for fetal development." },
  doxycycline: { trimester: 2, note: "Tetracyclines stain fetal teeth + bones from second trimester." },
  ciprofloxacin: { trimester: "any", note: "Fluoroquinolones — cartilage toxicity in animal studies. Use cautiously." },
  fluconazole: { trimester: 1, note: "High-dose fluconazole in T1 → craniofacial / skeletal anomalies." },
  carbamazepine: { trimester: "any", note: "Neural tube defects. Folate supplementation if continued." },
  valproate: { trimester: "any", note: "Highest teratogenic risk among AEDs. Switch before conception." },
  phenytoin: { trimester: "any", note: "Fetal hydantoin syndrome." },
  lithium: { trimester: 1, note: "Ebstein anomaly risk. Specialist consult required." },
  misoprostol: { trimester: "any", note: "Abortifacient." },
  diclofenac: { trimester: 3, note: "NSAIDs in T3 close ductus arteriosus prematurely." },
  ibuprofen: { trimester: 3, note: "Same NSAID mechanism — avoid in T3." },
};

/** Drugs needing dose reduction or avoidance in renal impairment. */
export const RENAL_RISK: Record<
  string,
  { eGFRThreshold: number; advice: string }
> = {
  metformin: { eGFRThreshold: 30, advice: "Stop metformin; lactic acidosis risk above the threshold." },
  enoxaparin: { eGFRThreshold: 30, advice: "Reduce dose by 50% or switch to UFH." },
  apixaban: { eGFRThreshold: 25, advice: "Reduce to 2.5mg BID or switch to LMWH/UFH." },
  rivaroxaban: { eGFRThreshold: 30, advice: "Avoid; switch anticoagulant." },
  dabigatran: { eGFRThreshold: 30, advice: "Contraindicated." },
  digoxin: { eGFRThreshold: 30, advice: "Halve loading + maintenance; monitor levels." },
  ibuprofen: { eGFRThreshold: 30, advice: "Avoid NSAIDs." },
  diclofenac: { eGFRThreshold: 30, advice: "Avoid NSAIDs." },
  spironolactone: { eGFRThreshold: 30, advice: "Hyperkalaemia risk; avoid." },
  gentamicin: { eGFRThreshold: 50, advice: "Reduce dose + monitor levels closely." },
  vancomycin: { eGFRThreshold: 50, advice: "Use AUC-based dosing; consult pharmacy." },
};

/** Paediatric absolute or near-absolute contraindications. */
export const PAEDIATRIC_AVOID: Record<
  string,
  { ageYearsBelow: number; reason: string }
> = {
  aspirin: { ageYearsBelow: 16, reason: "Reye's syndrome risk during viral illness." },
  ciprofloxacin: { ageYearsBelow: 18, reason: "Cartilage / tendon toxicity in growing skeletons (use only if no alternative)." },
  doxycycline: { ageYearsBelow: 8, reason: "Permanent tooth staining + enamel hypoplasia." },
  codeine: { ageYearsBelow: 12, reason: "Ultra-rapid metabolisers risk fatal opioid toxicity (FDA black-box)." },
  tramadol: { ageYearsBelow: 12, reason: "Same FDA black-box as codeine." },
  promethazine: { ageYearsBelow: 2, reason: "Respiratory depression risk." },
};

/** Geriatric (≥65) drugs to avoid per Beers Criteria. */
export const GERIATRIC_AVOID: Record<string, string> = {
  amitriptyline: "Strong anticholinergic — falls + cognitive risk. Use SSRI/duloxetine instead.",
  diazepam: "Long-acting benzodiazepine — falls + delirium. Use shorter agent or non-benzo.",
  alprazolam: "Falls + dependence in elderly. Avoid as first line.",
  diphenhydramine: "Anticholinergic; Beers list. Use loratadine/cetirizine.",
  promethazine: "Anticholinergic + sedation. Avoid.",
  glibenclamide: "Long-acting sulfonylurea — protracted hypoglycaemia. Use glipizide or non-SU agent.",
  digoxin: "Avoid >0.125mg/day in chronic AF — toxicity risk.",
  meperidine: "Avoid; neurotoxic metabolite (use morphine / hydromorphone).",
  cyclobenzaprine: "Anticholinergic; falls.",
};
