// Medicines catalog — generic ↔ brand mapping.
//
// This is the canonical lookup used by the pharmacy-matching API to
// normalize whatever the doctor wrote on the Rx (brand or generic,
// any capitalization) into a stable `medicineId` that vendor inventory
// rows are keyed on.
//
// Scope for Phase D: a small curated seed (~35 entries) covering the
// medicines our clinical presets actually prescribe. The shape is
// deliberately import-friendly so we can later bulk-load from openFDA,
// CDSCO, or a vendor's CSV without touching consumers.
//
// Matching rules:
//   - exact match on id, generic name, or any brand name (case-insensitive)
//   - falls back to a loose contains-match on generic name so "paracetamol
//     500mg" on the Rx still resolves to the "paracetamol" entry
//   - when nothing matches, the Rx line is returned as an "unmatched"
//     entry so the patient still sees what was prescribed, just without
//     vendor pricing.

import { bindPersistentArray } from "./persistent-array";

export type MedicineForm =
  | "tablet"
  | "capsule"
  | "syrup"
  | "injection"
  | "ointment"
  | "drops"
  | "inhaler"
  | "other";

export interface CatalogMedicine {
  id: string; // stable slug, e.g. "paracetamol"
  generic: string; // canonical generic name
  brands: string[]; // common Indian brand names
  composition?: string; // active ingredient(s) + strength hint
  form: MedicineForm;
  strengths: string[]; // e.g. ["500mg", "650mg"]
  otc: boolean; // over-the-counter or prescription only
  createdAt: string;
  updatedAt: string;
}

const medicines: CatalogMedicine[] = [];
const { hydrate, flush } = bindPersistentArray<CatalogMedicine>(
  "medicines-catalog",
  medicines,
  () => seedCatalog(),
);
await hydrate();

// Idempotent top-up: if we added entries to the seed after deploy, make
// sure they land in the already-hydrated DB copy too. Keyed by id so
// already-present rows are untouched.
(function ensureSeed() {
  const seed = seedCatalog();
  let added = 0;
  for (const m of seed) {
    if (!medicines.some((x) => x.id === m.id)) {
      medicines.push(m);
      added++;
    }
  }
  if (added > 0) flush();
})();

function nowIso() {
  return new Date().toISOString();
}

function seedCatalog(): CatalogMedicine[] {
  const n = nowIso();
  const mk = (
    id: string,
    generic: string,
    brands: string[],
    form: MedicineForm,
    strengths: string[],
    otc: boolean,
    composition?: string,
  ): CatalogMedicine => ({
    id,
    generic,
    brands,
    composition: composition || generic,
    form,
    strengths,
    otc,
    createdAt: n,
    updatedAt: n,
  });

  return [
    // Analgesics / antipyretics
    mk("paracetamol", "Paracetamol", ["Crocin", "Dolo", "Calpol", "Tylenol"], "tablet", ["500mg", "650mg"], true),
    mk("ibuprofen", "Ibuprofen", ["Brufen", "Combiflam", "Advil"], "tablet", ["200mg", "400mg"], true),
    mk("aspirin", "Aspirin", ["Disprin", "Ecosprin"], "tablet", ["75mg", "325mg"], true),
    mk("diclofenac", "Diclofenac", ["Voveran", "Voltaren"], "tablet", ["50mg"], false),
    mk("tramadol", "Tramadol", ["Ultracet", "Tramasure"], "tablet", ["50mg", "100mg"], false),

    // Antibiotics
    mk("amoxicillin", "Amoxicillin", ["Mox", "Novamox", "Amoxil"], "capsule", ["250mg", "500mg"], false),
    mk("amoxiclav", "Amoxicillin + Clavulanic acid", ["Augmentin", "Clavam"], "tablet", ["625mg"], false, "Amoxicillin 500mg + Clavulanic acid 125mg"),
    mk("azithromycin", "Azithromycin", ["Azithral", "Azee", "Zithromax"], "tablet", ["250mg", "500mg"], false),
    mk("cefixime", "Cefixime", ["Taxim-O", "Zifi"], "tablet", ["200mg"], false),
    mk("ciprofloxacin", "Ciprofloxacin", ["Ciplox", "Cifran"], "tablet", ["250mg", "500mg"], false),
    mk("doxycycline", "Doxycycline", ["Doxy-1", "Vibramycin"], "capsule", ["100mg"], false),
    mk("metronidazole", "Metronidazole", ["Flagyl", "Metrogyl"], "tablet", ["200mg", "400mg"], false),

    // GI
    mk("pantoprazole", "Pantoprazole", ["Pan", "Pantocid"], "tablet", ["40mg"], false),
    mk("omeprazole", "Omeprazole", ["Omez", "Ocid"], "capsule", ["20mg"], false),
    mk("ranitidine", "Ranitidine", ["Rantac", "Zinetac"], "tablet", ["150mg"], true),
    mk("ondansetron", "Ondansetron", ["Emeset", "Vomikind"], "tablet", ["4mg", "8mg"], false),
    mk("ors", "Oral Rehydration Salts", ["Electral", "WalyteORS"], "other", ["sachet"], true),
    mk("loperamide", "Loperamide", ["Imodium", "Eldoper"], "tablet", ["2mg"], true),

    // Allergy / respiratory
    mk("cetirizine", "Cetirizine", ["Zyrtec", "Cetzine", "Alerid"], "tablet", ["10mg"], true),
    mk("loratadine", "Loratadine", ["Claritin", "Lorfast"], "tablet", ["10mg"], true),
    mk("levocetirizine", "Levocetirizine", ["Xyzal", "Teczine"], "tablet", ["5mg"], true),
    mk("montelukast", "Montelukast", ["Montair", "Singulair"], "tablet", ["10mg"], false),
    mk("salbutamol", "Salbutamol", ["Asthalin", "Ventolin"], "inhaler", ["100mcg"], false),
    mk("dextromethorphan", "Dextromethorphan", ["Benadryl DR", "Tossex"], "syrup", ["100ml"], true),

    // Cardio / metabolic
    mk("amlodipine", "Amlodipine", ["Amlokind", "Stamlo"], "tablet", ["2.5mg", "5mg", "10mg"], false),
    mk("telmisartan", "Telmisartan", ["Telma", "Telvas"], "tablet", ["20mg", "40mg", "80mg"], false),
    mk("atorvastatin", "Atorvastatin", ["Atorva", "Lipitor"], "tablet", ["10mg", "20mg", "40mg"], false),
    mk("metformin", "Metformin", ["Glycomet", "Glucophage"], "tablet", ["500mg", "850mg", "1000mg"], false),
    mk("glimepiride", "Glimepiride", ["Amaryl", "Glimisave"], "tablet", ["1mg", "2mg"], false),

    // Other
    mk("vitamin-d3", "Cholecalciferol (Vitamin D3)", ["Uprise D3", "Calcirol"], "other", ["60000 IU"], true),
    mk("vitamin-b-complex", "Vitamin B Complex", ["Becosules", "Neurobion"], "capsule", ["standard"], true),
    mk("folic-acid", "Folic Acid", ["Folvite"], "tablet", ["5mg"], true),
    mk("iron-folic", "Ferrous + Folic Acid", ["Livogen", "Fefol"], "tablet", ["standard"], true),
    mk("thyroxine", "Levothyroxine", ["Thyronorm", "Eltroxin"], "tablet", ["25mcg", "50mcg", "100mcg"], false),
    mk("prednisolone", "Prednisolone", ["Wysolone", "Omnacortil"], "tablet", ["5mg", "10mg"], false),
    mk("clotrimazole", "Clotrimazole", ["Candid", "Canesten"], "ointment", ["1% cream"], true),
  ];
}

// ---- lookup helpers -------------------------------------------------

export function listMedicines(): CatalogMedicine[] {
  return medicines.slice();
}

export function getMedicineById(id: string): CatalogMedicine | null {
  return medicines.find((m) => m.id === id) || null;
}

// Normalize an Rx-line label (brand or generic, possibly with strength)
// into a catalog entry. Returns null on no match so the caller can keep
// the raw string around.
export function matchMedicine(rawName: string): CatalogMedicine | null {
  const q = rawName.trim().toLowerCase();
  if (!q) return null;
  // 1) exact id / generic / brand
  for (const m of medicines) {
    if (m.id === q) return m;
    if (m.generic.toLowerCase() === q) return m;
    if (m.brands.some((b) => b.toLowerCase() === q)) return m;
  }
  // 2) starts-with on generic/brand (handles "paracetamol 500mg")
  for (const m of medicines) {
    if (q.startsWith(m.generic.toLowerCase())) return m;
    if (m.brands.some((b) => q.startsWith(b.toLowerCase()))) return m;
  }
  // 3) contains — last resort (handles "Tab. Crocin 650")
  for (const m of medicines) {
    if (q.includes(m.generic.toLowerCase())) return m;
    if (m.brands.some((b) => q.includes(b.toLowerCase()))) return m;
  }
  return null;
}

export interface CreateMedicineInput {
  id: string;
  generic: string;
  brands?: string[];
  composition?: string;
  form: MedicineForm;
  strengths?: string[];
  otc?: boolean;
}

export function createMedicine(input: CreateMedicineInput): CatalogMedicine {
  const existing = medicines.find((m) => m.id === input.id);
  if (existing) return existing;
  const m: CatalogMedicine = {
    id: input.id.trim().toLowerCase(),
    generic: input.generic.trim(),
    brands: (input.brands || []).map((b) => b.trim()).filter(Boolean),
    composition: input.composition?.trim() || input.generic.trim(),
    form: input.form,
    strengths: (input.strengths || []).map((s) => s.trim()).filter(Boolean),
    otc: !!input.otc,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  medicines.push(m);
  flush();
  return m;
}
