// WhatsApp two-way conversations.
//
// One row per (patientUserId, organizationId) tuple. Holds the message
// log + opt-in state + last-template-sent so the bot can route inbound
// replies to the right context (e.g. "REFILL" coming back two minutes
// after a refill_due template means we know which drug).
//
// Inbound + outbound messages are appended to the same conversation
// so the admin / patient see one chronological thread. Each message
// carries a direction + provider id (Twilio sid) for delivery
// reconciliation.

import { bindPersistentArray } from "../persistent-array";

export type Direction = "outbound" | "inbound";
export type Channel = "whatsapp" | "sms";

export interface WAMessage {
  id: string;
  conversationId: string;
  direction: Direction;
  channel: Channel;
  body: string;
  /** Template name when the outbound message used a template. */
  templateName?: string;
  /** Captured intent when the message is inbound and a classifier
   *  match was confident. */
  intent?: string;
  /** Provider message id (Twilio sid) for delivery reconciliation. */
  providerSid?: string;
  /** Provider delivery status. */
  status?: "queued" | "sent" | "delivered" | "read" | "failed";
  /** Sender on the staff side (when admin replied directly). */
  staffEmail?: string;
  createdAt: string;
}

export interface WAConversation {
  id: string;
  /** Patient owner — even when the conversation is for a dependent
   *  the messages flow to the owner's phone. */
  patientUserId: string;
  /** Org the conversation belongs to (clinic / hospital). For
   *  platform-wide messages (OduDoc-direct) we use a sentinel
   *  "platform" string. */
  organizationId: string;
  patientPhone: string;
  patientName: string;
  /** Opt-in status for this org. Patient must have opted in for
   *  marketing messages; transactional messages don't require it
   *  but we still record consent here. */
  optInStatus: "opted_in" | "opted_out" | "unknown";
  optInAt?: string;
  optOutAt?: string;
  /** Set when the patient last sent STOP — we honour for 30 days
   *  before we'll ask them to re-opt-in. */
  cooldownUntil?: string;
  /** Most-recent outbound template — used by the inbound classifier
   *  to disambiguate quick replies. "REFILL" is meaningful because
   *  we just sent refill_due. */
  lastOutboundTemplate?: string;
  lastOutboundAt?: string;
  /** Inbox surface: count of inbound messages since the last time
   *  staff "read" the conversation. */
  unreadByStaff: number;
  unreadByPatient: number;
  messages: WAMessage[];
  updatedAt: string;
  createdAt: string;
}

const conversations: WAConversation[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<WAConversation>(
  "whatsapp_conversations",
  conversations,
  () => []
);
await hydrate();

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function findConversation(
  patientUserId: string,
  organizationId: string,
): WAConversation | null {
  return (
    conversations.find(
      (c) => c.patientUserId === patientUserId && c.organizationId === organizationId,
    ) || null
  );
}

export function findConversationByPhone(
  phone: string,
  organizationId?: string,
): WAConversation | null {
  const norm = phone.replace(/^whatsapp:/, "").replace(/[^\d+]/g, "");
  return (
    conversations.find(
      (c) => c.patientPhone.replace(/[^\d+]/g, "") === norm &&
        (!organizationId || c.organizationId === organizationId),
    ) || null
  );
}

export interface UpsertConvInput {
  patientUserId: string;
  organizationId: string;
  patientPhone: string;
  patientName: string;
}

export function ensureConversation(input: UpsertConvInput): WAConversation {
  const existing = findConversation(input.patientUserId, input.organizationId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const c: WAConversation = {
    id: genId("conv"),
    patientUserId: input.patientUserId,
    organizationId: input.organizationId,
    patientPhone: input.patientPhone,
    patientName: input.patientName,
    optInStatus: "unknown",
    unreadByStaff: 0,
    unreadByPatient: 0,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  conversations.push(c);
  flush();
  return c;
}

export function listConversationsForOrg(organizationId: string): WAConversation[] {
  return conversations
    .filter((c) => c.organizationId === organizationId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listConversationsForPatient(patientUserId: string): WAConversation[] {
  return conversations
    .filter((c) => c.patientUserId === patientUserId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function appendMessage(
  conversationId: string,
  msg: Omit<WAMessage, "id" | "conversationId" | "createdAt">,
): WAMessage | null {
  const c = conversations.find((x) => x.id === conversationId);
  if (!c) return null;
  const now = new Date().toISOString();
  const m: WAMessage = {
    id: genId("wam"),
    conversationId,
    createdAt: now,
    ...msg,
  };
  c.messages.push(m);
  c.updatedAt = now;
  if (msg.direction === "outbound") {
    if (msg.templateName) {
      c.lastOutboundTemplate = msg.templateName;
      c.lastOutboundAt = now;
    }
    c.unreadByPatient++;
  } else {
    c.unreadByStaff++;
  }
  flush();
  return m;
}

export function setOptIn(
  conversationId: string,
  status: "opted_in" | "opted_out",
  cooldownDays = 30,
): WAConversation | null {
  const c = conversations.find((x) => x.id === conversationId);
  if (!c) return null;
  const now = new Date().toISOString();
  c.optInStatus = status;
  if (status === "opted_in") {
    c.optInAt = now;
    c.cooldownUntil = undefined;
  } else {
    c.optOutAt = now;
    c.cooldownUntil = new Date(Date.now() + cooldownDays * 24 * 60 * 60 * 1000).toISOString();
  }
  c.updatedAt = now;
  flush();
  return c;
}

export function markStaffRead(conversationId: string): WAConversation | null {
  const c = conversations.find((x) => x.id === conversationId);
  if (!c) return null;
  c.unreadByStaff = 0;
  c.updatedAt = new Date().toISOString();
  flush();
  return c;
}

export function markPatientRead(conversationId: string): WAConversation | null {
  const c = conversations.find((x) => x.id === conversationId);
  if (!c) return null;
  c.unreadByPatient = 0;
  c.updatedAt = new Date().toISOString();
  flush();
  return c;
}

/** Aggregate inbox counts across orgs (used by patient dashboard). */
export function patientUnreadCount(patientUserId: string): number {
  let n = 0;
  for (const c of conversations) {
    if (c.patientUserId === patientUserId) n += c.unreadByPatient;
  }
  return n;
}

export function deleteConversationsForPatient(patientUserId: string): number {
  let n = 0;
  for (let i = conversations.length - 1; i >= 0; i--) {
    if (conversations[i].patientUserId === patientUserId) {
      tombstone(conversations[i].id);
      conversations.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flush();
  return n;
}

export function deleteConversationsForOrg(organizationId: string): number {
  let n = 0;
  for (let i = conversations.length - 1; i >= 0; i--) {
    if (conversations[i].organizationId === organizationId) {
      tombstone(conversations[i].id);
      conversations.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flush();
  return n;
}
