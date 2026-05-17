// WhatsApp / SMS booking bot conversation log.
//
// One row per (channel, fromPhone) conversation thread. Inbound
// messages append to messages[]. Multi-turn intent gathering walks
// the patient from "I want to book" → specialty → date → confirm.

import { bindPersistentArray } from "../persistent-array";

export type Channel = "whatsapp" | "sms";

export type ConversationStage =
  | "idle"
  | "awaiting_intent"
  | "awaiting_specialty"
  | "awaiting_date"
  | "awaiting_time"
  | "awaiting_name"
  | "awaiting_confirm"
  | "completed"
  | "handed_off"
  | "opted_out";

export interface BookingMessage {
  role: "patient" | "bot";
  text: string;
  at: string;
}

export interface BookingConversation {
  id: string;
  channel: Channel;
  fromPhone: string;
  /** Resolved patient userId once we know who they are. */
  patientUserId?: string;
  stage: ConversationStage;
  /** Accumulated slot values. */
  slots: {
    specialty?: string;
    preferredDate?: string;
    preferredTime?: string;
    patientName?: string;
    doctorName?: string;
  };
  messages: BookingMessage[];
  createdAt: string;
  updatedAt: string;
}

const conversations: BookingConversation[] = [];
const { hydrate, flush, reload } = bindPersistentArray<BookingConversation>(
  "booking_conversations",
  conversations,
  () => []
);
await hydrate();

/** Cross-Lambda freshness — Twilio webhooks for the same WhatsApp
 *  conversation can land on different Lambdas. Without reload, the
 *  bot would restart the conversation from scratch on each turn.
 *  Callers in the chatbot route should await this before findOrCreate. */
export async function reloadBookingBot(): Promise<void> {
  await reload();
}

export function findOrCreate(channel: Channel, fromPhone: string): BookingConversation {
  let c = conversations.find((x) => x.channel === channel && x.fromPhone === fromPhone && x.stage !== "completed" && x.stage !== "handed_off");
  if (c) return c;
  const at = new Date().toISOString();
  c = {
    id: `bcv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    channel, fromPhone,
    stage: "awaiting_intent",
    slots: {},
    messages: [],
    createdAt: at, updatedAt: at,
  };
  conversations.unshift(c);
  flush();
  return c;
}

export function appendMessage(c: BookingConversation, role: "patient" | "bot", text: string): void {
  c.messages.push({ role, text, at: new Date().toISOString() });
  c.updatedAt = new Date().toISOString();
  flush();
}

export function setStage(c: BookingConversation, stage: ConversationStage, slots?: Partial<BookingConversation["slots"]>): void {
  c.stage = stage;
  if (slots) c.slots = { ...c.slots, ...slots };
  c.updatedAt = new Date().toISOString();
  flush();
}

export function listRecent(limit = 50): BookingConversation[] {
  return [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
}

/** Deterministic state machine. Returns the next bot message + the
 *  new stage. Free-text intent classifier is the same one Twilio
 *  voice uses — keeps booking copy consistent across channels. */
export function nextTurn(c: BookingConversation, patientText: string): { reply: string; stage: ConversationStage; slots: BookingConversation["slots"] } {
  const raw = patientText.trim();
  const t = raw.toLowerCase();
  const slots = { ...c.slots };

  // Global commands — match at any stage. STOP honours WhatsApp/SMS
  // opt-out requirements; HELP routes to a human; RESTART wipes the
  // slot accumulator without losing the conversation row.
  if (/^stop$|unsubscribe|opt.?out/.test(t)) {
    return {
      reply: "You've opted out of OduDoc messages. We won't text you again. Reply START to opt back in.",
      stage: "opted_out",
      slots: {},
    };
  }
  if (/^start$/.test(t) && c.stage === "opted_out") {
    return {
      reply: "Welcome back. Reply BOOK to schedule a doctor, or HELP to talk to a person.",
      stage: "awaiting_intent",
      slots: {},
    };
  }
  if (/^(restart|reset|start.?over)$/.test(t)) {
    return {
      reply: "Starting over. Reply BOOK to schedule a doctor, HELP for a human agent.",
      stage: "awaiting_intent",
      slots: {},
    };
  }
  if (/^help$|talk.*(person|human|agent)/.test(t)) {
    return {
      reply: "Connecting you to a human agent. They'll message back within 30 minutes during business hours. Or call our 24/7 helpline: +1 (302) 899-2625.",
      stage: "handed_off",
      slots,
    };
  }

  if (c.stage === "opted_out") {
    return { reply: "You're opted out. Reply START to re-enable OduDoc messages.", stage: "opted_out", slots };
  }

  if (c.stage === "awaiting_intent") {
    if (/^(hi|hello|hey|hii|namaste|namaskar)$/.test(t)) {
      return {
        reply: "Hi from OduDoc 👋\nReply BOOK to schedule a doctor, HELP to talk to a person, or STOP to opt out.",
        stage: "awaiting_intent",
        slots,
      };
    }
    if (/book|appointment|consult|doctor|need.*see|डॉक्टर|appoint/.test(t)) {
      return {
        reply: "Sure! Which specialty do you need?\nCommon: General Medicine, Cardiology, Dermatology, Pediatrics, Gynaecology, Orthopaedics, Psychiatry.\nReply with the specialty name.",
        stage: "awaiting_specialty",
        slots,
      };
    }
    if (/cancel|reschedul|refill|lab|result/.test(t)) {
      return {
        reply: "For cancellations, reschedules, lab results, or prescription refills — please use the OduDoc app or visit www.odudoc.com/dashboard. Or reply HELP for a human agent.",
        stage: "awaiting_intent",
        slots,
      };
    }
    return {
      reply: "Hi from OduDoc 👋\nReply BOOK to schedule a doctor, HELP to talk to a person, or STOP to opt out.",
      stage: "awaiting_intent",
      slots,
    };
  }

  if (c.stage === "awaiting_specialty") {
    if (t.length < 3) {
      return { reply: "Please reply with the specialty name (e.g. Cardiology).", stage: "awaiting_specialty", slots };
    }
    slots.specialty = raw;
    return {
      reply: `Got it — ${slots.specialty}.\nWhich date works for you?\nReply DD-MM (e.g. 15-12), or TODAY / TOMORROW.`,
      stage: "awaiting_date",
      slots,
    };
  }

  if (c.stage === "awaiting_date") {
    let when = "";
    if (/today/.test(t)) when = "today";
    else if (/tomorrow/.test(t)) when = "tomorrow";
    else {
      const m = t.match(/(\d{1,2})[-\/.](\d{1,2})/);
      if (m) when = `${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
    }
    if (!when) {
      return { reply: "I didn't catch that. Please reply DD-MM (e.g. 15-12), TODAY, or TOMORROW.", stage: "awaiting_date", slots };
    }
    slots.preferredDate = when;
    return {
      reply: `Date set: ${when}.\nWhat time works best?\nReply MORNING / AFTERNOON / EVENING, or HH:MM (24-hour, e.g. 14:30).`,
      stage: "awaiting_time",
      slots,
    };
  }

  if (c.stage === "awaiting_time") {
    let time = "";
    if (/morning/.test(t)) time = "morning (9 AM – 12 PM)";
    else if (/afternoon|noon/.test(t)) time = "afternoon (12 PM – 4 PM)";
    else if (/evening|night/.test(t)) time = "evening (4 PM – 8 PM)";
    else {
      const m = t.match(/(\d{1,2}):(\d{2})/);
      if (m) {
        const h = parseInt(m[1], 10);
        const min = parseInt(m[2], 10);
        if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
          time = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
        }
      }
    }
    if (!time) {
      return { reply: "Please reply MORNING / AFTERNOON / EVENING, or a time like 14:30.", stage: "awaiting_time", slots };
    }
    slots.preferredTime = time;
    return {
      reply: `Time set: ${time}.\nLastly, what's the patient's full name? (Reply with the name as it should appear on the prescription.)`,
      stage: "awaiting_name",
      slots,
    };
  }

  if (c.stage === "awaiting_name") {
    if (raw.length < 3 || raw.length > 80 || !/[a-zA-Zऀ-ॿ]/.test(raw)) {
      return {
        reply: "Please reply with the patient's full name (3-80 characters).",
        stage: "awaiting_name",
        slots,
      };
    }
    slots.patientName = raw;
    return {
      reply: `Almost done. Booking summary:\n👤 ${slots.patientName}\n🩺 ${slots.specialty}\n📅 ${slots.preferredDate} · ${slots.preferredTime}\n\nReply YES to confirm, NO to start over.`,
      stage: "awaiting_confirm",
      slots,
    };
  }

  if (c.stage === "awaiting_confirm") {
    if (/^y(es)?|confirm/.test(t)) {
      return {
        reply: `✅ Booking request received for ${slots.patientName}.\nA matching ${slots.specialty} doctor will reach out within 4 hours to confirm the exact slot and share a payment link.\n\nFinish faster on web: https://www.odudoc.com/consult-now\nReply HELP anytime to talk to a person.`,
        stage: "completed",
        slots,
      };
    }
    if (/^n(o)?|cancel/.test(t)) {
      return { reply: "No problem — request cancelled. Reply BOOK any time to start a new appointment.", stage: "awaiting_intent", slots: {} };
    }
    return { reply: "Please reply YES to confirm or NO to cancel.", stage: "awaiting_confirm", slots };
  }

  if (c.stage === "completed" || c.stage === "handed_off") {
    return {
      reply: "Your previous request is being handled. Reply BOOK to start a new appointment, or HELP for a human agent.",
      stage: "awaiting_intent",
      slots: {},
    };
  }

  return { reply: "Reply BOOK to schedule, or HELP for a human.", stage: "awaiting_intent", slots: {} };
}

export function deleteConversationsForPhone(fromPhone: string): number {
  let n = 0;
  for (let i = conversations.length - 1; i >= 0; i--) {
    if (conversations[i].fromPhone === fromPhone) {
      conversations.splice(i, 1);
      n++;
    }
  }
  if (n) flush();
  return n;
}
