// Pharmacy store classes — single source of truth for the 7
// categories a pharmacy tenant can be licensed to operate. Spec
// v5.1 §41.1 / Cowork_Complete §13.
//
// One physical pharmacy commonly enables medicine + surgical + OTC
// together. Each class carries its own licence requirement and
// inventory rules, so the data model has to keep them distinct:
// a hospital pharmacy buying implants needs a separate paper trail
// from buying paracetamol.
//
// Surfaces:
//   - Pharma drug admin can tag each SKU with a primary store class.
//   - Pharmacy tenant admin enables a subset of classes for sale.
//   - Patient storefront filters by class so "I need a stethoscope"
//     and "I need amoxicillin" produce different result sets.

export type PharmacyStoreClass =
  | "medicine"
  | "surgical"
  | "instruments"
  | "otc_wellness"
  | "implants"
  | "diagnostic_consumables"
  | "veterinary";

export interface StoreClassInfo {
  code: PharmacyStoreClass;
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
  /** Headline examples for the storefront filter chip tooltip. */
  examples: string[];
  /** Compliance flags surfaced on the admin panel + sale. */
  flags: {
    /** Requires a separate drug licence (Form 20/21 in India). */
    drugLicence: boolean;
    /** Patient-facing prescription gate (if any item in the class is
     *  Schedule H/H1/X). The actual gate is per-SKU; this is the
     *  conservative class-level rule of thumb. */
    rxGated: boolean;
    /** Implant log / serial-tracked per patient. */
    serialTracked: boolean;
    /** Some items need cold-chain handling. */
    coldChain: boolean;
    /** Lab-only sales — not over the counter to retail patients. */
    labOnly: boolean;
  };
  /** Tailwind badge palette. */
  badge: { bg: string; text: string; ring: string };
}

export const STORE_CLASSES: Record<PharmacyStoreClass, StoreClassInfo> = {
  medicine: {
    code: "medicine",
    label: "Medicine pharmacy",
    shortLabel: "Medicine",
    emoji: "💊",
    description: "Prescription and over-the-counter pharmaceuticals — generics and branded.",
    examples: ["Antibiotics", "Antihypertensives", "Analgesics", "Branded + generic"],
    flags: { drugLicence: true, rxGated: true, serialTracked: false, coldChain: false, labOnly: false },
    badge: { bg: "bg-emerald-100", text: "text-emerald-800", ring: "ring-emerald-300" },
  },
  surgical: {
    code: "surgical",
    label: "Surgical store",
    shortLabel: "Surgical",
    emoji: "🧵",
    description: "Sutures, gauze, dressings, cannulas, catheters, drapes, OT linen, gowns, gloves, masks.",
    examples: ["Sutures", "Cannulas", "Surgical gloves", "OT drapes"],
    flags: { drugLicence: false, rxGated: false, serialTracked: false, coldChain: false, labOnly: false },
    badge: { bg: "bg-sky-100", text: "text-sky-800", ring: "ring-sky-300" },
  },
  instruments: {
    code: "instruments",
    label: "Medical instruments",
    shortLabel: "Instruments",
    emoji: "🩺",
    description: "Stethoscopes, BP monitors, glucometers, pulse oximeters, thermometers, syringes, needles, surgical tools.",
    examples: ["Stethoscopes", "Glucometers", "Pulse oximeters", "Thermometers"],
    flags: { drugLicence: false, rxGated: false, serialTracked: false, coldChain: false, labOnly: false },
    badge: { bg: "bg-indigo-100", text: "text-indigo-800", ring: "ring-indigo-300" },
  },
  otc_wellness: {
    code: "otc_wellness",
    label: "OTC & wellness",
    shortLabel: "OTC / wellness",
    emoji: "🌿",
    description: "Supplements, vitamins, baby care, sanitary, first aid, mobility aids, home BP/sugar monitors.",
    examples: ["Multivitamins", "Baby care", "First aid", "Mobility aids"],
    flags: { drugLicence: false, rxGated: false, serialTracked: false, coldChain: false, labOnly: false },
    badge: { bg: "bg-amber-100", text: "text-amber-900", ring: "ring-amber-300" },
  },
  implants: {
    code: "implants",
    label: "Implants & prosthetics",
    shortLabel: "Implants",
    emoji: "🦿",
    description: "Lens, joints, mesh, pacemaker, stents, dental implants. Serial-tracked per patient with recall traceability.",
    examples: ["IOL lenses", "Knee implants", "Cardiac stents", "Dental implants"],
    flags: { drugLicence: false, rxGated: true, serialTracked: true, coldChain: false, labOnly: false },
    badge: { bg: "bg-rose-100", text: "text-rose-900", ring: "ring-rose-300" },
  },
  diagnostic_consumables: {
    code: "diagnostic_consumables",
    label: "Diagnostic consumables",
    shortLabel: "Diagnostics",
    emoji: "🧪",
    description: "Reagents, controls, sample tubes, microscope slides, stains, calibrators. Lab sales only.",
    examples: ["Reagents", "Sample tubes", "Microscope slides", "Calibrators"],
    flags: { drugLicence: false, rxGated: false, serialTracked: false, coldChain: true, labOnly: true },
    badge: { bg: "bg-cyan-100", text: "text-cyan-900", ring: "ring-cyan-300" },
  },
  veterinary: {
    code: "veterinary",
    label: "Veterinary",
    shortLabel: "Veterinary",
    emoji: "🐾",
    description: "Animal medicines, vaccines, surgical supplies. Separate licence and user flow.",
    examples: ["Animal antibiotics", "Vet vaccines", "Vet anaesthetics"],
    flags: { drugLicence: true, rxGated: true, serialTracked: false, coldChain: true, labOnly: false },
    badge: { bg: "bg-violet-100", text: "text-violet-900", ring: "ring-violet-300" },
  },
};

export const STORE_CLASS_LIST: StoreClassInfo[] = [
  STORE_CLASSES.medicine,
  STORE_CLASSES.surgical,
  STORE_CLASSES.instruments,
  STORE_CLASSES.otc_wellness,
  STORE_CLASSES.implants,
  STORE_CLASSES.diagnostic_consumables,
  STORE_CLASSES.veterinary,
];

export function getStoreClassInfo(code: string | undefined | null): StoreClassInfo | null {
  if (!code) return null;
  return STORE_CLASSES[code as PharmacyStoreClass] || null;
}
