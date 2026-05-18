// Lab test class registry — the 17 LOINC-aligned families a
// pathology lab can be licensed to perform. Spec v6.0 §14.
//
// Each class drives:
//   - The lab's catalogue (which tests it offers).
//   - Compliance flags (chain-of-custody, NABL, biosafety level).
//   - Sample handling rules (cold-chain, fixative, transport time).
//
// Class metadata is hand-curated; per-test LOINC codes live in
// lib/lab-tests.ts (large reference file shipped separately) — this
// module covers the class taxonomy + handling rules.

export type LabTestClass =
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

export interface LabTestClassInfo {
  code: LabTestClass;
  label: string;
  emoji: string;
  description: string;
  examples: string[];
  flags: {
    /** Chain of custody (court-admissible). */
    chainOfCustody: boolean;
    /** NABL accreditation required for India. */
    nablRequired: boolean;
    /** Biosafety level (2 = standard, 3 = airborne pathogens). */
    biosafetyLevel: 1 | 2 | 3;
    /** Sample must be transported cold (vacutainer on ice). */
    coldChain: boolean;
    /** Critical-value escalation by default. */
    criticalValueEscalation: boolean;
  };
  /** Typical turnaround time in hours. */
  typicalTatHours: number;
  badge: { bg: string; text: string; ring: string };
}

export const LAB_TEST_CLASSES: LabTestClassInfo[] = [
  { code: "haematology", label: "Haematology", emoji: "🩸", description: "CBC, ESR, peripheral smear, reticulocyte count.", examples: ["CBC", "ESR", "Peripheral smear", "PT/INR"], flags: { chainOfCustody: false, nablRequired: true, biosafetyLevel: 2, coldChain: false, criticalValueEscalation: true }, typicalTatHours: 4, badge: { bg: "bg-rose-100", text: "text-rose-800", ring: "ring-rose-300" } },
  { code: "biochemistry", label: "Biochemistry", emoji: "🧪", description: "LFT, KFT, lipids, electrolytes, glucose panel.", examples: ["LFT", "KFT", "Lipid profile", "HbA1c"], flags: { chainOfCustody: false, nablRequired: true, biosafetyLevel: 2, coldChain: false, criticalValueEscalation: true }, typicalTatHours: 4, badge: { bg: "bg-amber-100", text: "text-amber-800", ring: "ring-amber-300" } },
  { code: "endocrinology", label: "Endocrinology", emoji: "🧬", description: "Thyroid, sex hormones, cortisol, growth hormone.", examples: ["TSH", "T3/T4", "Testosterone", "Cortisol"], flags: { chainOfCustody: false, nablRequired: true, biosafetyLevel: 2, coldChain: true, criticalValueEscalation: false }, typicalTatHours: 12, badge: { bg: "bg-fuchsia-100", text: "text-fuchsia-800", ring: "ring-fuchsia-300" } },
  { code: "immunology", label: "Immunology", emoji: "🛡️", description: "Autoimmune panels, allergens, immunoglobulins.", examples: ["ANA", "RF", "C3/C4", "Allergen panels"], flags: { chainOfCustody: false, nablRequired: true, biosafetyLevel: 2, coldChain: true, criticalValueEscalation: false }, typicalTatHours: 24, badge: { bg: "bg-violet-100", text: "text-violet-800", ring: "ring-violet-300" } },
  { code: "serology", label: "Serology", emoji: "🦠", description: "Viral markers, antibody titres (HBsAg, HCV, HIV, COVID, dengue).", examples: ["HBsAg", "Anti-HCV", "HIV ELISA", "Dengue NS1/IgM"], flags: { chainOfCustody: false, nablRequired: true, biosafetyLevel: 2, coldChain: false, criticalValueEscalation: true }, typicalTatHours: 6, badge: { bg: "bg-cyan-100", text: "text-cyan-800", ring: "ring-cyan-300" } },
  { code: "microbiology", label: "Microbiology", emoji: "🧫", description: "Cultures + sensitivities. Bacterial / fungal / TB.", examples: ["Urine culture", "Blood culture", "Sputum AFB", "Stool culture"], flags: { chainOfCustody: false, nablRequired: true, biosafetyLevel: 3, coldChain: false, criticalValueEscalation: true }, typicalTatHours: 72, badge: { bg: "bg-emerald-100", text: "text-emerald-800", ring: "ring-emerald-300" } },
  { code: "molecular", label: "Molecular", emoji: "🧬", description: "PCR, RT-PCR, NGS panels.", examples: ["COVID PCR", "HPV PCR", "BRCA panel", "Tumour mutation panel"], flags: { chainOfCustody: false, nablRequired: true, biosafetyLevel: 2, coldChain: true, criticalValueEscalation: false }, typicalTatHours: 48, badge: { bg: "bg-indigo-100", text: "text-indigo-800", ring: "ring-indigo-300" } },
  { code: "cytogenetics", label: "Cytogenetics", emoji: "🧫", description: "Karyotyping, FISH, chromosomal microarray.", examples: ["Karyotype", "FISH (BCR-ABL)", "Microarray"], flags: { chainOfCustody: false, nablRequired: true, biosafetyLevel: 2, coldChain: true, criticalValueEscalation: false }, typicalTatHours: 168, badge: { bg: "bg-purple-100", text: "text-purple-800", ring: "ring-purple-300" } },
  { code: "histopathology", label: "Histopathology", emoji: "🔬", description: "Tissue biopsies, IHC, tumour grading.", examples: ["Biopsy", "Mastectomy specimen", "Colon polyp", "Skin punch"], flags: { chainOfCustody: false, nablRequired: true, biosafetyLevel: 2, coldChain: false, criticalValueEscalation: false }, typicalTatHours: 96, badge: { bg: "bg-pink-100", text: "text-pink-800", ring: "ring-pink-300" } },
  { code: "cytology", label: "Cytology", emoji: "🔬", description: "Pap smear, FNAC, body-fluid cytology.", examples: ["Pap smear", "FNAC thyroid", "Pleural fluid cytology"], flags: { chainOfCustody: false, nablRequired: true, biosafetyLevel: 2, coldChain: false, criticalValueEscalation: false }, typicalTatHours: 48, badge: { bg: "bg-rose-100", text: "text-rose-800", ring: "ring-rose-300" } },
  { code: "haemato_oncology", label: "Haemato-oncology", emoji: "🎗️", description: "Flow cytometry, leukaemia panels, BCR-ABL.", examples: ["Flow cytometry — leukaemia panel", "BCR-ABL (qual)", "BCR-ABL (quant)"], flags: { chainOfCustody: false, nablRequired: true, biosafetyLevel: 2, coldChain: true, criticalValueEscalation: true }, typicalTatHours: 72, badge: { bg: "bg-violet-100", text: "text-violet-800", ring: "ring-violet-300" } },
  { code: "blood_bank", label: "Blood bank", emoji: "🩸", description: "Crossmatch, blood-product issue, donor screening.", examples: ["Crossmatch", "Donor screening", "Component issue"], flags: { chainOfCustody: true, nablRequired: true, biosafetyLevel: 2, coldChain: true, criticalValueEscalation: true }, typicalTatHours: 1, badge: { bg: "bg-red-100", text: "text-red-800", ring: "ring-red-300" } },
  { code: "toxicology", label: "Toxicology", emoji: "☠️", description: "Therapeutic drug monitoring, heavy metals, poisons.", examples: ["Lithium level", "Phenytoin", "Lead", "Mercury"], flags: { chainOfCustody: false, nablRequired: true, biosafetyLevel: 2, coldChain: true, criticalValueEscalation: true }, typicalTatHours: 24, badge: { bg: "bg-yellow-100", text: "text-yellow-900", ring: "ring-yellow-300" } },
  { code: "drug_testing", label: "Drug testing (forensic)", emoji: "⚖️", description: "Workplace / forensic urine + hair drug screening. Chain-of-custody mandatory.", examples: ["Urine drugs of abuse", "Hair drug test"], flags: { chainOfCustody: true, nablRequired: true, biosafetyLevel: 2, coldChain: false, criticalValueEscalation: false }, typicalTatHours: 24, badge: { bg: "bg-slate-200", text: "text-slate-800", ring: "ring-slate-400" } },
  { code: "paternity_dna", label: "Paternity / DNA", emoji: "🧬", description: "Court-admissible paternity testing. Chain-of-custody mandatory.", examples: ["Paternity test", "Sibling DNA", "Identity DNA"], flags: { chainOfCustody: true, nablRequired: true, biosafetyLevel: 2, coldChain: false, criticalValueEscalation: false }, typicalTatHours: 168, badge: { bg: "bg-blue-100", text: "text-blue-800", ring: "ring-blue-300" } },
  { code: "newborn_screening", label: "Newborn screening", emoji: "👶", description: "Heel-prick panels: PKU, hypothyroidism, G6PD.", examples: ["TSH (newborn)", "G6PD", "17-OHP", "PKU"], flags: { chainOfCustody: false, nablRequired: true, biosafetyLevel: 2, coldChain: false, criticalValueEscalation: true }, typicalTatHours: 72, badge: { bg: "bg-orange-100", text: "text-orange-800", ring: "ring-orange-300" } },
  { code: "infectious_disease_panels", label: "Infectious-disease panels", emoji: "🦠", description: "Tropical fever, fever-of-unknown-origin panels (multiplex PCR + culture).", examples: ["Tropical fever panel", "FUO panel", "Sepsis panel"], flags: { chainOfCustody: false, nablRequired: true, biosafetyLevel: 3, coldChain: true, criticalValueEscalation: true }, typicalTatHours: 24, badge: { bg: "bg-teal-100", text: "text-teal-800", ring: "ring-teal-300" } },
];

export function getLabClassInfo(code: string | undefined | null): LabTestClassInfo | null {
  if (!code) return null;
  return LAB_TEST_CLASSES.find((c) => c.code === code) || null;
}
