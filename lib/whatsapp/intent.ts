// Inbound-intent classifier.
//
// Deterministic keyword matcher tuned to the quick-reply buttons we
// declare on outbound templates plus a few generic openers. Returns
// null when nothing matches confidently — the conversation falls
// through to "needs human" and surfaces in the staff inbox.
//
// Why deterministic, not LLM: WhatsApp replies are short, mostly one-
// or two-word commands, with extremely high pattern density. A rule
// engine catches >95% of intents, runs free, and is auditable.
// LLM-based fallback can be layered on top later for the long tail.

export type Intent =
  | "confirm"        // CONFIRM, OK, yes, sure
  | "reschedule"     // RESCHEDULE, change time, postpone
  | "cancel"         // CANCEL, won't make it
  | "refill"         // REFILL, reorder, repeat Rx
  | "skip"           // SKIP, dismiss, not now
  | "deliver"        // DELIVER, send to me
  | "pharmacies"     // PHARMACIES, where can I get
  | "results"        // RESULTS, summary, what does it say
  | "doctor"         // DOCTOR, talk to doctor, follow up
  | "better"         // BETTER, recovering, fine now
  | "same"           // SAME, no change
  | "worse"          // WORSE, getting worse, urgent
  | "stop"           // STOP, unsubscribe, opt out
  | "start"          // START, opt in, subscribe
  | "help";          // HELP, menu, what can I do

export interface ClassifiedIntent {
  intent: Intent;
  /** 0–1 confidence; >0.6 considered actionable. */
  confidence: number;
  /** The phrase the matcher fired on. Surfaced in the staff inbox so
   *  they can verify the bot took the right action. */
  matchedSpan: string;
}

interface Rule {
  intent: Intent;
  patterns: RegExp[];
  confidence: number;
}

const RULES: Rule[] = [
  // Confirm / cancel / reschedule
  { intent: "confirm", patterns: [/^\s*(confirm|ok|okay|yes|yep|sure|going|will be there|will come)\b/i], confidence: 0.95 },
  { intent: "cancel",  patterns: [/^\s*(cancel|won.?t make it|cant come|not coming|skip appt)\b/i], confidence: 0.95 },
  { intent: "reschedule", patterns: [/^\s*(reschedule|change\s*time|change\s*date|postpone|move\s*it|different\s*time)\b/i], confidence: 0.95 },
  // Rx / pharmacy
  { intent: "refill",     patterns: [/^\s*(refill|re-?order|repeat|same\s*meds)\b/i, /\bneed\s+more\b/i], confidence: 0.92 },
  { intent: "skip",       patterns: [/^\s*(skip|dismiss|not\s*now|later|ignore)\b/i], confidence: 0.9 },
  { intent: "deliver",    patterns: [/^\s*(deliver|home\s*delivery|send\s*it|drop\s*it)\b/i], confidence: 0.92 },
  { intent: "pharmacies", patterns: [/^\s*(pharmac\w+|nearby|where\b|stores?)\b/i], confidence: 0.9 },
  // Results / follow-up
  { intent: "results",    patterns: [/^\s*(results?|summary|report|what.*say)\b/i], confidence: 0.9 },
  { intent: "doctor",     patterns: [/^\s*(doctor|talk\s*to\s*doctor|follow\s*up|call\s*me)\b/i], confidence: 0.9 },
  { intent: "better",     patterns: [/^\s*(better|fine|all\s*good|recovering|recovered)\b/i, /\bfeel\s+better\b/i], confidence: 0.88 },
  { intent: "same",       patterns: [/^\s*(same|no\s*change|unchanged)\b/i], confidence: 0.85 },
  { intent: "worse",      patterns: [/^\s*(worse|worsening|getting\s*worse|deterior\w+|urgent)\b/i, /\bnot\s+improving\b/i], confidence: 0.95 },
  // Lifecycle
  { intent: "stop",       patterns: [/^\s*(stop|unsubscribe|opt\s*out|don.?t\s*message|no\s*more|leave\s*me\s*alone)\b/i], confidence: 0.99 },
  { intent: "start",      patterns: [/^\s*(start|subscribe|opt\s*in|yes\s*please)\b/i], confidence: 0.95 },
  { intent: "help",       patterns: [/^\s*(help|menu|options|commands|what\s*can\s*you\s*do)\b/i], confidence: 0.9 },
];

export function classify(text: string): ClassifiedIntent | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  for (const rule of RULES) {
    for (const p of rule.patterns) {
      const m = trimmed.match(p);
      if (m) return { intent: rule.intent, confidence: rule.confidence, matchedSpan: m[0].trim() };
    }
  }
  return null;
}

/** Standard help-menu body — used as the auto-reply when "HELP"
 *  fires. Listed inline so the matcher and the response live next
 *  to each other. */
export const HELP_MENU =
  "Here's what I can do:\n\n" +
  "• CONFIRM / RESCHEDULE / CANCEL — manage your appointment\n" +
  "• REFILL — reorder your prescription\n" +
  "• RESULTS — quick summary of recent labs\n" +
  "• DOCTOR — request a follow-up call\n" +
  "• BETTER / SAME / WORSE — update us after a visit\n" +
  "• STOP — opt out of messages\n\n" +
  "Reply HELP any time to see this menu again.";
