// Differential-diagnosis rule database.
//
// Curated symptom-cluster → ranked-DDx map for the most common
// outpatient + acute presentations. The engine combines chief
// complaint, modifier symptoms, age band, vitals, and red-flag
// triggers to produce a ranked list with prevalence-weighted scoring
// and a "do not miss" red-flag panel that overrides ranking when fired.
//
// This is deliberately a curated rule database, not a machine-learning
// model. Doctors trust transparent, auditable logic over opaque ML at
// the point of care; every DDx entry can be traced to a rule and a
// citation. The list is easy to extend: add a row, ship.

export type AgeBand = "infant" | "child" | "adult" | "elderly" | "any";
export type Sex = "male" | "female" | "any";

/** A candidate diagnosis surfaced by the engine for a given complaint. */
export interface DDxCandidate {
  /** Display name. */
  name: string;
  /** Rough population prevalence weight (1-100). Used to baseline-rank
   *  before symptom modifiers boost / penalise. */
  baseScore: number;
  /** Common ICD-10 code (single most likely). The auto-coder also
   *  consults its own catalogue; we duplicate here so the DDx panel
   *  can show a code without a second roundtrip. */
  icd10?: string;
  /** Plain-language one-liner explaining why this is on the list. */
  rationale: string;
  /** Suggested next step — investigation, empiric treatment, escalate. */
  nextStep: string;
  /** Symptoms that boost this candidate when present. */
  boostIfAny?: string[];
  /** Symptoms that downgrade or rule-out this candidate. */
  penaliseIfAny?: string[];
  /** Restrict to age bands. Default: "any". */
  ageBand?: AgeBand[];
  /** Restrict by sex. */
  sex?: Sex;
}

/** A red flag is a symptom-or-vitals trigger that should not be missed
 *  for a given chief complaint, regardless of how the DDx ranks. */
export interface RedFlag {
  /** Plain-language label, e.g. "STEMI rule-out", "meningitis". */
  label: string;
  /** Triggering modifiers — any of these in the patient input fires
   *  the alert. Vitals triggers are matched separately by the engine
   *  via `vitalsTrigger` keys. */
  triggers: string[];
  /** Vital-sign triggers. Engine evaluates each — if any returns true
   *  the flag fires. */
  vitalsTrigger?: VitalsPredicate[];
  severity: "critical" | "major";
  /** Action: imaging, labs, escalate, transfer to ED. */
  action: string;
}

export type VitalsPredicate =
  | { kind: "systolic_below"; value: number }
  | { kind: "systolic_above"; value: number }
  | { kind: "spo2_below"; value: number }
  | { kind: "hr_above"; value: number }
  | { kind: "hr_below"; value: number }
  | { kind: "temp_above_c"; value: number }
  | { kind: "temp_below_c"; value: number }
  | { kind: "rr_above"; value: number };

/** Top-level entry: the keys here are the "chief complaint" buckets
 *  the engine matches against. Each carries its own DDx ladder + red
 *  flags. Add a new bucket to extend coverage. */
export interface ComplaintBucket {
  id: string;
  /** Tokens the matcher looks for in the chief-complaint free text. */
  matchTokens: string[];
  ddx: DDxCandidate[];
  redFlags: RedFlag[];
}

export const COMPLAINT_BUCKETS: ComplaintBucket[] = [
  // ── CHEST PAIN ─────────────────────────────────────────────────
  {
    id: "chest_pain",
    matchTokens: ["chest pain", "chest discomfort", "chest tightness", "chest pressure"],
    ddx: [
      {
        name: "Acute coronary syndrome (STEMI / NSTEMI / UA)",
        baseScore: 80, icd10: "I20.0",
        rationale: "Classic crushing/pressure chest pain ± radiation to arm/jaw, dyspnoea, diaphoresis. Cardinal cause to exclude in any adult chest pain.",
        nextStep: "12-lead ECG within 10 min, troponin at 0/3h, aspirin 300mg loading.",
        boostIfAny: ["radiation", "diaphoresis", "dyspnoea", "shortness of breath", "left arm", "jaw", "exertion"],
        ageBand: ["adult", "elderly"],
      },
      {
        name: "Aortic dissection",
        baseScore: 25, icd10: "I71.00",
        rationale: "Tearing pain radiating to back, marked BP differential between arms, hypertension history.",
        nextStep: "CT angiography aorta, BP control with esmolol, urgent CT-surgery consult.",
        boostIfAny: ["tearing", "back", "ripping", "interscapular"],
      },
      {
        name: "Pulmonary embolism",
        baseScore: 30, icd10: "I26.99",
        rationale: "Pleuritic chest pain with dyspnoea, tachycardia, recent immobilisation/surgery/OCP.",
        nextStep: "Wells score → D-dimer or CTPA. Heparin if intermediate/high risk.",
        boostIfAny: ["dyspnoea", "shortness of breath", "tachycardia", "leg swelling", "haemoptysis", "immobile"],
      },
      {
        name: "Pneumonia (with pleurisy)",
        baseScore: 35, icd10: "J18.9",
        rationale: "Pleuritic pain + fever + cough + crackles. Common cause of acute chest pain especially in elderly.",
        nextStep: "Chest X-ray, CRP/WBC, empiric antibiotics if confirmed.",
        boostIfAny: ["fever", "cough", "sputum", "crackles", "pleuritic"],
      },
      {
        name: "GERD / oesophagitis",
        baseScore: 50, icd10: "K21.9",
        rationale: "Retrosternal burning, post-prandial, relieved by antacids. Mimics cardiac pain — confirm cardiac workup is negative first.",
        nextStep: "Trial of PPI 4-8 weeks; endoscopy if alarm features.",
        boostIfAny: ["burning", "regurgitation", "after food", "lying down", "antacid relief"],
      },
      {
        name: "Costochondritis / musculoskeletal",
        baseScore: 55, icd10: "M94.0",
        rationale: "Reproducible point tenderness, often after exercise, no autonomic features.",
        nextStep: "NSAIDs (with safety check), local heat. ECG to confirm cardiac negative.",
        boostIfAny: ["tender", "movement", "trauma", "after gym", "reproducible"],
        penaliseIfAny: ["diaphoresis", "dyspnoea"],
      },
      {
        name: "Anxiety / panic attack",
        baseScore: 35, icd10: "F41.0",
        rationale: "Acute episode, palpitations, paraesthesiae, hyperventilation, often a precipitant.",
        nextStep: "Rule out cardiac first. Reassurance, breathing technique, consider SSRI for chronic.",
        boostIfAny: ["panic", "anxiety", "tingling", "fear", "dizzy"],
        penaliseIfAny: ["fever"],
      },
    ],
    redFlags: [
      {
        label: "STEMI / acute coronary syndrome",
        triggers: ["radiation", "diaphoresis", "dyspnoea", "left arm", "jaw"],
        vitalsTrigger: [{ kind: "systolic_below", value: 90 }],
        severity: "critical",
        action: "12-lead ECG within 10 min. If STEMI: cath-lab within 90 min or thrombolyse if no PCI capable centre.",
      },
      {
        label: "Aortic dissection",
        triggers: ["tearing", "back pain", "ripping", "interscapular"],
        vitalsTrigger: [{ kind: "systolic_above", value: 180 }],
        severity: "critical",
        action: "Bilateral arm BP. CT-A aorta. BP target SBP 100-120 with esmolol + nitroprusside.",
      },
      {
        label: "Tension pneumothorax",
        triggers: ["sudden", "trauma", "tracheal deviation"],
        vitalsTrigger: [{ kind: "spo2_below", value: 92 }, { kind: "systolic_below", value: 100 }],
        severity: "critical",
        action: "Immediate needle decompression at 2nd ICS MCL, then chest drain.",
      },
    ],
  },

  // ── HEADACHE ───────────────────────────────────────────────────
  {
    id: "headache",
    matchTokens: ["headache", "migraine", "head pain"],
    ddx: [
      {
        name: "Tension-type headache",
        baseScore: 70, icd10: "G44.2",
        rationale: "Bilateral pressing pain, no nausea, mild–moderate intensity.",
        nextStep: "Paracetamol or NSAID; lifestyle review. Refer if frequency >15/month.",
        penaliseIfAny: ["thunderclap", "sudden", "fever", "neck stiffness"],
      },
      {
        name: "Migraine",
        baseScore: 60, icd10: "G43.909",
        rationale: "Unilateral throbbing, photo-/phonophobia, nausea, aura possible.",
        nextStep: "Acute: triptan + NSAID. Prophylaxis if ≥4 attacks/month: propranolol or topiramate.",
        boostIfAny: ["unilateral", "throbbing", "nausea", "photophobia", "phonophobia", "aura"],
      },
      {
        name: "Cluster headache",
        baseScore: 15, icd10: "G44.001",
        rationale: "Severe unilateral periorbital pain in clusters with autonomic features.",
        nextStep: "100% O2 12L/min via non-rebreather. Sumatriptan SC. Prophylaxis: verapamil.",
        boostIfAny: ["periorbital", "tearing", "nasal", "ptosis"],
        sex: "male",
      },
      {
        name: "Subarachnoid haemorrhage",
        baseScore: 20, icd10: "I60.9",
        rationale: "Thunderclap onset, worst-of-life, neck stiffness.",
        nextStep: "Non-contrast CT head < 6h; LP if CT negative and >6h. Neurosurgery consult.",
        boostIfAny: ["thunderclap", "worst", "sudden", "neck stiffness"],
      },
      {
        name: "Meningitis",
        baseScore: 25, icd10: "G03.9",
        rationale: "Fever + headache + neck stiffness ± photophobia ± rash.",
        nextStep: "Empiric ceftriaxone + dexamethasone, blood cultures, then LP.",
        boostIfAny: ["fever", "neck stiffness", "rash", "photophobia"],
      },
      {
        name: "Sinusitis (frontal/ethmoidal)",
        baseScore: 35, icd10: "J32.9",
        rationale: "Frontal/maxillary pain, post-nasal drip, recent URTI, worse on bending.",
        nextStep: "Saline irrigation, nasal steroid; antibiotics only if persists >10d.",
        boostIfAny: ["nasal", "congestion", "sinus", "post-nasal", "facial pain"],
      },
    ],
    redFlags: [
      {
        label: "Subarachnoid haemorrhage",
        triggers: ["thunderclap", "worst headache", "sudden onset", "neck stiffness"],
        severity: "critical",
        action: "Non-contrast CT head immediately. LP if CT negative and presentation > 6h.",
      },
      {
        label: "Bacterial meningitis",
        triggers: ["fever", "neck stiffness", "rash", "altered mental"],
        vitalsTrigger: [{ kind: "temp_above_c", value: 38.5 }],
        severity: "critical",
        action: "Ceftriaxone 2g IV + dexamethasone before LP. Do not delay antibiotics.",
      },
      {
        label: "Raised ICP / mass lesion",
        triggers: ["morning", "vomiting", "papilloedema", "focal deficit", "new seizure"],
        severity: "major",
        action: "Urgent CT/MRI head. Avoid LP until imaging.",
      },
      {
        label: "Giant cell arteritis",
        triggers: ["temporal", "jaw claudication", "visual loss"],
        severity: "major",
        action: ">50y? Start prednisolone 60mg + ESR + temporal artery biopsy.",
      },
    ],
  },

  // ── ABDOMINAL PAIN ─────────────────────────────────────────────
  {
    id: "abdominal_pain",
    matchTokens: ["abdominal pain", "stomach pain", "belly pain", "tummy pain"],
    ddx: [
      {
        name: "Acute appendicitis",
        baseScore: 35, icd10: "K35.80",
        rationale: "Periumbilical → RIF migration, anorexia, low-grade fever, McBurney tenderness.",
        nextStep: "USG / CT abdomen. Surgical consult. NPO + IV fluids + antibiotics.",
        boostIfAny: ["right lower", "rif", "mcburney", "rovsing", "anorexia"],
      },
      {
        name: "Acute cholecystitis / biliary colic",
        baseScore: 30, icd10: "K81.0",
        rationale: "RUQ pain, post-fatty meal, Murphy sign positive, female 40s+.",
        nextStep: "USG abdomen, LFT, CRP. NPO, IV antibiotics, surgical consult.",
        boostIfAny: ["right upper", "ruq", "fatty meal", "murphy", "shoulder tip"],
      },
      {
        name: "Acute pancreatitis",
        baseScore: 25, icd10: "K85.9",
        rationale: "Epigastric pain radiating to back, nausea, alcohol or gallstones.",
        nextStep: "Lipase × 3 ULN, USG abdomen, IV fluids 5-10ml/kg/h, NPO.",
        boostIfAny: ["epigastric", "back", "alcohol", "vomiting"],
      },
      {
        name: "Renal colic",
        baseScore: 25, icd10: "N20.0",
        rationale: "Loin-to-groin colicky pain, haematuria, restless patient.",
        nextStep: "Urinalysis, NCCT KUB. NSAID + alpha-blocker if stone <10mm.",
        boostIfAny: ["loin", "groin", "haematuria", "restless", "colicky"],
      },
      {
        name: "Gastroenteritis",
        baseScore: 60, icd10: "A09",
        rationale: "Diffuse cramping with diarrhoea ± vomiting ± fever.",
        nextStep: "ORS, supportive. Stool culture if bloody/severe. Avoid antibiotics unless dysentery.",
        boostIfAny: ["diarrhoea", "vomiting", "loose stool"],
      },
      {
        name: "Bowel obstruction",
        baseScore: 15, icd10: "K56.60",
        rationale: "Colicky pain, distension, vomiting, absolute constipation, prior surgery.",
        nextStep: "Abdominal X-ray supine + erect, NPO, NG tube, surgical consult.",
        boostIfAny: ["distension", "constipation", "no flatus", "previous surgery"],
      },
      {
        name: "Ectopic pregnancy",
        baseScore: 20, icd10: "O00.9",
        rationale: "Lower abdominal pain in reproductive-age female with amenorrhoea ± vaginal bleeding.",
        nextStep: "Urine β-hCG, transvaginal USG, gynae emergency.",
        sex: "female",
        boostIfAny: ["amenorrhoea", "missed period", "vaginal bleed"],
      },
    ],
    redFlags: [
      {
        label: "Surgical abdomen / peritonitis",
        triggers: ["rigidity", "rebound", "guarding", "absent bowel sounds"],
        vitalsTrigger: [{ kind: "systolic_below", value: 100 }, { kind: "hr_above", value: 110 }],
        severity: "critical",
        action: "Urgent surgical review, IV fluids, broad-spectrum antibiotics, NPO.",
      },
      {
        label: "Ruptured AAA",
        triggers: ["pulsatile mass", "back pain", "syncope"],
        vitalsTrigger: [{ kind: "systolic_below", value: 90 }],
        severity: "critical",
        action: "Bedside USG, type & cross 6 units, vascular surgery STAT.",
      },
      {
        label: "Mesenteric ischaemia",
        triggers: ["pain out of proportion", "atrial fibrillation", "lactate"],
        severity: "critical",
        action: "CT angiography, surgical consult. Don't wait for X-ray findings.",
      },
    ],
  },

  // ── DYSPNOEA ───────────────────────────────────────────────────
  {
    id: "dyspnoea",
    matchTokens: ["shortness of breath", "dyspnoea", "breathless", "difficulty breathing"],
    ddx: [
      {
        name: "Acute exacerbation of COPD",
        baseScore: 30, icd10: "J44.1",
        rationale: "Smoker, wheeze, increased sputum purulence, prior episodes.",
        nextStep: "Salbutamol + ipratropium nebuliser, prednisolone 40mg × 5d, antibiotics if purulent.",
        boostIfAny: ["smoker", "sputum", "wheeze", "purulent"],
        ageBand: ["adult", "elderly"],
      },
      {
        name: "Acute pulmonary oedema / heart failure",
        baseScore: 30, icd10: "I50.1",
        rationale: "Orthopnoea, PND, bibasal crackles, raised JVP, leg oedema.",
        nextStep: "IV furosemide, sit up + O2, GTN if SBP > 110, BNP, echo.",
        boostIfAny: ["orthopnoea", "pnd", "leg swelling", "crackles"],
      },
      {
        name: "Pulmonary embolism",
        baseScore: 25, icd10: "I26.99",
        rationale: "Sudden dyspnoea + pleuritic chest pain ± leg swelling, recent immobilisation.",
        nextStep: "Wells score, D-dimer or CTPA, LMWH if intermediate/high risk.",
        boostIfAny: ["sudden", "pleuritic", "leg swelling", "immobile", "ocp"],
      },
      {
        name: "Asthma exacerbation",
        baseScore: 30, icd10: "J45.901",
        rationale: "Wheeze, accessory muscle use, prior asthma, viral trigger.",
        nextStep: "Salbutamol burst, prednisolone, ipratropium if severe, magnesium IV if life-threatening.",
        boostIfAny: ["wheeze", "asthma", "trigger", "allergy"],
      },
      {
        name: "Pneumonia",
        baseScore: 35, icd10: "J18.9",
        rationale: "Fever + productive cough + crackles + raised WBC/CRP.",
        nextStep: "CXR, blood cultures, empiric antibiotics per CURB-65 / IDSA.",
        boostIfAny: ["fever", "cough", "sputum", "crackles"],
      },
    ],
    redFlags: [
      {
        label: "Respiratory failure",
        triggers: ["accessory muscles", "silent chest", "exhaustion"],
        vitalsTrigger: [{ kind: "spo2_below", value: 88 }, { kind: "rr_above", value: 30 }],
        severity: "critical",
        action: "Urgent ABG. NIV trial if cooperative; intubate if exhausted or pH < 7.25.",
      },
      {
        label: "Tension pneumothorax",
        triggers: ["sudden", "trauma", "tracheal deviation", "absent breath sounds"],
        severity: "critical",
        action: "Needle decompression 2nd ICS MCL → chest drain.",
      },
    ],
  },

  // ── FEVER ──────────────────────────────────────────────────────
  {
    id: "fever",
    matchTokens: ["fever", "pyrexia", "temperature", "rigor"],
    ddx: [
      {
        name: "Viral upper respiratory tract infection",
        baseScore: 65, icd10: "J06.9",
        rationale: "Coryzal symptoms, mild fever, sore throat, cough — self-limiting in 5–7d.",
        nextStep: "Symptomatic. Antibiotics not indicated.",
        boostIfAny: ["cough", "runny nose", "sore throat"],
      },
      {
        name: "Dengue fever",
        baseScore: 35, icd10: "A90",
        rationale: "High-grade fever, retro-orbital pain, myalgia, rash, thrombocytopenia. Endemic in India.",
        nextStep: "CBC daily, NS1 antigen if <5d, IgM if >5d. Avoid NSAIDs/aspirin.",
        boostIfAny: ["retro-orbital", "rash", "bleeding", "petechiae", "myalgia"],
      },
      {
        name: "Typhoid (enteric fever)",
        baseScore: 25, icd10: "A01.00",
        rationale: "Step-ladder fever, relative bradycardia, abdominal pain, hepatosplenomegaly. India endemic.",
        nextStep: "Blood culture × 2, Widal (limited), empiric ceftriaxone or azithromycin.",
        boostIfAny: ["abdominal", "constipation", "rose spots", "step-ladder"],
      },
      {
        name: "Malaria",
        baseScore: 25, icd10: "B54",
        rationale: "Cyclical fever with rigors, travel/endemic exposure, splenomegaly.",
        nextStep: "Peripheral smear × 3 + RDT. ACT for falciparum, chloroquine for vivax.",
        boostIfAny: ["rigor", "cyclical", "travel", "endemic"],
      },
      {
        name: "UTI / pyelonephritis",
        baseScore: 30, icd10: "N39.0",
        rationale: "Dysuria, flank pain, frequency, prior UTI history. Pyelo if fever + flank pain.",
        nextStep: "Urinalysis + culture. Outpatient: nitrofurantoin or fosfomycin. IV cef if pyelo.",
        boostIfAny: ["dysuria", "frequency", "flank", "burning urine"],
      },
      {
        name: "Pneumonia",
        baseScore: 25, icd10: "J18.9",
        rationale: "Productive cough, dyspnoea, crackles.",
        nextStep: "CXR, CURB-65, antibiotics per setting.",
        boostIfAny: ["cough", "sputum", "crackles", "dyspnoea"],
      },
    ],
    redFlags: [
      {
        label: "Sepsis",
        triggers: ["confusion", "purpuric rash"],
        vitalsTrigger: [
          { kind: "systolic_below", value: 100 },
          { kind: "hr_above", value: 130 },
          { kind: "rr_above", value: 24 },
          { kind: "temp_above_c", value: 39.5 },
          { kind: "temp_below_c", value: 36 },
        ],
        severity: "critical",
        action: "Sepsis-six within 1h: cultures + lactate + IV antibiotics + IV fluids 30ml/kg + O2 + urine output.",
      },
      {
        label: "Dengue haemorrhagic fever / shock",
        triggers: ["bleeding", "petechiae", "abdominal pain", "vomiting"],
        vitalsTrigger: [{ kind: "systolic_below", value: 100 }, { kind: "hr_above", value: 110 }],
        severity: "critical",
        action: "Crystalloid bolus, platelet count, admit. Avoid NSAIDs.",
      },
    ],
  },
];

/** Index for quick complaint lookup. */
export function findBucket(complaintText: string): ComplaintBucket | null {
  const lower = complaintText.toLowerCase();
  for (const b of COMPLAINT_BUCKETS) {
    for (const t of b.matchTokens) {
      if (lower.includes(t)) return b;
    }
  }
  return null;
}
