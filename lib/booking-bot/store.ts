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
  | "awaiting_confirm"
  | "completed"
  | "handed_off";

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
  slots: { specialty?: string; preferredDate?: string; doctorName?: string };
  messages: BookingMessage[];
  createdAt: string;
  updatedAt: string;
}

const conversations: BookingConversation[] = [];
const { hydrate, flush } = bindPersistentArray<BookingConversation>(
  "booking_conversations",
  conversations,
  () => []
);
await hydrate();

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
  const t = patientText.trim().toLowerCase();
  const slots = { ...c.slots };

  if (c.stage === "awaiting_intent") {
    if (/book|appointment|consult|doctor|need.*see/.test(t)) {
      return {
        reply: "Sure. Which specialty? Common options: General Medicine, Cardiology, Dermatology, Pediatrics, Gynaecology, Orthopaedics. Reply with the specialty name.",
        stage: "awaiting_specialty",
        slots,
      };
    }
    if (/cancel|reschedul|refill|lab|result|talk.*person|human/.test(t)) {
      return {
        reply: "I'll hand you to a human agent. They'll message you within 30 minutes.",
        stage: "handed_off",
        slots,
      };
    }
    return {
      reply: "Hi from OduDoc. Reply BOOK to schedule a doctor, or HELP to talk to a person.",
      stage: "awaiting_intent",
      slots,
    };
  }

  if (c.stage === "awaiting_specialty") {
    if (t.length < 3) return { reply: "Please reply with the specialty name.", stage: "awaiting_specialty", slots };
    slots.specialty = patientText.trim();
    return {
      reply: `Got it — ${slots.specialty}. Which date works for you? Reply in DD-MM format (e.g. 15-12) or say TODAY / TOMORROW.`,
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
    if (!when) return { reply: "I didn't catch that. Reply DD-MM, TODAY, or TOMORROW.", stage: "awaiting_date", slots };
    slots.preferredDate = when;
    return {
      reply: `Booking ${slots.specialty} for ${when}. Reply YES to confirm, NO to change.`,
      stage: "awaiting_confirm",
      slots,
    };
  }

  if (c.stage === "awaiting_confirm") {
    if (/^y(es)?$/.test(t)) {
      return {
        reply: `Confirmed. A doctor will message you within 4 hours with the appointment slot. Pay through OduDoc app or web at booking time.`,
        stage: "completed",
        slots,
      };
    }
    if (/^n(o)?$/.test(t)) {
      return { reply: "OK. Reply BOOK to start over.", stage: "awaiting_intent", slots: {} };
    }
    return { reply: "Reply YES to confirm or NO to cancel.", stage: "awaiting_confirm", slots };
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
