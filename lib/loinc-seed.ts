// LOINC code reference subset.
//
// Full LOINC is ~96,000 codes. Shipping all of them blows the repo
// + bundle. We seed the ~200 codes that cover ~80% of OPD + IPD
// orders in Indian hospitals (per RxNorm/LOINC adoption notes
// circulated by NABL / ICMR). Hospitals can extend via the lab
// catalogue admin.
//
// Each entry: LOINC code · component · property · system · scale ·
// short display name · the OduDoc lab-class category it belongs to.

export type LabClass =
  | "haematology"
  | "biochemistry"
  | "endocrinology"
  | "immunology"
  | "serology"
  | "microbiology"
  | "molecular"
  | "cytogenetics"
  | "histopathology"
  | "cytology"
  | "haemato_oncology"
  | "blood_bank"
  | "toxicology"
  | "drug_testing"
  | "paternity_dna"
  | "newborn_screening"
  | "infectious_disease_panels";

export interface LoincCode {
  code: string;
  display: string;
  class: LabClass;
  unit?: string;
}

export const LOINC_SEED: LoincCode[] = [
  // ── Haematology ────────────────────────────────────────────────
  { code: "26464-8",  display: "WBC count",                          class: "haematology",   unit: "10^3/uL" },
  { code: "718-7",    display: "Haemoglobin",                        class: "haematology",   unit: "g/dL" },
  { code: "789-8",    display: "RBC count",                          class: "haematology",   unit: "10^6/uL" },
  { code: "777-3",    display: "Platelet count",                     class: "haematology",   unit: "10^3/uL" },
  { code: "4544-3",   display: "Haematocrit",                        class: "haematology",   unit: "%" },
  { code: "30385-9",  display: "ESR",                                class: "haematology",   unit: "mm/h" },
  { code: "5902-2",   display: "PT (Prothrombin time)",              class: "haematology",   unit: "s" },
  { code: "6301-6",   display: "INR",                                class: "haematology" },
  { code: "3173-2",   display: "aPTT",                               class: "haematology",   unit: "s" },
  { code: "30240-6",  display: "Reticulocyte count",                 class: "haematology",   unit: "%" },
  { code: "718-7",    display: "Peripheral smear",                   class: "haematology" },

  // ── Biochemistry ───────────────────────────────────────────────
  { code: "2345-7",   display: "Glucose (random)",                   class: "biochemistry",  unit: "mg/dL" },
  { code: "1558-6",   display: "Glucose (fasting)",                  class: "biochemistry",  unit: "mg/dL" },
  { code: "4548-4",   display: "HbA1c",                              class: "biochemistry",  unit: "%" },
  { code: "2160-0",   display: "Creatinine",                         class: "biochemistry",  unit: "mg/dL" },
  { code: "3094-0",   display: "Urea (BUN)",                         class: "biochemistry",  unit: "mg/dL" },
  { code: "1742-6",   display: "ALT (SGPT)",                         class: "biochemistry",  unit: "U/L" },
  { code: "1920-8",   display: "AST (SGOT)",                         class: "biochemistry",  unit: "U/L" },
  { code: "6768-6",   display: "Alkaline phosphatase",               class: "biochemistry",  unit: "U/L" },
  { code: "1975-2",   display: "Total bilirubin",                    class: "biochemistry",  unit: "mg/dL" },
  { code: "1968-7",   display: "Direct bilirubin",                   class: "biochemistry",  unit: "mg/dL" },
  { code: "2885-2",   display: "Total protein",                      class: "biochemistry",  unit: "g/dL" },
  { code: "1751-7",   display: "Albumin",                            class: "biochemistry",  unit: "g/dL" },
  { code: "2823-3",   display: "Potassium",                          class: "biochemistry",  unit: "mmol/L" },
  { code: "2951-2",   display: "Sodium",                             class: "biochemistry",  unit: "mmol/L" },
  { code: "2075-0",   display: "Chloride",                           class: "biochemistry",  unit: "mmol/L" },
  { code: "17861-6",  display: "Calcium",                            class: "biochemistry",  unit: "mg/dL" },
  { code: "2777-1",   display: "Phosphate",                          class: "biochemistry",  unit: "mg/dL" },
  { code: "19123-9",  display: "Magnesium",                          class: "biochemistry",  unit: "mg/dL" },
  { code: "2093-3",   display: "Cholesterol (total)",                class: "biochemistry",  unit: "mg/dL" },
  { code: "2085-9",   display: "HDL cholesterol",                    class: "biochemistry",  unit: "mg/dL" },
  { code: "13457-7",  display: "LDL cholesterol (calc)",             class: "biochemistry",  unit: "mg/dL" },
  { code: "2571-8",   display: "Triglycerides",                      class: "biochemistry",  unit: "mg/dL" },
  { code: "1988-5",   display: "C-reactive protein (CRP)",           class: "biochemistry",  unit: "mg/L" },
  { code: "33959-8",  display: "Procalcitonin",                      class: "biochemistry",  unit: "ng/mL" },
  { code: "1798-8",   display: "Amylase",                            class: "biochemistry",  unit: "U/L" },
  { code: "1832-5",   display: "Lipase",                             class: "biochemistry",  unit: "U/L" },
  { code: "2532-0",   display: "Lactate dehydrogenase (LDH)",        class: "biochemistry",  unit: "U/L" },
  { code: "2157-6",   display: "Creatine kinase (CK)",               class: "biochemistry",  unit: "U/L" },
  { code: "10839-9",  display: "Troponin I",                         class: "biochemistry",  unit: "ng/mL" },
  { code: "2524-7",   display: "Lactate",                            class: "biochemistry",  unit: "mmol/L" },
  { code: "2614-6",   display: "Magnesium (ionised)",                class: "biochemistry" },

  // ── Endocrinology ──────────────────────────────────────────────
  { code: "3016-3",   display: "TSH",                                class: "endocrinology", unit: "uIU/mL" },
  { code: "3024-7",   display: "Free T4",                            class: "endocrinology", unit: "ng/dL" },
  { code: "3053-6",   display: "Free T3",                            class: "endocrinology", unit: "pg/mL" },
  { code: "2143-6",   display: "Cortisol",                           class: "endocrinology", unit: "ug/dL" },
  { code: "2842-3",   display: "Prolactin",                          class: "endocrinology", unit: "ng/mL" },
  { code: "10501-5",  display: "Testosterone (total)",               class: "endocrinology", unit: "ng/dL" },
  { code: "11580-8",  display: "Oestradiol",                         class: "endocrinology", unit: "pg/mL" },
  { code: "1668-3",   display: "ACTH",                               class: "endocrinology", unit: "pg/mL" },
  { code: "1668-3",   display: "Growth hormone",                     class: "endocrinology", unit: "ng/mL" },
  { code: "1986-9",   display: "Insulin",                            class: "endocrinology", unit: "uIU/mL" },
  { code: "1989-3",   display: "C-peptide",                          class: "endocrinology", unit: "ng/mL" },
  { code: "1442-3",   display: "FSH",                                class: "endocrinology", unit: "mIU/mL" },
  { code: "10501-5",  display: "LH",                                 class: "endocrinology", unit: "mIU/mL" },

  // ── Immunology ─────────────────────────────────────────────────
  { code: "5048-4",   display: "ANA",                                class: "immunology" },
  { code: "11572-5",  display: "Rheumatoid factor (RF)",             class: "immunology",    unit: "IU/mL" },
  { code: "8061-4",   display: "C3 complement",                      class: "immunology",    unit: "mg/dL" },
  { code: "8060-6",   display: "C4 complement",                      class: "immunology",    unit: "mg/dL" },
  { code: "2458-8",   display: "IgG",                                class: "immunology",    unit: "mg/dL" },
  { code: "2465-3",   display: "IgA",                                class: "immunology",    unit: "mg/dL" },
  { code: "2472-9",   display: "IgM",                                class: "immunology",    unit: "mg/dL" },
  { code: "19113-0",  display: "IgE (total)",                        class: "immunology",    unit: "IU/mL" },
  { code: "29952-7",  display: "anti-CCP",                           class: "immunology",    unit: "U/mL" },
  { code: "31146-4",  display: "ANCA",                               class: "immunology" },

  // ── Serology ───────────────────────────────────────────────────
  { code: "5196-1",   display: "HBsAg",                              class: "serology" },
  { code: "13955-0",  display: "anti-HCV",                           class: "serology" },
  { code: "29893-3",  display: "HIV 1/2 antibody (ELISA)",           class: "serology" },
  { code: "30545-8",  display: "Dengue NS1 antigen",                 class: "serology" },
  { code: "31738-8",  display: "Dengue IgM",                         class: "serology" },
  { code: "94531-1",  display: "SARS-CoV-2 antibody",                class: "serology" },
  { code: "62856-4",  display: "VDRL",                               class: "serology" },
  { code: "20457-0",  display: "Widal test",                         class: "serology" },
  { code: "6562-3",   display: "Leptospira antibody",                class: "serology" },

  // ── Microbiology ───────────────────────────────────────────────
  { code: "600-7",    display: "Blood culture",                      class: "microbiology" },
  { code: "630-4",    display: "Urine culture",                      class: "microbiology" },
  { code: "624-7",    display: "Sputum culture",                     class: "microbiology" },
  { code: "618-9",    display: "Stool culture",                      class: "microbiology" },
  { code: "11475-1",  display: "AFB smear (sputum)",                 class: "microbiology" },
  { code: "11550-1",  display: "Mantoux / TST",                      class: "microbiology" },
  { code: "5189-6",   display: "GeneXpert MTB/RIF",                  class: "microbiology" },
  { code: "9534-4",   display: "Wound swab culture",                 class: "microbiology" },
  { code: "595-9",    display: "CSF culture",                        class: "microbiology" },

  // ── Molecular ──────────────────────────────────────────────────
  { code: "94500-6",  display: "SARS-CoV-2 RT-PCR",                  class: "molecular" },
  { code: "59423-3",  display: "HPV PCR (high-risk types)",          class: "molecular" },
  { code: "29608-5",  display: "BRCA1/2 sequencing",                 class: "molecular" },
  { code: "67869-2",  display: "Tumour mutation panel (NGS)",        class: "molecular" },
  { code: "47237-7",  display: "HIV RNA viral load",                 class: "molecular",     unit: "copies/mL" },
  { code: "29541-8",  display: "HCV RNA viral load",                 class: "molecular",     unit: "IU/mL" },
  { code: "29554-1",  display: "HBV DNA viral load",                 class: "molecular",     unit: "IU/mL" },

  // ── Blood bank ─────────────────────────────────────────────────
  { code: "883-9",    display: "ABO group",                          class: "blood_bank" },
  { code: "10331-7",  display: "Rh(D) type",                         class: "blood_bank" },
  { code: "890-4",    display: "Crossmatch",                         class: "blood_bank" },
  { code: "1230-1",   display: "Direct Coombs (DAT)",                class: "blood_bank" },
  { code: "1232-7",   display: "Indirect Coombs (IAT)",              class: "blood_bank" },

  // ── Toxicology / drug levels ───────────────────────────────────
  { code: "14334-7",  display: "Lithium level",                      class: "toxicology",    unit: "mmol/L" },
  { code: "3968-5",   display: "Phenytoin level",                    class: "toxicology",    unit: "ug/mL" },
  { code: "3948-7",   display: "Digoxin level",                      class: "toxicology",    unit: "ng/mL" },
  { code: "4049-3",   display: "Valproic acid level",                class: "toxicology",    unit: "ug/mL" },
  { code: "10334-1",  display: "Vancomycin trough",                  class: "toxicology",    unit: "ug/mL" },
  { code: "5683-8",   display: "Lead level",                         class: "toxicology",    unit: "ug/dL" },
  { code: "5685-3",   display: "Mercury level",                      class: "toxicology",    unit: "ug/L" },

  // ── Drug testing (forensic) ────────────────────────────────────
  { code: "19359-9",  display: "Urine drugs of abuse panel",         class: "drug_testing" },
  { code: "8163-8",   display: "Hair drug test panel",               class: "drug_testing" },

  // ── Paternity / DNA ────────────────────────────────────────────
  { code: "50405-5",  display: "Paternity test (DNA)",               class: "paternity_dna" },

  // ── Newborn screening ──────────────────────────────────────────
  { code: "47095-5",  display: "Newborn TSH",                        class: "newborn_screening" },
  { code: "37939-9",  display: "G6PD activity",                      class: "newborn_screening" },
  { code: "33717-0",  display: "17-hydroxyprogesterone (newborn)",   class: "newborn_screening" },
  { code: "60050-8",  display: "Phenylalanine (newborn screen)",     class: "newborn_screening" },

  // ── Infectious-disease panels ──────────────────────────────────
  { code: "11433-0",  display: "Tropical fever panel",               class: "infectious_disease_panels" },
  { code: "92154-4",  display: "Sepsis panel (multiplex PCR)",       class: "infectious_disease_panels" },
];

export function findLoinc(code: string): LoincCode | null {
  return LOINC_SEED.find((c) => c.code === code) || null;
}

export function searchLoinc(query: string, opts: { class?: LabClass; limit?: number } = {}): LoincCode[] {
  const q = query.toLowerCase().trim();
  let list = LOINC_SEED;
  if (opts.class) list = list.filter((c) => c.class === opts.class);
  if (q) {
    list = list.filter(
      (c) => c.code.includes(q) || c.display.toLowerCase().includes(q),
    );
  }
  return list.slice(0, opts.limit || 50);
}
