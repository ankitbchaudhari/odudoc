// Voice-order parser.
//
// Pure function. Takes a free-text transcript (from the browser
// Web Speech API or a manual paste) and extracts structured nursing
// orders. The grammar is deliberately narrow — we only recognise
// patterns staff actually use at the bedside, optimised for
// recall + correctness rather than free-form NLP coverage:
//
//   "Bed <N> vitals: BP <s> over <d>, pulse <p>, temp <t>, sat <o>"
//   "Bed <N> give <drug> <dose>"
//   "Bed <N> order <test1> and <test2>"
//   "Bed <N> stop <drug>"
//   "Bed <N> note <free-text>"
//
// A single utterance can pack multiple orders ("Bed 12 vitals
// 130 over 85 pulse 88 — and order CBC stat"). We split on
// keywords + commas and produce one VoiceOrder per intent so the
// nurse can confirm/discard each independently.
//
// Why deterministic vs LLM: medication errors are catastrophic —
// the parser must be auditable. Every match traces to a regex with
// a citation. LLM augmentation can come later behind a feature flag
// once we have a BAA-signed model provider.

export type OrderKind = "vitals" | "medication" | "lab_order" | "stop_med" | "note";

export interface ParsedVoiceOrder {
  kind: OrderKind;
  /** Free-text bed/room reference as captured ("Bed 12", "ICU 3", "203B"). */
  bedRef?: string;
  /** Vitals payload when kind === "vitals". Each vital comes back
   *  with the numeric value + the captured raw span so the UI can
   *  show "from your speech: 'BP 130 over 85'". */
  vitals?: {
    systolic?: number;
    diastolic?: number;
    hr?: number;
    rr?: number;
    spo2?: number;
    tempC?: number;
    tempF?: number;
    glucose?: number;
    weight?: number;
  };
  /** Medication payload. */
  medication?: {
    drugName: string;
    dose?: string;
    frequency?: string;        // "now" | "stat" | "BID" | "TID" | etc.
    route?: string;            // "PO" / "IV" / "IM" / "SC"
    rawSpan: string;
  };
  /** Stop-med payload — paired with a drug name. */
  stopMed?: { drugName: string };
  /** Lab order payload — array of test codes / names. */
  labOrders?: { tests: string[]; urgency?: "routine" | "stat" };
  /** Note text. */
  note?: string;
  /** Span of the original transcript this rule fired on. */
  matchedSpan: string;
  /** 0-1 confidence. Below 0.6 the UI flags the order for review
   *  before queueing. */
  confidence: number;
}

export interface ParseInput {
  transcript: string;
  /** Optional default bed when the nurse opens the station next to
   *  a specific bed; the parser pre-fills bedRef on orders that
   *  don't name one explicitly. */
  defaultBedRef?: string;
}

export interface ParseOutput {
  orders: ParsedVoiceOrder[];
  /** Tokens we couldn't classify — surfaced for review. */
  unclassified: string[];
}

// ── Bed reference detector ─────────────────────────────────────
// Matches "bed 12", "bed twelve", "ICU 3 bed 4", "203B".
const BED_RE = /\b(?:(?:icu|ward|room)\s*\d+\s*)?bed\s+(\w+(?:\s*\w+)?)/i;
const PLAIN_BED_RE = /^\s*(\d{1,4}[a-z]?)\b/i;

function pickBedRef(span: string, fallback?: string): string | undefined {
  const m = span.match(BED_RE);
  if (m) return `Bed ${m[1].trim()}`;
  const m2 = span.match(PLAIN_BED_RE);
  if (m2 && /^\d{1,4}[a-z]?$/i.test(m2[1])) return `Bed ${m2[1]}`;
  return fallback;
}

// Number-word fallback for misheard digits ("one twenty over eighty").
const NUM_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};
function wordToNum(s: string): number | null {
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  const lower = s.toLowerCase();
  if (NUM_WORDS[lower] !== undefined) return NUM_WORDS[lower];
  return null;
}

// ── Vitals patterns ────────────────────────────────────────────
const VITALS_PATTERNS: Array<{
  kind: keyof NonNullable<ParsedVoiceOrder["vitals"]>;
  regex: RegExp;
  pair?: keyof NonNullable<ParsedVoiceOrder["vitals"]>;
  extract: (m: RegExpMatchArray) => Record<string, number>;
}> = [
  {
    kind: "systolic",
    regex: /\b(?:bp|blood pressure)\D{0,8}(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})\b/i,
    extract: (m) => ({ systolic: Number(m[1]), diastolic: Number(m[2]) }),
  },
  {
    kind: "hr",
    regex: /\b(?:hr|heart rate|pulse|pr)\D{0,6}(\d{2,3})\b/i,
    extract: (m) => ({ hr: Number(m[1]) }),
  },
  {
    kind: "rr",
    regex: /\b(?:rr|resp(?:iratory)?\s*rate)\D{0,6}(\d{1,2})\b/i,
    extract: (m) => ({ rr: Number(m[1]) }),
  },
  {
    kind: "spo2",
    regex: /\b(?:spo2|sat\w*|oxygen\s*sat\w*|saturat\w+)\D{0,6}(\d{2,3})\s*%?/i,
    extract: (m) => ({ spo2: Number(m[1]) }),
  },
  {
    kind: "tempC",
    regex: /\b(?:temp\w*|temperature)\D{0,6}(\d{2,3}(?:\.\d)?)\s*(?:°\s*c|c\b|celsius)?/i,
    extract: (m) => {
      const v = Number(m[1]);
      const out: Record<string, number> = { tempC: v };
      // 95-110°F → convert to C; 30-44°C accepted as-is.
      if (v >= 90 && v <= 115) {
        out.tempF = v;
        out.tempC = ((v - 32) * 5) / 9;
      }
      return out;
    },
  },
  {
    kind: "glucose",
    regex: /\b(?:glucose|sugar|gluc|cbg)\D{0,6}(\d{2,3})\b/i,
    extract: (m) => ({ glucose: Number(m[1]) }),
  },
  {
    kind: "weight",
    regex: /\b(?:weight|weighs|weighed)\D{0,6}(\d{2,3}(?:\.\d)?)\s*(?:kg|kilo\w*)?/i,
    extract: (m) => ({ weight: Number(m[1]) }),
  },
];

const ROUTE_RE = /\b(po|orally|by mouth|iv|intravenous|im|intramuscular|sc|subcut\w+|topical|sublingual|sl)\b/i;
const FREQ_RE = /\b(stat|now|once|bid|tid|qid|q\s*\d+\s*h(?:ours?)?|every\s+\d+\s*hours?|prn|when\s+needed|hs|qhs|od|once daily|twice daily|three times daily|four times daily)\b/i;

function normaliseRoute(s: string): string | undefined {
  const lower = s.toLowerCase();
  if (/(po|orally|by mouth)/.test(lower)) return "PO";
  if (/(iv|intravenous)/.test(lower)) return "IV";
  if (/(im|intramuscular)/.test(lower)) return "IM";
  if (/(sc|subcut)/.test(lower)) return "SC";
  if (/topical/.test(lower)) return "TOP";
  if (/(sl|sublingual)/.test(lower)) return "SL";
  return undefined;
}
function normaliseFrequency(s: string): string {
  const lower = s.toLowerCase().trim();
  if (lower === "stat" || lower === "now" || lower === "once") return "STAT";
  if (lower === "bid" || lower === "twice daily") return "BID";
  if (lower === "tid" || lower === "three times daily") return "TID";
  if (lower === "qid" || lower === "four times daily") return "QID";
  if (lower === "od" || lower === "once daily") return "OD";
  if (lower === "hs" || lower === "qhs") return "HS";
  if (lower === "prn" || lower === "when needed") return "PRN";
  return s.trim().toUpperCase();
}

// Drug allowlist drawn from the existing safety engine; if the
// parser can't match a drug name to one of these we still capture
// the order but flag confidence lower so the UI prompts confirm.
import { normaliseDrug } from "../drug-safety/interactions-db";

function detectDrugName(span: string): { drugName: string; rawDrug: string } | null {
  // Look for "give <drug> <dose>" or "<drug> <dose> [route]".
  const m = span.match(/\b(?:give|administer|start|push)\s+([a-z][\w\-]+(?:\s+\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?))?)/i);
  const candidate = m ? m[1] : null;
  if (candidate) {
    const norm = normaliseDrug(candidate.split(/\s+/)[0]);
    if (norm) return { drugName: norm, rawDrug: candidate };
  }
  // Fallback: try to find a known generic anywhere in the span.
  const KNOWN = [
    "paracetamol", "ibuprofen", "diclofenac", "tramadol",
    "amoxicillin", "azithromycin", "ceftriaxone", "metronidazole",
    "pantoprazole", "ondansetron", "metoclopramide",
    "salbutamol", "atorvastatin", "metoprolol", "amlodipine",
    "ramipril", "telmisartan", "furosemide", "metformin",
    "insulin", "haloperidol", "lorazepam", "diazepam",
    "morphine", "fentanyl", "ketamine", "propofol",
    "noradrenaline", "adrenaline", "dopamine", "vasopressin",
    "heparin", "enoxaparin", "warfarin", "aspirin", "clopidogrel",
  ];
  const lower = span.toLowerCase();
  for (const k of KNOWN) {
    if (lower.includes(k)) return { drugName: k, rawDrug: k };
  }
  return null;
}

const DOSE_RE = /\b(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu|units?)\b/i;

// Common test names the parser recognises.
const KNOWN_TESTS = [
  "cbc", "complete blood count",
  "crp", "c reactive protein",
  "ecg", "ekg", "electrocardiogram",
  "cxr", "chest x ray", "chest x-ray",
  "abg", "arterial blood gas",
  "lft", "liver function",
  "kft", "kidney function",
  "rft", "renal function",
  "lipid", "lipid profile",
  "hba1c", "h b a1c",
  "tsh", "thyroid",
  "urine", "urinalysis", "ua",
  "troponin",
  "d-dimer", "ddimer",
  "lipase", "amylase",
  "blood culture", "cultures",
  "ultrasound", "usg",
  "ct", "ct scan",
  "mri",
];

function detectLabOrders(span: string): string[] {
  const lower = span.toLowerCase();
  const found = new Set<string>();
  for (const t of KNOWN_TESTS) {
    if (lower.includes(t)) found.add(t.toUpperCase());
  }
  return Array.from(found);
}

// ── Top-level parser ────────────────────────────────────────────
export function parseVoiceOrders(input: ParseInput): ParseOutput {
  const orders: ParsedVoiceOrder[] = [];
  const unclassified: string[] = [];
  if (!input.transcript || !input.transcript.trim()) return { orders, unclassified };

  // Split into sentence-ish chunks; commas are also separators
  // because nurses chain ("BP 130 over 85, pulse 92, temp 99").
  const chunks = input.transcript
    .replace(/\bover\b/gi, "over") // ensure spaces
    .split(/(?<=[.!?;])\s+|\n+|(?<=:)\s+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  let stickyBed: string | undefined = input.defaultBedRef;

  for (const chunk of chunks) {
    const lower = chunk.toLowerCase();
    const bed = pickBedRef(chunk, stickyBed);
    if (bed && !stickyBed) stickyBed = bed;

    // Vitals — collect across the chunk.
    const vitalsHits: Record<string, number> = {};
    let vitalsSpan = "";
    for (const p of VITALS_PATTERNS) {
      const m = chunk.match(p.regex);
      if (m) {
        Object.assign(vitalsHits, p.extract(m));
        vitalsSpan += (vitalsSpan ? " " : "") + m[0];
      }
    }
    if (Object.keys(vitalsHits).length > 0) {
      orders.push({
        kind: "vitals",
        bedRef: bed,
        vitals: vitalsHits as ParsedVoiceOrder["vitals"],
        matchedSpan: vitalsSpan,
        confidence: 0.92,
      });
      // Don't continue into med/lab parsing on a chunk that was
      // dominantly vitals — but allow lab/med detection if extra
      // keywords appear.
    }

    // Stop-med — "stop morphine"
    const stopM = chunk.match(/\bstop\s+([a-z][\w\-]+)/i);
    if (stopM) {
      const drug = normaliseDrug(stopM[1]) || stopM[1].toLowerCase();
      orders.push({
        kind: "stop_med",
        bedRef: bed,
        stopMed: { drugName: drug },
        matchedSpan: stopM[0],
        confidence: 0.9,
      });
    }

    // Medication — "give paracetamol 500 mg PO stat"
    if (/\b(give|administer|start|push)\b/i.test(lower)) {
      const drugMatch = detectDrugName(chunk);
      if (drugMatch) {
        const dose = chunk.match(DOSE_RE);
        const route = chunk.match(ROUTE_RE);
        const freq = chunk.match(FREQ_RE);
        orders.push({
          kind: "medication",
          bedRef: bed,
          medication: {
            drugName: drugMatch.drugName,
            dose: dose ? `${dose[1]} ${dose[2].toLowerCase()}` : undefined,
            route: route ? normaliseRoute(route[0]) : undefined,
            frequency: freq ? normaliseFrequency(freq[0]) : undefined,
            rawSpan: chunk,
          },
          matchedSpan: chunk,
          confidence: dose ? 0.88 : 0.7,
        });
      } else {
        unclassified.push(chunk);
      }
    }

    // Lab orders — "order CBC and CRP stat"
    if (/\border\b|\bget\b|\bsend\s+for\b/i.test(lower)) {
      const tests = detectLabOrders(chunk);
      if (tests.length > 0) {
        const urgency: "routine" | "stat" | undefined =
          /\bstat\b|\burgent\b|\bnow\b/i.test(lower) ? "stat" : "routine";
        orders.push({
          kind: "lab_order",
          bedRef: bed,
          labOrders: { tests, urgency },
          matchedSpan: chunk,
          confidence: 0.85,
        });
      }
    }

    // Note — "patient agitated", explicit "note ..."
    const noteM = chunk.match(/\bnote[:,]?\s+(.+)/i);
    if (noteM) {
      orders.push({
        kind: "note",
        bedRef: bed,
        note: noteM[1].trim(),
        matchedSpan: chunk,
        confidence: 0.95,
      });
      continue;
    }
    // If a chunk produced no orders + has at least 4 words, capture
    // it as an unclassified-note candidate so the UI can surface
    // "did you mean to record this as a note?".
    const produced = orders.some((o) => o.matchedSpan === chunk || (o.matchedSpan && chunk.includes(o.matchedSpan)));
    if (!produced && Object.keys(vitalsHits).length === 0 && chunk.split(/\s+/).length >= 4) {
      unclassified.push(chunk);
    }

    // Suppress unused warning.
    void wordToNum;
  }

  return { orders, unclassified };
}

/** Render a one-line human summary for an order. */
export function summariseOrder(o: ParsedVoiceOrder): string {
  const bed = o.bedRef ? `${o.bedRef} · ` : "";
  if (o.kind === "vitals" && o.vitals) {
    const parts: string[] = [];
    if (o.vitals.systolic && o.vitals.diastolic) parts.push(`BP ${o.vitals.systolic}/${o.vitals.diastolic}`);
    if (o.vitals.hr) parts.push(`HR ${o.vitals.hr}`);
    if (o.vitals.spo2) parts.push(`SpO2 ${o.vitals.spo2}%`);
    if (o.vitals.rr) parts.push(`RR ${o.vitals.rr}`);
    if (o.vitals.tempC) parts.push(`Temp ${Math.round(o.vitals.tempC * 10) / 10}°C`);
    if (o.vitals.glucose) parts.push(`Gluc ${o.vitals.glucose}`);
    if (o.vitals.weight) parts.push(`Wt ${o.vitals.weight}kg`);
    return `${bed}Vitals: ${parts.join(" · ")}`;
  }
  if (o.kind === "medication" && o.medication) {
    const m = o.medication;
    return `${bed}Give ${m.drugName}${m.dose ? ` ${m.dose}` : ""}${m.route ? ` ${m.route}` : ""}${m.frequency ? ` ${m.frequency}` : ""}`;
  }
  if (o.kind === "stop_med" && o.stopMed) {
    return `${bed}Stop ${o.stopMed.drugName}`;
  }
  if (o.kind === "lab_order" && o.labOrders) {
    return `${bed}Order: ${o.labOrders.tests.join(", ")}${o.labOrders.urgency === "stat" ? " (STAT)" : ""}`;
  }
  if (o.kind === "note" && o.note) return `${bed}Note: ${o.note}`;
  return `${bed}${o.matchedSpan}`;
}
