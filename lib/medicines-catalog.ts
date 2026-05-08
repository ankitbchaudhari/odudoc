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
  generic: string; // canonical generic name (English, ASCII)
  brands: string[]; // common Indian brand names (English, ASCII)
  composition?: string; // active ingredient(s) + strength hint
  form: MedicineForm;
  strengths: string[]; // e.g. ["500mg", "650mg"]
  otc: boolean; // over-the-counter or prescription only
  /** Country-specific native-language entries. Keys are BCP-47 lang
   *  tags ("ja", "ar", "ru", "zh-Hans", "es", "fr", "de", "pt-BR",
   *  "th", "ko"). Each language can override the generic name and
   *  add region-specific brand names so the same SKU resolves
   *  whether the doctor types "Paracetamol" or "アセトアミノフェン"
   *  or "باراسيتامول". */
  localNames?: Record<string, { generic?: string; brands?: string[] }>;
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
    localNames?: CatalogMedicine["localNames"],
  ): CatalogMedicine => ({
    id,
    generic,
    brands,
    composition: composition || generic,
    form,
    strengths,
    otc,
    localNames,
    createdAt: n,
    updatedAt: n,
  });

  return [
    // Analgesics / antipyretics
    mk("paracetamol", "Paracetamol", ["Crocin", "Dolo", "Calpol", "Tylenol", "Panadol"], "tablet", ["500mg", "650mg"], true, undefined, {
      ja:        { generic: "アセトアミノフェン", brands: ["タイレノール", "カロナール"] },
      ar:        { generic: "باراسيتامول",       brands: ["بانادول"] },
      ru:        { generic: "Парацетамол",       brands: ["Панадол"] },
      "zh-Hans": { generic: "对乙酰氨基酚",        brands: ["泰诺", "百服宁"] },
      es:        { generic: "Paracetamol",       brands: ["Termalgin", "Apiretal"] },
      fr:        { generic: "Paracétamol",       brands: ["Doliprane", "Efferalgan"] },
      de:        { generic: "Paracetamol",       brands: ["Ben-u-ron"] },
      "pt-BR":   { generic: "Paracetamol",       brands: ["Tylenol", "Doril"] },
      th:        { generic: "พาราเซตามอล",        brands: ["ไทลินอล"] },
      ko:        { generic: "아세트아미노펜",      brands: ["타이레놀"] },
    }),
    mk("ibuprofen", "Ibuprofen", ["Brufen", "Combiflam", "Advil", "Motrin", "Nurofen"], "tablet", ["200mg", "400mg"], true, undefined, {
      ja:        { generic: "イブプロフェン",   brands: ["ブルフェン"] },
      ar:        { generic: "إيبوبروفين",     brands: ["نوروفين"] },
      ru:        { generic: "Ибупрофен",     brands: ["Нурофен"] },
      "zh-Hans": { generic: "布洛芬",         brands: ["美林"] },
      es:        { generic: "Ibuprofeno",    brands: ["Espidifen", "Neobrufen"] },
      fr:        { generic: "Ibuprofène",    brands: ["Advil", "Nurofen"] },
      de:        { generic: "Ibuprofen",     brands: ["Dolormin"] },
      "pt-BR":   { generic: "Ibuprofeno",    brands: ["Advil", "Alivium"] },
    }),
    mk("aspirin", "Aspirin", ["Disprin", "Ecosprin"], "tablet", ["75mg", "325mg"], true),
    mk("diclofenac", "Diclofenac", ["Voveran", "Voltaren"], "tablet", ["50mg"], false),
    mk("tramadol", "Tramadol", ["Ultracet", "Tramasure"], "tablet", ["50mg", "100mg"], false),

    // Antibiotics
    mk("amoxicillin", "Amoxicillin", ["Mox", "Novamox", "Amoxil"], "capsule", ["250mg", "500mg"], false, undefined, {
      ja:        { generic: "アモキシシリン",  brands: ["サワシリン"] },
      ar:        { generic: "أموكسيسيلين",   brands: ["أموكسيل"] },
      ru:        { generic: "Амоксициллин",  brands: ["Флемоксин"] },
      "zh-Hans": { generic: "阿莫西林",        brands: ["阿莫仙"] },
      es:        { generic: "Amoxicilina",   brands: ["Clamoxyl"] },
      fr:        { generic: "Amoxicilline",  brands: ["Clamoxyl"] },
      de:        { generic: "Amoxicillin",   brands: ["Amoxypen"] },
      "pt-BR":   { generic: "Amoxicilina",   brands: ["Amoxil"] },
    }),
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

    // Analgesics — extended
    mk("naproxen", "Naproxen", ["Naprosyn", "Aleve"], "tablet", ["250mg", "500mg"], true),
    mk("aceclofenac", "Aceclofenac", ["Hifenac", "Zerodol"], "tablet", ["100mg"], false),
    mk("etoricoxib", "Etoricoxib", ["Etoshine", "Etody"], "tablet", ["60mg", "90mg", "120mg"], false),
    mk("mefenamic-acid", "Mefenamic Acid", ["Meftal", "Ponstan"], "tablet", ["250mg", "500mg"], false),

    // Antibiotics — extended
    mk("cephalexin", "Cephalexin", ["Sporidex", "Keflex"], "capsule", ["250mg", "500mg"], false),
    mk("cefuroxime", "Cefuroxime", ["Ceftum", "Zinacef"], "tablet", ["250mg", "500mg"], false),
    mk("cefadroxil", "Cefadroxil", ["Odoxil", "Duricef"], "capsule", ["500mg"], false),
    mk("cefpodoxime", "Cefpodoxime", ["Cefpodox", "Vantin"], "tablet", ["100mg", "200mg"], false),
    mk("levofloxacin", "Levofloxacin", ["Levoflox", "Tavanic"], "tablet", ["250mg", "500mg", "750mg"], false),
    mk("ofloxacin", "Ofloxacin", ["Oflox", "Floxin"], "tablet", ["200mg", "400mg"], false),
    mk("clarithromycin", "Clarithromycin", ["Claribid", "Biaxin"], "tablet", ["250mg", "500mg"], false),
    mk("erythromycin", "Erythromycin", ["Erythrocin", "E-Mycin"], "tablet", ["250mg", "500mg"], false),
    mk("nitrofurantoin", "Nitrofurantoin", ["Nitrofur", "Macrobid"], "tablet", ["100mg"], false),
    mk("co-trimoxazole", "Trimethoprim + Sulfamethoxazole", ["Septran", "Bactrim"], "tablet", ["480mg", "960mg"], false, "Trimethoprim 160mg + Sulfamethoxazole 800mg"),
    mk("linezolid", "Linezolid", ["Linospan", "Zyvox"], "tablet", ["600mg"], false),
    mk("rifaximin", "Rifaximin", ["Rifagut", "Xifaxan"], "tablet", ["200mg", "400mg", "550mg"], false),

    // Antifungals
    mk("fluconazole", "Fluconazole", ["Forcan", "Diflucan"], "tablet", ["50mg", "150mg", "200mg"], false),
    mk("itraconazole", "Itraconazole", ["Itrasys", "Sporanox"], "capsule", ["100mg", "200mg"], false),
    mk("terbinafine", "Terbinafine", ["Tinaderm", "Lamisil"], "tablet", ["250mg"], false),
    mk("ketoconazole", "Ketoconazole", ["Nizral", "Nizoral"], "tablet", ["200mg"], false),
    mk("griseofulvin", "Griseofulvin", ["Grisovin FP"], "tablet", ["250mg", "500mg"], false),

    // Antivirals
    mk("acyclovir", "Acyclovir", ["Zovirax", "Acivir"], "tablet", ["200mg", "400mg", "800mg"], false),
    mk("valacyclovir", "Valacyclovir", ["Valcivir", "Valtrex"], "tablet", ["500mg", "1g"], false),
    mk("oseltamivir", "Oseltamivir", ["Fluvir", "Tamiflu"], "capsule", ["30mg", "75mg"], false),

    // Antiparasitics
    mk("albendazole", "Albendazole", ["Bandy", "Zentel"], "tablet", ["400mg"], true),
    mk("mebendazole", "Mebendazole", ["Mebex", "Vermox"], "tablet", ["100mg"], true),
    mk("ivermectin", "Ivermectin", ["Ivecop", "Stromectol"], "tablet", ["6mg", "12mg"], false),
    mk("hydroxychloroquine", "Hydroxychloroquine", ["HCQS", "Plaquenil"], "tablet", ["200mg", "400mg"], false),
    mk("artemether-lumefantrine", "Artemether + Lumefantrine", ["Lumerax", "Riamet"], "tablet", ["80/480"], false, "Artemether 80mg + Lumefantrine 480mg"),

    // GI — extended
    mk("esomeprazole", "Esomeprazole", ["Nexium", "Esoz"], "tablet", ["20mg", "40mg"], false),
    mk("rabeprazole", "Rabeprazole", ["Razo", "Rablet"], "tablet", ["10mg", "20mg"], false),
    mk("lansoprazole", "Lansoprazole", ["Lanzol", "Prevacid"], "capsule", ["15mg", "30mg"], false),
    mk("famotidine", "Famotidine", ["Famocid", "Pepcid"], "tablet", ["20mg", "40mg"], true),
    mk("sucralfate", "Sucralfate", ["Sucrafil", "Carafate"], "tablet", ["1g"], false),
    mk("domperidone", "Domperidone", ["Domstal", "Motilium"], "tablet", ["10mg"], true),
    mk("metoclopramide", "Metoclopramide", ["Perinorm", "Reglan"], "tablet", ["10mg"], false),
    mk("lactulose", "Lactulose", ["Duphalac", "Cremaffin"], "syrup", ["10ml", "15ml"], true),
    mk("bisacodyl", "Bisacodyl", ["Dulcolax"], "tablet", ["5mg"], true),
    mk("racecadotril", "Racecadotril", ["Redotil", "Tiorfan"], "capsule", ["100mg"], false),
    mk("probiotic", "Probiotic (Lactobacillus / Saccharomyces)", ["Vibact", "Econorm", "Florastor"], "other", ["sachet"], true),

    // Allergy / Respiratory — extended
    mk("fexofenadine", "Fexofenadine", ["Allegra", "Fexova"], "tablet", ["120mg", "180mg"], true),
    mk("desloratadine", "Desloratadine", ["Deselex", "Clarinex"], "tablet", ["5mg"], true),
    mk("bilastine", "Bilastine", ["Blaston", "Bilaxten"], "tablet", ["20mg"], false),
    mk("hydroxyzine", "Hydroxyzine", ["Atarax"], "tablet", ["10mg", "25mg"], false),
    mk("budesonide", "Budesonide", ["Budecort", "Pulmicort"], "inhaler", ["100mcg", "200mcg"], false),
    mk("fluticasone", "Fluticasone", ["Flohale", "Flovent"], "inhaler", ["125mcg"], false),
    mk("formoterol-budesonide", "Formoterol + Budesonide", ["Foracort", "Symbicort"], "inhaler", ["6/200"], false, "Formoterol 6mcg + Budesonide 200mcg"),
    mk("salmeterol-fluticasone", "Salmeterol + Fluticasone", ["Seroflo", "Advair"], "inhaler", ["50/250"], false, "Salmeterol 50mcg + Fluticasone 250mcg"),
    mk("tiotropium", "Tiotropium", ["Tiova", "Spiriva"], "inhaler", ["18mcg"], false),
    mk("ambroxol", "Ambroxol", ["Mucolite", "Mucobrox"], "syrup", ["30mg/5ml"], true),
    mk("acetylcysteine", "Acetylcysteine", ["Mucinac", "Mucomyst"], "tablet", ["600mg"], true),

    // Cardio — extended
    mk("losartan", "Losartan", ["Repace", "Cozaar"], "tablet", ["25mg", "50mg", "100mg"], false),
    mk("olmesartan", "Olmesartan", ["Olmin", "Benicar"], "tablet", ["20mg", "40mg"], false),
    mk("valsartan", "Valsartan", ["Diovan", "Valent"], "tablet", ["80mg", "160mg"], false),
    mk("ramipril", "Ramipril", ["Cardace", "Altace"], "tablet", ["2.5mg", "5mg", "10mg"], false),
    mk("enalapril", "Enalapril", ["Envas", "Vasotec"], "tablet", ["2.5mg", "5mg", "10mg"], false),
    mk("lisinopril", "Lisinopril", ["Listril", "Prinivil"], "tablet", ["5mg", "10mg", "20mg"], false),
    mk("metoprolol", "Metoprolol", ["Metolar", "Lopressor"], "tablet", ["25mg", "50mg", "100mg"], false),
    mk("atenolol", "Atenolol", ["Aten", "Tenormin"], "tablet", ["25mg", "50mg", "100mg"], false),
    mk("bisoprolol", "Bisoprolol", ["Concor", "Zebeta"], "tablet", ["2.5mg", "5mg", "10mg"], false),
    mk("carvedilol", "Carvedilol", ["Carca", "Coreg"], "tablet", ["3.125mg", "6.25mg", "12.5mg", "25mg"], false),
    mk("rosuvastatin", "Rosuvastatin", ["Rosuvas", "Crestor"], "tablet", ["5mg", "10mg", "20mg"], false),
    mk("ezetimibe", "Ezetimibe", ["Ezedoc", "Zetia"], "tablet", ["10mg"], false),
    mk("fenofibrate", "Fenofibrate", ["Lipicard", "Tricor"], "tablet", ["145mg", "160mg"], false),
    mk("clopidogrel", "Clopidogrel", ["Clopilet", "Plavix"], "tablet", ["75mg"], false),
    mk("ticagrelor", "Ticagrelor", ["Brilinta"], "tablet", ["90mg"], false),
    mk("warfarin", "Warfarin", ["Warf", "Coumadin"], "tablet", ["1mg", "2mg", "5mg"], false),
    mk("apixaban", "Apixaban", ["Eliquis"], "tablet", ["2.5mg", "5mg"], false),
    mk("rivaroxaban", "Rivaroxaban", ["Xarelto"], "tablet", ["10mg", "15mg", "20mg"], false),
    mk("furosemide", "Furosemide", ["Lasix"], "tablet", ["20mg", "40mg"], false),
    mk("torsemide", "Torsemide", ["Dytor", "Demadex"], "tablet", ["5mg", "10mg", "20mg"], false),
    mk("spironolactone", "Spironolactone", ["Aldactone"], "tablet", ["25mg", "50mg", "100mg"], false),
    mk("hydrochlorothiazide", "Hydrochlorothiazide", ["Aquazide", "Microzide"], "tablet", ["12.5mg", "25mg"], false),
    mk("digoxin", "Digoxin", ["Lanoxin"], "tablet", ["0.25mg"], false),
    mk("isosorbide-mononitrate", "Isosorbide Mononitrate", ["Monotrate", "Imdur"], "tablet", ["20mg", "40mg"], false),

    // Diabetes — extended
    mk("sitagliptin", "Sitagliptin", ["Januvia", "Istavel"], "tablet", ["50mg", "100mg"], false),
    mk("vildagliptin", "Vildagliptin", ["Galvus", "Jalra"], "tablet", ["50mg"], false),
    mk("teneligliptin", "Teneligliptin", ["Tenepride", "Ziten"], "tablet", ["20mg"], false),
    mk("linagliptin", "Linagliptin", ["Trajenta"], "tablet", ["5mg"], false),
    mk("empagliflozin", "Empagliflozin", ["Jardiance"], "tablet", ["10mg", "25mg"], false),
    mk("dapagliflozin", "Dapagliflozin", ["Forxiga", "Farxiga"], "tablet", ["5mg", "10mg"], false),
    mk("pioglitazone", "Pioglitazone", ["Pioz", "Actos"], "tablet", ["15mg", "30mg"], false),
    mk("voglibose", "Voglibose", ["Volix", "Vocarb"], "tablet", ["0.2mg", "0.3mg"], false),
    mk("acarbose", "Acarbose", ["Glucobay", "Precose"], "tablet", ["50mg", "100mg"], false),
    mk("insulin-glargine", "Insulin Glargine", ["Lantus", "Basalog"], "injection", ["100 IU/ml"], false),
    mk("insulin-lispro", "Insulin Lispro", ["Humalog"], "injection", ["100 IU/ml"], false),
    mk("insulin-aspart", "Insulin Aspart", ["NovoRapid", "Novolog"], "injection", ["100 IU/ml"], false),

    // Urology / Gynae
    mk("tamsulosin", "Tamsulosin", ["Urimax", "Flomax"], "tablet", ["0.4mg"], false),
    mk("finasteride", "Finasteride", ["Finpecia", "Proscar"], "tablet", ["1mg", "5mg"], false),
    mk("dutasteride", "Dutasteride", ["Duprost", "Avodart"], "capsule", ["0.5mg"], false),
    mk("sildenafil", "Sildenafil", ["Viagra", "Penegra"], "tablet", ["25mg", "50mg", "100mg"], false),
    mk("tadalafil", "Tadalafil", ["Cialis", "Megalis"], "tablet", ["5mg", "10mg", "20mg"], false),
    mk("solifenacin", "Solifenacin", ["Vesicare"], "tablet", ["5mg", "10mg"], false),
    mk("mirabegron", "Mirabegron", ["Myrbetriq", "Mirabest"], "tablet", ["25mg", "50mg"], false),
    mk("tranexamic-acid", "Tranexamic Acid", ["Trapic", "Cyklokapron"], "tablet", ["500mg"], false),
    mk("medroxyprogesterone", "Medroxyprogesterone", ["Provera", "Meprate"], "tablet", ["5mg", "10mg"], false),

    // CNS / Psych
    mk("sertraline", "Sertraline", ["Zoloft", "Sertima"], "tablet", ["25mg", "50mg", "100mg"], false),
    mk("escitalopram", "Escitalopram", ["Lexapro", "Nexito"], "tablet", ["5mg", "10mg", "20mg"], false),
    mk("fluoxetine", "Fluoxetine", ["Prozac", "Fludac"], "capsule", ["10mg", "20mg"], false),
    mk("paroxetine", "Paroxetine", ["Paxil", "Pari"], "tablet", ["10mg", "20mg"], false),
    mk("venlafaxine", "Venlafaxine", ["Effexor", "Veniz"], "tablet", ["37.5mg", "75mg", "150mg"], false),
    mk("duloxetine", "Duloxetine", ["Cymbalta", "Duzela"], "capsule", ["20mg", "30mg", "60mg"], false),
    mk("mirtazapine", "Mirtazapine", ["Remeron", "Mirtaz"], "tablet", ["15mg", "30mg"], false),
    mk("alprazolam", "Alprazolam", ["Xanax", "Alprax"], "tablet", ["0.25mg", "0.5mg", "1mg"], false),
    mk("clonazepam", "Clonazepam", ["Klonopin", "Lonazep"], "tablet", ["0.25mg", "0.5mg", "2mg"], false),
    mk("diazepam", "Diazepam", ["Valium", "Calmpose"], "tablet", ["2mg", "5mg", "10mg"], false),
    mk("lorazepam", "Lorazepam", ["Ativan", "Trapex"], "tablet", ["1mg", "2mg"], false),
    mk("etizolam", "Etizolam", ["Etilaam", "Etizola"], "tablet", ["0.25mg", "0.5mg"], false),
    mk("quetiapine", "Quetiapine", ["Seroquel", "Qutipin"], "tablet", ["25mg", "100mg", "200mg"], false),
    mk("olanzapine", "Olanzapine", ["Zyprexa", "Oleanz"], "tablet", ["5mg", "10mg"], false),
    mk("risperidone", "Risperidone", ["Risperdal", "Sizodon"], "tablet", ["1mg", "2mg", "3mg"], false),
    mk("levetiracetam", "Levetiracetam", ["Keppra", "Levipil"], "tablet", ["250mg", "500mg", "1000mg"], false),
    mk("lamotrigine", "Lamotrigine", ["Lamictal", "Lamitor"], "tablet", ["25mg", "50mg", "100mg"], false),
    mk("sodium-valproate", "Sodium Valproate", ["Valparin", "Encorate"], "tablet", ["200mg", "500mg"], false),
    mk("carbamazepine", "Carbamazepine", ["Tegretol", "Mazetol"], "tablet", ["200mg"], false),
    mk("gabapentin", "Gabapentin", ["Gabapin", "Neurontin"], "capsule", ["100mg", "300mg", "400mg"], false),
    mk("pregabalin", "Pregabalin", ["Lyrica", "Pregeb"], "capsule", ["75mg", "150mg"], false),
    mk("amitriptyline", "Amitriptyline", ["Tryptomer", "Elavil"], "tablet", ["10mg", "25mg"], false),
    mk("donepezil", "Donepezil", ["Aricept", "Donep"], "tablet", ["5mg", "10mg"], false),

    // Topicals — extended
    mk("mupirocin", "Mupirocin", ["T-Bact", "Bactroban"], "ointment", ["2%"], false),
    mk("fusidic-acid", "Fusidic Acid", ["Fucidin", "Fucibet"], "ointment", ["2%"], false),
    mk("betamethasone", "Betamethasone", ["Betnovate", "Diprolene"], "ointment", ["0.05%", "0.1%"], false),
    mk("mometasone", "Mometasone", ["Elocon", "Momate"], "ointment", ["0.1%"], false),
    mk("permethrin", "Permethrin", ["Permite", "Elimite"], "ointment", ["5% cream"], false),
    mk("benzoyl-peroxide", "Benzoyl Peroxide", ["Persol", "Benzac"], "ointment", ["2.5%", "5%"], true),
    mk("adapalene", "Adapalene", ["Adaferin", "Differin"], "ointment", ["0.1%"], true),
    mk("tretinoin", "Tretinoin", ["Retino-A", "Retin-A"], "ointment", ["0.025%", "0.05%"], false),
    mk("calamine", "Calamine", ["Lacto Calamine"], "other", ["lotion"], true),
    mk("calcipotriol", "Calcipotriol", ["Daivonex", "Dovonex"], "ointment", ["50mcg/g"], false),

    // Ophthalmic / ENT drops
    mk("moxifloxacin-eye", "Moxifloxacin Eye Drops", ["Vigamox", "Moxicip"], "drops", ["0.5%"], false),
    mk("tobramycin-eye", "Tobramycin Eye Drops", ["Tobrex", "Tobaneg"], "drops", ["0.3%"], false),
    mk("ciprofloxacin-eye", "Ciprofloxacin Eye Drops", ["Ciplox-D", "Ciloxan"], "drops", ["0.3%"], false),
    mk("olopatadine-eye", "Olopatadine Eye Drops", ["Patanol", "Winolap"], "drops", ["0.1%"], false),
    mk("cmc-eye", "Carboxymethylcellulose Eye Drops", ["Refresh Tears", "I-Kul"], "drops", ["0.5%"], true),
    mk("timolol-eye", "Timolol Eye Drops", ["Timolet", "Timoptol"], "drops", ["0.5%"], false),
    mk("latanoprost-eye", "Latanoprost Eye Drops", ["Latim", "Xalatan"], "drops", ["0.005%"], false),
    mk("xylometazoline-nasal", "Xylometazoline Nasal Drops", ["Otrivin", "Nasivion"], "drops", ["0.05%", "0.1%"], true),
    mk("fluticasone-nasal", "Fluticasone Nasal Spray", ["Flixonase", "Flomist"], "drops", ["50mcg"], false),

    // Endocrine / Misc
    mk("levothyroxine", "Levothyroxine", ["Thyronorm", "Eltroxin", "Synthroid"], "tablet", ["12.5mcg", "25mcg", "50mcg", "75mcg", "100mcg", "125mcg", "150mcg"], false),
    mk("carbimazole", "Carbimazole", ["Neo-Mercazole"], "tablet", ["5mg", "10mg"], false),
    mk("allopurinol", "Allopurinol", ["Zyloric", "Zyloprim"], "tablet", ["100mg", "300mg"], false),
    mk("febuxostat", "Febuxostat", ["Febutaz", "Uloric"], "tablet", ["40mg", "80mg"], false),
    mk("colchicine", "Colchicine", ["Colcin", "Colcrys"], "tablet", ["0.5mg"], false),
    mk("methotrexate", "Methotrexate", ["Folitrax", "Trexall"], "tablet", ["7.5mg", "10mg", "15mg"], false),
    mk("sulfasalazine", "Sulfasalazine", ["Saaz", "Azulfidine"], "tablet", ["500mg"], false),

    // Steroids — extended
    mk("methylprednisolone", "Methylprednisolone", ["Medrol", "Solu-Medrol"], "tablet", ["4mg", "8mg", "16mg"], false),
    mk("dexamethasone", "Dexamethasone", ["Dexona", "Decadron"], "tablet", ["0.5mg", "4mg"], false),
    mk("hydrocortisone", "Hydrocortisone", ["Cortizone", "Locoid"], "ointment", ["1%"], true),

    // Vitamins / Minerals — extended
    mk("vitamin-c", "Vitamin C (Ascorbic Acid)", ["Limcee", "Celin"], "tablet", ["500mg"], true),
    mk("vitamin-b12", "Vitamin B12 (Methylcobalamin)", ["Mecobalamin", "Nervz"], "tablet", ["500mcg", "1500mcg"], true),
    mk("calcium-d3", "Calcium + Vitamin D3", ["Shelcal", "Caltrate"], "tablet", ["500mg + 250 IU"], true),
    mk("zinc", "Zinc Sulfate", ["Z & D", "Zincovit"], "tablet", ["20mg"], true),
    mk("multivitamin", "Multivitamin", ["Revital", "Centrum", "Supradyn"], "tablet", ["standard"], true),
    mk("omega-3", "Omega-3 Fatty Acids", ["Maxepa", "Seven Seas"], "capsule", ["1000mg"], true),

    // Antiemetics — extended
    mk("promethazine", "Promethazine", ["Phenergan"], "tablet", ["25mg"], false),
    mk("doxylamine-pyridoxine", "Doxylamine + Pyridoxine", ["Doxinate", "Diclegis"], "tablet", ["10mg + 10mg"], false),

    // Tradition / OTC
    mk("loperamide", "Loperamide", ["Imodium", "Eldoper"], "tablet", ["2mg"], true),
    mk("diosmin-hesperidin", "Diosmin + Hesperidin", ["Daflon", "Venex"], "tablet", ["500mg"], true),
  ];
}

// ---- lookup helpers -------------------------------------------------

export function listMedicines(): CatalogMedicine[] {
  return medicines.slice();
}

export function getMedicineById(id: string): CatalogMedicine | null {
  return medicines.find((m) => m.id === id) || null;
}

/** Yield all searchable name strings for a catalog row across every
 *  language we have on file (English + each localNames entry). Used
 *  by matchMedicine() so a Japanese pharmacist typing "アセトアミノフェン"
 *  still resolves to the same SKU as a US doctor typing "Tylenol". */
function namesFor(m: CatalogMedicine): string[] {
  const out: string[] = [m.generic, ...m.brands];
  if (m.localNames) {
    for (const lang of Object.keys(m.localNames)) {
      const entry = m.localNames[lang];
      if (entry.generic) out.push(entry.generic);
      if (entry.brands) out.push(...entry.brands);
    }
  }
  return out.filter(Boolean).map((s) => s.toLowerCase());
}

// Normalize an Rx-line label (brand or generic, possibly with strength,
// in any supported language) into a catalog entry. Returns null on no
// match so the caller can keep the raw string around.
export function matchMedicine(rawName: string): CatalogMedicine | null {
  // For non-Latin scripts trim/lowercase is still safe and harmless.
  const q = rawName.trim().toLowerCase();
  if (!q) return null;
  // 1) exact id / any localised name
  for (const m of medicines) {
    if (m.id === q) return m;
    if (namesFor(m).includes(q)) return m;
  }
  // 2) starts-with — covers "paracetamol 500mg" / "アセトアミノフェン 500mg"
  for (const m of medicines) {
    if (namesFor(m).some((n) => q.startsWith(n) || n.startsWith(q))) return m;
  }
  // 3) contains — last resort (handles "Tab. Crocin 650" or
  //    "錠剤 アセトアミノフェン 500mg")
  for (const m of medicines) {
    if (namesFor(m).some((n) => q.includes(n))) return m;
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
