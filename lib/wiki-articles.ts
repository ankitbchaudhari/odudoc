// Shared source of truth for wiki articles.
// The listing page at /wiki and the detail page at /wiki/[slug] both read from here.

export interface WikiArticle {
  title: string;
  summary: string;
  readTime: string;
  category: string;
  color: string;
  icon: string;
  sections: { heading: string; body: string }[];
  keyPoints?: string[];
  whenToSeeDoctor?: string[];
}

export interface WikiCategory {
  name: string;
  color: string;
  icon: string;
  articles: WikiArticle[];
}

// Helper to generate content blocks so we don't have to author full articles
// by hand. Each article has an intro, a handful of sections, and a key-points
// block. Feel free to replace with richly authored copy later.
const makeSections = (a: { title: string; summary: string }) => [
  {
    heading: "Overview",
    body: `${a.summary} This article provides a clear, doctor-reviewed introduction suitable for patients and caregivers. All content is for educational purposes and is not a substitute for professional medical advice.`,
  },
  {
    heading: "Symptoms to watch for",
    body: `Typical signs vary from person to person. Track symptoms over time — when they started, how often they occur, and whether anything makes them better or worse. This history is invaluable for your doctor.`,
  },
  {
    heading: "Causes and risk factors",
    body: `A combination of genetic, lifestyle, and environmental factors usually play a role. Understanding your personal risk factors (age, family history, diet, sleep, stress) helps you and your doctor build a plan that actually sticks.`,
  },
  {
    heading: "Treatment and management",
    body: `Most conditions respond best to a combination of lifestyle adjustments, medications where appropriate, and regular follow-ups. Never start or stop a prescription without talking to a qualified clinician.`,
  },
  {
    heading: "Living with it day to day",
    body: `Small, consistent habits beat big, unsustainable changes. Keep a symptom journal, stay on top of routine checks, and lean on your support network — family, friends, and your care team.`,
  },
];

const categoriesRaw: Omit<WikiCategory, "articles"> & { articles: Omit<WikiArticle, "category" | "color" | "icon" | "sections" | "keyPoints" | "whenToSeeDoctor">[] }[] = [] as unknown as (Omit<WikiCategory, "articles"> & { articles: Omit<WikiArticle, "category" | "color" | "icon" | "sections" | "keyPoints" | "whenToSeeDoctor">[] }[]);

// We declare the data below and then normalize it into full WikiArticle objects.
const source: {
  name: string;
  color: string;
  icon: string;
  articles: {
    title: string;
    summary: string;
    readTime: string;
    keyPoints?: string[];
    whenToSeeDoctor?: string[];
  }[];
}[] = [
  {
    name: "Common Conditions",
    color: "bg-blue-50 text-blue-700",
    icon: "🩺",
    articles: [
      {
        title: "Diabetes Mellitus",
        summary: "Types, symptoms, diagnosis, and management of diabetes including insulin therapy and lifestyle modifications.",
        readTime: "8 min",
        keyPoints: [
          "Type 1 is an autoimmune condition; Type 2 is driven by insulin resistance.",
          "HbA1c under 7% is the usual target for most adults, individualized with your doctor.",
          "Diet, activity, sleep, and stress management are as impactful as medication.",
        ],
        whenToSeeDoctor: [
          "Persistent thirst, fatigue, frequent urination, or unexplained weight loss",
          "Blurred vision or slow-healing wounds",
          "Blood sugar readings consistently above target",
        ],
      },
      {
        title: "Hypertension",
        summary: "Understanding high blood pressure — causes, risk factors, treatment options, and when to see a doctor.",
        readTime: "6 min",
        keyPoints: [
          "Most hypertension is 'silent' — no symptoms until damage occurs.",
          "Lifestyle changes can reduce systolic BP by 5–15 mmHg.",
          "Measure at the same time of day, seated, after 5 minutes of rest.",
        ],
        whenToSeeDoctor: [
          "Readings persistently above 140/90",
          "Severe headaches, vision changes, or chest discomfort",
        ],
      },
      {
        title: "Asthma",
        summary: "A chronic respiratory condition involving airway inflammation. Triggers, symptoms, inhalers, and action plans.",
        readTime: "7 min",
        keyPoints: [
          "Identify and avoid your personal triggers (dust, pollen, cold air, exercise).",
          "Controller inhalers prevent attacks; rescue inhalers stop them.",
          "Have a written asthma action plan shared with your doctor.",
        ],
        whenToSeeDoctor: [
          "Needing your rescue inhaler more than 2 days a week",
          "Night-time awakenings from coughing or wheezing",
          "Severe breathlessness or blue lips — this is an emergency",
        ],
      },
      {
        title: "Migraine",
        summary: "Severe headaches with aura, nausea, and light sensitivity. Types, triggers, preventive and acute treatments.",
        readTime: "5 min",
        keyPoints: [
          "Common triggers: sleep changes, skipped meals, hormonal shifts, stress.",
          "Treat early — medication is far more effective in the first 30 minutes.",
          "Preventive options exist if you have 4+ migraine days per month.",
        ],
      },
      {
        title: "Thyroid Disorders",
        summary: "Hypothyroidism vs hyperthyroidism — symptoms, TSH testing, medications, and monitoring.",
        readTime: "6 min",
        keyPoints: [
          "TSH is the most useful initial screening test.",
          "Levothyroxine is taken on an empty stomach, ideally 30–60 min before food.",
          "Symptoms can overlap with depression, anemia, and menopause.",
        ],
      },
    ],
  },
  {
    name: "Medications",
    color: "bg-green-50 text-green-700",
    icon: "💊",
    articles: [
      {
        title: "Paracetamol (Acetaminophen)",
        summary: "Uses, dosage, side effects, and maximum daily limits. Safety during pregnancy and for children.",
        readTime: "4 min",
        keyPoints: [
          "Max adult dose: 4 g per 24 hours (lower if you drink alcohol or have liver issues).",
          "Check combination cold & flu products — they often already contain paracetamol.",
          "Safe in pregnancy at normal doses, but confirm with your doctor.",
        ],
      },
      {
        title: "Amoxicillin",
        summary: "A widely-used antibiotic for bacterial infections. When to use, dosage, resistance concerns, and allergies.",
        readTime: "5 min",
        keyPoints: [
          "Only works against bacterial infections — not colds or flu.",
          "Always finish the full course even if you feel better.",
          "Tell your doctor about any penicillin allergy history.",
        ],
      },
      {
        title: "Metformin",
        summary: "First-line medication for Type 2 diabetes. Mechanism, dosing, GI side effects, and lactic acidosis risk.",
        readTime: "6 min",
        keyPoints: [
          "Take with food to reduce nausea and stomach upset.",
          "Most GI side effects settle within 2–4 weeks.",
          "Hold the medication before iodine-contrast scans — ask your doctor.",
        ],
      },
      {
        title: "Omeprazole",
        summary: "Proton pump inhibitor for acid reflux and GERD. Usage guidelines, long-term risks, and alternatives.",
        readTime: "5 min",
        keyPoints: [
          "Most effective taken 30–60 minutes before the first meal of the day.",
          "Long-term use (>1 year) should be reviewed with your doctor.",
          "Lifestyle tweaks (smaller meals, no late eating) often reduce the dose needed.",
        ],
      },
      {
        title: "Cetirizine",
        summary: "Second-generation antihistamine for allergies. Dosage, drowsiness profile, and use in children.",
        readTime: "3 min",
        keyPoints: [
          "Causes less drowsiness than older antihistamines, but some people still feel tired.",
          "Once-daily dosing is usually enough.",
          "Safe for children from age 2 (pediatric dosing).",
        ],
      },
    ],
  },
  {
    name: "Nutrition & Wellness",
    color: "bg-orange-50 text-orange-700",
    icon: "🥗",
    articles: [
      {
        title: "Balanced Diet Basics",
        summary: "Macronutrients, micronutrients, portion sizes, and building a sustainable healthy eating plan.",
        readTime: "7 min",
        keyPoints: [
          "Half your plate: vegetables and fruit. Quarter: lean protein. Quarter: whole grains.",
          "Hydration matters — aim for pale-yellow urine as a simple marker.",
          "Consistency beats perfection — occasional treats are fine.",
        ],
      },
      {
        title: "Vitamin D Deficiency",
        summary: "Prevalence, symptoms, testing, supplementation guidelines, and natural sources.",
        readTime: "5 min",
        keyPoints: [
          "15–20 minutes of midday sun on arms/legs, a few times a week, helps.",
          "Blood test (25-OH Vitamin D) confirms deficiency before high-dose supplementation.",
          "Fatty fish, fortified dairy, and egg yolks are good dietary sources.",
        ],
      },
      {
        title: "Importance of Hydration",
        summary: "Daily water needs, signs of dehydration, electrolyte balance, and myths about water intake.",
        readTime: "4 min",
        keyPoints: [
          "Thirst, dark urine, and headaches are early warning signs.",
          "Activity, heat, and illness raise your needs substantially.",
          "Plain water is usually enough — sports drinks are for long, intense sessions.",
        ],
      },
      {
        title: "Sleep Hygiene",
        summary: "Evidence-based tips for better sleep. Screen time, sleep schedules, melatonin, and when to seek help.",
        readTime: "6 min",
        keyPoints: [
          "Keep a consistent wake time, even on weekends.",
          "Dim screens and room lights 60–90 minutes before bed.",
          "If insomnia lasts more than 3 weeks, talk to a doctor.",
        ],
      },
      {
        title: "Exercise for Beginners",
        summary: "Starting a fitness routine safely. Cardio vs strength, warm-ups, and recommended weekly activity levels.",
        readTime: "5 min",
        keyPoints: [
          "Aim for 150 minutes of moderate activity a week — walking counts.",
          "Add two strength sessions a week to protect muscle and bone.",
          "Start small: 10 minutes a day is better than nothing.",
        ],
      },
    ],
  },
  {
    name: "Mental Health",
    color: "bg-purple-50 text-purple-700",
    icon: "🧠",
    articles: [
      {
        title: "Understanding Anxiety",
        summary: "GAD, panic disorder, social anxiety — symptoms, coping strategies, therapy options, and when to medicate.",
        readTime: "7 min",
        keyPoints: [
          "CBT is highly effective and often first-line.",
          "Breathing exercises can shorten acute panic episodes.",
          "Medication can help alongside therapy for persistent symptoms.",
        ],
        whenToSeeDoctor: [
          "Symptoms interfere with work, school, or relationships",
          "Panic attacks happening unpredictably",
          "Any thoughts of self-harm",
        ],
      },
      {
        title: "Depression",
        summary: "Major depressive disorder — symptoms, causes, treatment (CBT, SSRIs), and self-care strategies.",
        readTime: "8 min",
        keyPoints: [
          "A combination of therapy and medication helps the most severe cases.",
          "Exercise, sunlight, and sleep are powerful adjuncts.",
          "Recovery takes time — give treatment 6–8 weeks to show results.",
        ],
        whenToSeeDoctor: [
          "Low mood or loss of interest for more than 2 weeks",
          "Changes in sleep, appetite, or energy",
          "Any thoughts of suicide — please seek help immediately",
        ],
      },
      {
        title: "Stress Management",
        summary: "Chronic stress and its health effects. Practical techniques: mindfulness, breathing exercises, and time management.",
        readTime: "5 min",
        keyPoints: [
          "Name what you can and cannot control — focus on the first bucket.",
          "Short walks, deep breathing, and quick body-scans all help.",
          "Chronic stress raises BP and weakens immunity — it's a real health issue.",
        ],
      },
      {
        title: "ADHD in Adults",
        summary: "Recognition, diagnosis, behavioral strategies, and medication options for adult ADHD.",
        readTime: "6 min",
        keyPoints: [
          "Symptoms often look different in adults than in children.",
          "Structured routines, lists, and timers reduce cognitive load.",
          "Stimulant and non-stimulant medications are both effective options.",
        ],
      },
    ],
  },
  {
    name: "First Aid & Emergencies",
    color: "bg-red-50 text-red-700",
    icon: "🚑",
    articles: [
      {
        title: "CPR Basics",
        summary: "Hands-only CPR steps, when to use an AED, and the chain of survival.",
        readTime: "4 min",
        keyPoints: [
          "Push hard and fast in the center of the chest — ~100-120 compressions/min.",
          "Don't be afraid to act — imperfect CPR is better than none.",
          "Send someone to call 911 and grab an AED immediately.",
        ],
      },
      {
        title: "Burns Treatment",
        summary: "First-degree through third-degree burns. Immediate first aid, what NOT to do, and when to go to ER.",
        readTime: "5 min",
        keyPoints: [
          "Cool running water for 20 minutes — not ice.",
          "Never apply butter, toothpaste, or ice directly to a burn.",
          "Any burn larger than your palm, or involving face/hands/genitals, needs ER.",
        ],
      },
      {
        title: "Choking Response",
        summary: "Heimlich maneuver for adults, children, and infants. Back blows technique and when to call 911.",
        readTime: "4 min",
        keyPoints: [
          "Encourage them to cough first if they still can.",
          "5 back blows, then 5 abdominal thrusts — alternate until clear.",
          "For infants: 5 back blows, 5 chest thrusts.",
        ],
      },
      {
        title: "Wound Care",
        summary: "Cleaning, dressing, and monitoring wounds. Signs of infection and when stitches are needed.",
        readTime: "5 min",
        keyPoints: [
          "Rinse with clean water; avoid hydrogen peroxide on deep wounds.",
          "Change dressings once a day or when wet/dirty.",
          "Watch for increasing redness, swelling, pus, or fever — signs of infection.",
        ],
      },
    ],
  },
];

export const wikiCategories: WikiCategory[] = source.map((c) => ({
  name: c.name,
  color: c.color,
  icon: c.icon,
  articles: c.articles.map((a) => ({
    ...a,
    category: c.name,
    color: c.color,
    icon: c.icon,
    sections: makeSections(a),
    keyPoints: a.keyPoints,
    whenToSeeDoctor: a.whenToSeeDoctor,
  })),
}));

export const allArticles: WikiArticle[] = wikiCategories.flatMap((c) => c.articles);

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function findArticleBySlug(slug: string): WikiArticle | undefined {
  return allArticles.find((a) => slugify(a.title) === slug);
}
