// Medical-term glossary. Each term is its own indexable URL with a short
// definition, clinical context, and links into specialties/conditions where
// relevant. Targets "what is [term]" search intent — huge long-tail volume,
// cheap to produce, and pairs nicely with AI Overview surfaces.

export interface GlossaryTerm {
  slug: string;
  term: string;
  short: string;       // 1-line dictionary-style definition
  definition: string;  // 2-4 sentences
  context?: string;    // clinical usage / when doctors say this
  seeAlso?: Array<{ label: string; href: string }>;
  keywords?: string[];
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    slug: "hba1c",
    term: "HbA1c",
    short: "A three-month average of blood glucose, expressed as a percentage.",
    definition:
      "Haemoglobin A1c (HbA1c) measures the percentage of haemoglobin with glucose attached. Because red blood cells live about 90 days, HbA1c reflects average blood sugar over that window — more stable than a single finger-prick reading.",
    context:
      "Used to diagnose and monitor diabetes. Under 5.7% is normal; 5.7-6.4% is pre-diabetes; 6.5% or higher on two occasions confirms diabetes.",
    seeAlso: [
      { label: "Type 2 Diabetes", href: "/conditions/type-2-diabetes" },
      { label: "Endocrinologist", href: "/specialty/endocrinologist" },
    ],
    keywords: ["HbA1c", "glycated haemoglobin", "A1c"],
  },
  {
    slug: "blood-pressure",
    term: "Blood Pressure",
    short: "The pressure of blood in arteries, reported as systolic/diastolic.",
    definition:
      "Blood pressure is the force of circulating blood on artery walls. The top number (systolic) is measured when the heart contracts; the bottom (diastolic) when it relaxes between beats. Healthy is generally under 120/80 mm Hg.",
    context:
      "Persistently elevated readings define hypertension and raise risk of stroke, heart attack, and kidney disease.",
    seeAlso: [
      { label: "Hypertension", href: "/conditions/hypertension" },
      { label: "Cardiologist", href: "/specialty/cardiologist" },
    ],
    keywords: ["BP", "systolic", "diastolic"],
  },
  {
    slug: "bmi",
    term: "BMI (Body Mass Index)",
    short: "Weight in kilograms divided by height in metres squared.",
    definition:
      "BMI is a simple screening number: weight (kg) divided by height (m) squared. Under 18.5 is underweight, 18.5-24.9 healthy, 25-29.9 overweight, 30+ obese. It doesn't account for muscle mass, so athletes can have high BMIs without excess fat.",
    seeAlso: [
      { label: "Type 2 Diabetes", href: "/conditions/type-2-diabetes" },
    ],
    keywords: ["body mass index", "BMI calculator"],
  },
  {
    slug: "ecg",
    term: "ECG (Electrocardiogram)",
    short: "A tracing of the heart's electrical activity.",
    definition:
      "An ECG records voltage changes across the body surface caused by heart muscle contraction. It's fast, painless, and the first-line test for chest pain, palpitations, and suspected arrhythmia. Outputs the familiar P-QRS-T pattern.",
    seeAlso: [
      { label: "Chest pain", href: "/symptoms/chest-pain" },
      { label: "Cardiologist", href: "/specialty/cardiologist" },
    ],
    keywords: ["EKG", "electrocardiogram", "heart tracing"],
  },
  {
    slug: "mri",
    term: "MRI (Magnetic Resonance Imaging)",
    short: "Detailed imaging using magnetic fields, no radiation.",
    definition:
      "MRI uses powerful magnets and radio waves to produce cross-sectional images of soft tissue — brain, spine, joints, and organs. No ionising radiation. Scans take 20-60 minutes and require lying still in an enclosed tube.",
    seeAlso: [{ label: "MRI vs CT", href: "/compare/mri-vs-ct" }],
    keywords: ["MRI scan", "magnetic resonance"],
  },
  {
    slug: "ct-scan",
    term: "CT Scan",
    short: "Cross-sectional imaging with X-rays, fast and high-resolution.",
    definition:
      "Computed tomography uses rotating X-rays to build cross-sectional images. Excellent for bone, bleeding, trauma, and lung detail. Fast (seconds to minutes) but involves ionising radiation, so not used lightly in young patients.",
    seeAlso: [{ label: "MRI vs CT", href: "/compare/mri-vs-ct" }],
    keywords: ["CT", "CAT scan", "computed tomography"],
  },
  {
    slug: "ssri",
    term: "SSRI",
    short: "Selective serotonin reuptake inhibitor — a common antidepressant class.",
    definition:
      "SSRIs block serotonin reabsorption in the brain, raising its effective levels. They're first-line for moderate-to-severe depression and most anxiety disorders. Common examples: sertraline, escitalopram, fluoxetine.",
    context:
      "Full effect takes 4-6 weeks. Side effects (nausea, insomnia, sexual) often improve after the first few weeks.",
    seeAlso: [
      { label: "Depression", href: "/conditions/depression" },
      { label: "Psychiatrist", href: "/specialty/psychiatrist" },
    ],
    keywords: ["SSRI", "antidepressant", "sertraline", "escitalopram"],
  },
  {
    slug: "nsaid",
    term: "NSAID",
    short: "Non-steroidal anti-inflammatory drug.",
    definition:
      "NSAIDs (ibuprofen, naproxen, diclofenac) reduce inflammation, pain, and fever by blocking COX enzymes. They're very effective but can irritate the stomach, raise blood pressure, and affect kidneys — avoid in ulcer history, kidney disease, or third-trimester pregnancy.",
    seeAlso: [
      { label: "Paracetamol vs Ibuprofen", href: "/compare/paracetamol-vs-ibuprofen" },
    ],
    keywords: ["NSAID", "ibuprofen", "naproxen", "anti-inflammatory"],
  },
  {
    slug: "ppi",
    term: "PPI",
    short: "Proton pump inhibitor — blocks stomach acid production.",
    definition:
      "PPIs (omeprazole, pantoprazole, esomeprazole) reduce stomach acid by inhibiting the acid-producing pump. First-line for GERD and peptic ulcers. Short-term use is very safe; long-term use needs periodic review.",
    seeAlso: [{ label: "GERD", href: "/conditions/gerd" }],
    keywords: ["PPI", "omeprazole", "acid reflux drug"],
  },
  {
    slug: "tsh",
    term: "TSH",
    short: "Thyroid-stimulating hormone — the best screening test for thyroid function.",
    definition:
      "TSH is made by the pituitary to drive the thyroid. High TSH means the thyroid is underactive (hypothyroidism); low TSH means overactive (hyperthyroidism). It's the single most sensitive thyroid test and usually the first ordered.",
    seeAlso: [
      { label: "Hypothyroidism", href: "/conditions/hypothyroidism" },
      { label: "Endocrinologist", href: "/specialty/endocrinologist" },
    ],
    keywords: ["TSH", "thyroid test"],
  },
  {
    slug: "cbc",
    term: "CBC (Complete Blood Count)",
    short: "A baseline blood test counting red cells, white cells, and platelets.",
    definition:
      "A CBC reports haemoglobin, red cell count, white cell count and differential, and platelets. It's the workhorse blood test — ordered for fatigue, infection, bleeding, and as part of almost every work-up.",
    keywords: ["CBC", "full blood count", "FBC", "haemoglobin"],
  },
  {
    slug: "crp",
    term: "CRP",
    short: "C-reactive protein — a marker of inflammation.",
    definition:
      "CRP rises within hours of inflammation or infection. Used to track severity in infections, autoimmune flares, and post-surgery. High-sensitivity CRP is also used to refine cardiovascular risk estimates.",
    keywords: ["CRP", "C-reactive protein", "inflammation marker"],
  },
  {
    slug: "bradycardia",
    term: "Bradycardia",
    short: "A heart rate under 60 beats per minute.",
    definition:
      "Bradycardia is a resting heart rate below 60 bpm. Often normal in athletes and during sleep. Pathological causes include conduction block, drugs (beta-blockers, digoxin), and hypothyroidism.",
    seeAlso: [{ label: "Cardiologist", href: "/specialty/cardiologist" }],
    keywords: ["slow heart rate", "bradycardia"],
  },
  {
    slug: "tachycardia",
    term: "Tachycardia",
    short: "A heart rate over 100 beats per minute at rest.",
    definition:
      "Tachycardia is a resting heart rate above 100 bpm. Common non-pathological causes include exercise, caffeine, fever, and anxiety. Persistent unexplained tachycardia warrants an ECG and work-up for anaemia, thyroid, or arrhythmia.",
    seeAlso: [{ label: "Cardiologist", href: "/specialty/cardiologist" }],
    keywords: ["fast heart rate", "tachycardia", "palpitations"],
  },
  {
    slug: "atrial-fibrillation",
    term: "Atrial Fibrillation (AFib)",
    short: "An irregular, often fast heart rhythm that raises stroke risk.",
    definition:
      "AFib is the most common sustained arrhythmia. Instead of a coordinated beat, the atria quiver. It can cause palpitations, fatigue, or no symptoms at all — but untreated, it multiplies stroke risk five-fold. Treatment: rate control + anticoagulation.",
    seeAlso: [{ label: "Cardiologist", href: "/specialty/cardiologist" }],
    keywords: ["AFib", "atrial fibrillation", "irregular heartbeat"],
  },
  {
    slug: "sciatica",
    term: "Sciatica",
    short: "Pain along the sciatic nerve, typically from low back into the leg.",
    definition:
      "Sciatica is pain radiating along the sciatic nerve caused by compression at the lower spine — usually a herniated disc. Features include sharp leg pain, sometimes with numbness or weakness. Most cases resolve in 6-12 weeks with conservative care.",
    seeAlso: [
      { label: "Back pain", href: "/symptoms/back-pain" },
      { label: "Orthopedist", href: "/specialty/orthopedist" },
    ],
    keywords: ["sciatica", "leg pain", "herniated disc"],
  },
  {
    slug: "dyspnea",
    term: "Dyspnea",
    short: "The sensation of breathlessness or shortness of breath.",
    definition:
      "Dyspnea is subjective breathlessness. Causes range from deconditioning and anxiety to asthma, heart failure, anaemia, and pulmonary embolism. Sudden, severe, or rest dyspnea is a red flag and needs urgent assessment.",
    seeAlso: [{ label: "Chest pain", href: "/symptoms/chest-pain" }],
    keywords: ["dyspnea", "shortness of breath", "breathlessness"],
  },
  {
    slug: "syncope",
    term: "Syncope",
    short: "Temporary loss of consciousness — a faint.",
    definition:
      "Syncope is brief loss of consciousness from reduced brain blood flow. Most common causes are benign (vasovagal, dehydration, low blood pressure) but syncope on exertion or with palpitations needs cardiac work-up.",
    seeAlso: [{ label: "Cardiologist", href: "/specialty/cardiologist" }],
    keywords: ["syncope", "fainting", "blackout"],
  },
  {
    slug: "anemia",
    term: "Anaemia",
    short: "Low red blood cell count or haemoglobin.",
    definition:
      "Anaemia means reduced oxygen-carrying capacity of the blood. Most common cause globally is iron deficiency, often from blood loss or poor absorption. Symptoms include fatigue, pallor, breathlessness, and palpitations.",
    keywords: ["anaemia", "anemia", "iron deficiency", "low haemoglobin"],
  },
  {
    slug: "edema",
    term: "Oedema",
    short: "Swelling from fluid accumulation in tissues.",
    definition:
      "Oedema is visible tissue swelling from fluid leaking from blood vessels. Mild ankle oedema is common on long flights or in heat. Persistent or asymmetric swelling can indicate heart failure, kidney disease, venous insufficiency, or (one-sided) a DVT.",
    keywords: ["oedema", "edema", "swelling", "fluid retention"],
  },
  {
    slug: "hypoglycemia",
    term: "Hypoglycaemia",
    short: "Blood glucose below 70 mg/dL.",
    definition:
      "Hypoglycaemia is low blood sugar. Symptoms include shakiness, sweating, hunger, irritability, and — if severe — confusion or loss of consciousness. Most episodes are in diabetics on insulin or sulfonylureas. Treatment: 15g fast-acting carbs, repeat in 15 min if still low.",
    seeAlso: [{ label: "Type 2 Diabetes", href: "/conditions/type-2-diabetes" }],
    keywords: ["low blood sugar", "hypoglycaemia", "hypo"],
  },
  {
    slug: "gfr",
    term: "eGFR",
    short: "Estimated glomerular filtration rate — a measure of kidney function.",
    definition:
      "eGFR estimates how many millilitres of blood the kidneys filter per minute, calculated from serum creatinine and demographics. Normal is above 90; under 60 for three months defines chronic kidney disease.",
    keywords: ["eGFR", "kidney function", "CKD"],
  },
  {
    slug: "ldl",
    term: "LDL Cholesterol",
    short: "'Bad' cholesterol — drives atherosclerosis.",
    definition:
      "LDL carries cholesterol to tissues; high levels deposit in artery walls and cause atherosclerosis. Target levels depend on cardiovascular risk — from under 100 mg/dL for general health to under 55 in high-risk patients.",
    seeAlso: [{ label: "Hypertension", href: "/conditions/hypertension" }],
    keywords: ["LDL", "bad cholesterol", "low-density lipoprotein"],
  },
  {
    slug: "hdl",
    term: "HDL Cholesterol",
    short: "'Good' cholesterol — carries cholesterol back to the liver.",
    definition:
      "HDL transports cholesterol from tissues back to the liver for disposal. Higher levels are protective. Exercise and healthy fats raise HDL; smoking and sedentary living lower it.",
    keywords: ["HDL", "good cholesterol"],
  },
  {
    slug: "triage",
    term: "Triage",
    short: "Sorting patients by urgency.",
    definition:
      "Triage is the prioritisation of patients by severity so the sickest are seen first. Used in emergency rooms, mass-casualty situations, and — increasingly — at the start of a telemedicine consultation to decide whether online care is appropriate.",
    keywords: ["triage", "emergency sorting"],
  },
  {
    slug: "prn",
    term: "PRN",
    short: "Medical shorthand for 'as needed'.",
    definition:
      "From Latin pro re nata. A PRN prescription lets the patient take a medication when they need it, not on a fixed schedule — e.g. paracetamol PRN for pain.",
    keywords: ["PRN", "as needed"],
  },
  {
    slug: "stat",
    term: "STAT",
    short: "Medical shorthand for 'immediately'.",
    definition:
      "From Latin statim. Used on orders and prescriptions when an action is needed urgently, typically within minutes.",
    keywords: ["STAT", "urgent"],
  },
  {
    slug: "bid",
    term: "BID",
    short: "Twice daily (from Latin bis in die).",
    definition:
      "BID means a medication is taken twice a day, roughly 12 hours apart. Related: QD (once daily), TID (three times daily), QID (four times daily), QHS (at bedtime).",
    keywords: ["BID", "twice daily", "medication frequency"],
  },
  {
    slug: "cbt",
    term: "CBT",
    short: "Cognitive behavioural therapy.",
    definition:
      "CBT is a short-term, structured talking therapy that targets unhelpful thoughts and behaviours. It's the most evidence-supported treatment for anxiety, depression, and insomnia — and translates well to video delivery.",
    seeAlso: [
      { label: "Anxiety", href: "/symptoms/anxiety" },
      { label: "Depression", href: "/conditions/depression" },
    ],
    keywords: ["CBT", "cognitive behavioural therapy", "talking therapy"],
  },
  {
    slug: "fhir",
    term: "FHIR",
    short: "Fast Healthcare Interoperability Resources — a modern health data standard.",
    definition:
      "FHIR is an HL7 standard for exchanging electronic health records via RESTful APIs. It's become the de-facto way modern EHRs talk to each other and to mobile apps.",
    seeAlso: [{ label: "EHR vs EMR", href: "/compare/ehr-vs-emr" }],
    keywords: ["FHIR", "healthcare interoperability", "HL7"],
  },
];

export function getGlossaryBySlug(slug: string): GlossaryTerm | undefined {
  return GLOSSARY.find((g) => g.slug === slug);
}
