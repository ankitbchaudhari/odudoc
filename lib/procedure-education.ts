// Procedure education library. Spec v6.0 §35.
//
// Seeded knowledge base of clinical procedures + at-home care
// instructions. Surfaces inline in three places:
//   - Doctor's IV / injection order — shows the site map and
//     reconstitution recipe at the point of order.
//   - Patient prescription view — opens as a sidebar drawer when
//     the patient taps a med they're unfamiliar with.
//   - Public /education library — discoverable from the patient
//     portal + indexed for SEO.
//
// Content is curated, not user-generated. Each entry has a single
// canonical author (a clinician on staff or, in the seed set, the
// AYUSH ministry-approved monograph) and an updatedAt that gates
// when patients see the "Revised" pill.

export type ProcedureCategory =
  | "injection_sites"
  | "drug_reconstitution"
  | "post_op_care"
  | "vaccination_aftercare"
  | "wound_dressing"
  | "diabetes_self_care"
  | "first_aid"
  | "device_use";

export interface ProcedureCard {
  slug: string;
  title: string;
  category: ProcedureCategory;
  /** Tagline shown on the index grid. */
  summary: string;
  /** Markdown body shown on the detail page. */
  body: string;
  /** Step-by-step list rendered above the body. */
  steps?: string[];
  /** When the body must not be followed without clinical
   *  supervision (e.g. reconstitution recipes). */
  clinicianOnly?: boolean;
  /** Who reviewed the content last. */
  author: string;
  /** "MOH-2025-04" / "ICU SOP v3.1" / "AYUSH M-12". */
  source?: string;
  updatedAt: string;
}

export const CATEGORY_META: Record<
  ProcedureCategory,
  { label: string; emoji: string; tone: string }
> = {
  injection_sites: { label: "Injection sites", emoji: "💉", tone: "from-rose-400 to-pink-600" },
  drug_reconstitution: { label: "Drug reconstitution", emoji: "🧪", tone: "from-cyan-400 to-blue-600" },
  post_op_care: { label: "Post-op care", emoji: "🩺", tone: "from-emerald-400 to-teal-600" },
  vaccination_aftercare: { label: "Vaccination aftercare", emoji: "💊", tone: "from-violet-400 to-purple-600" },
  wound_dressing: { label: "Wound dressing", emoji: "🩹", tone: "from-amber-400 to-orange-600" },
  diabetes_self_care: { label: "Diabetes self-care", emoji: "🩸", tone: "from-fuchsia-400 to-pink-600" },
  first_aid: { label: "First aid", emoji: "🚑", tone: "from-red-400 to-rose-600" },
  device_use: { label: "Device use", emoji: "📟", tone: "from-indigo-400 to-violet-600" },
};

// Seed content — clinician-authored. Long-form body lives in
// markdown so reviewers can edit without touching JSX. The seed
// set covers the highest-volume use cases at OPD + IPD + home.
export const PROCEDURE_LIBRARY: ProcedureCard[] = [
  {
    slug: "im-injection-deltoid",
    title: "Intramuscular injection — deltoid site",
    category: "injection_sites",
    summary: "Adult IM injection in the deltoid. Site landmarks, needle, technique, after-care.",
    steps: [
      "Locate the acromion process at the top of the shoulder.",
      "Measure three fingerbreadths down — that's the deltoid centre.",
      "Clean with alcohol swab, allow to dry (don't blow on it).",
      "Insert needle at 90° to a depth of 2.5 cm (1 inch). 23G × 1\" for most adults.",
      "Aspirate briefly (optional per modern WHO guidance — usually skip).",
      "Inject slowly over 5 seconds.",
      "Withdraw and apply gentle pressure with a dry swab. Do not massage.",
    ],
    body:
      "**Volume limit:** 1 mL max in the deltoid for adults; use the vastus lateralis if larger volumes are needed.\n\n" +
      "**Common indications:** flu vaccine, Tdap, Hep B booster, intramuscular antibiotics where the deltoid is approved.\n\n" +
      "**Avoid if:** local skin infection, recent lymph node biopsy on that side, severe muscle wasting.\n\n" +
      "**Documentation:** site, route, time, lot number, name of administering staff.",
    author: "Dr. Dixit Velani, Internal Medicine",
    source: "WHO Immunization Handbook 2024",
    updatedAt: "2026-04-12T00:00:00Z",
  },
  {
    slug: "ceftriaxone-reconstitution",
    title: "Ceftriaxone reconstitution — 1 g vial",
    category: "drug_reconstitution",
    clinicianOnly: true,
    summary: "Diluent volume, final concentration, and infusion rate for IM and IV use.",
    steps: [
      "IM use: reconstitute 1 g with 3.5 mL of 1% lidocaine. Final volume ≈ 4 mL, concentration 250 mg/mL.",
      "IV bolus: reconstitute 1 g with 10 mL of sterile water for injection.",
      "IV infusion: dissolve in 10 mL water, then dilute to 50–100 mL of 0.9% NaCl or 5% dextrose; infuse over 30 min.",
      "After reconstitution: stable 6 h at room temperature, 24 h refrigerated. Discard unused volume.",
    ],
    body:
      "**Compatibility caution:** never mix with calcium-containing IV solutions (Ringer's lactate, calcium gluconate). Precipitates have caused lung and renal calcifications in neonates.\n\n" +
      "**Dose ranges:** 1–2 g once daily IV/IM for most infections; up to 4 g for meningitis (split BD).\n\n" +
      "**Storage of reconstituted solution:** 2–8 °C, protected from light. Discoloration → discard.",
    author: "Hospital pharmacy SOP",
    source: "Indian Pharmacopoeia 2023, Ceftriaxone monograph",
    updatedAt: "2026-04-08T00:00:00Z",
  },
  {
    slug: "post-cataract-care",
    title: "Post-cataract surgery — first 14 days",
    category: "post_op_care",
    summary: "What to do (and not do) after IOL implantation. Patient-facing.",
    steps: [
      "Use the prescribed eye drops on schedule — antibiotic + steroid taper for 14 days.",
      "Wear the protective shield at night for 7 days to avoid accidental rubbing.",
      "No swimming, hot tubs, or heavy lifting (>5 kg) for 14 days.",
      "Avoid bending below waist level for 48 h.",
      "Call your surgeon immediately if pain worsens, vision drops suddenly, or you see flashes / floaters.",
    ],
    body:
      "**Expected timeline:** vision improves day 2–3, stabilises by week 2. Mild gritty sensation is normal.\n\n" +
      "**Driving:** when the operated eye reaches 6/12 vision with correction — usually 1–2 weeks. Confirm with your surgeon.\n\n" +
      "**Routine follow-up:** day 1, week 1, week 4. Refraction at week 4 for new spectacles if needed.",
    author: "Dr. Pankti Chaudhari, Integrative Medicine",
    updatedAt: "2026-03-22T00:00:00Z",
  },
  {
    slug: "covid-vaccine-aftercare",
    title: "After your Covid vaccine",
    category: "vaccination_aftercare",
    summary: "Common side effects, when to call a doctor, return to activities.",
    steps: [
      "Rest the arm for 24 h — soreness and warmth at the injection site are normal.",
      "Paracetamol 500–650 mg every 6 h if febrile (avoid prophylactic dosing).",
      "Hydrate. Resume normal activity when you feel up to it; most people are back to work in 24–48 h.",
    ],
    body:
      "**Watch for:** chest pain, breathlessness, palpitations, or a severe persistent headache. These need urgent review.\n\n" +
      "**Anaphylaxis window:** 15–30 min observation at the clinic post-dose. Carry your vaccine card for the next dose schedule.",
    author: "Public health desk",
    source: "ICMR vaccination guidance 2025",
    updatedAt: "2026-04-30T00:00:00Z",
  },
  {
    slug: "insulin-pen-use",
    title: "Insulin pen — how to use",
    category: "diabetes_self_care",
    summary: "Step-by-step for first-time insulin pen users.",
    steps: [
      "Wash hands. Attach a new needle (single-use, fresh per injection).",
      "Prime the pen: dial 2 units, hold the pen needle-up, press the plunger until a drop appears.",
      "Dial your dose. Choose a site (abdomen, thigh, upper arm, buttocks) and rotate sites.",
      "Pinch the skin, insert at 90°, press the plunger, count slowly to 10 before removing.",
      "Recap and dispose of the needle in a sharps bin. Never reuse.",
    ],
    body:
      "**Storage:** unopened pens in the fridge (2–8 °C); pen in current use at room temperature ≤30 days. Don't freeze.\n\n" +
      "**Hypoglycaemia signs:** sweating, tremor, hunger, confusion. Eat 15 g fast-acting carbs (juice, glucose tablets), wait 15 min, recheck.",
    author: "Diabetes educator team",
    updatedAt: "2026-04-02T00:00:00Z",
  },
  {
    slug: "wound-dressing-change",
    title: "Wound dressing change at home",
    category: "wound_dressing",
    summary: "Sterile technique for a routine dressing change.",
    steps: [
      "Wash hands with soap for 20 s. Wear gloves.",
      "Remove old dressing — peel parallel to skin, never pull straight up.",
      "Inspect: redness >2 cm beyond margin, pus, foul smell → call the surgeon.",
      "Clean with saline-soaked gauze, outward in spiral. Pat dry.",
      "Apply the prescribed topical, then a new sterile dressing.",
    ],
    body:
      "**Frequency:** as prescribed — usually daily for the first 5 days, then alternate days.\n\n" +
      "**Bath:** no soaking the wound for 48 h. After that, brief showers are fine; pat dry.\n\n" +
      "**Diabetic patients:** even small wounds need closer follow-up. Photograph daily so your doctor can review remotely.",
    author: "Surgical nursing team",
    updatedAt: "2026-04-18T00:00:00Z",
  },
  {
    slug: "burn-first-aid",
    title: "Burn first aid",
    category: "first_aid",
    summary: "First 20 minutes — what saves skin, what makes it worse.",
    steps: [
      "Remove the source — flames, hot liquid, chemical splash.",
      "Cool the burn under cool running water for 20 minutes. Not ice. Not butter.",
      "Cover loosely with cling film or clean dry cloth.",
      "Pain relief: paracetamol 500–650 mg.",
    ],
    body:
      "**Go to ER immediately if:** burn is larger than the palm, involves face / hands / feet / genitals / joints, is electrical or chemical, or the person is a child under 5 / adult over 60.\n\n" +
      "**Never:** apply butter, oil, toothpaste, or ice. Don't break blisters.",
    author: "ER team",
    source: "ATLS adapted for community",
    updatedAt: "2026-04-25T00:00:00Z",
  },
  {
    slug: "spacer-with-inhaler",
    title: "Spacer + inhaler — correct technique",
    category: "device_use",
    summary: "How to use a spacer with an MDI inhaler. Critical for kids and elderly.",
    steps: [
      "Shake the inhaler, attach to the spacer.",
      "Exhale fully away from the spacer.",
      "Seal the mouthpiece between your lips. Press the inhaler once.",
      "Breathe in slowly and deeply, hold for 10 seconds. (Children: 5 tidal breaths.)",
      "Wait 30 seconds. Repeat for the next puff.",
    ],
    body:
      "**Cleaning:** weekly with warm soapy water, air dry. Don't rub the inside.\n\n" +
      "**Why a spacer:** delivers 80% more drug to the lungs vs inhaler alone, especially in patients who can't coordinate inhalation with actuation.",
    author: "Pulmonology team",
    updatedAt: "2026-03-15T00:00:00Z",
  },
];

export function listProcedures(opts: { category?: ProcedureCategory; clinicianOnly?: boolean } = {}): ProcedureCard[] {
  let list = PROCEDURE_LIBRARY;
  if (opts.category) list = list.filter((p) => p.category === opts.category);
  if (typeof opts.clinicianOnly === "boolean")
    list = list.filter((p) => !!p.clinicianOnly === opts.clinicianOnly);
  return list;
}

export function getProcedure(slug: string): ProcedureCard | null {
  return PROCEDURE_LIBRARY.find((p) => p.slug === slug) || null;
}
