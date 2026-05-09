// SOAP-note structurer.
//
// Takes a free-text consultation transcript (typically from Web
// Speech API or an uploaded audio→text run) and structures it into
// the four SOAP sections plus extracted vitals, medications, and a
// suggested differential pivot.
//
// We use deterministic heuristics rather than an LLM for two reasons:
//
//   1. Privacy / regulatory: a doctor-patient transcript is the most
//      sensitive PHI in the encounter. Sending it to a third-party
//      LLM raises an HL7/HIPAA/DPDP audit conversation we'd rather
//      side-step until we have BAA-signed model access.
//   2. Predictability: deterministic heuristics produce the same
//      structure every time, which makes review faster — doctors
//      learn to trust the layout. LLM output drifts.
//
// The structure is good enough that an LLM upgrade path is just
// "replace this function" — same input/output contract, swap the
// implementation. We mark hooks where that swap would happen.
//
// Input transcript is segmented by simple turn detection: lines
// starting with "Doctor:" / "Patient:" prefixes are honoured;
// otherwise we treat the whole blob as doctor narration.

export type Speaker = "doctor" | "patient" | "nurse" | "other";

export interface TranscriptTurn {
  speaker: Speaker;
  text: string;
  /** Optional ms offset from recording start. Surfaced in the audit
   *  trail so a reviewer can scrub back to the audio if disputed. */
  startedAtMs?: number;
}

export interface ExtractedVital {
  kind: "bp" | "hr" | "rr" | "spo2" | "temp" | "weight" | "height";
  value: string;
  unit?: string;
  rawSpan: string;
}

export interface ExtractedMed {
  drugName: string;
  strength?: string;
  raw: string;
}

export interface SOAPNote {
  /** Subjective — patient-reported symptoms, history, concerns. */
  subjective: string[];
  /** Objective — exam findings, vitals, observable signs. */
  objective: string[];
  /** Assessment — diagnoses, differentials, clinical reasoning. */
  assessment: string[];
  /** Plan — investigations, treatments, follow-up, education. */
  plan: string[];
  vitals: ExtractedVital[];
  medications: ExtractedMed[];
  /** Symptoms surfaced from the transcript — feeds into the
   *  differential-diagnosis copilot. */
  surfacedSymptoms: string[];
  /** Words-per-minute estimate for the encounter, useful UX feedback
   *  ("transcript looks short" → did the mic catch everything?). */
  stats: { totalWords: number; doctorWords: number; patientWords: number };
}

// ── Symptom lexicon ──────────────────────────────────────────────
// Words/phrases that map to the differential-engine modifier
// vocabulary. Hits here also seed the surfacedSymptoms list which
// the UI passes straight into <DifferentialPanel/>.
const SYMPTOM_LEXICON: Array<{ pattern: RegExp; tag: string }> = [
  // Pain qualities
  { pattern: /\b(crushing|squeezing|pressure)\b/i, tag: "pressure" },
  { pattern: /\b(tearing|ripping)\b/i, tag: "tearing" },
  { pattern: /\b(throbbing|pulsating)\b/i, tag: "throbbing" },
  { pattern: /\b(burning)\b/i, tag: "burning" },
  { pattern: /\b(stabbing|sharp)\b/i, tag: "stabbing" },
  { pattern: /\b(colicky)\b/i, tag: "colicky" },
  { pattern: /\bworst.{0,12}(headache|life|pain)\b/i, tag: "worst" },
  { pattern: /\bthunderclap\b/i, tag: "thunderclap" },
  // Radiation
  { pattern: /\bradiat\w+\b/i, tag: "radiation" },
  { pattern: /\b(left|right)\s*arm\b/i, tag: "left arm" },
  { pattern: /\bjaw\b/i, tag: "jaw" },
  { pattern: /\b(back)\b/i, tag: "back" },
  { pattern: /\binterscapular\b/i, tag: "interscapular" },
  // Associated
  { pattern: /\b(dyspnoea|dyspnea|short(?:ness)? of breath|breathless|breath difficulty|breath\w* (?:trouble|difficulty))\b/i, tag: "dyspnoea" },
  { pattern: /\b(diaphoresis|sweat\w*|cold sweat|profuse sweating)\b/i, tag: "diaphoresis" },
  { pattern: /\b(nausea|nauseated|nauseous)\b/i, tag: "nausea" },
  { pattern: /\b(vomit\w*|emesis)\b/i, tag: "vomiting" },
  { pattern: /\b(palpitation\w*)\b/i, tag: "palpitations" },
  { pattern: /\b(dizz\w+|light-?headed|vertigo)\b/i, tag: "dizziness" },
  { pattern: /\b(fever|febrile|pyrexia|temperature)\b/i, tag: "fever" },
  { pattern: /\b(rigor\w*|shiver\w*|chills?)\b/i, tag: "rigor" },
  { pattern: /\b(cough\w*)\b/i, tag: "cough" },
  { pattern: /\b(sputum|phlegm|expectoration)\b/i, tag: "sputum" },
  { pattern: /\b(haemoptysis|hemoptysis|coughing blood)\b/i, tag: "haemoptysis" },
  { pattern: /\b(haematuria|blood in urine)\b/i, tag: "haematuria" },
  { pattern: /\b(diarrh\w+|loose motions?)\b/i, tag: "diarrhoea" },
  { pattern: /\b(constipat\w+)\b/i, tag: "constipation" },
  { pattern: /\b(distended? (?:abdomen|belly)|abdominal distension)\b/i, tag: "distension" },
  { pattern: /\b(rash|petechi\w+|purpuric)\b/i, tag: "rash" },
  { pattern: /\b(neck stiffness|stiff neck|nuchal rigidity)\b/i, tag: "neck stiffness" },
  { pattern: /\b(photophobia|light sensitiv\w+)\b/i, tag: "photophobia" },
  { pattern: /\b(phonophobia|sound sensitiv\w+)\b/i, tag: "phonophobia" },
  { pattern: /\b(aura)\b/i, tag: "aura" },
  { pattern: /\b(syncop\w+|fainting|loss of consciousness|loc)\b/i, tag: "syncope" },
  { pattern: /\b(pleuritic)\b/i, tag: "pleuritic" },
  { pattern: /\b(orthopnoea|orthopnea)\b/i, tag: "orthopnoea" },
  { pattern: /\b(pnd|paroxysmal nocturnal dyspnoea)\b/i, tag: "pnd" },
  { pattern: /\b(leg swelling|ankle swelling|pedal oedema|pedal edema)\b/i, tag: "leg swelling" },
  { pattern: /\b(wheez\w+)\b/i, tag: "wheeze" },
  { pattern: /\b(retro-?orbital)\b/i, tag: "retro-orbital" },
  { pattern: /\b(amenorrhoea|missed period)\b/i, tag: "amenorrhoea" },
  { pattern: /\b(dysuria|burning urine|burning urination)\b/i, tag: "dysuria" },
  { pattern: /\b(flank pain)\b/i, tag: "flank" },
  { pattern: /\b(murphy\b)/i, tag: "murphy" },
  { pattern: /\b(McBurney|right iliac fossa|rif)\b/i, tag: "rif" },
];

// ── Vitals extraction ────────────────────────────────────────────
// Very forgiving regex set tuned to typical doctor-spoken phrasing:
// "BP one-twenty over eighty", "BP 120/80", "saturating 92 percent",
// "pulse 110", "temp 38.5".
const VITAL_REGEX = [
  { kind: "bp" as const, regex: /\b(?:bp|blood pressure)\D{0,8}(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})\b/i, format: (m: RegExpMatchArray) => `${m[1]}/${m[2]}`, unit: "mmHg" },
  { kind: "hr" as const, regex: /\b(?:hr|heart rate|pulse|pr)\D{0,6}(\d{2,3})\b/i, format: (m: RegExpMatchArray) => m[1], unit: "bpm" },
  { kind: "rr" as const, regex: /\b(?:rr|resp(?:iratory)?\s*rate)\D{0,6}(\d{1,2})\b/i, format: (m: RegExpMatchArray) => m[1], unit: "/min" },
  { kind: "spo2" as const, regex: /\b(?:spo2|sat\w*|oxygen sat\w*|saturating)\D{0,6}(\d{2,3})\s*%?/i, format: (m: RegExpMatchArray) => m[1], unit: "%" },
  { kind: "temp" as const, regex: /\b(?:temp\w*|fever)\D{0,6}(\d{2,3}(?:\.\d)?)\s*(?:°|deg|c|celsius)?\b/i, format: (m: RegExpMatchArray) => m[1], unit: "°C" },
  { kind: "weight" as const, regex: /\b(?:weight|weighs?)\D{0,6}(\d{2,3}(?:\.\d)?)\s*(?:kg|kilo\w*)?\b/i, format: (m: RegExpMatchArray) => m[1], unit: "kg" },
  { kind: "height" as const, regex: /\b(?:height)\D{0,6}(\d{2,3}(?:\.\d)?)\s*(?:cm|centimetres?)\b/i, format: (m: RegExpMatchArray) => m[1], unit: "cm" },
];

// ── Medication extraction ────────────────────────────────────────
// Common drug stems we recognise. We deliberately under-extract here
// — false positives on med detection lead to wrong Rx propagation,
// which is much worse than missing a med the doctor will type anyway.
const MED_STEMS = [
  // Cardio
  "aspirin", "clopidogrel", "atorvastatin", "rosuvastatin", "metoprolol",
  "bisoprolol", "ramipril", "enalapril", "telmisartan", "losartan",
  "amlodipine", "hydrochlorothiazide", "furosemide", "warfarin", "apixaban",
  "rivaroxaban", "digoxin", "isosorbide",
  // Endo
  "metformin", "glimepiride", "sitagliptin", "insulin", "levothyroxine",
  // Resp
  "salbutamol", "ipratropium", "budesonide", "formoterol", "montelukast",
  "theophylline", "prednisolone",
  // GI
  "pantoprazole", "omeprazole", "rabeprazole", "ondansetron", "metoclopramide",
  "domperidone",
  // Antibiotics
  "amoxicillin", "azithromycin", "ciprofloxacin", "levofloxacin",
  "doxycycline", "ceftriaxone", "cefixime", "metronidazole", "linezolid",
  "co-amoxiclav", "clarithromycin",
  // Analgesics
  "paracetamol", "ibuprofen", "diclofenac", "tramadol", "nimesulide",
  // Misc
  "fluoxetine", "sertraline", "escitalopram", "alprazolam", "diazepam",
  "phenytoin", "valproate", "carbamazepine", "lithium",
];

const MED_REGEX = new RegExp(
  `\\b(${MED_STEMS.join("|")})\\b(?:\\s+(\\d{1,4}\\s*(?:mg|mcg|g|ml|iu)))?`,
  "gi",
);

// ── Section keywords ────────────────────────────────────────────
// Phrases that nudge a sentence into a particular SOAP bucket.
const SECTION_HINTS = {
  subjective: [
    /^the patient/i, /^patient (?:reports|complains|says|mentions|denies|notes|describes)/i,
    /\b(?:complains? of|complaining of|presenting with|came (?:in )?with)\b/i,
    /\b(?:since|for) (?:the past|a few|\d+) (?:hours?|days?|weeks?|months?|years?)\b/i,
    /\b(?:history of|past medical history|family history|hx of)\b/i,
    /\bdenies\b/i,
  ],
  objective: [
    /^on examination/i, /^examination/i, /^o\/e/i,
    /\b(?:vitals?|bp|heart rate|temp\w*|saturat\w*)\b/i,
    /\b(?:bibasal|crackles|wheez\w+|murmur|rales|s1 s2)\b/i,
    /\b(?:tender(?:ness)?|guarding|rigidity|rebound)\b/i,
    /\bauscultat\w+\b/i,
    /\b(?:appears|looks|conscious|oriented|alert|distressed|drowsy)\b/i,
  ],
  assessment: [
    /^(?:assessment|impression|likely|probable|differential|dx|diagnosis)/i,
    /\b(?:most likely|i think this is|appears to be|this looks like|ddx)\b/i,
    /\brule out\b/i,
  ],
  plan: [
    /^plan/i,
    /\b(?:will (?:start|order|prescribe|admit|discharge|refer))\b/i,
    /\b(?:start (?:on |with )?|prescrib\w+|order\w*|admit\w*|refer\w*)\b/i,
    /\b(?:follow up|review|come back|return)\b/i,
    /\b(?:investigate|do an?|get an?|send for)\b/i,
    /\b(?:ecg|cxr|ct|mri|usg|cbc|crp|d-?dimer|troponin|lipase|amylase)\b/i,
  ],
};

function pickSection(sentence: string): keyof SOAPNote | null {
  for (const [k, patterns] of Object.entries(SECTION_HINTS) as Array<[
    keyof typeof SECTION_HINTS,
    RegExp[],
  ]>) {
    for (const p of patterns) if (p.test(sentence)) return k as keyof SOAPNote;
  }
  return null;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(/(?<=[.!?])\s+|\n+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseTranscript(raw: string): TranscriptTurn[] {
  // Treat "Doctor:" / "Patient:" / "Nurse:" prefixed lines as turns;
  // otherwise the whole blob becomes a single doctor turn (typical
  // for ambient capture where speaker diarisation isn't yet available).
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const turns: TranscriptTurn[] = [];
  let pending: TranscriptTurn | null = null;
  for (const ln of lines) {
    const m = ln.match(/^(Doctor|Patient|Nurse|Other)\s*[:>-]\s*(.+)$/i);
    if (m) {
      if (pending) turns.push(pending);
      pending = { speaker: m[1].toLowerCase() as Speaker, text: m[2] };
    } else if (pending) {
      pending.text += " " + ln;
    } else {
      pending = { speaker: "doctor", text: ln };
    }
  }
  if (pending) turns.push(pending);
  return turns;
}

export function structureSoapNote(transcript: string): SOAPNote {
  const turns = parseTranscript(transcript);
  const allText = turns.map((t) => t.text).join(" ");

  const note: SOAPNote = {
    subjective: [],
    objective: [],
    assessment: [],
    plan: [],
    vitals: [],
    medications: [],
    surfacedSymptoms: [],
    stats: { totalWords: 0, doctorWords: 0, patientWords: 0 },
  };

  // ── Section bucketing ─────────────────────────────────────────
  // Heuristic: every sentence is scored against the four section
  // patterns. Patient-attributed sentences default to subjective.
  // Sentences with no clear hint go to "subjective" if the speaker is
  // the patient, otherwise we use a sticky "current section" model
  // (last hinted section persists until a new hint fires).
  let sticky: keyof SOAPNote | null = "subjective";
  for (const t of turns) {
    for (const sentence of splitSentences(t.text)) {
      const hinted = pickSection(sentence);
      let bucket: keyof SOAPNote | null = hinted;
      if (!bucket) {
        if (t.speaker === "patient") bucket = "subjective";
        else bucket = sticky;
      } else {
        sticky = hinted;
      }
      if (!bucket) continue;
      const arr = note[bucket];
      if (Array.isArray(arr) && (arr as string[]).indexOf(sentence) === -1) {
        (arr as string[]).push(sentence);
      }
    }
  }

  // ── Vitals ───────────────────────────────────────────────────
  for (const v of VITAL_REGEX) {
    const m = allText.match(v.regex);
    if (m) {
      note.vitals.push({
        kind: v.kind,
        value: v.format(m),
        unit: v.unit,
        rawSpan: m[0],
      });
    }
  }

  // ── Medications ──────────────────────────────────────────────
  const seenMed = new Set<string>();
  for (const m of allText.matchAll(MED_REGEX)) {
    const name = m[1].toLowerCase();
    if (seenMed.has(name)) continue;
    seenMed.add(name);
    note.medications.push({
      drugName: name,
      strength: m[2]?.replace(/\s+/g, "") || undefined,
      raw: m[0],
    });
  }

  // ── Symptom surfacing ────────────────────────────────────────
  const seenSym = new Set<string>();
  for (const lex of SYMPTOM_LEXICON) {
    if (lex.pattern.test(allText) && !seenSym.has(lex.tag)) {
      seenSym.add(lex.tag);
      note.surfacedSymptoms.push(lex.tag);
    }
  }

  // ── Stats ────────────────────────────────────────────────────
  for (const t of turns) {
    const w = t.text.split(/\s+/).filter(Boolean).length;
    note.stats.totalWords += w;
    if (t.speaker === "doctor") note.stats.doctorWords += w;
    else if (t.speaker === "patient") note.stats.patientWords += w;
  }

  return note;
}

/** Hook for swapping in an LLM-based structurer later. Same signature
 *  as structureSoapNote — implementations can call out to Claude /
 *  Whisper / Vertex / etc. behind a BAA. */
export type StructureSoapFn = (transcript: string) => SOAPNote;
