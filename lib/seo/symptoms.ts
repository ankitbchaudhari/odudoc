// Symptom-driven landing pages. These capture "what doctor do I see for X"
// intent, which is enormous long-tail volume. Each symptom maps to one or more
// specialties so we can drive the reader straight into booking.

export interface SymptomMeta {
  slug: string;
  name: string;                 // display name, title-case
  titleTag: string;
  metaDescription: string;
  tagline: string;              // one-line hero subtitle
  intro: string;                // 2–3 sentence overview
  whenToWorry: string[];        // red-flag list
  selfCare: string[];           // safe things to try first
  relatedSpecialtySlugs: string[]; // specialty slugs from ./specialties
  faqs: Array<{ q: string; a: string }>;
  keywords: string[];
}

export const SYMPTOMS: SymptomMeta[] = [
  {
    slug: "fever",
    name: "Fever",
    titleTag: "Fever — Causes, When to See a Doctor & Online Consultation",
    metaDescription:
      "Adult or child with a fever? Learn when a fever is serious, what to try at home, and book an online doctor consultation in minutes.",
    tagline: "Most fevers fight off infection on their own — but some need a doctor, fast.",
    intro:
      "Fever is the body's normal response to infection. In adults, a temperature over 38°C (100.4°F) is considered a fever, and most resolve within three days. A doctor should assess anything that lasts longer, climbs above 39.4°C (103°F), or comes with warning signs like chest pain, confusion, or a stiff neck.",
    whenToWorry: [
      "Temperature above 39.4°C (103°F) in an adult",
      "Fever lasting more than three days",
      "Severe headache, stiff neck, or confusion",
      "Rash that doesn't fade under pressure",
      "Difficulty breathing, chest pain, or persistent vomiting",
      "Any fever in a baby under 3 months",
    ],
    selfCare: [
      "Drink water, broth, or oral rehydration fluids throughout the day",
      "Rest — fever is energy-expensive",
      "Paracetamol or ibuprofen at label dosing if you have no contraindication",
      "Keep the room cool; light clothing beats heavy blankets",
      "Monitor temperature every 4–6 hours and note the trend",
    ],
    relatedSpecialtySlugs: ["general-physician", "pediatrician"],
    faqs: [
      {
        q: "When should I go to the emergency room for a fever?",
        a: "Go immediately for fever with stiff neck, confusion, seizure, a non-blanching rash, severe difficulty breathing, or for any fever in an infant under 3 months old.",
      },
      {
        q: "Can I have a video consultation for a fever?",
        a: "Yes. A General Physician can review your symptoms, suggest tests, and issue prescriptions online. They'll escalate you to in-person care if warning signs appear.",
      },
      {
        q: "Is 37.5°C a fever?",
        a: "37.5°C is a low-grade temperature. It's not usually considered a true fever until it reaches 38°C (100.4°F) or higher.",
      },
    ],
    keywords: ["fever treatment", "high temperature", "fever in adults", "fever in children", "online doctor for fever"],
  },
  {
    slug: "headache",
    name: "Headache",
    titleTag: "Headache — Causes, Red Flags & Online Doctor Consultation",
    metaDescription:
      "Tension, migraine, or something worse? Understand what's causing your headache and when to book an online doctor — fast.",
    tagline: "Most headaches are benign. A few aren't — here's how to tell the difference.",
    intro:
      "Tension headaches and migraines account for the majority of head pain. They respond well to rest, hydration, and simple analgesics. A sudden, severe, 'thunderclap' headache, or one with neurological symptoms, is a medical emergency.",
    whenToWorry: [
      "Sudden, severe headache reaching maximum intensity within seconds",
      "Headache after a head injury",
      "Fever, stiff neck, or rash alongside the headache",
      "New weakness, slurred speech, or vision loss",
      "Headache that wakes you from sleep or is worse in the morning",
      "Progressively worsening headache over days or weeks",
    ],
    selfCare: [
      "Drink water — mild dehydration is a common trigger",
      "Rest in a dark, quiet room",
      "Paracetamol or ibuprofen at label dosing",
      "Cold compress on the forehead or warm compress on the neck",
      "Cut back on caffeine gradually, not suddenly",
    ],
    relatedSpecialtySlugs: ["general-physician", "neurologist"],
    faqs: [
      {
        q: "When is a headache an emergency?",
        a: "Sudden, severe 'worst of your life' headache, or headache with weakness, slurred speech, or vision loss — call emergency services immediately.",
      },
      {
        q: "What kind of doctor treats chronic headaches?",
        a: "Start with a General Physician. If headaches are frequent, severe, or need long-term management, they'll refer you to a Neurologist.",
      },
    ],
    keywords: ["headache causes", "migraine", "tension headache", "thunderclap headache", "online doctor headache"],
  },
  {
    slug: "cough",
    name: "Cough",
    titleTag: "Cough — Acute vs Chronic, When to See a Doctor Online",
    metaDescription:
      "A cough that won't quit? Learn what causes it, when it needs a doctor, and book a video consultation with a GP in minutes.",
    tagline: "Most coughs clear within three weeks. The ones that don't need investigation.",
    intro:
      "Acute coughs (under 3 weeks) are usually viral and self-limiting. Subacute (3–8 weeks) and chronic (over 8 weeks) coughs deserve medical review — especially if you're a smoker, have unexplained weight loss, or are coughing up blood.",
    whenToWorry: [
      "Coughing up blood",
      "Shortness of breath or chest pain",
      "Cough lasting more than 3 weeks",
      "High fever that doesn't break",
      "Unintended weight loss or night sweats",
      "Wheezing that's new or worsening",
    ],
    selfCare: [
      "Warm fluids — honey and lemon in warm water for soothing",
      "Humidifier or steam from a hot shower",
      "Elevate your head at night",
      "Avoid smoking and smoky environments",
      "Over-the-counter cough suppressant for dry cough at bedtime",
    ],
    relatedSpecialtySlugs: ["general-physician", "pediatrician"],
    faqs: [
      {
        q: "How long is too long for a cough?",
        a: "Any cough lasting longer than three weeks should be reviewed by a doctor — especially if you smoke or have other symptoms.",
      },
      {
        q: "Can a doctor prescribe cough medicine online?",
        a: "Yes. After a video consultation, a GP can issue a digital prescription for prescription-strength cough medicine, inhalers, or antibiotics if indicated.",
      },
    ],
    keywords: ["chronic cough", "dry cough", "wet cough", "cough with blood", "online doctor cough"],
  },
  {
    slug: "chest-pain",
    name: "Chest Pain",
    titleTag: "Chest Pain — Cardiac vs Non-Cardiac & When to See a Cardiologist",
    metaDescription:
      "Chest pain is never to be ignored. Learn the red flags, possible causes, and connect with a Cardiologist online today.",
    tagline: "Chest pain deserves respect. This page is not a substitute for emergency care.",
    intro:
      "Chest pain ranges from harmless (acid reflux, muscle strain) to immediately life-threatening (heart attack, pulmonary embolism, aortic dissection). If your symptoms match any red flag below, call emergency services now — do not book a video consultation.",
    whenToWorry: [
      "Crushing or squeezing chest pain, especially with exertion",
      "Pain radiating to the jaw, arm, or back",
      "Shortness of breath, sweating, or nausea with chest pain",
      "Sudden, severe tearing chest or back pain",
      "Chest pain with fainting or palpitations",
      "Any chest pain in someone with a history of heart disease",
    ],
    selfCare: [
      "If ANY red flag is present: stop reading and call emergency services",
      "For clearly reflux-related burning after meals: sit upright, sip water, avoid trigger foods",
      "For clearly musculoskeletal pain reproducible on movement: rest, ice, OTC anti-inflammatory",
      "Do not self-diagnose cardiac pain — book a Cardiologist same-day if in doubt",
    ],
    relatedSpecialtySlugs: ["cardiologist", "general-physician"],
    faqs: [
      {
        q: "Should I book an online consultation for chest pain?",
        a: "Only if red flags are absent and the pain is mild, intermittent, and clearly reproducible (e.g. on deep breath or movement). Otherwise go to the emergency room.",
      },
      {
        q: "What tests will a cardiologist order?",
        a: "Typically an ECG, blood tests including troponin, and often an echocardiogram or stress test. Some of these can be arranged after a video consultation.",
      },
    ],
    keywords: ["chest pain causes", "heart attack symptoms", "angina", "chest pain left side", "cardiologist online"],
  },
  {
    slug: "acne",
    name: "Acne",
    titleTag: "Acne — Causes, Treatments & Online Dermatologist Consultation",
    metaDescription:
      "From occasional breakouts to cystic acne, learn what works — and book a video consultation with a Dermatologist in minutes.",
    tagline: "The right treatment depends on the type of acne. Skip the trial-and-error.",
    intro:
      "Acne is caused by a mix of excess oil, clogged pores, bacteria, and inflammation. Mild acne often responds to over-the-counter benzoyl peroxide or salicylic acid. Moderate or cystic acne needs prescription treatment — topical retinoids, antibiotics, or isotretinoin — which a Dermatologist can prescribe online.",
    whenToWorry: [
      "Deep, painful cysts that leave scars",
      "Sudden severe acne in an adult with no history",
      "Acne with excess hair growth or irregular periods (may signal a hormonal cause)",
      "Acne that hasn't responded to 3+ months of OTC treatment",
    ],
    selfCare: [
      "Wash twice daily with a gentle cleanser — no scrubbing",
      "Non-comedogenic moisturiser and sunscreen",
      "Benzoyl peroxide 2.5–5% on active spots",
      "Don't pick or squeeze — it drives pigmentation and scarring",
      "Patience: any new routine takes 6–8 weeks to show results",
    ],
    relatedSpecialtySlugs: ["dermatologist"],
    faqs: [
      {
        q: "Can a dermatologist treat acne online?",
        a: "Yes — most acne is well-suited to video consultation. Your dermatologist will review photos, write a prescription, and follow up at 6–8 weeks to check progress.",
      },
      {
        q: "What's the strongest acne treatment?",
        a: "Oral isotretinoin is the most effective for severe nodular or cystic acne. It requires a dermatologist, monthly blood tests, and strict contraception for women of childbearing age.",
      },
    ],
    keywords: ["acne treatment", "cystic acne", "adult acne", "hormonal acne", "dermatologist online"],
  },
  {
    slug: "back-pain",
    name: "Back Pain",
    titleTag: "Back Pain — Causes, Red Flags & Online Doctor Consultation",
    metaDescription:
      "Most back pain resolves in weeks. Learn what speeds recovery, what to avoid, and when to see an Orthopedist online.",
    tagline: "The right diagnosis saves months of misdirected treatment.",
    intro:
      "Most acute low back pain is mechanical and resolves within 4–6 weeks with movement, stretching, and time. Pain lasting longer, or accompanied by leg weakness, numbness, or loss of bladder control, needs urgent assessment.",
    whenToWorry: [
      "Leg weakness, numbness, or tingling",
      "Loss of bladder or bowel control — this is an emergency",
      "Back pain after a fall or significant trauma",
      "Unexplained weight loss, fever, or night pain",
      "Pain not improving after 4–6 weeks",
    ],
    selfCare: [
      "Keep moving — prolonged bed rest makes it worse",
      "Heat pack for muscle tension, ice for acute strain",
      "OTC paracetamol or ibuprofen at label dosing",
      "Gentle stretching: cat-cow, knee-to-chest, pelvic tilts",
      "Workstation review — chair height, screen at eye level",
    ],
    relatedSpecialtySlugs: ["orthopedist", "general-physician"],
    faqs: [
      {
        q: "Do I need an MRI for back pain?",
        a: "Usually not in the first 6 weeks unless red flags are present. Imaging early often finds incidental changes that don't explain the pain and lead to unnecessary treatment.",
      },
      {
        q: "Should I see an orthopedist online?",
        a: "Yes — for an initial review, management plan, and prescription. In-person or physiotherapy follow-up is arranged when needed.",
      },
    ],
    keywords: ["lower back pain", "sciatica", "back pain relief", "slipped disc", "orthopedist online"],
  },
  {
    slug: "anxiety",
    name: "Anxiety",
    titleTag: "Anxiety — Symptoms, Treatment & Online Psychiatrist",
    metaDescription:
      "Anxiety is treatable. Learn what helps, what to avoid, and book a confidential online Psychiatrist consultation today.",
    tagline: "You don't need to wait until it feels unbearable.",
    intro:
      "Anxiety disorders are the most common mental health conditions and are highly treatable. Evidence-based care combines therapy (especially CBT) with, where appropriate, medication. A Psychiatrist can diagnose, prescribe, and monitor — often entirely by video.",
    whenToWorry: [
      "Panic attacks interfering with daily life",
      "Thoughts of self-harm or suicide — seek help immediately",
      "Avoidance that's shrinking your world",
      "Physical symptoms (chest tightness, palpitations) that need cardiac work-up ruled out first",
    ],
    selfCare: [
      "Daily movement — even a 20-minute walk lowers baseline anxiety",
      "Regular sleep schedule",
      "Reduce caffeine and alcohol",
      "Structured breathing: 4-second inhale, 4-second hold, 6-second exhale",
      "Mindfulness or CBT-based apps as a bridge to therapy",
    ],
    relatedSpecialtySlugs: ["psychiatrist", "general-physician"],
    faqs: [
      {
        q: "Is online psychiatry confidential?",
        a: "Yes. Consultations are encrypted and notes are stored under the same privacy rules as in-person care. Nothing is shared without your consent.",
      },
      {
        q: "Will I need medication?",
        a: "Not necessarily. Many people improve with therapy alone. When medication helps, SSRIs are first-line and are started at low doses.",
      },
    ],
    keywords: ["anxiety treatment", "panic attacks", "generalised anxiety", "online psychiatrist", "anxiety medication"],
  },
  {
    slug: "skin-rash",
    name: "Skin Rash",
    titleTag: "Skin Rash — Identification, Treatment & Online Dermatologist",
    metaDescription:
      "Is it eczema, contact dermatitis, or something serious? Upload photos and get a dermatologist's diagnosis online.",
    tagline: "A photo-based consultation is often all it takes.",
    intro:
      "Skin rashes are one of the best-suited problems for telemedicine: clear photos plus a short history usually give a Dermatologist enough to diagnose and prescribe. Some rashes — especially those with systemic symptoms — still need in-person review.",
    whenToWorry: [
      "Rash with fever, joint pain, or feeling unwell",
      "Rash that doesn't fade when pressed (could indicate meningococcal infection)",
      "Rapidly spreading redness, swelling, or blistering",
      "Rash affecting the eyes, mouth, or genitals",
      "Honey-crusted, painful, or weeping rash",
    ],
    selfCare: [
      "Stop any new product (soap, detergent, cream) you recently started",
      "Cool compress — avoid hot water",
      "Fragrance-free moisturiser regularly",
      "OTC 1% hydrocortisone on limited areas, short courses only",
      "Antihistamine at night if itch is disrupting sleep",
    ],
    relatedSpecialtySlugs: ["dermatologist", "general-physician"],
    faqs: [
      {
        q: "Can a dermatologist diagnose a rash from photos?",
        a: "In most cases, yes — especially for eczema, psoriasis, contact dermatitis, fungal infections, and hives. A few conditions require in-person examination.",
      },
    ],
    keywords: ["skin rash", "eczema", "hives", "contact dermatitis", "dermatologist online"],
  },
  {
    slug: "toothache",
    name: "Toothache",
    titleTag: "Toothache — Causes, Pain Relief & Online Dentist",
    metaDescription:
      "Throbbing toothache? Find out what it could be, what helps right now, and book an online Dentist consultation.",
    tagline: "Pain relief tonight, a definitive fix soon.",
    intro:
      "Toothache usually signals decay, infection, a cracked tooth, or gum disease. A Dentist can advise on pain control, prescribe antibiotics if there's infection, and arrange in-person treatment — all in a short video consultation.",
    whenToWorry: [
      "Facial swelling, especially around the eye or under the jaw",
      "Difficulty swallowing or breathing — go to the emergency room",
      "Fever with tooth pain",
      "Pain that wakes you at night and doesn't settle with OTC analgesics",
    ],
    selfCare: [
      "Ibuprofen + paracetamol combined at label doses gives strong relief",
      "Salt-water rinses (one teaspoon in warm water, 3–4 times daily)",
      "Avoid very hot, cold, or sugary foods",
      "Clove oil on a cotton bud can temporarily numb the area",
      "Do not place aspirin directly on the gum — it burns the tissue",
    ],
    relatedSpecialtySlugs: ["dentist"],
    faqs: [
      {
        q: "Can a dentist prescribe antibiotics online?",
        a: "Yes, where clinically indicated — usually for a confirmed dental abscess or cellulitis. Antibiotics are a bridge; the tooth still needs in-person treatment.",
      },
    ],
    keywords: ["toothache", "tooth pain", "dental abscess", "online dentist", "toothache relief"],
  },
  {
    slug: "stomach-pain",
    name: "Stomach Pain",
    titleTag: "Stomach Pain — Causes, Red Flags & Online Doctor",
    metaDescription:
      "From indigestion to something more serious, learn how to read stomach pain and when to book an online doctor.",
    tagline: "Location, timing, and accompanying symptoms tell most of the story.",
    intro:
      "Abdominal pain is one of the broadest symptoms in medicine. Character and location matter: cramping mid-abdomen after meals suggests one set of causes, sharp right-lower-quadrant pain quite another. A General Physician can triage and refer to a Gastroenterologist or surgeon as needed.",
    whenToWorry: [
      "Severe, sudden pain — go to hospital",
      "Pain with vomiting blood or passing black/bloody stools",
      "Pain with fever and inability to eat or drink",
      "Pregnancy with lower abdominal pain",
      "Pain in the right lower abdomen that's worsening",
    ],
    selfCare: [
      "Sip water slowly — small amounts, frequently",
      "Bland foods (toast, rice, banana) when appetite returns",
      "Avoid NSAIDs if you suspect gastritis",
      "Heat pack on the abdomen for cramping",
      "Track timing vs meals, bowel habits, and any triggers",
    ],
    relatedSpecialtySlugs: ["general-physician"],
    faqs: [
      {
        q: "When should I worry about stomach pain?",
        a: "Sudden severe pain, pain with fever, pain with bleeding, or pain in pregnancy — all need urgent in-person assessment.",
      },
    ],
    keywords: ["stomach pain", "abdominal pain", "indigestion", "gastritis", "online doctor stomach"],
  },
  {
    slug: "sore-throat",
    name: "Sore Throat",
    titleTag: "Sore Throat — Viral vs Bacterial & Online Doctor",
    metaDescription:
      "Most sore throats are viral and settle in a week. Learn when antibiotics actually help — and book a GP online.",
    tagline: "Antibiotics rarely help a sore throat. Here's when they do.",
    intro:
      "The vast majority of sore throats are viral. Bacterial (strep) throat is less common and can usually be distinguished clinically. A video consultation lets a GP assess you, swab if needed, and prescribe antibiotics only when they'll actually help.",
    whenToWorry: [
      "Difficulty breathing or swallowing saliva",
      "Severe one-sided pain with fever (possible quinsy)",
      "Stiff neck or rash",
      "Sore throat lasting longer than a week",
    ],
    selfCare: [
      "Warm fluids — tea with honey, soup",
      "Saltwater gargles",
      "Paracetamol or ibuprofen",
      "Throat lozenges for short-term relief",
      "Rest and humidified air",
    ],
    relatedSpecialtySlugs: ["general-physician", "ent"],
    faqs: [
      {
        q: "Do I need antibiotics for a sore throat?",
        a: "Usually no. Antibiotics help confirmed bacterial (strep) throat but not the common viral sore throat. A GP can assess the likelihood in a video consultation.",
      },
    ],
    keywords: ["sore throat", "strep throat", "tonsillitis", "throat pain", "online doctor throat"],
  },
  {
    slug: "fatigue",
    name: "Fatigue",
    titleTag: "Fatigue — Causes, Tests & Online Doctor Consultation",
    metaDescription:
      "Tired all the time? From iron deficiency to thyroid to sleep — get a proper work-up with an online GP.",
    tagline: "Fatigue is a symptom, not a diagnosis. Get the cause identified.",
    intro:
      "Persistent fatigue deserves a proper work-up. Common reversible causes include iron or B12 deficiency, thyroid dysfunction, poor sleep, depression, and uncontrolled diabetes. A GP can arrange blood tests and review results in a follow-up consultation.",
    whenToWorry: [
      "Fatigue with unintended weight loss",
      "Fatigue with night sweats or fever",
      "Shortness of breath on mild exertion",
      "Fatigue with depression, hopelessness, or loss of interest",
    ],
    selfCare: [
      "7–9 hours of sleep on a consistent schedule",
      "Daylight exposure early in the day",
      "Regular movement — even a short daily walk",
      "Limit alcohol and late caffeine",
      "Balanced meals with protein, iron-rich foods, and vegetables",
    ],
    relatedSpecialtySlugs: ["general-physician", "endocrinologist"],
    faqs: [
      {
        q: "What tests will a GP order for fatigue?",
        a: "Usually full blood count, iron studies, thyroid function, vitamin D and B12, and HbA1c at minimum — plus any targeted tests based on your history.",
      },
    ],
    keywords: ["chronic fatigue", "always tired", "tiredness causes", "fatigue blood test", "online doctor fatigue"],
  },
  {
    slug: "dizziness",
    name: "Dizziness",
    titleTag: "Dizziness — Causes, Red Flags & Online Consultation | OduDoc",
    metaDescription:
      "Dizzy or lightheaded? Learn what causes dizziness, when it's serious, and book a video consultation with a doctor on OduDoc.",
    tagline: "Dizziness can be harmless or a warning sign — the difference matters.",
    intro:
      "Dizziness is a blanket term for feeling off-balance, lightheaded, or as if the room is spinning (vertigo). Most episodes are benign — dehydration, low blood pressure on standing, inner-ear issues — but sudden, severe, or recurring dizziness needs a doctor.",
    whenToWorry: [
      "Sudden severe dizziness with weakness, slurred speech, or facial droop (stroke signs)",
      "Fainting or loss of consciousness",
      "Chest pain, palpitations, or shortness of breath",
      "New hearing loss in one ear",
      "Dizziness that lasts more than a few days",
      "Head injury before the dizziness started",
    ],
    selfCare: [
      "Sit or lie down immediately when dizzy — don't try to walk it off",
      "Sip water; dehydration is a very common cause",
      "Stand up slowly, especially from bed or a hot shower",
      "Avoid driving until the episode fully resolves",
      "Note triggers (head movement, standing, meals) to share with the doctor",
    ],
    relatedSpecialtySlugs: ["general-physician", "cardiologist", "neurologist"],
    faqs: [
      {
        q: "What's the difference between dizziness and vertigo?",
        a: "Dizziness is a general off-balance feeling. Vertigo is a specific sensation that the room is spinning, and usually points to an inner-ear cause.",
      },
      {
        q: "Can low blood sugar make me dizzy?",
        a: "Yes. Skipped meals, intense exercise, or diabetes medication can drop glucose enough to cause dizziness, sweating, and shakiness.",
      },
      {
        q: "Should I see a doctor for occasional lightheadedness on standing?",
        a: "If it's brief and resolves in seconds, it's usually benign. If it's frequent, worsening, or you nearly faint, have it checked.",
      },
    ],
    keywords: ["dizziness causes", "vertigo", "lightheaded", "feeling dizzy", "online doctor dizziness"],
  },
  {
    slug: "insomnia",
    name: "Insomnia",
    titleTag: "Insomnia — Causes, Treatments & Online Doctor Consultation",
    metaDescription:
      "Can't sleep? Learn the causes of insomnia, evidence-based first steps, and when to see a doctor. Book online on OduDoc.",
    tagline: "Short runs of bad sleep are normal. Chronic insomnia is treatable — and worth treating.",
    intro:
      "Insomnia means regular trouble falling or staying asleep despite the opportunity to sleep. It's called chronic once it's happened three or more nights a week for three months. The good news: the first-line treatment (cognitive behavioural therapy for insomnia, CBT-I) works better than sleeping pills long-term.",
    whenToWorry: [
      "Insomnia affecting work, driving, or relationships",
      "Loud snoring with pauses in breathing (possible sleep apnoea)",
      "Persistent low mood, hopelessness, or anxiety",
      "Reliance on alcohol or over-the-counter sleep aids",
      "Morning headaches and excessive daytime sleepiness",
    ],
    selfCare: [
      "Fix a wake-up time — even on weekends",
      "No caffeine after 2 PM; no alcohol within three hours of bed",
      "Screens off 30–60 minutes before sleep",
      "Leave the bed if you can't sleep after 20 minutes; return only when drowsy",
      "Cool, dark, quiet bedroom — 18–20°C is ideal",
    ],
    relatedSpecialtySlugs: ["general-physician", "psychiatrist"],
    faqs: [
      {
        q: "Is it safe to take melatonin long-term?",
        a: "Short-term use is generally considered safe, but long-term data is limited. Talk to a doctor before relying on it nightly, especially if pregnant, on antidepressants, or under 18.",
      },
      {
        q: "Can CBT-I really work better than sleeping pills?",
        a: "Yes — clinical guidelines in the UK, US, and India recommend CBT-I as first-line treatment for chronic insomnia because it outperforms medication at 6–12 months.",
      },
    ],
    keywords: ["insomnia", "can't sleep", "sleep disorder", "CBT-I", "online doctor insomnia"],
  },
  {
    slug: "shortness-of-breath",
    name: "Shortness of Breath",
    titleTag: "Shortness of Breath — Causes, Warning Signs & Online Consult",
    metaDescription:
      "Breathlessness can be benign or a medical emergency. Learn the red flags and book an online doctor consultation on OduDoc.",
    tagline: "Never ignore new or sudden shortness of breath — it deserves a doctor's eye.",
    intro:
      "Breathlessness (dyspnoea) is the uncomfortable awareness of your own breathing. Common triggers include exertion, anxiety, asthma, infection, anaemia, or heart problems. New, severe, or progressive breathlessness always warrants medical assessment — the causes range from easily treated to life-threatening.",
    whenToWorry: [
      "Sudden severe breathlessness at rest",
      "Chest pain, pressure, or pain radiating to the arm or jaw",
      "Blue-tinged lips or fingertips",
      "Coughing up blood",
      "Swollen calf that's tender or warm (possible clot)",
      "Breathlessness when lying flat that wakes you up",
    ],
    selfCare: [
      "Stop and sit upright — don't try to push through",
      "Focus on slow, pursed-lip breathing if anxiety is driving it",
      "Move to fresh air if indoors is stuffy or smoky",
      "If you have an asthma inhaler and it's an asthma pattern, use it as prescribed",
      "Track how breathlessness relates to activity to describe to the doctor",
    ],
    relatedSpecialtySlugs: ["general-physician", "cardiologist"],
    faqs: [
      {
        q: "Is breathlessness always a heart or lung problem?",
        a: "No. Anaemia, anxiety, deconditioning, and thyroid problems can all cause it. A good workup looks at all of these rather than jumping to conclusions.",
      },
      {
        q: "Can I have a video consultation for shortness of breath?",
        a: "For chronic or mild symptoms, yes — a doctor can take your history and arrange tests. For sudden severe breathlessness, call emergency services instead.",
      },
    ],
    keywords: ["shortness of breath", "dyspnoea", "breathless", "can't catch breath", "online doctor breathing"],
  },
  {
    slug: "nausea",
    name: "Nausea",
    titleTag: "Nausea — Causes, Remedies & When to See a Doctor | OduDoc",
    metaDescription:
      "Feeling sick to the stomach? Learn causes of nausea, safe home remedies, and when to consult a doctor online on OduDoc.",
    tagline: "Nausea is a symptom, not a diagnosis — and the cause matters.",
    intro:
      "Nausea is the unpleasant urge to vomit. It's triggered by dozens of things: infection, pregnancy, migraine, medication side effects, vertigo, anxiety, and more serious conditions like gallbladder or pancreas issues. Occasional, short-lived nausea is rarely dangerous; persistent or severe nausea needs a doctor.",
    whenToWorry: [
      "Vomiting blood or material that looks like coffee grounds",
      "Severe abdominal pain or rigidity",
      "Nausea with chest pain or sweating (possible cardiac)",
      "Signs of dehydration — no urine for 8 hours, dizziness on standing",
      "Confusion, severe headache, or stiff neck",
      "Nausea lasting more than 48 hours",
    ],
    selfCare: [
      "Sip clear fluids slowly — large volumes make it worse",
      "Bland foods: toast, rice, bananas, plain yoghurt",
      "Ginger tea or candied ginger often helps mild nausea",
      "Avoid strong smells, fatty foods, and alcohol",
      "Rest upright for 30 minutes after eating",
    ],
    relatedSpecialtySlugs: ["general-physician", "gastroenterologist"],
    faqs: [
      {
        q: "Is nausea without vomiting a bad sign?",
        a: "Not necessarily. Many common causes — early pregnancy, motion sickness, medication side effects — cause nausea without actual vomiting.",
      },
      {
        q: "Can I take anti-nausea medication without prescription?",
        a: "Some options are over-the-counter, but self-treating nausea for more than a day or two risks masking a serious cause. Speak to a doctor first.",
      },
    ],
    keywords: ["nausea", "feeling sick", "nausea without vomiting", "nausea remedies", "online doctor nausea"],
  },
  {
    slug: "joint-pain",
    name: "Joint Pain",
    titleTag: "Joint Pain — Causes, Relief & Online Doctor Consultation",
    metaDescription:
      "Aching knees, wrists, or hips? Learn common causes of joint pain and book a video consultation with an orthopaedist on OduDoc.",
    tagline: "Joint pain isn't 'just age' — most causes are treatable once identified.",
    intro:
      "Joint pain covers everything from a twisted knee to the symmetric morning stiffness of rheumatoid arthritis. The pattern — which joints, how many, morning vs evening, swelling vs no swelling — tells the doctor far more than the pain level alone. Early assessment matters for inflammatory arthritis because prompt treatment prevents permanent damage.",
    whenToWorry: [
      "A hot, red, swollen joint (possible infection or gout)",
      "Joint pain with fever or rash",
      "Inability to bear weight after an injury",
      "Morning stiffness lasting more than 30–60 minutes",
      "Symmetric pain in fingers, wrists, or knees",
      "Unexplained weight loss alongside joint pain",
    ],
    selfCare: [
      "Rest the joint for 24–48 hours but avoid full immobilisation",
      "Ice for acute injury; heat for chronic stiffness",
      "Paracetamol or topical NSAIDs per label if no contraindication",
      "Low-impact movement (swimming, cycling) preserves range of motion",
      "Weight management reduces knee and hip load significantly",
    ],
    relatedSpecialtySlugs: ["orthopedist", "general-physician"],
    faqs: [
      {
        q: "Is joint cracking a problem?",
        a: "Painless, occasional cracking is almost always harmless. Cracking with pain, swelling, or locking should be assessed.",
      },
      {
        q: "When should I see an orthopaedist vs a GP?",
        a: "Start with a GP for most new joint pain. Move to an orthopaedist for persistent, severe, or post-injury pain that doesn't respond to first-line care.",
      },
    ],
    keywords: ["joint pain", "aching joints", "arthritis pain", "knee pain", "online orthopaedist"],
  },
  {
    slug: "constipation",
    name: "Constipation",
    titleTag: "Constipation — Causes, Fixes & When to See a Doctor | OduDoc",
    metaDescription:
      "Struggling to go? Learn the real causes of constipation, safe first steps, and when to book a doctor online on OduDoc.",
    tagline: "Everyone gets constipated sometimes. If it's your new normal, that's worth checking.",
    intro:
      "Constipation usually means fewer than three bowel movements per week, hard stools, or straining. Low fibre, low water intake, inactivity, certain medications, and stress are the usual culprits. A sudden change in bowel habits that lasts beyond a couple of weeks — especially after 40 — always deserves a doctor's assessment.",
    whenToWorry: [
      "Blood in the stool or on the toilet paper",
      "Unexplained weight loss or persistent abdominal pain",
      "A new, lasting change in bowel habit after age 40",
      "Severe abdominal swelling or inability to pass gas",
      "Constipation alternating with diarrhoea",
      "Family history of colorectal cancer",
    ],
    selfCare: [
      "Add fibre gradually — aim for 25–30 g/day from fruit, veg, whole grains",
      "Drink enough water to keep urine pale yellow",
      "Move daily — even 20 minutes of walking helps transit",
      "Respond to the urge rather than holding it",
      "Limit long stretches on the toilet; straining makes haemorrhoids worse",
    ],
    relatedSpecialtySlugs: ["general-physician", "gastroenterologist"],
    faqs: [
      {
        q: "How long can I safely use a laxative?",
        a: "Short-term use (a few days) is generally fine. Regular use of stimulant laxatives for weeks can make things worse — see a doctor if you need them ongoing.",
      },
      {
        q: "Is it normal to not go every day?",
        a: "Yes. Anywhere from three times a day to three times a week can be normal, provided stools are soft and passing them doesn't hurt.",
      },
    ],
    keywords: ["constipation", "hard stool", "infrequent bowel movements", "constipation remedies", "online doctor constipation"],
  },
];

export function getSymptomBySlug(slug: string): SymptomMeta | undefined {
  return SYMPTOMS.find((x) => x.slug === slug);
}
