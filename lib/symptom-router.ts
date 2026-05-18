// Symptom → specialty router.
//
// Used by the homepage symptom checker to route a patient with no
// prior context to the right specialty in 3 taps. Each Region is a
// body area with one or more common complaints; each complaint
// maps to a specialty slug that already exists at /specialty/[id].
//
// Not a clinical decision tool — it's a triage helper. Severity-flag
// + emergency-redirect logic lives in the wizard itself so we keep
// this pure mapping.

export interface SymptomOption {
  id: string;
  label: string;
  emoji: string;
  /** Sub-complaints shown in step 2. Each maps to a specialty. */
  complaints: Array<{ id: string; label: string; specialty: string }>;
}

export const REGIONS: SymptomOption[] = [
  {
    id: "head",
    label: "Head / Face",
    emoji: "🧠",
    complaints: [
      { id: "headache",       label: "Headache or migraine",       specialty: "neurologist" },
      { id: "dizziness",      label: "Dizziness or fainting",      specialty: "neurologist" },
      { id: "eye",            label: "Eye pain or vision change",  specialty: "ophthalmologist" },
      { id: "ear",            label: "Ear pain or hearing loss",   specialty: "ent" },
      { id: "sore_throat",    label: "Sore throat or sinus",       specialty: "ent" },
      { id: "facial_rash",    label: "Facial rash or acne",        specialty: "dermatologist" },
    ],
  },
  {
    id: "chest",
    label: "Chest / Heart",
    emoji: "❤️",
    complaints: [
      { id: "chest_pain",     label: "Chest pain or pressure",     specialty: "cardiologist" },
      { id: "palpitations",   label: "Palpitations / fast heart",  specialty: "cardiologist" },
      { id: "shortness",      label: "Shortness of breath",        specialty: "pulmonologist" },
      { id: "cough",          label: "Persistent cough",           specialty: "pulmonologist" },
      { id: "wheeze",         label: "Wheeze or asthma flare",     specialty: "pulmonologist" },
    ],
  },
  {
    id: "abdomen",
    label: "Stomach / Belly",
    emoji: "🤰",
    complaints: [
      { id: "abdominal_pain", label: "Abdominal pain or cramps",   specialty: "gastroenterologist" },
      { id: "nausea",         label: "Nausea or vomiting",         specialty: "gastroenterologist" },
      { id: "constipation",   label: "Constipation or diarrhea",   specialty: "gastroenterologist" },
      { id: "acidity",        label: "Acidity or heartburn",       specialty: "gastroenterologist" },
      { id: "uti",            label: "Urinary burning",            specialty: "urologist" },
    ],
  },
  {
    id: "joints",
    label: "Back / Joints",
    emoji: "🦴",
    complaints: [
      { id: "back_pain",      label: "Back pain",                  specialty: "orthopedist" },
      { id: "knee_pain",      label: "Knee or hip pain",           specialty: "orthopedist" },
      { id: "joint_swelling", label: "Joint swelling or stiffness", specialty: "rheumatologist" },
      { id: "shoulder_neck",  label: "Neck or shoulder pain",      specialty: "orthopedist" },
    ],
  },
  {
    id: "skin",
    label: "Skin / Hair",
    emoji: "✨",
    complaints: [
      { id: "rash",           label: "Rash or itching",            specialty: "dermatologist" },
      { id: "acne",           label: "Acne or scarring",           specialty: "dermatologist" },
      { id: "hair_loss",      label: "Hair loss",                  specialty: "dermatologist" },
      { id: "mole_change",    label: "Mole or growth change",      specialty: "dermatologist" },
    ],
  },
  {
    id: "mental",
    label: "Mind / Mood",
    emoji: "🧘",
    complaints: [
      { id: "anxiety",        label: "Anxiety or panic",           specialty: "psychiatrist" },
      { id: "depression",     label: "Low mood or depression",     specialty: "psychiatrist" },
      { id: "sleep",          label: "Sleep problems",             specialty: "psychiatrist" },
      { id: "addiction",      label: "Substance use",              specialty: "psychiatrist" },
    ],
  },
  {
    id: "general",
    label: "Fever / General",
    emoji: "🌡️",
    complaints: [
      { id: "fever",          label: "Fever or chills",            specialty: "general-physician" },
      { id: "fatigue",        label: "Fatigue or weakness",        specialty: "general-physician" },
      { id: "weight",         label: "Weight gain or loss",        specialty: "endocrinologist" },
      { id: "diabetes",       label: "Diabetes management",        specialty: "diabetologist" },
      { id: "thyroid",        label: "Thyroid concerns",           specialty: "endocrinologist" },
    ],
  },
  {
    id: "womens",
    label: "Women's Health",
    emoji: "🌷",
    complaints: [
      { id: "periods",        label: "Period problems",            specialty: "gynecologist" },
      { id: "pcos",           label: "PCOS / hormonal",            specialty: "gynecologist" },
      { id: "pregnancy",      label: "Pregnancy or fertility",     specialty: "gynecologist" },
      { id: "menopause",      label: "Menopause symptoms",         specialty: "gynecologist" },
    ],
  },
];

export type Duration = "today" | "few_days" | "weeks" | "months";
export type Severity = "mild" | "moderate" | "severe";

export interface Recommendation {
  specialty: string;
  specialtyLabel: string;
  urgency: "routine" | "soon" | "urgent" | "emergency";
  urgencyLabel: string;
  reason: string;
}

const SPECIALTY_LABEL: Record<string, string> = {
  "neurologist": "Neurologist",
  "ophthalmologist": "Ophthalmologist",
  "ent": "ENT Specialist",
  "dermatologist": "Dermatologist",
  "cardiologist": "Cardiologist",
  "pulmonologist": "Pulmonologist",
  "gastroenterologist": "Gastroenterologist",
  "urologist": "Urologist",
  "orthopedist": "Orthopedist",
  "rheumatologist": "Rheumatologist",
  "psychiatrist": "Psychiatrist",
  "general-physician": "General Physician",
  "endocrinologist": "Endocrinologist",
  "diabetologist": "Diabetologist",
  "gynecologist": "Gynecologist",
};

/** Severe + today on chest, head with severe headache, or sudden
 *  vision change → emergency. Severe alone or today + chest →
 *  urgent. Otherwise pick by duration. */
export function urgencyFor(complaintId: string, duration: Duration, severity: Severity): Recommendation["urgency"] {
  const RED_FLAGS = new Set(["chest_pain", "shortness", "stroke", "eye"]);
  if (severity === "severe" && (duration === "today" || RED_FLAGS.has(complaintId))) {
    return "emergency";
  }
  if (severity === "severe") return "urgent";
  if (duration === "today" && complaintId === "chest_pain") return "urgent";
  if (duration === "today") return "soon";
  return "routine";
}

export function recommend(
  region: SymptomOption,
  complaintId: string,
  duration: Duration,
  severity: Severity,
): Recommendation {
  const c = region.complaints.find((x) => x.id === complaintId) || region.complaints[0];
  const urgency = urgencyFor(complaintId, duration, severity);
  const URGENCY_LABEL: Record<Recommendation["urgency"], string> = {
    routine: "Routine — book within the week",
    soon: "Soon — book today or tomorrow",
    urgent: "Urgent — try Consult Now",
    emergency: "Emergency — go to the ER or call 911",
  };
  const reason = urgency === "emergency"
    ? `This combination of severe symptoms today needs in-person emergency care.`
    : `Based on your ${c.label.toLowerCase()} ${duration === "today" ? "today" : duration === "few_days" ? "for a few days" : duration === "weeks" ? "for weeks" : "for months"}, a ${SPECIALTY_LABEL[c.specialty] || c.specialty} is the right starting point.`;
  return {
    specialty: c.specialty,
    specialtyLabel: SPECIALTY_LABEL[c.specialty] || c.specialty,
    urgency,
    urgencyLabel: URGENCY_LABEL[urgency],
    reason,
  };
}
