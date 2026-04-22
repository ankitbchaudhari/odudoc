// Side-by-side comparison landing pages. These capture "X vs Y" decision
// intent — high click-through, high commercial value, naturally easy to
// outrank thin blog spam with a clean structured comparison.

export interface CompareRow {
  label: string;
  a: string;
  b: string;
}

export interface CompareMeta {
  slug: string;         // e.g. "telemedicine-vs-in-person"
  a: string;            // short label, e.g. "Telemedicine"
  b: string;            // short label, e.g. "In-Person Visit"
  aLong: string;        // full label for body copy
  bLong: string;
  titleTag: string;
  metaDescription: string;
  tagline: string;
  overview: string;
  rows: CompareRow[];
  whenToChoose: { a: string[]; b: string[] };
  verdict: string;      // 2-4 sentence takeaway
  relatedSlugs: string[]; // other compare slugs
  internalLinks?: Array<{ label: string; href: string }>;
  keywords: string[];
}

export const COMPARES: CompareMeta[] = [
  {
    slug: "telemedicine-vs-in-person",
    a: "Telemedicine",
    b: "In-Person Visit",
    aLong: "Telemedicine / video consultation",
    bLong: "Traditional in-person clinic visit",
    titleTag: "Telemedicine vs In-Person: Which Is Right for Your Symptom?",
    metaDescription:
      "A clear side-by-side of online doctor consultation versus traditional clinic visits — speed, cost, limits, and what each does best.",
    tagline: "Neither is better in general — each is better for specific situations.",
    overview:
      "For routine, chronic, mental-health, and follow-up care, telemedicine is usually faster, cheaper, and equal in outcome. For anything needing hands-on examination, imaging, or procedures, in-person remains essential. Most patients in 2026 use both.",
    rows: [
      { label: "Time to see a doctor", a: "Typically 10-60 min", b: "Days to weeks" },
      { label: "Cost (average)", a: "30-60% lower", b: "Full clinic fee + travel" },
      { label: "Travel", a: "None", b: "Significant for many patients" },
      { label: "Physical examination", a: "Limited — inspection only", b: "Full (palpation, auscultation, etc.)" },
      { label: "Prescriptions", a: "Most classes — digital, pharmacy-honoured", b: "Full range including controlled drugs where allowed" },
      { label: "Tests and imaging", a: "Requested — done at separate lab/centre", b: "Often same-day on site" },
      { label: "Procedures", a: "Not possible", b: "Full scope" },
      { label: "Follow-ups", a: "Convenient, often same-day", b: "Usually scheduled weeks out" },
      { label: "Continuity", a: "Digital record, easy sharing", b: "Often paper-based" },
    ],
    whenToChoose: {
      a: [
        "Cold, flu, sore throat, sinus symptoms",
        "Skin rashes and acne",
        "Mental health — therapy and psychiatry",
        "Medication refills for stable conditions",
        "Lab report review",
        "Post-op check-ins",
      ],
      b: [
        "Chest pain, severe abdominal pain, trauma",
        "Anything requiring physical examination",
        "Procedures, injections, IV fluids",
        "Suspected appendicitis or surgical abdomen",
        "New neurological deficit",
      ],
    },
    verdict:
      "Start with telemedicine for most routine problems — it's faster and cheaper, and your doctor will send you in if needed. Go directly in-person for red-flag symptoms, procedures, and anything that needs hands.",
    relatedSlugs: ["online-doctor-vs-er", "ehr-vs-emr"],
    internalLinks: [
      { label: "Video consultations on OduDoc", href: "/consult" },
      { label: "Symptoms A–Z", href: "/symptoms" },
    ],
    keywords: ["telemedicine vs in person", "online vs offline doctor", "video consultation vs clinic"],
  },
  {
    slug: "ehr-vs-emr",
    a: "EHR",
    b: "EMR",
    aLong: "Electronic Health Record",
    bLong: "Electronic Medical Record",
    titleTag: "EHR vs EMR: What's the Difference and Which Do You Need?",
    metaDescription:
      "EHR and EMR sound alike but aren't. A clinic-ready comparison of features, interoperability, and the right pick for your size.",
    tagline: "EMR lives inside your clinic. EHR follows the patient everywhere.",
    overview:
      "EMR is a digital version of the traditional chart — used and maintained by one practice. EHR is a broader, shareable record designed to move with the patient across providers. For a solo clinic the distinction may not matter; for multi-site or network care, EHR is a must.",
    rows: [
      { label: "Scope", a: "Patient record across providers", b: "Clinic-local chart only" },
      { label: "Interoperability", a: "Designed for it (FHIR, HL7, CCDA)", b: "Often limited" },
      { label: "Patient access", a: "Usually portal-based", b: "Typically none" },
      { label: "Data analytics", a: "Population-level possible", b: "Single-clinic only" },
      { label: "Typical user", a: "Hospitals, networks, multi-site clinics", b: "Solo and small practices" },
      { label: "Cost", a: "Higher", b: "Lower" },
      { label: "Complexity", a: "More configuration", b: "Simpler rollout" },
    ],
    whenToChoose: {
      a: [
        "Multi-site or multi-specialty clinic",
        "Labs, pharmacy, or imaging under one roof",
        "Hospital with admissions and discharges",
        "Referrals in and out of your network",
      ],
      b: [
        "Solo or 1-3 doctor practice",
        "Charting and basic billing only",
        "No current need for external integrations",
      ],
    },
    verdict:
      "Pick the smallest thing that fits today — but buy something that can grow. An EMR with a clear upgrade path to EHR features is often the sweet spot for a growing clinic.",
    relatedSlugs: ["telemedicine-vs-in-person"],
    internalLinks: [
      { label: "Clinic & hospital software", href: "/for-clinics" },
      { label: "Pricing", href: "/pricing" },
    ],
    keywords: ["EHR vs EMR", "electronic health record", "hospital software comparison"],
  },
  {
    slug: "online-doctor-vs-er",
    a: "Online Doctor",
    b: "Emergency Room",
    aLong: "Online doctor (video consultation)",
    bLong: "Emergency room (ER) or A&E",
    titleTag: "Online Doctor vs ER: When Is Each the Right Call?",
    metaDescription:
      "Not sure whether to book a video consultation or head to the ER? A clear triage checklist to help you decide in 30 seconds.",
    tagline: "Online for routine. ER for anything that might be life- or limb-threatening.",
    overview:
      "ERs exist for true emergencies — they're overkill for a sore throat and fatal delays away from a heart attack. Online doctors handle an enormous range of problems, but they're not a replacement for emergency medicine.",
    rows: [
      { label: "Speed (non-critical)", a: "10-60 min", b: "Hours of waiting" },
      { label: "Speed (true emergency)", a: "Unsafe delay", b: "Minutes — this is what ERs are for" },
      { label: "Cost", a: "Low", b: "Very high" },
      { label: "Imaging and labs", a: "Ordered for later", b: "On-site, immediate" },
      { label: "Procedures", a: "None", b: "Full (including life-saving)" },
    ],
    whenToChoose: {
      a: [
        "Cold, flu, cough, sore throat",
        "Skin rash or minor skin infection",
        "Mental health support",
        "Prescription refills",
        "Lab result review",
      ],
      b: [
        "Chest pain, pressure, or tightness",
        "Sudden, severe headache",
        "Stroke warning signs (FAST)",
        "Severe abdominal pain",
        "Shortness of breath",
        "Serious injury or uncontrolled bleeding",
        "Suicidal crisis",
      ],
    },
    verdict:
      "If any ER warning sign is present, go to the ER or call emergency services. For everything else, online is faster, cheaper, and just as good. When in doubt, book an online consult — the doctor will escalate if needed.",
    relatedSlugs: ["telemedicine-vs-in-person", "urgent-care-vs-er"],
    internalLinks: [
      { label: "Book an online consultation", href: "/consult" },
    ],
    keywords: ["online doctor vs ER", "when to go to ER", "telemedicine vs emergency"],
  },
  {
    slug: "urgent-care-vs-er",
    a: "Urgent Care",
    b: "Emergency Room",
    aLong: "Urgent care clinic",
    bLong: "Emergency room / A&E",
    titleTag: "Urgent Care vs ER: Which Should You Choose?",
    metaDescription:
      "Stitches, sprains, mild fevers — or chest pain? A simple decision guide between urgent care and the emergency room.",
    tagline: "Urgent care handles the 'serious but not life-threatening'. The ER handles the rest.",
    overview:
      "Urgent care clinics fill the gap between primary care and the emergency room: minor injuries, infections, and illnesses that can't wait for an appointment but don't need hospital-level resources.",
    rows: [
      { label: "Cost", a: "Moderate", b: "Very high" },
      { label: "Wait time", a: "Typically under 1 hour", b: "Often 2-6 hours" },
      { label: "Imaging", a: "X-ray on site", b: "CT, MRI, ultrasound" },
      { label: "Specialist access", a: "Limited", b: "Full hospital specialists" },
      { label: "Severity limits", a: "Cannot admit", b: "Can admit and operate" },
    ],
    whenToChoose: {
      a: [
        "Minor cuts needing stitches",
        "Sprains and possible simple fractures",
        "Moderate fevers and flu",
        "UTIs and ear infections",
        "Minor burns",
      ],
      b: [
        "Any chest pain or stroke signs",
        "Severe bleeding",
        "Major trauma",
        "Severe abdominal pain",
        "Trouble breathing",
      ],
    },
    verdict:
      "For symptoms in the grey zone, online triage first. An OduDoc doctor can assess by video in 10 minutes and tell you whether urgent care is enough — saving hours and a big bill.",
    relatedSlugs: ["online-doctor-vs-er"],
    keywords: ["urgent care vs ER", "when to go to urgent care", "ER vs walk-in"],
  },
  {
    slug: "mri-vs-ct",
    a: "MRI",
    b: "CT Scan",
    aLong: "Magnetic resonance imaging (MRI)",
    bLong: "Computed tomography (CT) scan",
    titleTag: "MRI vs CT Scan: Which Does Your Doctor Actually Need?",
    metaDescription:
      "MRI and CT answer different questions. Here's how they differ in detail, speed, cost, and radiation — and which is right when.",
    tagline: "Soft tissue detail beats bone and bleeding urgency — and vice versa.",
    overview:
      "MRI uses magnetic fields to produce detailed soft-tissue images. CT uses X-rays for fast cross-sectional views. They answer different clinical questions; doctors don't usually substitute one for the other.",
    rows: [
      { label: "Scan time", a: "20-60 min", b: "5-10 min" },
      { label: "Radiation", a: "None", b: "Moderate" },
      { label: "Soft tissue detail", a: "Excellent", b: "Good" },
      { label: "Bone detail", a: "Good", b: "Excellent" },
      { label: "Acute bleeding", a: "Slower to detect", b: "Very fast to detect" },
      { label: "Claustrophobia", a: "Significant — long, enclosed", b: "Short, open-ring" },
      { label: "Cost (relative)", a: "Higher", b: "Lower" },
      { label: "Best for", a: "Brain, spine, joints, ligaments", b: "Trauma, strokes, chest, abdomen" },
    ],
    whenToChoose: {
      a: [
        "Knee, shoulder, or spinal ligament injury",
        "Suspected MS or brain tumour",
        "Pituitary imaging",
        "Liver lesion characterisation",
      ],
      b: [
        "Acute trauma and head injury",
        "Suspected stroke (first-line)",
        "Pulmonary embolism",
        "Kidney stones",
        "Acute abdominal pain workup",
      ],
    },
    verdict:
      "You don't choose between these — your doctor does, based on the clinical question. If you have both options offered, ask which answers the question better and which involves less radiation for your age.",
    relatedSlugs: [],
    internalLinks: [{ label: "Order a scan or lab test", href: "/tests" }],
    keywords: ["MRI vs CT", "MRI or CT scan", "medical imaging comparison"],
  },
  {
    slug: "therapist-vs-psychiatrist",
    a: "Therapist",
    b: "Psychiatrist",
    aLong: "Psychologist / therapist",
    bLong: "Psychiatrist",
    titleTag: "Therapist vs Psychiatrist: Who Should You See?",
    metaDescription:
      "Therapy, medication, or both? Understand the difference between a therapist and a psychiatrist and pick the right starting point.",
    tagline: "They're not substitutes — they're partners.",
    overview:
      "Therapists deliver psychotherapy — talking treatments like CBT. Psychiatrists are medical doctors who can diagnose, prescribe medication, and manage complex or severe mental illness. Many people benefit from both, often simultaneously.",
    rows: [
      { label: "Medical training", a: "PhD/PsyD/MA (psychology)", b: "Medical doctor (MD/MBBS + specialty)" },
      { label: "Prescribes medication", a: "Usually no", b: "Yes" },
      { label: "Delivers therapy", a: "Yes — their primary tool", b: "Sometimes, less commonly" },
      { label: "Session length", a: "45-60 min, often weekly", b: "30-60 min initial, shorter follow-ups" },
      { label: "Cost per session", a: "Moderate", b: "Higher" },
      { label: "Typical entry point for", a: "Mild to moderate symptoms, life-change support", b: "Severe symptoms, medication needed, complex diagnosis" },
    ],
    whenToChoose: {
      a: [
        "Relationship or grief work",
        "Mild to moderate anxiety or depression",
        "Life transitions",
        "Skills you want to build (coping, parenting, assertiveness)",
      ],
      b: [
        "Suspected bipolar disorder or psychosis",
        "Severe depression or anxiety not responding to therapy",
        "ADHD diagnosis and medication",
        "Medication review for existing psychiatric treatment",
      ],
    },
    verdict:
      "If you're unsure, start with a Psychiatrist video consultation — they can diagnose, recommend therapy or medication, and refer to the right therapist. For straightforward stress or mild symptoms, a therapist is often the faster route.",
    relatedSlugs: ["telemedicine-vs-in-person"],
    internalLinks: [
      { label: "Book a Psychiatrist online", href: "/specialty/psychiatrist" },
    ],
    keywords: ["therapist vs psychiatrist", "psychologist vs psychiatrist", "who should I see mental health"],
  },
  {
    slug: "dietitian-vs-nutritionist",
    a: "Dietitian",
    b: "Nutritionist",
    aLong: "Registered Dietitian (RD)",
    bLong: "Nutritionist",
    titleTag: "Dietitian vs Nutritionist: What's the Real Difference?",
    metaDescription:
      "Dietitian or nutritionist? One is a regulated clinical credential, the other isn't. Here's what that means for your choice.",
    tagline: "One is a regulated credential. The other often isn't.",
    overview:
      "In most countries, 'dietitian' is a protected, regulated clinical title requiring a degree, supervised practice, and registration. 'Nutritionist' is often unregulated and can be used by anyone from a certified professional to a weekend-course graduate.",
    rows: [
      { label: "Regulated title", a: "Yes (in most countries)", b: "Often no" },
      { label: "Clinical training", a: "Extensive", b: "Varies widely" },
      { label: "Can treat medical conditions", a: "Yes (diabetes, kidney, IBD, etc.)", b: "Limited scope" },
      { label: "Insurance coverage", a: "Usually covered", b: "Rarely covered" },
      { label: "Typical cost", a: "Moderate to high", b: "Lower" },
    ],
    whenToChoose: {
      a: [
        "Medical condition (diabetes, kidney disease, eating disorder)",
        "Post-bariatric surgery",
        "Pregnancy nutrition",
        "Insurance-covered care",
      ],
      b: [
        "General wellness goals with a reputable practitioner",
        "Coaching or meal planning without a medical condition",
      ],
    },
    verdict:
      "For anything tied to a medical condition, choose a registered dietitian. For general wellness and weight coaching, a qualified nutritionist can be excellent — but check their credentials carefully.",
    relatedSlugs: [],
    keywords: ["dietitian vs nutritionist", "RD vs nutritionist", "nutrition specialist choice"],
  },
  {
    slug: "paracetamol-vs-ibuprofen",
    a: "Paracetamol",
    b: "Ibuprofen",
    aLong: "Paracetamol (acetaminophen)",
    bLong: "Ibuprofen (an NSAID)",
    titleTag: "Paracetamol vs Ibuprofen: Which Should You Take?",
    metaDescription:
      "Pain, fever, headache — which is better? A plain-English comparison of paracetamol and ibuprofen, with safety notes.",
    tagline: "Different mechanisms, often combined for best relief.",
    overview:
      "Paracetamol works primarily in the brain to reduce pain and fever. Ibuprofen reduces inflammation and pain throughout the body. Combining them at appropriate doses is safe for most adults and often more effective than either alone.",
    rows: [
      { label: "How it works", a: "Central pain/fever", b: "Anti-inflammatory + pain/fever" },
      { label: "Pain type", a: "Headache, general pain, fever", b: "Inflammatory pain (injury, dental, period)" },
      { label: "On empty stomach", a: "Fine", b: "Avoid" },
      { label: "Kidney safety", a: "Safer", b: "Avoid if kidney disease" },
      { label: "Ulcer or GI bleed history", a: "Preferred", b: "Avoid" },
      { label: "Pregnancy", a: "First-line (follow dosing)", b: "Avoid third trimester" },
      { label: "Liver safety", a: "Avoid if liver disease or heavy alcohol use", b: "Safer for liver" },
      { label: "Max adult daily dose", a: "4 g (3 g for small/elderly)", b: "1.2 g OTC" },
    ],
    whenToChoose: {
      a: [
        "Headache or fever first-line",
        "Kidney disease or ulcer history",
        "Pregnancy",
        "Children (correct weight-based dose)",
      ],
      b: [
        "Menstrual pain",
        "Dental pain and swelling",
        "Musculoskeletal injury",
        "Gout flares",
      ],
    },
    verdict:
      "Paracetamol first for headache and fever; ibuprofen first for inflammation. For strong pain, alternating or combining at label doses is safe for most adults — but check with a doctor if you have kidney, liver, ulcer, or heart disease, or are pregnant.",
    relatedSlugs: [],
    keywords: ["paracetamol vs ibuprofen", "acetaminophen vs ibuprofen", "pain relief choice"],
  },
];

export function getCompareBySlug(slug: string): CompareMeta | undefined {
  return COMPARES.find((c) => c.slug === slug);
}
