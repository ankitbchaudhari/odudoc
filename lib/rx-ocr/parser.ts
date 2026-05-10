// OCR'd Rx parser.
//
// Pure function. Takes the raw text Tesseract (or any OCR pipeline)
// produces from a paper-prescription photo and extracts structured
// medication lines. The grammar is tuned to typical Indian
// physician handwriting + common Rx pad layouts:
//
//   Tab. Crocin 500 mg          1-0-1   x 5 days
//   Cap. Amoxicillin 500mg      1-1-1   for 7 days   #21
//   Syp. Cetirizine 10ml        0-0-1   x 5 days
//   Inj. Insulin 10 U s/c       BD      14 days
//   T. Pantoprazole 40 mg       OD bef food   1 month
//
// We deliberately don't try to "understand" the entire Rx (header /
// patient details / signature). We just pull med lines because that's
// the data the safety engine + repeat-prescription flow needs. Lines
// that don't match get returned as `unparsed` so the patient can
// edit them inline before save.
//
// LLM-assist hook: replaceable behind a feature flag once we have a
// BAA-signed model — the same Drug + Frequency + Duration shape is
// what the LLM would output too.

import { normaliseDrug } from "../drug-safety/interactions-db";

export interface ParsedRxItem {
  /** Canonical generic name. */
  drugName: string;
  /** Brand the doctor wrote, when distinct from generic. */
  brand?: string;
  strength?: string;             // "500 mg"
  form?: string;                 // tablet / capsule / syrup / injection / drops / cream
  /** Free-text dose ("1 tab", "10 ml", "10 U"). */
  dose?: string;
  /** Normalised frequency code ("OD" / "BID" / "TID" / "QID" / "HS" /
   *  "STAT" / "PRN") plus the original pattern for transparency. */
  frequency?: string;
  rawFrequency?: string;
  /** Route — PO / SC / IM / IV / topical / per rectum / SL. */
  route?: string;
  durationDays?: number;
  /** Quantity dispensed when the Rx specifies it ("#21"). */
  quantity?: number;
  /** Free-text instructions captured verbatim. */
  instructions?: string;
  /** Span the parser fired on — surfaced in the UI for audit. */
  rawLine: string;
  /** 0-1 confidence; UI prompts review when < 0.6. */
  confidence: number;
}

export interface ParseRxOutput {
  items: ParsedRxItem[];
  unparsed: string[];
}

const FORM_PREFIX = /^\s*(tab\.?|cap\.?|syp\.?|syr\.?|inj\.?|drop\.?|cream|oint\.?|gel|spray|susp\.?|sol\.?|t\.?|c\.?)\s+/i;
const FORM_NAME: Record<string, string> = {
  tab: "tablet", "tab.": "tablet", t: "tablet", "t.": "tablet",
  cap: "capsule", "cap.": "capsule", c: "capsule", "c.": "capsule",
  syp: "syrup", "syp.": "syrup", syr: "syrup", "syr.": "syrup",
  inj: "injection", "inj.": "injection",
  drop: "drops", "drop.": "drops",
  cream: "cream", oint: "ointment", "oint.": "ointment",
  gel: "gel", spray: "spray",
  susp: "suspension", "susp.": "suspension",
  sol: "solution", "sol.": "solution",
};

const STRENGTH_RE = /\b(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu|u(?!nit)|units?)\b/i;
const QTY_RE = /#\s*(\d{1,4})\b/;
const DURATION_RE_LIST = [
  /\bx\s*(\d{1,3})\s*(day|days|d)\b/i,
  /\bfor\s+(\d{1,3})\s*(day|days|d)\b/i,
  /\b(\d{1,3})\s*\/\s*7\b/,                 // "5/7" = 5 days
  /\b(\d{1,3})\s*(day|days|d)\b/i,           // bare "7 days"
  /\bfor\s+(\d{1,2})\s*(week|weeks|wk|w)\b/i,
  /\b(\d{1,2})\s*(week|weeks|wk|w)\b/i,
  /\bfor\s+(\d{1,2})\s*(month|months|mo|m)\b/i,
  /\b(\d{1,2})\s*(month|months|mo)\b/i,
];

function parseDuration(raw: string): number | undefined {
  for (let i = 0; i < DURATION_RE_LIST.length; i++) {
    const m = raw.match(DURATION_RE_LIST[i]);
    if (!m) continue;
    const n = Number(m[1]);
    if (!Number.isFinite(n)) continue;
    const unit = (m[2] || "day").toLowerCase();
    if (unit.startsWith("week") || unit === "wk" || unit === "w") return n * 7;
    if (unit.startsWith("month") || unit === "mo" || unit === "m") return n * 30;
    return n;
  }
  return undefined;
}

const ROUTE_RE = /\b(po|orally|by mouth|iv|intravenous|im|intramuscular|s\/?c|sc|subcut\w+|topical|sl|sublingual|pr|per\s+rectum|per\s+vag\w*|inhal\w+|nebulis\w+)\b/i;
function normaliseRoute(s: string): string | undefined {
  const lower = s.toLowerCase();
  if (/(po|orally|by mouth)/.test(lower)) return "PO";
  if (/(iv|intravenous)/.test(lower)) return "IV";
  if (/(im|intramuscular)/.test(lower)) return "IM";
  if (/(s\/?c|subcut)/.test(lower)) return "SC";
  if (/topical/.test(lower)) return "TOP";
  if (/(sl|sublingual)/.test(lower)) return "SL";
  if (/(pr|per rectum)/.test(lower)) return "PR";
  if (/per vag/.test(lower)) return "PV";
  if (/(inhal|nebulis)/.test(lower)) return "INH";
  return undefined;
}

const FREQ_PATTERNS: Array<{ re: RegExp; code: string }> = [
  { re: /\b1\s*[-_]\s*1\s*[-_]\s*1\s*[-_]\s*1\b/, code: "QID" },
  { re: /\b1\s*[-_]\s*1\s*[-_]\s*1\b/, code: "TID" },
  { re: /\b1\s*[-_]\s*0\s*[-_]\s*1\b/, code: "BID" },
  { re: /\b0\s*[-_]\s*0\s*[-_]\s*1\b/, code: "HS" },
  { re: /\b1\s*[-_]\s*0\s*[-_]\s*0\b/, code: "OD" },
  { re: /\b0\s*[-_]\s*1\s*[-_]\s*0\b/, code: "OD-noon" },
  { re: /\b(qid|qds|four\s+times\s+daily|4\s*x\s*day)\b/i, code: "QID" },
  { re: /\b(tid|tds|three\s+times\s+daily|3\s*x\s*day|t\.i\.d\.?)\b/i, code: "TID" },
  { re: /\b(bid|bd|b\.d\.?|twice\s+daily|two\s+times\s+daily)\b/i, code: "BID" },
  { re: /\b(qid|qds)\b/i, code: "QID" },
  { re: /\b(od|q\s*\d*\s*d|once\s+daily|once\s+a\s+day)\b/i, code: "OD" },
  { re: /\b(hs|qhs|at\s+night|bedtime|nocte)\b/i, code: "HS" },
  { re: /\b(stat|now|once|immediately)\b/i, code: "STAT" },
  { re: /\b(prn|sos|when\s+needed|as\s+needed|whenever\s+needed)\b/i, code: "PRN" },
  { re: /\bq\s*(\d+)\s*h(ours?)?\b/i, code: "Q?H" },
];

function parseFrequency(raw: string): { code?: string; rawFrequency?: string } {
  for (const p of FREQ_PATTERNS) {
    const m = raw.match(p.re);
    if (m) {
      let code = p.code;
      if (code === "Q?H") {
        const hM = raw.match(/\bq\s*(\d+)\s*h/i);
        code = hM ? `Q${hM[1]}H` : "QXH";
      }
      return { code, rawFrequency: m[0].trim() };
    }
  }
  return {};
}

const INSTR_KEYWORDS = [
  "before food", "after food", "with food", "empty stomach",
  "before meals", "after meals", "with meals",
  "at bedtime", "in the morning", "in the evening",
  "as needed", "if pain", "if fever", "if sleep disturbance",
];

function parseInstructions(raw: string): string | undefined {
  const lower = raw.toLowerCase();
  const found: string[] = [];
  for (const k of INSTR_KEYWORDS) {
    if (lower.includes(k)) found.push(k);
  }
  if (found.length === 0) return undefined;
  return found.join(", ");
}

const COMMON_BRANDS_TO_IGNORE = new Set(["tab", "cap", "syp", "syr", "inj", "drop", "cream", "gel", "spray", "susp", "sol", "ml", "mg", "mcg", "iu", "u", "x", "for", "every"]);

function looksLikeDrugName(token: string): boolean {
  const lower = token.toLowerCase().replace(/[.,]/g, "");
  if (lower.length < 3) return false;
  if (COMMON_BRANDS_TO_IGNORE.has(lower)) return false;
  if (/^\d+$/.test(lower)) return false;
  return /^[a-z][a-z\-]+$/.test(lower);
}

function parseLine(rawLine: string): ParsedRxItem | null {
  const trimmed = rawLine.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  // Reject obvious non-Rx lines (header / signature / dates).
  if (/^(date|signature|patient|name|age|sex|address|prescriber|doctor)\b/i.test(trimmed)) return null;
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\s*$/.test(trimmed)) return null;

  let working = trimmed;
  let form: string | undefined;
  const formMatch = working.match(FORM_PREFIX);
  if (formMatch) {
    const key = formMatch[1].toLowerCase().replace(/\.$/, "");
    form = FORM_NAME[key] || FORM_NAME[key + "."];
    working = working.slice(formMatch[0].length).trim();
  }

  // Drug name = first 1-2 alphabetic tokens before the strength.
  const tokens = working.split(/\s+/);
  const drugTokens: string[] = [];
  for (const t of tokens) {
    if (STRENGTH_RE.test(t)) break;
    if (!looksLikeDrugName(t)) {
      // Allow a single non-alpha token (a "-" inside a name) only at the start.
      if (drugTokens.length > 0) break;
    }
    if (looksLikeDrugName(t)) drugTokens.push(t);
    if (drugTokens.length >= 2) break;
  }
  if (drugTokens.length === 0) return null;
  const rawDrugStr = drugTokens.join(" ").replace(/[.,]/g, "");
  const generic = normaliseDrug(rawDrugStr);
  const drugName = generic || rawDrugStr.toLowerCase();
  const brand = generic && generic !== rawDrugStr.toLowerCase() ? rawDrugStr : undefined;

  const strengthMatch = trimmed.match(STRENGTH_RE);
  const strength = strengthMatch ? `${strengthMatch[1]}${strengthMatch[2].toLowerCase()}` : undefined;

  const freq = parseFrequency(trimmed);
  const dur = parseDuration(trimmed);
  const qtyMatch = trimmed.match(QTY_RE);
  const quantity = qtyMatch ? Number(qtyMatch[1]) : undefined;
  const routeMatch = trimmed.match(ROUTE_RE);
  const route = routeMatch ? normaliseRoute(routeMatch[0]) : (form === "injection" ? "IM" : form === "tablet" || form === "capsule" || form === "syrup" ? "PO" : undefined);

  // Confidence: drug normalisation + at least one of strength/freq/duration is a strong signal.
  let confidence = 0.5;
  if (generic) confidence += 0.2;
  if (strength) confidence += 0.1;
  if (freq.code) confidence += 0.1;
  if (dur !== undefined) confidence += 0.05;
  confidence = Math.min(0.95, confidence);

  // Need at least *something* clinically usable beyond the drug name.
  if (!strength && !freq.code && !dur && !quantity) {
    if (!generic) return null;
    confidence = Math.min(confidence, 0.55);
  }

  return {
    drugName,
    brand,
    strength,
    form,
    dose: undefined,
    frequency: freq.code,
    rawFrequency: freq.rawFrequency,
    route,
    durationDays: dur,
    quantity,
    instructions: parseInstructions(trimmed),
    rawLine: trimmed,
    confidence,
  };
}

export function parseRxText(raw: string): ParseRxOutput {
  if (!raw) return { items: [], unparsed: [] };
  // Normalise unicode + line breaks; OCR commonly emits ‑ and · which
  // confuse our patterns.
  const cleaned = raw
    .replace(/‐|–|—|−/g, "-")  // various dashes → ASCII
    .replace(/·/g, ".")
    .replace(/ /g, " ");
  const lines = cleaned
    .split(/\r?\n+/)
    .flatMap((l) => l.split(/(?<=\bdays?\b|\bweeks?\b|\bmonths?\b|#\d{1,4}\b)\s+/i))
    .map((l) => l.trim())
    .filter(Boolean);

  const items: ParsedRxItem[] = [];
  const unparsed: string[] = [];
  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed) items.push(parsed);
    else if (line.length >= 6 && /[a-z]{4,}/i.test(line)) unparsed.push(line);
  }
  return { items, unparsed };
}
