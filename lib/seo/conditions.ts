// Condition landing pages. Targets "[condition] treatment / symptoms / doctor"
// queries — higher commercial intent than symptom pages and deeper clinical
// content. Each condition maps to one or more specialties for booking.

export interface ConditionMeta {
  slug: string;
  name: string;
  titleTag: string;
  metaDescription: string;
  tagline: string;
  overview: string;
  causes: string[];
  symptoms: string[];
  diagnosis: string[];
  treatments: string[];
  prevention?: string[];
  relatedSpecialtySlugs: string[];
  relatedSymptomSlugs?: string[];
  faqs: Array<{ q: string; a: string }>;
  keywords: string[];
}

export const CONDITIONS: ConditionMeta[] = [
  {
    slug: "hypertension",
    name: "Hypertension (High Blood Pressure)",
    titleTag: "Hypertension — Causes, Treatment & Online Cardiologist",
    metaDescription:
      "Manage high blood pressure with evidence-based treatment and regular monitoring. Book a Cardiologist video consultation on OduDoc.",
    tagline: "Silent, common, and one of the most modifiable cardiovascular risks there is.",
    overview:
      "Hypertension is sustained blood pressure of 130/80 mm Hg or higher. It damages arteries over years without symptoms, making it a leading cause of stroke, heart attack, and kidney disease. Treatment combines lifestyle change with — for most people — one or two well-tolerated medications.",
    causes: [
      "Genetics and family history",
      "Age (risk rises steadily after 40)",
      "High sodium diet and low potassium",
      "Obesity and sedentary lifestyle",
      "Chronic stress and poor sleep",
      "Kidney disease and sleep apnoea (secondary causes)",
    ],
    symptoms: [
      "Usually none — hypertension is typically silent",
      "Headaches at very high pressures (>180/110)",
      "Nosebleeds in hypertensive emergency",
      "Fatigue or blurred vision with end-organ damage",
    ],
    diagnosis: [
      "Multiple readings over weeks — one clinic reading isn't enough",
      "Home blood pressure log (twice daily for a week)",
      "24-hour ambulatory monitoring if readings vary",
      "Baseline labs: kidney function, electrolytes, lipids, HbA1c",
      "ECG and sometimes echocardiogram to assess heart",
    ],
    treatments: [
      "DASH diet — rich in fruit, vegetables, low-fat dairy, whole grains",
      "Sodium under 2g daily",
      "150 minutes of moderate exercise per week",
      "Weight loss of 5-10% if overweight",
      "ACE inhibitors, ARBs, calcium channel blockers, or thiazide diuretics",
      "Combination therapy when single agent insufficient",
    ],
    prevention: [
      "Annual BP screening from age 18",
      "Home monitor if family history is strong",
      "Limit alcohol to <2 drinks/day men, <1 women",
      "Quit smoking",
    ],
    relatedSpecialtySlugs: ["cardiologist", "general-physician"],
    relatedSymptomSlugs: ["headache", "chest-pain", "fatigue"],
    faqs: [
      {
        q: "Can hypertension be cured without medication?",
        a: "Lifestyle changes alone bring stage-1 hypertension to normal in a meaningful minority of people. Most need medication too, especially at stage-2 levels or with cardiovascular risk factors.",
      },
      {
        q: "Is online consultation good enough for BP management?",
        a: "Yes for most patients. A home BP log plus periodic labs gives a Cardiologist everything they need to titrate medication and review targets.",
      },
    ],
    keywords: ["hypertension", "high blood pressure", "BP treatment", "hypertension management", "online cardiologist"],
  },
  {
    slug: "type-2-diabetes",
    name: "Type 2 Diabetes",
    titleTag: "Type 2 Diabetes — Symptoms, Treatment & Online Endocrinologist",
    metaDescription:
      "Evidence-based type 2 diabetes management: HbA1c targets, medication choices, and regular monitoring. Book an Endocrinologist online.",
    tagline: "Reversible for some, lifelong for others — but always manageable.",
    overview:
      "Type 2 diabetes is a chronic condition where insulin resistance and, eventually, reduced insulin production raise blood glucose. Long-term complications include eye, kidney, nerve, and heart damage, but tight early control dramatically reduces risk.",
    causes: [
      "Genetics and family history",
      "Overweight, especially abdominal fat",
      "Physical inactivity",
      "Age over 45 (though rising in younger adults)",
      "Gestational diabetes in prior pregnancy",
      "PCOS and other insulin-resistance states",
    ],
    symptoms: [
      "Frequent urination, especially at night",
      "Increased thirst and hunger",
      "Unexplained weight loss",
      "Fatigue and slow-healing wounds",
      "Blurred vision",
      "Tingling in hands or feet",
    ],
    diagnosis: [
      "HbA1c ≥ 6.5% on two occasions",
      "Fasting glucose ≥ 126 mg/dL on two occasions",
      "Random glucose ≥ 200 mg/dL with symptoms",
      "Oral glucose tolerance test in borderline cases",
      "Baseline kidney, lipid, and liver function",
    ],
    treatments: [
      "Weight loss — 5-10% can dramatically improve control",
      "Mediterranean-style or low-carb diet",
      "Metformin as first-line drug",
      "GLP-1 agonists (semaglutide, liraglutide) for weight + glucose",
      "SGLT2 inhibitors for heart and kidney protection",
      "Insulin when oral agents are insufficient",
    ],
    prevention: [
      "Maintain healthy weight",
      "Daily movement — walks after meals",
      "Reduce refined carbs and sugary drinks",
      "Annual HbA1c from 35, earlier if high risk",
    ],
    relatedSpecialtySlugs: ["endocrinologist", "general-physician"],
    relatedSymptomSlugs: ["fatigue"],
    faqs: [
      {
        q: "Can type 2 diabetes be reversed?",
        a: "A meaningful minority of patients can achieve non-diabetic HbA1c values with substantial weight loss, especially if the diagnosis is recent. Ongoing lifestyle maintenance is essential.",
      },
      {
        q: "What HbA1c should I aim for?",
        a: "Under 7% is the standard adult target. Younger patients without complications often aim for under 6.5%; older patients or those with cardiovascular disease may accept 7.5-8%.",
      },
    ],
    keywords: ["type 2 diabetes", "diabetes treatment", "HbA1c", "metformin", "GLP-1", "online endocrinologist"],
  },
  {
    slug: "migraine",
    name: "Migraine",
    titleTag: "Migraine — Triggers, Treatment & Online Neurologist",
    metaDescription:
      "Acute and preventive migraine treatment, trigger identification, and when to see a Neurologist. Book a video consultation on OduDoc.",
    tagline: "Not just a bad headache — a treatable neurological condition.",
    overview:
      "Migraine is a recurrent neurological disorder characterised by throbbing, often one-sided headaches lasting 4-72 hours, typically with nausea, light and sound sensitivity, and sometimes aura. Modern treatment separates acute relief from prevention.",
    causes: [
      "Genetic predisposition",
      "Hormonal fluctuations (menstrual migraine)",
      "Sleep disruption",
      "Certain foods (aged cheese, red wine, chocolate)",
      "Stress and post-stress letdown",
      "Bright lights, strong smells, weather changes",
    ],
    symptoms: [
      "Throbbing one-sided headache",
      "Nausea and vomiting",
      "Light and sound sensitivity",
      "Visual aura (flashes, zigzags) in 25%",
      "Tingling or speech changes with complex aura",
      "Exhaustion for 24 hours after",
    ],
    diagnosis: [
      "Clinical — based on pattern of attacks",
      "Headache diary noting frequency, triggers, response",
      "MRI only if red flags or atypical features",
    ],
    treatments: [
      "Acute: triptans, NSAIDs, anti-emetics, gepants",
      "Prevention: propranolol, topiramate, amitriptyline",
      "CGRP antagonists (erenumab, galcanezumab) for frequent migraine",
      "Botox for chronic migraine",
      "Lifestyle: sleep hygiene, hydration, trigger avoidance",
    ],
    prevention: [
      "Consistent sleep and meal times",
      "Hydration through the day",
      "Limit caffeine to under 200mg",
      "Identify and avoid personal triggers",
    ],
    relatedSpecialtySlugs: ["neurologist", "general-physician"],
    relatedSymptomSlugs: ["headache"],
    faqs: [
      {
        q: "When should I see a neurologist for migraine?",
        a: "If attacks are more than 4 per month, if acute treatment isn't working, or if features are atypical (new in middle age, with neurological signs, worst-ever).",
      },
      {
        q: "Are migraines hereditary?",
        a: "Yes. If one parent has migraine, your risk roughly doubles; both parents, it triples.",
      },
    ],
    keywords: ["migraine treatment", "migraine relief", "triptans", "chronic migraine", "online neurologist"],
  },
  {
    slug: "hypothyroidism",
    name: "Hypothyroidism",
    titleTag: "Hypothyroidism — Symptoms, Treatment & Online Endocrinologist",
    metaDescription:
      "Underactive thyroid is easy to diagnose and treat. Learn the symptoms, the lab tests, and book an Endocrinologist online.",
    tagline: "One daily pill, one blood test every few months, and most people feel like themselves again.",
    overview:
      "Hypothyroidism means the thyroid gland produces too little thyroid hormone. Most cases are autoimmune (Hashimoto's). Symptoms are nonspecific but highly suggestive when combined. Treatment with levothyroxine is straightforward.",
    causes: [
      "Hashimoto's thyroiditis (most common)",
      "Iodine deficiency",
      "Post-radiation or post-thyroidectomy",
      "Certain medications (lithium, amiodarone)",
      "Congenital hypothyroidism",
    ],
    symptoms: [
      "Fatigue",
      "Weight gain",
      "Cold intolerance",
      "Dry skin and hair thinning",
      "Constipation",
      "Heavy periods",
      "Low mood or brain fog",
    ],
    diagnosis: [
      "TSH — the first and most sensitive test",
      "Free T4 — confirms diagnosis",
      "TPO antibodies — confirms autoimmune cause",
      "Ultrasound if nodules palpable",
    ],
    treatments: [
      "Daily levothyroxine on empty stomach",
      "Start low, titrate every 6-8 weeks",
      "Retest TSH once stable",
      "Separate from calcium, iron, and food by 30-60 minutes",
    ],
    relatedSpecialtySlugs: ["endocrinologist", "general-physician"],
    relatedSymptomSlugs: ["fatigue"],
    faqs: [
      {
        q: "Is hypothyroidism lifelong?",
        a: "Usually yes, especially with autoimmune cause. Temporary forms exist (post-viral thyroiditis, post-partum) and resolve within a year.",
      },
      {
        q: "Do natural thyroid supplements work?",
        a: "Synthetic levothyroxine is the standard of care and the only form reliably shown to normalise thyroid function. Desiccated thyroid has a small role in specific cases under specialist care.",
      },
    ],
    keywords: ["hypothyroidism", "underactive thyroid", "levothyroxine", "Hashimoto's", "thyroid online"],
  },
  {
    slug: "asthma",
    name: "Asthma",
    titleTag: "Asthma — Diagnosis, Inhalers & Online Doctor",
    metaDescription:
      "Well-controlled asthma means no nighttime symptoms, no attacks, and no limits. Get evidence-based management online.",
    tagline: "Well-controlled asthma should feel like not having asthma at all.",
    overview:
      "Asthma is chronic airway inflammation causing intermittent wheeze, cough, chest tightness, and breathlessness. Modern inhaler-based therapy controls almost all asthma. Poor control usually reflects under-treatment or poor inhaler technique.",
    causes: [
      "Genetic predisposition",
      "Allergens (dust mites, pets, pollen)",
      "Air pollution and tobacco smoke",
      "Viral infections in childhood",
      "Occupational exposures",
    ],
    symptoms: [
      "Wheeze, especially on exhale",
      "Cough, often worse at night",
      "Chest tightness",
      "Shortness of breath with exertion or allergens",
      "Symptoms responsive to bronchodilator",
    ],
    diagnosis: [
      "Spirometry showing reversible airway obstruction",
      "Peak flow variability over 2 weeks",
      "Exhaled nitric oxide (FeNO)",
      "Trial of inhaled corticosteroid with response",
    ],
    treatments: [
      "ICS-formoterol as-needed for mild asthma",
      "Daily ICS + rescue inhaler for moderate",
      "LABA + ICS combinations for step-up",
      "Biologics (omalizumab, dupilumab) for severe",
      "Inhaler technique training every visit",
    ],
    prevention: [
      "Avoid known triggers",
      "Annual flu vaccination",
      "Quit smoking, avoid secondhand smoke",
      "Action plan for exacerbations",
    ],
    relatedSpecialtySlugs: ["general-physician"],
    relatedSymptomSlugs: ["cough", "chest-pain"],
    faqs: [
      {
        q: "Can asthma go away?",
        a: "Childhood asthma often remits in adolescence but can return in adulthood. Adult-onset asthma is usually lifelong but fully controllable.",
      },
    ],
    keywords: ["asthma treatment", "inhaler", "ICS", "asthma attack", "online doctor asthma"],
  },
  {
    slug: "gerd",
    name: "Acid Reflux (GERD)",
    titleTag: "GERD — Heartburn Treatment & Online Doctor",
    metaDescription:
      "Stop heartburn at its source. Learn GERD triggers, first-line and advanced treatments, and when to see a doctor.",
    tagline: "Persistent heartburn is not normal — it's treatable.",
    overview:
      "Gastroesophageal reflux disease is when stomach acid chronically refluxes into the oesophagus, causing heartburn, regurgitation, and — if untreated — damage. Most cases respond to lifestyle change and acid suppression.",
    causes: [
      "Weak lower oesophageal sphincter",
      "Hiatal hernia",
      "Obesity",
      "Pregnancy",
      "Smoking and alcohol",
      "Certain foods (spicy, fatty, citrus, coffee)",
    ],
    symptoms: [
      "Burning behind the breastbone, worse after meals or lying down",
      "Sour taste or regurgitation",
      "Chronic cough, especially at night",
      "Hoarseness or sore throat",
      "Difficulty swallowing",
    ],
    diagnosis: [
      "Clinical in typical cases",
      "Trial of PPI therapy",
      "Endoscopy for alarm symptoms or >50 with new onset",
      "pH monitoring in refractory cases",
    ],
    treatments: [
      "Weight loss if overweight",
      "Smaller, earlier dinners; avoid lying down for 3 hours after",
      "Elevate head of bed by 6 inches",
      "H2 blockers or PPIs",
      "Fundoplication for severe, drug-resistant cases",
    ],
    relatedSpecialtySlugs: ["general-physician"],
    relatedSymptomSlugs: ["chest-pain", "stomach-pain"],
    faqs: [
      {
        q: "Are PPIs safe long-term?",
        a: "Short- to medium-term use is well-studied and safe. Long-term use has small associations with bone loss, B12 deficiency, and kidney issues — worth reviewing annually whether the dose is still needed.",
      },
    ],
    keywords: ["GERD", "acid reflux", "heartburn treatment", "PPI", "online doctor reflux"],
  },
  {
    slug: "depression",
    name: "Depression",
    titleTag: "Depression — Signs, Treatment & Online Psychiatrist",
    metaDescription:
      "Depression is treatable. Therapy, medication, and evidence-based care — all available via confidential online Psychiatrist consultation.",
    tagline: "Treatable, common, and not a weakness.",
    overview:
      "Depression is a mood disorder characterised by persistent low mood, loss of interest, and functional impairment lasting at least two weeks. Most people improve with therapy, medication, or both — and early treatment has the best outcome.",
    causes: [
      "Genetic vulnerability",
      "Major life stressors and grief",
      "Chronic illness (diabetes, heart disease, pain)",
      "Hormonal transitions (postpartum, perimenopause)",
      "Substance use",
      "Certain medications",
    ],
    symptoms: [
      "Persistent sadness or emptiness",
      "Loss of interest or pleasure",
      "Sleep changes (too much or too little)",
      "Appetite and weight changes",
      "Fatigue, slowed thinking",
      "Feelings of worthlessness or guilt",
      "Thoughts of death or suicide — seek help immediately",
    ],
    diagnosis: [
      "Clinical interview (PHQ-9 is a common tool)",
      "Rule out medical mimics: thyroid, anaemia, vitamin D",
      "Assess safety and risk carefully",
    ],
    treatments: [
      "Cognitive behavioural therapy (CBT)",
      "Interpersonal therapy",
      "SSRIs (sertraline, escitalopram) first-line",
      "SNRIs, bupropion, or mirtazapine for specific profiles",
      "Exercise — comparable to medication for mild depression",
      "Light therapy for seasonal pattern",
    ],
    relatedSpecialtySlugs: ["psychiatrist", "general-physician"],
    relatedSymptomSlugs: ["anxiety", "fatigue"],
    faqs: [
      {
        q: "Will I need antidepressants forever?",
        a: "Most people stay on treatment 6-12 months after feeling well. Recurrent depression may need longer-term maintenance, decided individually with your psychiatrist.",
      },
      {
        q: "Is online therapy as effective?",
        a: "Meta-analyses show video CBT matches in-person for depression and anxiety — with the bonus of no travel and better adherence.",
      },
    ],
    keywords: ["depression treatment", "SSRI", "CBT", "antidepressants", "online psychiatrist depression"],
  },
  {
    slug: "eczema",
    name: "Eczema (Atopic Dermatitis)",
    titleTag: "Eczema — Treatment, Moisturiser & Online Dermatologist",
    metaDescription:
      "Control eczema flares with the right moisturiser routine, topical steroids, and when needed, systemic therapy. Book a Dermatologist online.",
    tagline: "Consistent moisturising beats every fancy cream for daily control.",
    overview:
      "Atopic dermatitis is chronic, itchy, inflammatory skin disease affecting 10-20% of children and many adults. The skin barrier is impaired and overreacts to triggers. Treatment layers barrier repair, inflammation control, and trigger avoidance.",
    causes: [
      "Genetic barrier defect (filaggrin mutations)",
      "Immune dysregulation",
      "Environmental triggers (soap, sweat, allergens)",
      "Dry climate or indoor heating",
    ],
    symptoms: [
      "Itchy, dry, red patches",
      "Flexural distribution (elbows, knees, neck)",
      "Oozing and crusting in flares",
      "Sleep disruption from itch",
      "Thickened skin from chronic scratching",
    ],
    diagnosis: ["Clinical — pattern and history"],
    treatments: [
      "Fragrance-free moisturiser 2-3 times daily",
      "Topical corticosteroids for flares",
      "Topical calcineurin inhibitors (tacrolimus) for face and folds",
      "Wet wraps for severe flares",
      "Dupilumab, JAK inhibitors for severe cases",
      "Avoid known triggers; short lukewarm showers",
    ],
    relatedSpecialtySlugs: ["dermatologist"],
    relatedSymptomSlugs: ["skin-rash"],
    faqs: [
      {
        q: "Is eczema curable?",
        a: "No, but it's very controllable. Most children improve by adolescence; adult eczema tends to be chronic but responsive to modern treatment.",
      },
    ],
    keywords: ["eczema", "atopic dermatitis", "eczema treatment", "moisturiser", "online dermatologist"],
  },
  {
    slug: "pcos",
    name: "PCOS (Polycystic Ovary Syndrome)",
    titleTag: "PCOS — Symptoms, Treatment & Online Gynecologist",
    metaDescription:
      "PCOS management covers periods, fertility, acne, and metabolic risk. Book a confidential video consultation with a Gynecologist.",
    tagline: "A metabolic and hormonal condition that touches many systems — one at a time.",
    overview:
      "Polycystic ovary syndrome affects up to 1 in 10 women of reproductive age. It combines irregular periods, excess androgens, and often insulin resistance. Treatment is personalised to the goal: regular cycles, clearer skin, fertility, or long-term metabolic health.",
    causes: [
      "Genetic predisposition",
      "Insulin resistance",
      "Hormonal imbalance (high LH, high androgens)",
    ],
    symptoms: [
      "Irregular or absent periods",
      "Acne, especially jawline and chin",
      "Excess hair growth on face or body",
      "Hair thinning on scalp",
      "Weight gain",
      "Difficulty conceiving",
    ],
    diagnosis: [
      "Two of three Rotterdam criteria: irregular periods, clinical or biochemical hyperandrogenism, polycystic ovaries on ultrasound",
      "Baseline labs: LH, FSH, testosterone, prolactin, TSH, HbA1c, lipids",
    ],
    treatments: [
      "Weight loss of 5% if overweight — dramatic improvements",
      "Combined oral contraceptives for cycle regulation and skin",
      "Metformin for insulin resistance",
      "Letrozole or clomiphene for ovulation induction",
      "Spironolactone for hirsutism",
      "Topical eflornithine for facial hair",
    ],
    relatedSpecialtySlugs: ["gynecologist", "endocrinologist"],
    faqs: [
      {
        q: "Can I still get pregnant with PCOS?",
        a: "Yes. Most women with PCOS conceive, often with weight loss and ovulation induction. Early intervention improves outcomes.",
      },
    ],
    keywords: ["PCOS", "polycystic ovary syndrome", "PCOS treatment", "irregular periods", "online gynecologist"],
  },
  {
    slug: "anxiety-disorder",
    name: "Anxiety Disorders",
    titleTag: "Anxiety Disorder — Treatment & Online Psychiatrist",
    metaDescription:
      "Generalised anxiety, panic, social anxiety — all highly treatable. Get a diagnosis and plan from a Psychiatrist online.",
    tagline: "The most common mental health condition — and one of the most treatable.",
    overview:
      "Anxiety disorders include generalised anxiety, panic disorder, social anxiety, and specific phobias. They differ in pattern but share underlying physiology and respond to similar therapies.",
    causes: [
      "Genetics",
      "Trauma or chronic stress",
      "Temperament",
      "Medical conditions (thyroid, cardiac)",
      "Substance use and withdrawal",
    ],
    symptoms: [
      "Persistent worry out of proportion",
      "Panic attacks with palpitations, shortness of breath",
      "Avoidance behaviours",
      "Physical symptoms: tension, fatigue, gut symptoms",
      "Sleep disturbance",
    ],
    diagnosis: [
      "Clinical, using GAD-7 or similar screening",
      "Rule out cardiac, thyroid, substance-related causes",
    ],
    treatments: [
      "Cognitive behavioural therapy — first-line",
      "SSRIs or SNRIs for moderate to severe anxiety",
      "Short-term benzodiazepines sparingly",
      "Mindfulness-based stress reduction",
      "Exposure therapy for phobia and panic",
      "Regular aerobic exercise",
    ],
    relatedSpecialtySlugs: ["psychiatrist", "general-physician"],
    relatedSymptomSlugs: ["anxiety", "chest-pain"],
    faqs: [
      {
        q: "Do I need medication for anxiety?",
        a: "Not necessarily — many improve with therapy alone. When medication helps, SSRIs are first-line, low-dose, and reviewed every few months.",
      },
    ],
    keywords: ["anxiety disorder", "panic disorder", "GAD", "social anxiety", "online psychiatrist anxiety"],
  },
  {
    slug: "uti",
    name: "Urinary Tract Infection (UTI)",
    titleTag: "UTI — Symptoms, Antibiotics & Online Doctor",
    metaDescription:
      "Most UTIs respond to a short antibiotic course. Get a prescription online today with a GP video consultation on OduDoc.",
    tagline: "Treat early, treat right, move on.",
    overview:
      "UTIs are common bacterial infections of the urinary tract, most often the bladder. Uncomplicated UTIs in otherwise healthy women respond reliably to short antibiotic courses. Red flags suggesting kidney involvement need more careful assessment.",
    causes: [
      "E. coli from gut flora (85% of cases)",
      "Sexual activity",
      "Reduced oestrogen post-menopause",
      "Catheters",
      "Structural urinary abnormalities",
    ],
    symptoms: [
      "Burning on urination",
      "Frequency and urgency",
      "Cloudy or strong-smelling urine",
      "Suprapubic discomfort",
      "Blood in urine",
      "Flank pain or fever — suggests kidney involvement",
    ],
    diagnosis: [
      "Symptoms alone are often enough in uncomplicated cases",
      "Urine dipstick confirms leukocytes and nitrites",
      "Urine culture in recurrent or complicated UTIs",
    ],
    treatments: [
      "Nitrofurantoin, fosfomycin, or trimethoprim-sulfamethoxazole — 3-5 day courses",
      "Paracetamol or ibuprofen for symptom relief",
      "Adequate hydration",
      "Recurrent UTIs: post-coital antibiotic, vaginal oestrogen, prophylactic courses",
    ],
    prevention: [
      "Urinate after intercourse",
      "Stay hydrated",
      "Avoid spermicide if prone to UTIs",
      "Front-to-back wiping",
    ],
    relatedSpecialtySlugs: ["general-physician", "gynecologist"],
    relatedSymptomSlugs: ["stomach-pain"],
    faqs: [
      {
        q: "Can a doctor prescribe antibiotics for UTI online?",
        a: "Yes — for uncomplicated cases with clear symptoms, a GP can issue a prescription after a short video consultation. Complicated UTIs or suspected kidney infection need in-person care.",
      },
    ],
    keywords: ["UTI", "urinary tract infection", "antibiotics UTI", "online doctor UTI", "cystitis"],
  },
  {
    slug: "arthritis",
    name: "Arthritis",
    titleTag: "Arthritis — Types, Treatment & Online Orthopedist",
    metaDescription:
      "Osteo- or rheumatoid? The right diagnosis changes everything. Book an Orthopedist or Rheumatology-aware GP online.",
    tagline: "Pain, stiffness, and swelling don't all have the same cause — or treatment.",
    overview:
      "Arthritis is an umbrella term. Osteoarthritis (wear-related) and rheumatoid arthritis (autoimmune) are the two largest groups and need different treatment. Accurate diagnosis up front avoids years of wrong therapy.",
    causes: [
      "Osteoarthritis: age, prior injury, obesity, genetics",
      "Rheumatoid: autoimmune, genetic, smoking",
      "Gout: urate crystal deposition",
      "Psoriatic arthritis: linked to psoriasis",
    ],
    symptoms: [
      "Joint pain and stiffness",
      "Morning stiffness >30 min suggests inflammatory cause",
      "Swelling, warmth, or redness",
      "Reduced range of motion",
      "Systemic symptoms (fatigue, low-grade fever) in autoimmune forms",
    ],
    diagnosis: [
      "History and exam",
      "Inflammatory markers (ESR, CRP)",
      "Rheumatoid factor, anti-CCP",
      "Uric acid if gout suspected",
      "X-ray, ultrasound, or MRI as indicated",
    ],
    treatments: [
      "Weight management and targeted exercise",
      "Paracetamol and topical NSAIDs first-line for osteoarthritis",
      "Disease-modifying antirheumatic drugs (methotrexate, biologics) for rheumatoid",
      "Intra-articular steroid injections for flares",
      "Joint replacement for end-stage osteoarthritis",
    ],
    relatedSpecialtySlugs: ["orthopedist", "general-physician"],
    relatedSymptomSlugs: ["back-pain"],
    faqs: [
      {
        q: "Which specialist treats arthritis?",
        a: "Osteoarthritis is typically managed by a GP or Orthopedist. Rheumatoid and other inflammatory arthritides are managed by Rheumatologists — ask your GP for a referral.",
      },
    ],
    keywords: ["arthritis", "osteoarthritis", "rheumatoid arthritis", "joint pain", "online orthopedist"],
  },
  {
    slug: "high-cholesterol",
    name: "High Cholesterol (Dyslipidaemia)",
    titleTag: "High Cholesterol — Causes, Treatment & Online Cardiologist",
    metaDescription:
      "Understand high cholesterol, when it becomes dangerous, and how it's treated. Book a video consultation with a doctor on OduDoc.",
    tagline: "Silent for years — then a major driver of heart attack and stroke.",
    overview:
      "Dyslipidaemia means an unhealthy balance of blood fats — typically raised LDL (\"bad\") cholesterol or triglycerides with low HDL (\"good\") cholesterol. It rarely causes symptoms but builds plaque in arteries over decades. Treatment combines lifestyle change with medication when risk is high enough.",
    causes: [
      "Diet high in saturated and trans fats",
      "Low physical activity and excess weight",
      "Genetics — familial hypercholesterolaemia runs in families",
      "Type 2 diabetes and metabolic syndrome",
      "Hypothyroidism and chronic kidney disease",
      "Some medications (steroids, certain HIV drugs)",
    ],
    symptoms: [
      "Usually none — diagnosed on a routine lipid panel",
      "Tendon xanthomas (cholesterol deposits) in severe familial forms",
      "Chest pain or stroke symptoms once advanced atherosclerosis is present",
    ],
    diagnosis: [
      "Fasting lipid panel: total, LDL, HDL, triglycerides",
      "Cardiovascular risk score (QRISK, ASCVD, WHO/ISH) to contextualise the numbers",
      "HbA1c and thyroid function to rule out contributors",
      "Family history review for inherited lipid disorders",
    ],
    treatments: [
      "Mediterranean-style diet; replace saturated fats with unsaturated",
      "150 minutes/week of moderate aerobic exercise",
      "Weight loss where appropriate",
      "Statin therapy when calculated risk crosses the local threshold",
      "Ezetimibe or PCSK9 inhibitors added when statins alone aren't enough",
    ],
    prevention: [
      "Regular lipid checks from age 40 (earlier if family history)",
      "Quit smoking — huge effect on overall cardiovascular risk",
      "Keep blood pressure and HbA1c in target ranges",
      "Limit alcohol; prioritise sleep",
    ],
    relatedSpecialtySlugs: ["cardiologist", "general-physician", "endocrinologist"],
    relatedSymptomSlugs: ["chest-pain"],
    faqs: [
      {
        q: "Do I definitely need a statin if my cholesterol is high?",
        a: "Not always. The decision is based on overall cardiovascular risk, not the cholesterol number alone. A doctor will calculate your 10-year risk before recommending medication.",
      },
      {
        q: "Can I manage cholesterol with diet alone?",
        a: "Many people can move modestly raised LDL into target range with diet, weight loss, and exercise. Familial or severely elevated cholesterol usually needs medication too.",
      },
    ],
    keywords: ["high cholesterol", "LDL", "dyslipidaemia", "statin", "online cardiologist"],
  },
  {
    slug: "ibs",
    name: "Irritable Bowel Syndrome (IBS)",
    titleTag: "IBS — Symptoms, Treatment & Online Gastroenterologist",
    metaDescription:
      "IBS causes bloating, cramps, and irregular bowels. Learn how it's managed and book a video consultation on OduDoc.",
    tagline: "Common, genuine, and treatable — despite often being dismissed for years.",
    overview:
      "Irritable bowel syndrome is a disorder of gut-brain communication causing recurrent abdominal pain linked to altered bowel habits. There's no structural damage on tests, which is why IBS is defined by symptom criteria rather than a biopsy. First-line treatment targets diet, stress, and specific symptoms rather than a single drug.",
    causes: [
      "Altered gut motility and sensitivity",
      "Gut-brain axis disturbances (anxiety, depression often coexist)",
      "Post-infectious IBS after a gastroenteritis episode",
      "Food triggers — often FODMAPs, caffeine, or alcohol",
      "Genetic predisposition",
    ],
    symptoms: [
      "Recurrent abdominal pain or cramping",
      "Bloating and visible abdominal distension",
      "Constipation, diarrhoea, or alternating between the two",
      "Mucus in stool",
      "Relief of pain after a bowel movement",
    ],
    diagnosis: [
      "Rome IV symptom criteria",
      "Blood count, CRP, coeliac serology to exclude inflammation or coeliac disease",
      "Faecal calprotectin when inflammatory bowel disease is a concern",
      "Referral for colonoscopy if red flags (bleeding, weight loss, age over 50)",
    ],
    treatments: [
      "Low-FODMAP diet trialled for 4–6 weeks under supervision",
      "Soluble fibre (psyllium) for constipation-predominant IBS",
      "Antispasmodics (mebeverine, peppermint oil) for cramping",
      "Laxatives or anti-diarrhoeals based on subtype",
      "Gut-directed CBT or hypnotherapy for refractory cases",
    ],
    prevention: [
      "Identify and avoid personal trigger foods with a symptom diary",
      "Regular meal timing; avoid skipping meals",
      "Stress management — exercise, sleep, therapy if anxiety is driving flares",
    ],
    relatedSpecialtySlugs: ["gastroenterologist", "general-physician"],
    relatedSymptomSlugs: ["stomach-pain", "constipation"],
    faqs: [
      {
        q: "Is IBS the same as inflammatory bowel disease?",
        a: "No. IBS is a functional disorder with no visible inflammation or tissue damage. Inflammatory bowel disease (Crohn's, ulcerative colitis) involves actual intestinal inflammation and needs very different treatment.",
      },
      {
        q: "Can stress cause IBS?",
        a: "Stress doesn't cause IBS outright, but it can trigger and worsen flares via the gut-brain axis. That's why behavioural therapies work.",
      },
    ],
    keywords: ["IBS", "irritable bowel syndrome", "bloating", "gut pain", "online gastroenterologist"],
  },
  {
    slug: "sinusitis",
    name: "Sinusitis (Sinus Infection)",
    titleTag: "Sinusitis — Symptoms, Treatment & Online Doctor Consultation",
    metaDescription:
      "Sinusitis causes facial pain, nasal congestion, and pressure. Learn how it's treated and book an online doctor on OduDoc.",
    tagline: "Most acute sinusitis is viral and self-limiting — antibiotics are rarely the first answer.",
    overview:
      "Sinusitis is inflammation of the sinus linings, usually triggered by a viral upper-respiratory infection. It's acute when symptoms last under four weeks and chronic when they persist 12 weeks or more. Treatment aims to drain the sinuses and reduce inflammation; bacteria are only involved in a minority of cases.",
    causes: [
      "Viral upper respiratory infections (by far the most common)",
      "Allergic rhinitis keeping sinuses inflamed",
      "Deviated nasal septum or nasal polyps",
      "Dental infections spreading upward",
      "Bacterial or, rarely, fungal infection",
    ],
    symptoms: [
      "Facial pain or pressure, often around the cheeks or forehead",
      "Thick nasal discharge (yellow or green)",
      "Nasal congestion and reduced sense of smell",
      "Post-nasal drip, cough worse when lying down",
      "Fever in bacterial sinusitis",
    ],
    diagnosis: [
      "Clinical — no imaging needed in most acute cases",
      "CT sinuses when chronic, recurrent, or complicated",
      "Nasal endoscopy by an ENT specialist for persistent symptoms",
      "Allergy testing when atopy is suspected",
    ],
    treatments: [
      "Saline nasal irrigation — evidence-based and underused",
      "Intranasal corticosteroid sprays",
      "Decongestants for short-term relief (maximum 3–5 days)",
      "Antibiotics only when bacterial infection is likely (severe, worsening after improvement, or lasting > 10 days)",
      "Surgical correction for structural causes in chronic disease",
    ],
    prevention: [
      "Treat allergic rhinitis proactively",
      "Avoid cigarette smoke and known irritants",
      "Hand hygiene to reduce viral infections",
      "Humidify dry indoor air in winter",
    ],
    relatedSpecialtySlugs: ["general-physician", "ent-specialist"],
    relatedSymptomSlugs: ["headache", "cough"],
    faqs: [
      {
        q: "Green mucus — do I need antibiotics?",
        a: "No. Green or yellow mucus is normal in any viral upper-respiratory infection and does not by itself mean bacterial infection.",
      },
      {
        q: "When should chronic sinusitis be referred to ENT?",
        a: "If symptoms persist beyond 12 weeks despite standard treatment, if you have recurrent acute episodes, or if imaging shows structural problems.",
      },
    ],
    keywords: ["sinusitis", "sinus infection", "chronic sinusitis", "facial pain", "online ENT"],
  },
  {
    slug: "anemia",
    name: "Anaemia (Iron Deficiency)",
    titleTag: "Anaemia — Causes, Treatment & Online Doctor Consultation",
    metaDescription:
      "Iron-deficiency anaemia causes fatigue, breathlessness, and pallor. Learn how it's diagnosed and treated on OduDoc.",
    tagline: "The most common nutritional deficiency worldwide — and one of the easiest to fix once found.",
    overview:
      "Anaemia means a reduced red-blood-cell count or haemoglobin level, so the body carries less oxygen. Iron deficiency is the most common cause globally — from diet, blood loss, pregnancy, or malabsorption. Treatment addresses both the low iron and the reason it got low in the first place.",
    causes: [
      "Low dietary iron intake",
      "Menstrual blood loss, especially heavy periods",
      "Gastrointestinal blood loss (ulcers, haemorrhoids, bowel cancer)",
      "Pregnancy and lactation (increased demand)",
      "Poor absorption (coeliac disease, gastric surgery)",
      "Chronic kidney disease reducing erythropoietin",
    ],
    symptoms: [
      "Persistent tiredness, especially on exertion",
      "Pale skin, nail beds, and inner eyelids",
      "Breathlessness and a fast heartbeat",
      "Headache and poor concentration",
      "Brittle nails and hair loss",
      "Restless legs, especially at night",
    ],
    diagnosis: [
      "Full blood count (low haemoglobin, low MCV in iron deficiency)",
      "Ferritin (best marker of iron stores) and transferrin saturation",
      "Endoscopy/colonoscopy in men and post-menopausal women to find a bleed source",
      "Coeliac screen when malabsorption is suspected",
    ],
    treatments: [
      "Oral iron supplements — typically 3–6 months to refill stores",
      "Take with vitamin C; avoid tea/coffee within an hour",
      "IV iron if oral isn't tolerated or stores need rapid repletion",
      "Treat the underlying cause — heavy periods, GI bleed, diet",
      "Transfusion only for severe symptomatic anaemia",
    ],
    prevention: [
      "Iron-rich diet: red meat, legumes, dark leafy greens, fortified cereals",
      "Vitamin C with plant-based iron sources",
      "Manage heavy periods with a doctor",
      "Screen during pregnancy as per antenatal guidelines",
    ],
    relatedSpecialtySlugs: ["general-physician", "hematologist"],
    relatedSymptomSlugs: ["fatigue", "shortness-of-breath"],
    faqs: [
      {
        q: "How long does it take to recover from iron-deficiency anaemia?",
        a: "Haemoglobin usually rises within 2–4 weeks of starting iron, but replenishing stores takes 3–6 months of continued treatment.",
      },
      {
        q: "Is it safe to self-diagnose with iron tablets off the shelf?",
        a: "Taking iron without a confirmed deficiency can mask more serious causes of fatigue — and iron overload has its own risks. Get a blood test first.",
      },
    ],
    keywords: ["anaemia", "iron deficiency", "low haemoglobin", "anemia treatment", "online doctor anaemia"],
  },
  {
    slug: "back-pain",
    name: "Back Pain (Chronic)",
    titleTag: "Chronic Back Pain — Causes, Relief & Online Orthopaedist",
    metaDescription:
      "Chronic back pain has treatable causes. Learn first-line treatments and book a video consultation with an orthopaedist on OduDoc.",
    tagline: "Most back pain improves — the job of a doctor is to rule out the small fraction that needs imaging.",
    overview:
      "Back pain is called chronic once it persists beyond 12 weeks. The vast majority is mechanical — muscle, ligament, or disc strain — without a specific lesion on imaging. Modern treatment prioritises staying active, targeted exercise, and pain education over bed rest and early MRI.",
    causes: [
      "Mechanical / muscular strain",
      "Disc degeneration or herniation",
      "Facet joint arthritis",
      "Poor posture and prolonged sitting",
      "Osteoporotic vertebral fractures",
      "Less common: infection, inflammatory spondyloarthritis, malignancy",
    ],
    symptoms: [
      "Aching or stiffness in the lower or upper back",
      "Pain worsened by specific movements or positions",
      "Radiating pain down a leg (sciatica) when nerve roots are involved",
      "Morning stiffness in inflammatory causes",
      "Reduced range of motion",
    ],
    diagnosis: [
      "Clinical assessment — usually no imaging in the first 6 weeks without red flags",
      "Red-flag screen: night pain, weight loss, fever, neurological deficit, bladder or bowel symptoms",
      "MRI when red flags are present or symptoms persist beyond conservative treatment",
      "Blood tests for inflammation when inflammatory causes are suspected",
    ],
    treatments: [
      "Stay active — the old \"strict bed rest\" advice is outdated",
      "Paracetamol or NSAIDs per label for flares",
      "Structured physiotherapy with a graded exercise programme",
      "Cognitive behavioural therapy for persistent pain",
      "Injections (facet, epidural) for selected cases",
      "Surgery only for specific structural problems like severe disc prolapse with nerve compression",
    ],
    prevention: [
      "Strengthen core and glutes with regular exercise",
      "Ergonomic workstation and regular micro-breaks",
      "Lift with the legs, not the back",
      "Maintain a healthy weight; quit smoking",
    ],
    relatedSpecialtySlugs: ["orthopedist", "general-physician"],
    relatedSymptomSlugs: ["back-pain"],
    faqs: [
      {
        q: "Do I need an MRI for my back pain?",
        a: "Usually not in the first six weeks unless red flags are present. Early imaging often shows incidental findings that lead to unnecessary treatment.",
      },
      {
        q: "Is walking good for chronic back pain?",
        a: "Yes. Graded walking is one of the best-studied first-line treatments for mechanical back pain.",
      },
    ],
    keywords: ["back pain", "chronic back pain", "lower back pain", "sciatica", "online orthopaedist"],
  },
  {
    slug: "allergic-rhinitis",
    name: "Allergic Rhinitis (Hay Fever)",
    titleTag: "Allergic Rhinitis — Symptoms, Treatment & Online Consultation",
    metaDescription:
      "Allergic rhinitis causes sneezing, itchy eyes, and a runny nose. Learn how it's managed and book a doctor online on OduDoc.",
    tagline: "Annoying rather than dangerous — but easy to under-treat for years.",
    overview:
      "Allergic rhinitis is an immune response to inhaled allergens — pollen, dust mites, animal dander, moulds. It's seasonal or perennial depending on the trigger. Untreated, it worsens asthma, disturbs sleep, and significantly reduces quality of life, so effective treatment is worth pursuing.",
    causes: [
      "Pollen (tree, grass, weed) — seasonal",
      "Dust mites — perennial",
      "Pet dander",
      "Mould spores",
      "Occupational allergens (flour, wood dust, latex)",
    ],
    symptoms: [
      "Sneezing fits, especially on waking",
      "Clear runny nose and nasal congestion",
      "Itchy eyes, nose, and throat",
      "Post-nasal drip and chronic cough",
      "Fatigue and poor concentration from disturbed sleep",
    ],
    diagnosis: [
      "Clinical pattern — symptoms with known triggers",
      "Skin-prick testing or specific IgE blood testing when trigger identification matters",
      "Assessment for coexisting asthma (\"one airway\" concept)",
    ],
    treatments: [
      "Intranasal corticosteroids — the most effective single treatment",
      "Non-sedating oral antihistamines (cetirizine, loratadine, fexofenadine)",
      "Saline nasal irrigation twice daily during flares",
      "Allergen immunotherapy for moderate-severe cases unresponsive to drugs",
      "Eye drops (antihistamine or mast-cell stabiliser) for ocular symptoms",
    ],
    prevention: [
      "Keep windows closed during high pollen counts; shower after outdoor exposure",
      "Dust-mite covers on bedding; wash linens weekly at 60°C",
      "HEPA filtration for homes with pets",
      "Identify and, where practical, reduce workplace exposures",
    ],
    relatedSpecialtySlugs: ["general-physician", "ent-specialist"],
    relatedSymptomSlugs: ["cough", "sore-throat"],
    faqs: [
      {
        q: "Are nasal steroid sprays safe long-term?",
        a: "Yes — at licensed doses they're safe for ongoing use and are first-line for moderate-severe allergic rhinitis.",
      },
      {
        q: "Can allergies cause asthma?",
        a: "Allergic rhinitis and asthma commonly coexist. Poorly controlled rhinitis makes asthma worse, and treating one usually helps the other.",
      },
    ],
    keywords: ["allergic rhinitis", "hay fever", "pollen allergy", "dust mite allergy", "online doctor allergies"],
  },
];

export function getConditionBySlug(slug: string): ConditionMeta | undefined {
  return CONDITIONS.find((c) => c.slug === slug);
}
