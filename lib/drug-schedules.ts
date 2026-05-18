// Drug schedule classification — single source of truth for the
// dispensing rules. Spec v5.1 §41.2 / Cowork_Complete §13.
//
// Indian Drugs & Cosmetics Act schedules drive every dispense
// decision: whether a prescription is required, whether a special
// register entry is needed, whether biometric pharmacist auth is
// mandated, whether cold-chain handling applies.
//
// The pharma catalogue + hospital formulary already type-check
// against this enum; consumers (patient Rx view, pharmacy dispense
// counter, /verify-medicine, AI Rx assistant) import the helpers
// below to render consistent badges and gate dispense behaviour.

export type DrugSchedule = "OTC" | "H" | "H1" | "X" | "G" | "K";

export interface DrugScheduleInfo {
  code: DrugSchedule;
  label: string;
  longLabel: string;
  examples: string[];
  /** Patient-facing explanation that appears on /verify-medicine. */
  patientHint: string;
  /** Pharmacy compliance rule — what the counter must do. */
  dispenseRule: string;
  /** Whether the pharmacy can sell without a prescription. */
  requiresPrescription: boolean;
  /** Whether a separate register entry + 3-year retention applies. */
  requiresRegisterEntry: boolean;
  /** Whether biometric pharmacist auth is required at dispense. */
  requiresBiometricAuth: boolean;
  /** Whether the drug needs temperature-logged cold-chain handling. */
  coldChain: boolean;
  /** Tailwind colour tokens for the badge. */
  badge: {
    bg: string;
    text: string;
    ring: string;
  };
}

export const SCHEDULES: Record<DrugSchedule, DrugScheduleInfo> = {
  OTC: {
    code: "OTC",
    label: "OTC",
    longLabel: "Schedule K · over the counter",
    examples: ["Paracetamol", "Antacids", "ORS", "Basic vitamins"],
    patientHint: "Sold over the counter. No prescription required.",
    dispenseRule: "No Rx · self-checkout permitted · age-gated where applicable.",
    requiresPrescription: false,
    requiresRegisterEntry: false,
    requiresBiometricAuth: false,
    coldChain: false,
    badge: { bg: "bg-emerald-100", text: "text-emerald-800", ring: "ring-emerald-300" },
  },
  H: {
    code: "H",
    label: "Schedule H",
    longLabel: "Schedule H · prescription required",
    examples: ["Antibiotics", "Antihypertensives", "Antidiabetics", "Statins"],
    patientHint: "Prescription required. Don't take without a doctor's instruction.",
    dispenseRule: "Prescription mandatory · digital QR-verified Rx accepted · retain for 2 years.",
    requiresPrescription: true,
    requiresRegisterEntry: false,
    requiresBiometricAuth: false,
    coldChain: false,
    badge: { bg: "bg-sky-100", text: "text-sky-800", ring: "ring-sky-300" },
  },
  H1: {
    code: "H1",
    label: "Schedule H1",
    longLabel: "Schedule H1 · strict prescription + register",
    examples: ["Tramadol", "Alprazolam", "Zolpidem", "Certain antibiotics"],
    patientHint: "Strict prescription required. Pharmacist must record this sale.",
    dispenseRule: "Rx + separate H1 register · pharmacist co-sign · 3-year retention.",
    requiresPrescription: true,
    requiresRegisterEntry: true,
    requiresBiometricAuth: false,
    coldChain: false,
    badge: { bg: "bg-amber-100", text: "text-amber-900", ring: "ring-amber-300" },
  },
  X: {
    code: "X",
    label: "NDPS",
    longLabel: "Schedule X · narcotic / NDPS",
    examples: ["Morphine", "Fentanyl", "Methylphenidate", "Ketamine"],
    patientHint: "Narcotic. Triplicate prescription + biometric ID at the pharmacy.",
    dispenseRule: "Triplicate Rx · NDPS register · biometric pharmacist auth · special audit.",
    requiresPrescription: true,
    requiresRegisterEntry: true,
    requiresBiometricAuth: true,
    coldChain: false,
    badge: { bg: "bg-rose-100", text: "text-rose-900", ring: "ring-rose-300" },
  },
  G: {
    code: "G",
    label: "Cold chain",
    longLabel: "Schedule G · cold chain",
    examples: ["Vaccines", "Insulin", "Biologics", "Some chemo"],
    patientHint: "Cold chain. Store in fridge (2–8 °C). Don't accept if the seal is warm.",
    dispenseRule: "Temperature-logged cold chain · break-of-chain rejection · time-since-removal tracked.",
    requiresPrescription: true,
    requiresRegisterEntry: false,
    requiresBiometricAuth: false,
    coldChain: true,
    badge: { bg: "bg-cyan-100", text: "text-cyan-900", ring: "ring-cyan-300" },
  },
  K: {
    code: "K",
    label: "AYUSH",
    longLabel: "AYUSH (Ayurveda · Homoeopathy)",
    examples: ["Classical Ayurveda formulations", "Single-remedy homoeopathy", "Mother tinctures"],
    patientHint: "AYUSH product — distinct from allopathic drugs. Check label for the AYUSH license number.",
    dispenseRule: "AYUSH licence · separate catalogue · not interchangeable with allopathic.",
    requiresPrescription: false,
    requiresRegisterEntry: false,
    requiresBiometricAuth: false,
    coldChain: false,
    badge: { bg: "bg-violet-100", text: "text-violet-900", ring: "ring-violet-300" },
  },
};

export function getScheduleInfo(code: string | undefined | null): DrugScheduleInfo | null {
  if (!code) return null;
  const upper = code.toUpperCase() as DrugSchedule;
  return SCHEDULES[upper] || null;
}

export function requiresPrescription(code: string | undefined | null): boolean {
  return !!getScheduleInfo(code)?.requiresPrescription;
}
