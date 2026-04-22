import { NextRequest, NextResponse } from "next/server";
import { doctors } from "@/lib/data";

import { log } from "@/lib/log";
// Symptom / keyword → specialty mapping
const SYMPTOM_MAP: { keywords: string[]; specialty: string; conditions: string[] }[] = [
  {
    keywords: ["heart", "chest pain", "palpitation", "blood pressure", "hypertension", "cardiac", "ecg", "arrhythmia", "cholesterol", "angina", "coronary", "cardiovascular"],
    specialty: "Cardiologist",
    conditions: ["Hypertension", "Coronary Artery Disease", "Arrhythmia", "Heart Failure"],
  },
  {
    keywords: ["skin", "rash", "acne", "eczema", "psoriasis", "itching", "dermatitis", "allergy", "hair loss", "lesion", "mole", "biopsy", "melanoma"],
    specialty: "Dermatologist",
    conditions: ["Eczema", "Psoriasis", "Acne", "Skin Allergy", "Hair Loss"],
  },
  {
    keywords: ["period", "pregnancy", "menstrual", "ovary", "pcos", "fertility", "uterus", "cervical", "vaginal", "gynecology", "obstetric", "prenatal", "menopause", "ovarian"],
    specialty: "Gynecologist",
    conditions: ["PCOS", "Menstrual Irregularity", "Fertility Issues", "Prenatal Care"],
  },
  {
    keywords: ["child", "pediatric", "infant", "toddler", "vaccine", "vaccination", "growth", "developmental", "neonatal", "kid", "baby", "fever child"],
    specialty: "Pediatrician",
    conditions: ["Childhood Fever", "Growth Issues", "Vaccination", "Developmental Delay"],
  },
  {
    keywords: ["brain", "headache", "migraine", "seizure", "epilepsy", "stroke", "nerve", "neurological", "memory loss", "dementia", "parkinson", "alzheimer", "dizziness", "tremor", "neuropathy"],
    specialty: "Neurologist",
    conditions: ["Migraine", "Epilepsy", "Stroke", "Neuropathy", "Dementia"],
  },
  {
    keywords: ["bone", "joint", "fracture", "arthritis", "spine", "back pain", "knee", "orthopedic", "osteoporosis", "ligament", "tendon", "shoulder", "hip", "scoliosis"],
    specialty: "Orthopedist",
    conditions: ["Arthritis", "Back Pain", "Fracture", "Osteoporosis", "Joint Pain"],
  },
  {
    keywords: ["eye", "vision", "cataract", "glaucoma", "retina", "myopia", "ophthalmology", "blind", "cornea", "macular", "lens", "optical"],
    specialty: "Ophthalmologist",
    conditions: ["Cataract", "Glaucoma", "Refractive Error", "Macular Degeneration"],
  },
  {
    keywords: ["diabetes", "sugar", "insulin", "thyroid", "hormone", "endocrine", "obesity", "adrenal", "pituitary", "metabolic", "glucose", "hba1c"],
    specialty: "Endocrinologist",
    conditions: ["Diabetes", "Thyroid Disorder", "Obesity", "Hormonal Imbalance"],
  },
  {
    keywords: ["stomach", "digestion", "gastric", "liver", "hepatitis", "ibs", "crohn", "colitis", "bowel", "constipation", "diarrhea", "acid reflux", "gerd", "ulcer", "pancreas"],
    specialty: "Gastroenterologist",
    conditions: ["GERD", "IBS", "Hepatitis", "Ulcer", "Colitis"],
  },
  {
    keywords: ["lung", "breathing", "asthma", "cough", "copd", "pneumonia", "respiratory", "bronchitis", "inhaler", "tb", "tuberculosis", "oxygen", "pulmonary", "wheeze"],
    specialty: "Pulmonologist",
    conditions: ["Asthma", "COPD", "Pneumonia", "Tuberculosis", "Bronchitis"],
  },
  {
    keywords: ["kidney", "renal", "urine", "uti", "bladder", "prostate", "urinary", "nephrology", "dialysis", "creatinine", "stones", "calculi"],
    specialty: "Urologist",
    conditions: ["Kidney Stones", "UTI", "Prostate Issues", "Renal Failure"],
  },
  {
    keywords: ["depression", "anxiety", "mental", "stress", "insomnia", "psychiatric", "bipolar", "schizophrenia", "ocd", "ptsd", "panic", "mood", "psychology", "counseling"],
    specialty: "Psychiatrist",
    conditions: ["Depression", "Anxiety Disorder", "Insomnia", "Bipolar Disorder"],
  },
  {
    keywords: ["cancer", "tumor", "oncology", "chemotherapy", "radiation", "biopsy malignant", "lymphoma", "leukemia", "carcinoma", "metastasis"],
    specialty: "Oncologist",
    conditions: ["Cancer", "Tumor", "Lymphoma", "Carcinoma"],
  },
  {
    keywords: ["ear", "nose", "throat", "ent", "hearing", "sinusitis", "tonsil", "larynx", "voice", "tinnitus", "adenoid", "snoring", "sleep apnea"],
    specialty: "ENT Specialist",
    conditions: ["Sinusitis", "Tonsillitis", "Hearing Loss", "Sleep Apnea"],
  },
];

// Generic fallback
const GENERAL = {
  specialty: "General Physician",
  conditions: ["General Health Assessment", "Preventive Care", "Chronic Disease"],
};

function analyzeText(text: string) {
  const lower = text.toLowerCase();
  const matches: { specialty: string; conditions: string[]; score: number }[] = [];

  for (const entry of SYMPTOM_MAP) {
    const score = entry.keywords.filter((k) => lower.includes(k)).length;
    if (score > 0) {
      matches.push({ specialty: entry.specialty, conditions: entry.conditions, score });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.length > 0 ? matches.slice(0, 2) : [{ ...GENERAL, score: 1 }];
}

function getRecommendedDoctors(specialties: string[]) {
  const results: typeof doctors = [];
  for (const spec of specialties) {
    const matched = doctors.filter(
      (d) =>
        d.specialty.toLowerCase().includes(spec.toLowerCase().replace("ist", "").replace("logist", "logy").slice(0, 6)) ||
        spec.toLowerCase().includes(d.specialty.toLowerCase().split(" ")[0].slice(0, 5))
    );
    results.push(...matched.slice(0, 2));
  }
  // dedupe
  const seen = new Set<string>();
  const deduped = results.filter((d) => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });

  // if nothing matched, return top-rated general physicians
  if (deduped.length === 0) {
    return doctors.filter((d) => d.specialty === "General Physician").slice(0, 3);
  }

  return deduped.slice(0, 4);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symptoms, fileName } = body as { symptoms: string; fileName?: string };

    const combinedText = `${symptoms || ""} ${fileName || ""}`.trim();

    if (!combinedText) {
      return NextResponse.json({ error: "Please describe your symptoms or upload a report." }, { status: 400 });
    }

    // Simulate processing delay feel (no actual delay added, just structured)
    const matches = analyzeText(combinedText);
    const primaryMatch = matches[0];
    const secondaryMatch = matches[1];

    const recommendedDoctors = getRecommendedDoctors(matches.map((m) => m.specialty));

    // Build AI summary
    const conditionsList = [
      ...primaryMatch.conditions.slice(0, 2),
      ...(secondaryMatch ? secondaryMatch.conditions.slice(0, 1) : []),
    ];

    const summary = `Based on your report, the symptoms indicate possible ${conditionsList.join(", ")}. A consultation with a ${primaryMatch.specialty} is strongly recommended.${secondaryMatch ? ` Additionally, a ${secondaryMatch.specialty} may be relevant if symptoms persist.` : ""}`;

    return NextResponse.json({
      summary,
      primarySpecialty: primaryMatch.specialty,
      secondarySpecialty: secondaryMatch?.specialty || null,
      detectedConditions: conditionsList,
      urgency: combinedText.match(/severe|emergency|chest pain|stroke|unconscious|bleeding|can't breathe/i)
        ? "HIGH"
        : combinedText.match(/chronic|ongoing|months|years|persistent/i)
        ? "MEDIUM"
        : "LOW",
      recommendedDoctors: recommendedDoctors.map((d) => ({
        id: d.id,
        name: d.name,
        specialty: d.specialty,
        qualifications: d.qualifications,
        experience: d.experience,
        rating: d.rating,
        reviewCount: d.reviewCount,
        fee: d.fee,
        available: d.available,
        city: d.city,
        imageColor: d.imageColor,
        initials: d.initials,
      })),
    });
  } catch (err) {
    log.error("AI analyze error:", err);
    return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });
  }
}
