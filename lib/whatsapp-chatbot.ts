// WhatsApp customer-care chatbot.
//
// Receives the text body of an inbound message and returns the reply
// we should send (or null to do nothing / hand to human). Replies use
// freeform text via Meta Cloud API — free of charge inside the 24h
// session window the inbound message opens.
//
// Keep this stateless on purpose. We don't track conversation history
// across multiple inbound messages — every reply is computed from the
// latest text. That means the bot can't run multi-step flows like
// "press 1 for X, 2 for Y, then enter your name" — but for STOP /
// HELP / MENU / BOOK / BALANCE intents the patient says everything
// in one message, so stateless is plenty.
//
// For richer flows (book appointment via WA, refill prescription),
// the bot ends with "Tap here to continue on app: <link>" — patients
// finish in the React app where the UX is far better than menu
// trees.

import { log } from "./log";

export interface ChatbotInput {
  /** Inbound text. We normalise + lowercase before matching. */
  body: string;
  /** E.164 phone number of the sender — used for personalised replies
   *  (e.g. wallet balance lookup) and for opt-out persistence. */
  from: string;
  /** ISO timestamp of the inbound message — for "received at HH:mm"
   *  in support handoff fallback. */
  receivedAt: string;
}

export interface ChatbotReply {
  /** The freeform text to send back. */
  body: string;
  /** Intent classification — written to logs so we can see which
   *  keywords patients are using most. */
  intent: ChatbotIntent;
}

export type ChatbotIntent =
  | "stop"
  | "start"
  | "help"
  | "menu"
  | "book"
  | "balance"
  | "support"
  | "thanks"
  | "unknown";

const STOP_WORDS = new Set([
  "stop", "unsubscribe", "cancel", "end", "quit", "optout", "opt-out", "opt out",
]);
const START_WORDS = new Set(["start", "resubscribe", "yes", "subscribe"]);
const HELP_WORDS = new Set(["help", "info", "support", "?"]);
const MENU_WORDS = new Set(["menu", "options", "hi", "hello", "hey", "namaste"]);
const BOOK_WORDS = new Set(["book", "appointment", "consult", "doctor", "consultation"]);
const BALANCE_WORDS = new Set(["balance", "wallet", "credits"]);
const THANKS_WORDS = new Set(["thanks", "thank you", "ty", "thx", "dhanyavaad"]);

const BASE_URL = "https://www.odudoc.com";

export function chatbotRespond(input: ChatbotInput): ChatbotReply {
  const normalized = input.body.trim().toLowerCase().replace(/[^\w\s-?]/g, "");
  const firstWord = normalized.split(/\s+/)[0] || "";

  log.info("chatbot.inbound", { from: input.from, body: input.body.slice(0, 120) });

  // STOP keywords — opt-out confirmation. Caller should ALSO persist
  // the opt-out in the user store (we don't have user store access
  // from here, so the webhook handler runs that side-effect).
  if (STOP_WORDS.has(firstWord) || STOP_WORDS.has(normalized)) {
    return {
      intent: "stop",
      body:
        "You've been unsubscribed from OduDoc transactional messages 🩺\n\n" +
        "You will no longer receive OTPs, appointment confirmations, lab results, " +
        "or other notifications at this number. This may affect your ability to " +
        "use OduDoc services.\n\n" +
        "Reply START anytime to resubscribe.\n\n" +
        `Manage notifications: ${BASE_URL}/dashboard/notifications\n` +
        "Email: support@odudoc.com\n\n" +
        "— Team OduDoc",
    };
  }

  if (START_WORDS.has(firstWord) || START_WORDS.has(normalized)) {
    return {
      intent: "start",
      body:
        "Welcome back to OduDoc 🩺 You're now resubscribed to transactional messages. " +
        `You can adjust preferences anytime at ${BASE_URL}/dashboard/notifications.\n\n` +
        "Reply MENU to see what you can do.",
    };
  }

  if (HELP_WORDS.has(firstWord) || HELP_WORDS.has(normalized)) {
    return {
      intent: "help",
      body:
        "OduDoc Support 🩺\n\n" +
        "I can help with:\n" +
        "• Reply *BOOK* — find doctors and book a consultation\n" +
        "• Reply *BALANCE* — check your OduDoc wallet\n" +
        "• Reply *MENU* — full list of services\n" +
        "• Reply *STOP* — unsubscribe from messages\n\n" +
        "For urgent help:\n" +
        `🌐 ${BASE_URL}/support\n` +
        "✉️ support@odudoc.com\n" +
        "📞 +1 (302) 899-2625 (24/7)\n\n" +
        "A team member typically replies within 2-4 hours.",
    };
  }

  if (MENU_WORDS.has(firstWord) || MENU_WORDS.has(normalized)) {
    return {
      intent: "menu",
      body:
        "OduDoc — what would you like to do? 🩺\n\n" +
        `👨‍⚕️ Find doctors\n${BASE_URL}/doctors\n\n` +
        `📋 Book a lab test\n${BASE_URL}/dashboard/labs\n\n` +
        `💊 Order medicines\n${BASE_URL}/dashboard/rx-fulfillment\n\n` +
        `📅 View my appointments\n${BASE_URL}/dashboard/timeline\n\n` +
        `💰 My wallet\n${BASE_URL}/dashboard/wallet\n\n` +
        "Reply *HELP* anytime for support.",
    };
  }

  if (BOOK_WORDS.has(firstWord) || BOOK_WORDS.has(normalized)) {
    return {
      intent: "book",
      body:
        "Find a doctor and book online 👨‍⚕️\n\n" +
        `${BASE_URL}/doctors\n\n` +
        "Browse by specialty, check ratings, and book a slot in under 1 minute. " +
        "You'll get a WhatsApp confirmation right after.\n\n" +
        "Need a specific specialty? Reply with the name (e.g. *cardiologist*, " +
        "*dermatologist*) and I'll send you a direct link.",
    };
  }

  if (BALANCE_WORDS.has(firstWord) || BALANCE_WORDS.has(normalized)) {
    return {
      intent: "balance",
      body:
        "Check your OduDoc wallet balance and recent transactions:\n\n" +
        `${BASE_URL}/dashboard/wallet\n\n` +
        "💡 Top-ups get 5% bonus credit. Use the balance for consultations, " +
        "lab tests, or pharmacy orders.",
    };
  }

  if (THANKS_WORDS.has(firstWord) || normalized.startsWith("thank")) {
    return {
      intent: "thanks",
      body: "You're welcome! 🙏 Reply *MENU* anytime to see what else I can help with. — Team OduDoc",
    };
  }

  // Fallback: route to human support. We don't try to be clever —
  // patients with unrecognised messages get a "we'll get back to you"
  // reply, and the inbound is logged so the support team sees it in
  // /admin/support inbox.
  return {
    intent: "unknown",
    body:
      "Thanks for messaging OduDoc 🩺\n\n" +
      "I didn't quite catch that. A team member will follow up within 2-4 hours.\n\n" +
      "In the meantime, you can:\n" +
      "• Reply *MENU* to see services\n" +
      "• Reply *HELP* for support\n" +
      `• Visit ${BASE_URL}/support`,
  };
}

// ────────────────────────────────────────────────────────────────────
// AI-augmented variant: same deterministic pass first, but when the
// inbound classifies as "unknown" AND the sender has a recent
// consultation, we route the question through Gemini grounded in that
// visit's notes. Lets us turn the post-visit follow-up flow into a
// useful Q&A without breaking the fast deterministic path for
// STOP/HELP/MENU/etc.
// ────────────────────────────────────────────────────────────────────

import {
  answerPostVisitQuestion,
  findRecentVisitContextForPhone,
} from "./whatsapp-post-visit";

export async function chatbotRespondWithAI(
  input: ChatbotInput,
): Promise<ChatbotReply> {
  const det = chatbotRespond(input);
  // For everything except "unknown" the deterministic answer is the
  // right one — never want Gemini overriding a STOP intent.
  if (det.intent !== "unknown") return det;

  // Look up a recent visit. No visit → keep the deterministic fallback.
  const ctx = findRecentVisitContextForPhone(input.from);
  if (!ctx) return det;

  const ans = await answerPostVisitQuestion(input.body, ctx);
  if (ans.type === "off_topic") return det;

  if (ans.type === "escalate") {
    return {
      intent: "unknown",
      body:
        "⚠️ Based on what you described, please reach urgent care right away.\n\n" +
        "If this is an emergency, call your local emergency number now.\n\n" +
        `For non-emergency follow-up, reply *DOCTOR* to reach a clinician on OduDoc, or visit ${BASE_URL}/support.\n\n` +
        (ans.body
          ? ans.body
          : "I'm an AI, not your doctor — I can't safely answer this one."),
    };
  }

  // "answer"
  return {
    intent: "unknown",
    body:
      ans.body +
      "\n\nReply *DOCTOR* to follow up with " +
      ctx.doctorName +
      `, or *MENU* for more options. — Team OduDoc`,
  };
}
