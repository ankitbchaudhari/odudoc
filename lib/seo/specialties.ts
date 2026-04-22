// Registry of medical specialties for SEO landing pages.
//
// One entry per specialty renders a public, indexable page at
// /specialty/[slug] with keyword-rich copy, a doctor list, and FAQPage /
// Service JSON-LD. Adding a new specialty here automatically gets it into
// the sitemap and the directory index.

export interface SpecialtyMeta {
  slug: string;
  /** Matches `Doctor.specialty` so we can filter the public doctor list. */
  canonicalName: string;
  /** Shown in H1 and OG title. */
  displayName: string;
  /** Shown in <title>. ~55 chars. */
  titleTag: string;
  /** Meta description. ~150 chars. */
  metaDescription: string;
  /** One-line intro under H1. */
  tagline: string;
  /** Paragraph body shown above the doctor list. Plain text, no markup. */
  intro: string;
  /** Common conditions this specialty treats — becomes a bulleted list + keywords. */
  conditions: string[];
  /** Common symptoms a patient searches for — internal linking + content. */
  symptoms: string[];
  /** FAQ items for FAQPage schema. */
  faqs: Array<{ q: string; a: string }>;
  /** Extra search-intent keywords. */
  keywords: string[];
}

export const SPECIALTIES: SpecialtyMeta[] = [
  {
    slug: "general-physician",
    canonicalName: "General Physician",
    displayName: "General Physician",
    titleTag: "Online General Physician Consultation — Book Video Visit",
    metaDescription:
      "Consult a general physician online for fever, cold, cough, infections, and everyday health issues. Get prescriptions in under 30 minutes.",
    tagline: "Your first call for everyday health issues.",
    intro:
      "A general physician (GP) is the right starting point for most symptoms — cold, flu, fever, body aches, infections, mild allergies, and anything you're not sure of. Video consultations work well here because a GP can assess severity, prescribe medication, and tell you whether you need a specialist or in-person care.",
    conditions: [
      "Cold, cough, sore throat",
      "Fever and fatigue",
      "Viral infections",
      "Urinary tract infections",
      "Food poisoning and diarrhoea",
      "Seasonal allergies",
      "Mild hypertension or diabetes follow-up",
      "General check-ups and second opinions",
    ],
    symptoms: [
      "fever",
      "cough",
      "headache",
      "body pain",
      "weakness",
      "nausea",
      "stomach pain",
    ],
    faqs: [
      {
        q: "When should I consult a general physician online?",
        a: "For any routine illness — fever, cold, cough, infections, fatigue, stomach upset — or to get a prescription refilled. If you're unsure which specialist you need, start with a GP.",
      },
      {
        q: "Can a GP prescribe antibiotics online?",
        a: "Yes. After assessing your symptoms and history, the doctor can issue a digital prescription that your pharmacy will accept.",
      },
      {
        q: "How much does an online GP consultation cost on OduDoc?",
        a: "Pricing varies by doctor and starts from the doctor's listed consultation fee. No hidden fees — you see the amount before confirming.",
      },
    ],
    keywords: [
      "online general physician",
      "GP consultation online",
      "family doctor online",
      "video doctor consultation",
    ],
  },
  {
    slug: "dermatologist",
    canonicalName: "Dermatologist",
    displayName: "Dermatologist",
    titleTag: "Online Dermatologist — Skin, Hair & Acne Consultation",
    metaDescription:
      "Consult a dermatologist online for acne, eczema, hair loss, pigmentation, and skin infections. Upload photos, get prescriptions, same day.",
    tagline: "Skin and hair care from verified dermatologists.",
    intro:
      "Dermatology is a great fit for video consultation — most skin conditions can be assessed from close-up photos and a short description of onset, location, and triggers. On OduDoc you can upload photos in advance so the dermatologist can review them before the call.",
    conditions: [
      "Acne and post-acne scars",
      "Eczema and atopic dermatitis",
      "Psoriasis",
      "Hair loss and dandruff",
      "Pigmentation and melasma",
      "Fungal and bacterial skin infections",
      "Allergic rashes and hives",
      "Anti-ageing and skincare routines",
    ],
    symptoms: ["acne", "rash", "itching", "hair fall", "dandruff", "dark spots", "dry skin"],
    faqs: [
      {
        q: "Can a dermatologist diagnose my skin problem over video?",
        a: "Yes, in most cases. Clear photos in good lighting plus your symptom history are usually enough for common conditions like acne, eczema, fungal infections, and hair loss. Anything suspicious for skin cancer or requiring a biopsy will be referred for an in-person visit.",
      },
      {
        q: "Will I get a prescription after the consultation?",
        a: "Yes — prescriptions are digital and delivered to your OduDoc account right after the call.",
      },
      {
        q: "Should I stop my current skincare before the appointment?",
        a: "No. Continue your normal routine so the doctor sees your actual state, and mention every product you use during the call.",
      },
    ],
    keywords: [
      "online dermatologist",
      "skin doctor consultation",
      "acne treatment online",
      "hair fall specialist online",
    ],
  },
  {
    slug: "gynecologist",
    canonicalName: "Gynecologist",
    displayName: "Gynecologist",
    titleTag: "Online Gynecologist Consultation — Women's Health Care",
    metaDescription:
      "Private online gynecology consultations for periods, PCOS, pregnancy, contraception, and menopause. 100% confidential, book in minutes.",
    tagline: "Confidential women's health consultations.",
    intro:
      "Gynecologist video consultations are ideal for period issues, PCOS management, early pregnancy advice, contraception counselling, and post-natal follow-up. All consultations are private and the doctor can order any labs or scans you need.",
    conditions: [
      "Irregular or painful periods",
      "PCOS and PCOD",
      "Pregnancy and prenatal care",
      "Contraception and family planning",
      "UTI and vaginal infections",
      "Menopause symptoms",
      "Fertility counselling",
      "Breast and pelvic discomfort",
    ],
    symptoms: [
      "irregular periods",
      "period pain",
      "white discharge",
      "pregnancy symptoms",
      "hot flashes",
    ],
    faqs: [
      {
        q: "Are online gynecology consultations confidential?",
        a: "Yes. All consultations are private, encrypted, and only accessible to you and your doctor.",
      },
      {
        q: "Can I discuss pregnancy over a video call?",
        a: "Absolutely — early pregnancy advice, symptom management, and scan reviews are commonly handled online. Physical examinations still require an in-person visit.",
      },
      {
        q: "Can the doctor order lab tests?",
        a: "Yes. Your gynecologist can order home blood tests and ultrasound referrals directly from the call.",
      },
    ],
    keywords: [
      "online gynecologist",
      "women's health online",
      "PCOS doctor online",
      "pregnancy consultation online",
    ],
  },
  {
    slug: "pediatrician",
    canonicalName: "Pediatrician",
    displayName: "Pediatrician",
    titleTag: "Online Pediatrician — Child Doctor Consultation",
    metaDescription:
      "Talk to a pediatrician online for fever, cough, cold, rashes, vaccination schedules, and feeding questions. Fast help for your child's health.",
    tagline: "Caring for your child from home.",
    intro:
      "Pediatric video consultations let parents get quick advice for common childhood illnesses without dragging a sick child to a clinic. OduDoc pediatricians handle fevers, rashes, colds, feeding questions, and vaccination schedule reviews. For anything that needs physical examination — suspected ear infection, severe dehydration, injuries — you'll be referred to in-person care.",
    conditions: [
      "Fever and cough in children",
      "Diarrhoea and vomiting",
      "Rashes and skin issues",
      "Feeding and nutrition concerns",
      "Sleep issues",
      "Vaccination schedule review",
      "Growth and milestones",
      "Allergy concerns",
    ],
    symptoms: ["child fever", "baby cough", "baby rash", "diarrhoea", "not eating"],
    faqs: [
      {
        q: "From what age can my child have an online consultation?",
        a: "Any age, including newborns. For infants the doctor will ask the parent detailed questions and may request a video of the child's breathing or feeding.",
      },
      {
        q: "When should I take my child to the ER instead?",
        a: "Difficulty breathing, seizures, persistent high fever in infants under 3 months, severe dehydration, or head injuries need in-person emergency care.",
      },
      {
        q: "Can the pediatrician review my child's vaccination card?",
        a: "Yes — upload a photo and the doctor will identify any missing or due shots.",
      },
    ],
    keywords: [
      "online pediatrician",
      "child doctor online",
      "baby fever doctor",
      "pediatric video consultation",
    ],
  },
  {
    slug: "dentist",
    canonicalName: "Dentist",
    displayName: "Dentist",
    titleTag: "Online Dental Consultation — Tooth Pain & Oral Health",
    metaDescription:
      "Online dental consultations for tooth pain, gum issues, orthodontics, and dental hygiene advice. Get a treatment plan before visiting a clinic.",
    tagline: "Dental advice before you book the chair.",
    intro:
      "Dental video consultations are excellent for triage: assessing how urgent a tooth issue is, reviewing x-rays from another clinic, orthodontic consultations, and preventive care advice. Most actual dental treatment still happens in person, but a 15-minute video call can save you from unnecessary emergency visits.",
    conditions: [
      "Tooth pain and sensitivity",
      "Gum bleeding and inflammation",
      "Orthodontic consultations",
      "Cosmetic dentistry options",
      "Dental hygiene advice",
      "Wisdom tooth issues",
      "X-ray second opinions",
    ],
    symptoms: ["tooth pain", "gum pain", "sensitivity", "bad breath", "swollen gums"],
    faqs: [
      {
        q: "What can a dentist help with over video?",
        a: "Triage, second opinions, orthodontic planning, post-procedure follow-ups, and reviewing x-rays you've had done elsewhere.",
      },
      {
        q: "Can a dentist prescribe antibiotics or painkillers online?",
        a: "Yes, when clinically appropriate.",
      },
      {
        q: "Do I still need to visit a dental clinic?",
        a: "For cleanings, fillings, extractions, and most procedures — yes. The online visit saves you an unnecessary consultation before the treatment.",
      },
    ],
    keywords: ["online dentist", "dental consultation online", "tooth pain doctor"],
  },
  {
    slug: "orthopedist",
    canonicalName: "Orthopedist",
    displayName: "Orthopedist",
    titleTag: "Online Orthopedic Consultation — Bones, Joints & Back Pain",
    metaDescription:
      "Consult an orthopedic specialist online for back pain, knee pain, joint issues, sports injuries, and fracture follow-ups.",
    tagline: "Get moving again — bones, joints, and muscles.",
    intro:
      "Orthopedic video consultations are useful for chronic joint and back pain, post-fracture follow-ups, sports injury assessment, and reviewing x-rays or MRI scans. The doctor can guide you through simple at-home range-of-motion tests and tell you whether you need imaging or a specialist referral.",
    conditions: [
      "Back pain and sciatica",
      "Knee and joint pain",
      "Sports injuries",
      "Shoulder pain",
      "Post-fracture follow-up",
      "Arthritis management",
      "Neck pain and stiffness",
      "MRI and x-ray reviews",
    ],
    symptoms: ["back pain", "knee pain", "joint pain", "shoulder pain", "neck pain"],
    faqs: [
      {
        q: "Can an orthopedist diagnose my pain over video?",
        a: "They can do a thorough assessment using your history, a few guided physical movements, and any imaging you have. For new or severe injuries they may refer you for an x-ray first.",
      },
      {
        q: "Should I send scans before the appointment?",
        a: "Yes — upload any x-rays, MRIs, or previous reports to your OduDoc profile so the doctor can review them before the call.",
      },
      {
        q: "Can physical therapy be prescribed online?",
        a: "Yes, including home exercise plans and referrals to in-person PT.",
      },
    ],
    keywords: [
      "online orthopedic doctor",
      "back pain doctor online",
      "knee pain specialist",
      "orthopedic consultation online",
    ],
  },
  {
    slug: "psychiatrist",
    canonicalName: "Psychiatrist",
    displayName: "Psychiatrist",
    titleTag: "Online Psychiatrist — Anxiety, Depression & Mental Health",
    metaDescription:
      "Talk to a psychiatrist online for anxiety, depression, stress, sleep issues, ADHD, and medication management. Private and judgment-free.",
    tagline: "Mental health support, your schedule.",
    intro:
      "Psychiatry is one of the most studied specialties for telemedicine — clinical outcomes match in-person care. OduDoc psychiatrists handle the full range of adult mental health issues, from first-time anxiety to long-term medication management. All sessions are private and confidential.",
    conditions: [
      "Anxiety and panic attacks",
      "Depression",
      "Insomnia and sleep issues",
      "ADHD (adult)",
      "OCD",
      "PTSD",
      "Substance-use concerns",
      "Medication review",
    ],
    symptoms: ["anxiety", "panic attacks", "depression", "insomnia", "stress"],
    faqs: [
      {
        q: "Is online psychiatry as effective as in-person?",
        a: "For most common conditions — anxiety, depression, ADHD, sleep issues — studies show comparable outcomes to in-person care.",
      },
      {
        q: "Can the psychiatrist prescribe medication?",
        a: "Yes. After assessment the psychiatrist can start, adjust, or renew medications, and schedule follow-ups.",
      },
      {
        q: "Is the session confidential?",
        a: "Yes. All mental health consultations are strictly private and never shared without your consent.",
      },
    ],
    keywords: [
      "online psychiatrist",
      "anxiety doctor online",
      "depression treatment online",
      "mental health consultation",
    ],
  },
  {
    slug: "cardiologist",
    canonicalName: "Cardiologist",
    displayName: "Cardiologist",
    titleTag: "Online Cardiologist — Heart Health Consultation",
    metaDescription:
      "Consult a cardiologist online for blood pressure management, chest discomfort, ECG review, cholesterol, and follow-up care.",
    tagline: "Heart health — without the waiting room.",
    intro:
      "Cardiology video consultations are great for chronic management: blood pressure review, medication titration, cholesterol optimisation, and reviewing ECG or echo reports. Any acute chest pain, shortness of breath, or fainting needs emergency in-person care — not a video call.",
    conditions: [
      "Hypertension",
      "High cholesterol",
      "Heart palpitations",
      "ECG and echo report review",
      "Medication review",
      "Post-angioplasty follow-up",
      "Heart failure management",
    ],
    symptoms: ["palpitations", "high BP", "chest discomfort", "shortness of breath"],
    faqs: [
      {
        q: "Can a cardiologist monitor my blood pressure remotely?",
        a: "Yes. If you have a home BP monitor, the cardiologist can log your readings and adjust medications over follow-up calls.",
      },
      {
        q: "When should I go to an ER instead?",
        a: "Any severe chest pain, shortness of breath at rest, fainting, or pain radiating to the arm or jaw — call emergency services immediately.",
      },
      {
        q: "Can I upload my ECG for review?",
        a: "Yes — upload ECG photos, echo reports, and lab results to your OduDoc profile and the cardiologist will review them in the call.",
      },
    ],
    keywords: [
      "online cardiologist",
      "heart doctor online",
      "BP consultation online",
      "cholesterol doctor",
    ],
  },
  {
    slug: "neurologist",
    canonicalName: "Neurologist",
    displayName: "Neurologist",
    titleTag: "Online Neurologist — Migraine, Epilepsy & Headache Care",
    metaDescription:
      "Consult a neurologist online for migraines, chronic headaches, epilepsy, nerve pain, and MRI report reviews.",
    tagline: "Specialist care for brain, spine, and nerves.",
    intro:
      "Neurology video consultations suit chronic headache and migraine management, epilepsy follow-up, nerve pain, and reviewing MRI or EEG results. The neurologist can guide simple neurological tests you can do at home and refer for advanced imaging if needed.",
    conditions: [
      "Migraine and chronic headache",
      "Epilepsy follow-up",
      "Nerve pain and neuropathy",
      "Dizziness and vertigo",
      "Parkinson's management",
      "MRI and EEG report review",
      "Memory concerns",
    ],
    symptoms: ["migraine", "headache", "dizziness", "numbness", "tingling"],
    faqs: [
      {
        q: "Can a neurologist prescribe migraine medication online?",
        a: "Yes. Preventive and acute migraine treatments can be prescribed after a detailed history.",
      },
      {
        q: "Can I review my MRI report online?",
        a: "Yes — upload the report (ideally with the images) and the neurologist will walk you through it.",
      },
      {
        q: "When is in-person evaluation needed?",
        a: "Sudden severe symptoms, new weakness, seizures without prior history, or any suspected stroke symptoms require immediate in-person emergency care.",
      },
    ],
    keywords: [
      "online neurologist",
      "migraine doctor online",
      "headache specialist",
      "neurology consultation",
    ],
  },
  {
    slug: "endocrinologist",
    canonicalName: "Endocrinologist",
    displayName: "Endocrinologist",
    titleTag: "Online Endocrinologist — Diabetes, Thyroid & Hormones",
    metaDescription:
      "Consult an endocrinologist online for diabetes, thyroid issues, PCOS, obesity, and hormone imbalances. Data-driven care.",
    tagline: "Hormones, metabolism, and diabetes care.",
    intro:
      "Endocrinology is almost perfectly suited to telemedicine — it's mostly about reviewing lab trends, titrating medications, and counselling on lifestyle. OduDoc endocrinologists handle type 1 and type 2 diabetes, thyroid disorders, PCOS, obesity, and adrenal issues.",
    conditions: [
      "Type 1 and type 2 diabetes",
      "Thyroid disorders",
      "PCOS",
      "Obesity management",
      "Insulin resistance",
      "Vitamin D deficiency",
      "Calcium and bone health",
    ],
    symptoms: ["high sugar", "fatigue", "weight gain", "hair thinning", "cold intolerance"],
    faqs: [
      {
        q: "Can I manage diabetes entirely online?",
        a: "For most stable patients, yes. The endocrinologist tracks your sugars, HbA1c, and symptoms and adjusts medication accordingly.",
      },
      {
        q: "Can the doctor order thyroid or diabetes tests?",
        a: "Yes — lab tests can be ordered for home collection and the results flow back into your OduDoc chart.",
      },
      {
        q: "Do I need an in-person visit for the first appointment?",
        a: "Usually not. An initial video consult plus uploaded lab reports is typically enough to start care.",
      },
    ],
    keywords: [
      "online endocrinologist",
      "diabetes doctor online",
      "thyroid specialist online",
      "PCOS endocrinologist",
    ],
  },
  {
    slug: "ent",
    canonicalName: "ENT",
    displayName: "ENT Specialist",
    titleTag: "Online ENT Specialist — Ear, Nose & Throat Doctor",
    metaDescription:
      "Consult an ENT doctor online for ear pain, sinus issues, sore throat, tonsillitis, snoring, and hearing concerns.",
    tagline: "Ear, nose, and throat — expert advice fast.",
    intro:
      "ENT video consultations are great for recurring sinusitis, sore throats, allergies, tinnitus, and snoring issues. The doctor can assess severity, prescribe medication, and tell you whether you need a procedure like septoplasty or tonsillectomy.",
    conditions: [
      "Sinusitis and allergies",
      "Recurrent sore throat and tonsillitis",
      "Ear pain and blockage",
      "Tinnitus",
      "Snoring and sleep apnea screening",
      "Vertigo",
      "Voice changes",
    ],
    symptoms: ["ear pain", "sore throat", "blocked nose", "sinus pain", "ringing in ear"],
    faqs: [
      {
        q: "Can an ENT doctor check my ear over video?",
        a: "Not directly — but through your symptoms, recent fevers, and previous history the doctor can usually make a good assessment. Severe cases are referred for in-person scope examination.",
      },
      {
        q: "Can I get treatment for recurring sinusitis online?",
        a: "Yes. The ENT can start medications, CT referral, and lifestyle advice in one call.",
      },
      {
        q: "When does snoring need an ENT?",
        a: "Loud snoring with daytime sleepiness, witnessed pauses in breathing, or morning headaches — those may suggest sleep apnea and warrant evaluation.",
      },
    ],
    keywords: [
      "online ENT doctor",
      "sinus specialist",
      "throat doctor online",
      "ear doctor online",
    ],
  },
  {
    slug: "ophthalmologist",
    canonicalName: "Ophthalmologist",
    displayName: "Ophthalmologist",
    titleTag: "Online Eye Doctor — Ophthalmologist Consultation",
    metaDescription:
      "Consult an ophthalmologist online for red eyes, allergies, dry eye, glasses updates, and reviewing eye-exam reports.",
    tagline: "Eye care advice from verified ophthalmologists.",
    intro:
      "Ophthalmology video consultations work well for red eye, allergies, dry eye syndrome, reviewing eye-exam reports, and pre/post-surgical follow-ups. A physical examination with slit-lamp is still needed for definitive diagnosis of many conditions.",
    conditions: [
      "Red or itchy eyes",
      "Dry eye syndrome",
      "Allergic conjunctivitis",
      "Vision problems and glasses updates",
      "Glaucoma follow-up",
      "Post-LASIK care",
      "Eye strain and computer vision",
    ],
    symptoms: ["red eyes", "itchy eyes", "blurry vision", "eye pain", "watery eyes"],
    faqs: [
      {
        q: "Can an ophthalmologist update my glasses prescription online?",
        a: "Not directly — that requires an eye exam with specific equipment. The doctor can review your current prescription and symptoms and refer you for an in-person refraction.",
      },
      {
        q: "Can red eye be diagnosed over video?",
        a: "Yes in most cases — the doctor will examine photos and symptoms to distinguish conjunctivitis, allergies, or dry eye.",
      },
      {
        q: "When should I go to the ER for eye issues?",
        a: "Sudden vision loss, severe eye pain, trauma, or flashing lights and floaters warrant immediate in-person emergency care.",
      },
    ],
    keywords: [
      "online ophthalmologist",
      "eye doctor online",
      "red eye doctor",
      "dry eye consultation",
    ],
  },
];

export function getSpecialtyBySlug(slug: string): SpecialtyMeta | null {
  return SPECIALTIES.find((s) => s.slug === slug) || null;
}
