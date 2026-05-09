// ICD-10 auto-coding helper.
//
// Maps free-text diagnoses ("fever with cough", "type 2 diabetes",
// "lower back pain") to the most likely ICD-10 codes. We index by
// keyword because ICD has thousands of codes and manual lookup is the
// single biggest source of hospital billing delay in India.
//
// Coverage: ~150 of the most-used ICD-10 codes seen in primary care +
// general hospital admission. Easy to extend — append a row and ship.
// The matcher returns up to N suggestions ranked by keyword-match
// strength; the prescriber confirms the right code on screen.

export interface IcdCode {
  code: string;        // "E11.9"
  title: string;       // human-readable
  /** Lowercase keywords that should match this code. Order matters
   *  loosely — multi-word phrases score higher than single keywords. */
  keywords: string[];
  /** Coarse chapter for grouping in UI. */
  chapter: string;
}

export const ICD10: IcdCode[] = [
  // ── Endocrine ──────────────────────────────────────────────────
  { code: "E11.9", title: "Type 2 diabetes mellitus, without complications", keywords: ["type 2 diabetes", "t2dm", "diabetes mellitus", "non-insulin diabetes"], chapter: "Endocrine" },
  { code: "E10.9", title: "Type 1 diabetes mellitus, without complications", keywords: ["type 1 diabetes", "t1dm", "iddm", "insulin dependent"], chapter: "Endocrine" },
  { code: "E11.65", title: "Type 2 diabetes with hyperglycaemia", keywords: ["uncontrolled diabetes", "hyperglycaemia", "high sugar"], chapter: "Endocrine" },
  { code: "E11.21", title: "Type 2 diabetes with diabetic nephropathy", keywords: ["diabetic nephropathy", "diabetic kidney"], chapter: "Endocrine" },
  { code: "E03.9", title: "Hypothyroidism, unspecified", keywords: ["hypothyroidism", "underactive thyroid", "low thyroid"], chapter: "Endocrine" },
  { code: "E05.90", title: "Thyrotoxicosis / hyperthyroidism", keywords: ["hyperthyroidism", "thyrotoxicosis", "graves"], chapter: "Endocrine" },
  { code: "E78.5", title: "Hyperlipidaemia, unspecified", keywords: ["dyslipidaemia", "hyperlipidaemia", "high cholesterol", "lipid"], chapter: "Endocrine" },
  { code: "E66.9", title: "Obesity, unspecified", keywords: ["obesity", "overweight"], chapter: "Endocrine" },

  // ── Circulatory ────────────────────────────────────────────────
  { code: "I10", title: "Essential (primary) hypertension", keywords: ["hypertension", "high blood pressure", "htn", "essential htn"], chapter: "Circulatory" },
  { code: "I11.9", title: "Hypertensive heart disease, no failure", keywords: ["hypertensive heart"], chapter: "Circulatory" },
  { code: "I20.0", title: "Unstable angina", keywords: ["unstable angina", "ua", "rest angina"], chapter: "Circulatory" },
  { code: "I21.9", title: "Acute myocardial infarction", keywords: ["mi", "heart attack", "ami", "myocardial infarction", "stemi", "nstemi"], chapter: "Circulatory" },
  { code: "I25.10", title: "Atherosclerotic heart disease", keywords: ["coronary artery disease", "cad", "ihd", "ischaemic heart"], chapter: "Circulatory" },
  { code: "I48.91", title: "Atrial fibrillation, unspecified", keywords: ["atrial fibrillation", "afib", "af"], chapter: "Circulatory" },
  { code: "I50.9", title: "Heart failure, unspecified", keywords: ["heart failure", "chf", "cardiac failure"], chapter: "Circulatory" },
  { code: "I50.1", title: "Acute pulmonary oedema", keywords: ["pulmonary oedema", "pulmonary edema", "flash pulmonary"], chapter: "Circulatory" },
  { code: "I63.9", title: "Cerebral infarction (stroke)", keywords: ["stroke", "cva", "cerebral infarction", "ischaemic stroke"], chapter: "Circulatory" },
  { code: "I60.9", title: "Subarachnoid haemorrhage", keywords: ["subarachnoid", "sah", "thunderclap headache haemorrhage"], chapter: "Circulatory" },
  { code: "I26.99", title: "Pulmonary embolism, unspecified", keywords: ["pulmonary embolism", "pe", "pulmonary thromboembolism"], chapter: "Circulatory" },
  { code: "I71.00", title: "Aortic dissection", keywords: ["aortic dissection"], chapter: "Circulatory" },
  { code: "I83.90", title: "Varicose veins, lower extremity", keywords: ["varicose veins"], chapter: "Circulatory" },

  // ── Respiratory ────────────────────────────────────────────────
  { code: "J06.9", title: "Acute upper respiratory infection", keywords: ["uri", "upper respiratory", "cold", "common cold"], chapter: "Respiratory" },
  { code: "J18.9", title: "Pneumonia, unspecified", keywords: ["pneumonia", "lower respiratory infection", "lrti", "consolidation"], chapter: "Respiratory" },
  { code: "J20.9", title: "Acute bronchitis", keywords: ["bronchitis", "acute bronchitis"], chapter: "Respiratory" },
  { code: "J32.9", title: "Chronic sinusitis, unspecified", keywords: ["sinusitis", "rhinosinusitis"], chapter: "Respiratory" },
  { code: "J45.901", title: "Asthma with exacerbation", keywords: ["asthma exacerbation", "acute asthma", "wheeze attack"], chapter: "Respiratory" },
  { code: "J45.909", title: "Asthma, unspecified", keywords: ["asthma", "bronchial asthma"], chapter: "Respiratory" },
  { code: "J44.1", title: "COPD with acute exacerbation", keywords: ["copd exacerbation", "aecopd"], chapter: "Respiratory" },
  { code: "J44.9", title: "COPD, unspecified", keywords: ["copd", "chronic obstructive"], chapter: "Respiratory" },
  { code: "J93.9", title: "Pneumothorax, unspecified", keywords: ["pneumothorax"], chapter: "Respiratory" },
  { code: "J96.00", title: "Acute respiratory failure", keywords: ["respiratory failure"], chapter: "Respiratory" },
  { code: "U07.1", title: "COVID-19", keywords: ["covid", "covid-19", "sars-cov-2"], chapter: "Respiratory" },

  // ── Digestive ──────────────────────────────────────────────────
  { code: "K21.9", title: "GERD without oesophagitis", keywords: ["gerd", "gord", "reflux", "acidity"], chapter: "Digestive" },
  { code: "K29.70", title: "Gastritis, unspecified", keywords: ["gastritis", "stomach inflammation"], chapter: "Digestive" },
  { code: "K35.80", title: "Acute appendicitis", keywords: ["appendicitis"], chapter: "Digestive" },
  { code: "K56.60", title: "Intestinal obstruction, unspecified", keywords: ["bowel obstruction", "intestinal obstruction", "ileus"], chapter: "Digestive" },
  { code: "K57.30", title: "Diverticulitis", keywords: ["diverticulitis"], chapter: "Digestive" },
  { code: "K59.00", title: "Constipation", keywords: ["constipation"], chapter: "Digestive" },
  { code: "K70.30", title: "Alcoholic cirrhosis of liver", keywords: ["alcoholic cirrhosis"], chapter: "Digestive" },
  { code: "K76.0", title: "Fatty liver", keywords: ["fatty liver", "nafld", "steatosis"], chapter: "Digestive" },
  { code: "K80.20", title: "Cholelithiasis (gallstones)", keywords: ["gallstones", "cholelithiasis"], chapter: "Digestive" },
  { code: "K81.0", title: "Acute cholecystitis", keywords: ["cholecystitis", "gallbladder inflammation"], chapter: "Digestive" },
  { code: "K85.9", title: "Acute pancreatitis", keywords: ["pancreatitis"], chapter: "Digestive" },
  { code: "K92.2", title: "Gastrointestinal haemorrhage", keywords: ["gi bleed", "gi haemorrhage", "haematemesis", "melena"], chapter: "Digestive" },
  { code: "A09", title: "Infectious gastroenteritis", keywords: ["gastroenteritis", "diarrhoea", "diarrhea", "loose motions"], chapter: "Digestive" },
  { code: "B19.9", title: "Viral hepatitis, unspecified", keywords: ["hepatitis", "jaundice viral"], chapter: "Digestive" },

  // ── Genitourinary ──────────────────────────────────────────────
  { code: "N20.0", title: "Calculus of kidney (renal stone)", keywords: ["renal stone", "kidney stone", "renal calculus", "renal colic"], chapter: "Genitourinary" },
  { code: "N39.0", title: "Urinary tract infection", keywords: ["uti", "cystitis", "urinary infection", "burning urine"], chapter: "Genitourinary" },
  { code: "N10", title: "Acute pyelonephritis", keywords: ["pyelonephritis", "kidney infection"], chapter: "Genitourinary" },
  { code: "N18.6", title: "End stage renal disease", keywords: ["esrd", "end stage renal", "ckd 5"], chapter: "Genitourinary" },
  { code: "N18.4", title: "Chronic kidney disease, stage 4", keywords: ["ckd 4", "chronic kidney"], chapter: "Genitourinary" },
  { code: "N40.0", title: "Benign prostatic hyperplasia", keywords: ["bph", "prostate enlargement"], chapter: "Genitourinary" },
  { code: "N92.0", title: "Heavy menstrual bleeding", keywords: ["menorrhagia", "heavy periods"], chapter: "Genitourinary" },
  { code: "O00.9", title: "Ectopic pregnancy", keywords: ["ectopic pregnancy", "tubal pregnancy"], chapter: "Genitourinary" },

  // ── Infectious ─────────────────────────────────────────────────
  { code: "A01.00", title: "Typhoid fever", keywords: ["typhoid", "enteric fever", "salmonella typhi"], chapter: "Infectious" },
  { code: "A90", title: "Dengue fever", keywords: ["dengue", "dengue fever"], chapter: "Infectious" },
  { code: "B54", title: "Malaria, unspecified", keywords: ["malaria", "plasmodium"], chapter: "Infectious" },
  { code: "A41.9", title: "Sepsis, unspecified", keywords: ["sepsis", "septic shock", "septicaemia"], chapter: "Infectious" },
  { code: "B20", title: "HIV disease", keywords: ["hiv", "aids"], chapter: "Infectious" },
  { code: "A15.9", title: "Tuberculosis, respiratory, unspecified", keywords: ["tuberculosis", "tb", "pulmonary tb"], chapter: "Infectious" },

  // ── Neurological ───────────────────────────────────────────────
  { code: "G43.909", title: "Migraine, unspecified", keywords: ["migraine"], chapter: "Neurological" },
  { code: "G44.2", title: "Tension-type headache", keywords: ["tension headache", "tension-type headache"], chapter: "Neurological" },
  { code: "G44.001", title: "Cluster headache", keywords: ["cluster headache"], chapter: "Neurological" },
  { code: "G40.909", title: "Epilepsy, unspecified", keywords: ["epilepsy", "seizure disorder", "seizures"], chapter: "Neurological" },
  { code: "G45.9", title: "Transient ischaemic attack", keywords: ["tia", "transient ischaemic"], chapter: "Neurological" },
  { code: "G93.5", title: "Compression of brain", keywords: ["raised icp", "intracranial pressure"], chapter: "Neurological" },
  { code: "R51", title: "Headache", keywords: ["headache", "head pain"], chapter: "Neurological" },
  { code: "G03.9", title: "Meningitis, unspecified", keywords: ["meningitis"], chapter: "Neurological" },

  // ── Psychiatric ────────────────────────────────────────────────
  { code: "F32.9", title: "Major depressive disorder, single episode", keywords: ["depression", "mdd", "depressive episode"], chapter: "Psychiatric" },
  { code: "F33.9", title: "Recurrent depressive disorder", keywords: ["recurrent depression"], chapter: "Psychiatric" },
  { code: "F41.0", title: "Panic disorder", keywords: ["panic", "panic attack"], chapter: "Psychiatric" },
  { code: "F41.1", title: "Generalized anxiety disorder", keywords: ["gad", "anxiety", "generalized anxiety"], chapter: "Psychiatric" },
  { code: "F51.01", title: "Primary insomnia", keywords: ["insomnia", "sleep difficulty"], chapter: "Psychiatric" },

  // ── Musculoskeletal ────────────────────────────────────────────
  { code: "M54.50", title: "Low back pain, unspecified", keywords: ["low back pain", "lbp", "lumbar pain"], chapter: "Musculoskeletal" },
  { code: "M54.2", title: "Cervicalgia (neck pain)", keywords: ["neck pain", "cervicalgia"], chapter: "Musculoskeletal" },
  { code: "M25.50", title: "Joint pain, unspecified", keywords: ["joint pain", "arthralgia"], chapter: "Musculoskeletal" },
  { code: "M79.7", title: "Fibromyalgia", keywords: ["fibromyalgia"], chapter: "Musculoskeletal" },
  { code: "M81.0", title: "Postmenopausal osteoporosis", keywords: ["osteoporosis"], chapter: "Musculoskeletal" },
  { code: "M94.0", title: "Costochondritis", keywords: ["costochondritis", "chest wall pain"], chapter: "Musculoskeletal" },
  { code: "M17.9", title: "Osteoarthritis of knee", keywords: ["osteoarthritis knee", "knee oa"], chapter: "Musculoskeletal" },
  { code: "M16.9", title: "Osteoarthritis of hip", keywords: ["osteoarthritis hip"], chapter: "Musculoskeletal" },

  // ── Skin ───────────────────────────────────────────────────────
  { code: "L20.9", title: "Atopic dermatitis", keywords: ["eczema", "atopic dermatitis"], chapter: "Skin" },
  { code: "L40.9", title: "Psoriasis, unspecified", keywords: ["psoriasis"], chapter: "Skin" },
  { code: "L70.0", title: "Acne vulgaris", keywords: ["acne"], chapter: "Skin" },
  { code: "L03.90", title: "Cellulitis, unspecified", keywords: ["cellulitis"], chapter: "Skin" },
  { code: "L50.9", title: "Urticaria, unspecified", keywords: ["urticaria", "hives"], chapter: "Skin" },

  // ── Symptoms / signs (R-codes) ─────────────────────────────────
  { code: "R50.9", title: "Fever, unspecified", keywords: ["fever", "pyrexia"], chapter: "Symptoms" },
  { code: "R05", title: "Cough", keywords: ["cough"], chapter: "Symptoms" },
  { code: "R06.02", title: "Shortness of breath", keywords: ["shortness of breath", "dyspnoea", "dyspnea"], chapter: "Symptoms" },
  { code: "R07.9", title: "Chest pain, unspecified", keywords: ["chest pain"], chapter: "Symptoms" },
  { code: "R10.9", title: "Abdominal pain, unspecified", keywords: ["abdominal pain", "stomach pain", "belly pain"], chapter: "Symptoms" },
  { code: "R11.10", title: "Vomiting", keywords: ["vomiting", "emesis"], chapter: "Symptoms" },
  { code: "R19.7", title: "Diarrhoea, unspecified", keywords: ["diarrhoea", "diarrhea", "loose stool"], chapter: "Symptoms" },
  { code: "R42", title: "Dizziness and giddiness", keywords: ["dizziness", "vertigo"], chapter: "Symptoms" },
  { code: "R51", title: "Headache (general)", keywords: ["headache"], chapter: "Symptoms" },
  { code: "R52.9", title: "Pain, unspecified", keywords: ["pain"], chapter: "Symptoms" },
  { code: "R53.83", title: "Other fatigue", keywords: ["fatigue", "tiredness"], chapter: "Symptoms" },
];

export interface IcdSuggestion {
  code: string;
  title: string;
  chapter: string;
  score: number;
  matchedKeywords: string[];
}

/** Score a candidate against the query. Multi-word keyword matches
 *  score higher than single-word matches; longer keywords also score
 *  higher to bias toward specific over generic codes. */
function scoreCode(code: IcdCode, query: string): { score: number; matched: string[] } {
  const q = query.toLowerCase();
  let score = 0;
  const matched: string[] = [];
  for (const kw of code.keywords) {
    if (q.includes(kw)) {
      // Length-weighted match. "type 2 diabetes" beats "diabetes".
      score += 5 + Math.min(20, kw.length);
      matched.push(kw);
    }
  }
  return { score, matched };
}

export function suggestIcd10(query: string, limit = 6): IcdSuggestion[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const out: IcdSuggestion[] = [];
  for (const code of ICD10) {
    const { score, matched } = scoreCode(code, q);
    if (score === 0) continue;
    out.push({
      code: code.code,
      title: code.title,
      chapter: code.chapter,
      score,
      matchedKeywords: matched,
    });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}

/** Run the suggester over multiple diagnosis lines (e.g. encounter
 *  "diagnoses" textarea). Deduplicates by code, keeps the highest
 *  score across lines. */
export function suggestIcd10Multi(lines: string[], limit = 8): IcdSuggestion[] {
  const acc = new Map<string, IcdSuggestion>();
  for (const line of lines) {
    for (const s of suggestIcd10(line, limit)) {
      const prior = acc.get(s.code);
      if (!prior || s.score > prior.score) acc.set(s.code, s);
    }
  }
  return Array.from(acc.values()).sort((a, b) => b.score - a.score).slice(0, limit);
}
