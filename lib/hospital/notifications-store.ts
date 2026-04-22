// Notifications log: SMS / email / WhatsApp / in-app. Tenant-scoped.
import { bindPersistentArray } from "../persistent-array";
import { sendEmail } from "../email";
import { sendSms, sendWhatsApp, sendVoice, sayTwiml } from "../sms";

export type Channel = "sms" | "email" | "whatsapp" | "push" | "in_app" | "voice";
export type NotificationStatus = "queued" | "sent" | "delivered" | "read" | "failed" | "bounced";
export type Category = "appointment" | "reminder" | "result" | "billing" | "marketing" | "alert" | "discharge" | "vaccination" | "generic";

export interface Notification {
  id: string; organizationId: string;
  channel: Channel;
  category: Category;
  recipientName?: string;
  recipientContact: string;
  patientId?: string;
  subject?: string;
  body: string;
  templateCode?: string;
  status: NotificationStatus;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  errorMessage?: string;
  providerRef?: string;
  costEstimate?: number;
  scheduledFor?: string;
  attemptCount: number;
  createdAt: string; updatedAt: string;
}

const messages: Notification[] = [];
const h = bindPersistentArray<Notification>("notifications-log", messages, () => []);
await h;

export const CHANNEL_LABEL: Record<Channel, string> = { sms: "SMS", email: "Email", whatsapp: "WhatsApp", push: "Push", in_app: "In-app", voice: "Voice" };
export const STATUS_LABEL: Record<NotificationStatus, string> = { queued: "Queued", sent: "Sent", delivered: "Delivered", read: "Read", failed: "Failed", bounced: "Bounced" };
export const CATEGORY_LABEL: Record<Category, string> = { appointment: "Appointment", reminder: "Reminder", result: "Result", billing: "Billing", marketing: "Marketing", alert: "Alert", discharge: "Discharge", vaccination: "Vaccination", generic: "Generic" };

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(list: Notification[], orgId: string) {
  const p = `NTF-${suf(orgId)}-`;
  const m = list.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

export function listNotifications(opts: { organizationId: string; channel?: Channel; status?: NotificationStatus; category?: Category; patientId?: string }): Notification[] {
  return messages.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.channel ? r.channel === opts.channel : true))
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.category ? r.category === opts.category : true))
    .filter((r) => (opts.patientId ? r.patientId === opts.patientId : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function createNotification(orgId: string, input: Partial<Notification>): { ok: true; record: Notification } | { ok: false; error: string } {
  if (!input.channel || !input.recipientContact || !input.body) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: Notification = {
    id: nextId(messages, orgId), organizationId: orgId,
    channel: input.channel as Channel,
    category: (input.category || "generic") as Category,
    recipientName: input.recipientName, recipientContact: input.recipientContact,
    patientId: input.patientId,
    subject: input.subject, body: input.body,
    templateCode: input.templateCode,
    status: (input.status || "queued") as NotificationStatus,
    sentAt: input.sentAt, deliveredAt: input.deliveredAt, readAt: input.readAt,
    errorMessage: input.errorMessage,
    providerRef: input.providerRef,
    costEstimate: input.costEstimate,
    scheduledFor: input.scheduledFor,
    attemptCount: input.attemptCount ?? 0,
    createdAt: now, updatedAt: now,
  };
  messages.push(r);
  // Fire-and-forget dispatch via provider matching the channel.
  // We update attemptCount/status/providerRef/errorMessage/sentAt in-place
  // and then poke a flush through an index-identity splice.
  void dispatchNotification(r).catch((e) => {
    void import("../log").then(({ log }) => log.error("notifications.dispatch_threw", e));
  });
  return { ok: true, record: r };
}

async function dispatchNotification(r: Notification): Promise<void> {
  // in_app / push are surfaced by the UI — nothing to dispatch externally.
  if (r.channel === "in_app" || r.channel === "push") {
    touchNotification(r.id, r.organizationId, { status: "sent", sentAt: new Date().toISOString() });
    return;
  }
  let result: { ok: boolean; id?: string; sid?: string; error?: string; skipped?: boolean } = { ok: false };
  try {
    if (r.channel === "email") {
      const res = await sendEmail({
        from: r.category === "marketing" ? "promotion" : r.category === "appointment" || r.category === "reminder" ? "notifications" : "no-reply",
        to: r.recipientContact,
        subject: r.subject || "Notification from OduDoc",
        html: r.body.startsWith("<") ? r.body : `<div style="font-family:sans-serif;white-space:pre-wrap;">${r.body}</div>`,
      });
      result = res;
    } else if (r.channel === "sms") {
      result = await sendSms(r.recipientContact, r.body);
    } else if (r.channel === "whatsapp") {
      result = await sendWhatsApp(r.recipientContact, r.body);
    } else if (r.channel === "voice") {
      result = await sendVoice(r.recipientContact, sayTwiml(r.body));
    }
  } catch (e) {
    result = { ok: false, error: (e as Error).message };
  }
  const now = new Date().toISOString();
  if (result.ok) {
    touchNotification(r.id, r.organizationId, {
      status: result.skipped ? "queued" : "sent",
      sentAt: result.skipped ? undefined : now,
      providerRef: result.id || result.sid,
      attemptCount: r.attemptCount + 1,
    });
  } else {
    touchNotification(r.id, r.organizationId, {
      status: "failed",
      errorMessage: result.error,
      attemptCount: r.attemptCount + 1,
    });
  }
}

function touchNotification(id: string, orgId: string, patch: Partial<Notification>): void {
  const i = messages.findIndex((m) => m.id === id && m.organizationId === orgId);
  if (i < 0) return;
  messages.splice(i, 1, { ...messages[i], ...patch, id: messages[i].id, organizationId: messages[i].organizationId, updatedAt: new Date().toISOString() });
}
export function updateNotification(id: string, orgId: string, patch: Partial<Notification>): Notification | null {
  const i = messages.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  messages.splice(i, 1, { ...messages[i], ...patch, id: messages[i].id, organizationId: messages[i].organizationId, updatedAt: new Date().toISOString() });
  return messages[i];
}
// Webhook callbacks from Twilio/Resend land here — we key by the provider's
// message id (stored as providerRef on the notification) since we don't
// know the orgId on the inbound request.
export function updateByProviderRef(providerRef: string, patch: Partial<Notification>): Notification | null {
  const i = messages.findIndex((r) => r.providerRef === providerRef);
  if (i < 0) return null;
  messages.splice(i, 1, { ...messages[i], ...patch, id: messages[i].id, organizationId: messages[i].organizationId, updatedAt: new Date().toISOString() });
  return messages[i];
}

export function deleteNotification(id: string, orgId: string): boolean {
  const i = messages.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  messages.splice(i, 1); return true;
}

export async function retryNotification(id: string, orgId: string): Promise<Notification | null> {
  const i = messages.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const r = messages[i];
  if (r.status !== "failed" && r.status !== "queued") return r;
  touchNotification(id, orgId, { status: "queued", errorMessage: undefined });
  const fresh = messages.find((m) => m.id === id && m.organizationId === orgId);
  if (fresh) await dispatchNotification(fresh);
  return messages.find((m) => m.id === id && m.organizationId === orgId) || null;
}

export function computeStats(orgId: string) {
  const my = messages.filter((r) => r.organizationId === orgId);
  const today = new Date().toISOString().slice(0, 10);
  const todays = my.filter((r) => r.createdAt.slice(0, 10) === today);
  return {
    total: my.length,
    today: todays.length,
    queued: my.filter((r) => r.status === "queued").length,
    sentToday: todays.filter((r) => r.status === "sent" || r.status === "delivered" || r.status === "read").length,
    failedToday: todays.filter((r) => r.status === "failed" || r.status === "bounced").length,
    deliveryRate: todays.length > 0 ? Math.round((todays.filter((r) => r.status === "delivered" || r.status === "read").length / todays.length) * 100) : 0,
  };
}

export function unlinkNotificationsForPatient(patientId: string, orgId: string): void {
  const stamp = new Date().toISOString();
  for (let __i = 0; __i < messages.length; __i++) {
    const r = messages[__i];
    if (r.organizationId === orgId && r.patientId === patientId) {
      messages.splice(__i, 1, { ...r, patientId: "", updatedAt: stamp });
    }
  }
  // flush:auto-unlink
  messages.splice(messages.length, 0);
}
