// In-app notification center.
//
// Cross-cutting drop-in for every event surfaced to a user — appt
// reminders, lab results ready, refill due, inter-org transfer
// accepted, etc. Renderable as a bell-with-badge anywhere in the
// app via <NotificationBell/>.
//
// We deliberately keep this distinct from the WhatsApp /
// transactional-email layers — those are off-platform delivery.
// In-app notifications are what the patient sees when they open
// OduDoc, regardless of whether we also pinged them out-of-band.

import { bindPersistentArray } from "../persistent-array";

export type NotifKind =
  | "appointment_reminder"
  | "appointment_confirmed"
  | "appointment_cancelled"
  | "lab_result_ready"
  | "rx_ready"
  | "refill_due"
  | "transfer_received"
  | "transfer_accepted"
  | "wallet_topup"
  | "wallet_refund"
  | "abha_linked"
  | "consent_request"
  | "billing_invoice"
  | "system";

export type NotifSeverity = "info" | "success" | "warn" | "critical";

export interface Notification {
  id: string;
  /** Recipient. Patients (and staff) see in-app via this id. */
  userId: string;
  kind: NotifKind;
  severity: NotifSeverity;
  title: string;
  body: string;
  /** Optional deep-link the bell click follows. */
  link?: string;
  /** Stable reference to the originating entity (booking id, lab
   *  order id, transfer id, …). Lets the UI dedupe + group. */
  reference?: string;
  /** Read marker. */
  readAt?: string;
  /** When the notification expires from the inbox. Undefined = keeps. */
  expiresAt?: string;
  createdAt: string;
}

const items: Notification[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<Notification>(
  "notifications",
  items,
  () => []
);
await hydrate();

const MAX_PER_USER = 200;

export function listForUser(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}): Notification[] {
  const lim = Math.min(opts.limit ?? 50, MAX_PER_USER);
  return items
    .filter((n) => {
      if (n.userId !== userId) return false;
      if (n.expiresAt && new Date(n.expiresAt).getTime() < Date.now()) return false;
      if (opts.unreadOnly && n.readAt) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, lim);
}

export function unreadCount(userId: string): number {
  let n = 0;
  for (const it of items) {
    if (it.userId !== userId) continue;
    if (it.readAt) continue;
    if (it.expiresAt && new Date(it.expiresAt).getTime() < Date.now()) continue;
    n++;
  }
  return n;
}

export interface PushInput {
  userId: string;
  kind: NotifKind;
  title: string;
  body: string;
  severity?: NotifSeverity;
  link?: string;
  reference?: string;
  expiresInDays?: number;
}

export function pushNotification(input: PushInput): Notification {
  // Idempotency: if a notification with the same (user, kind, ref)
  // exists and is still unread, update its body/title rather than
  // duplicating. Stops "Lab result ready" firing 4 times for the
  // same order.
  if (input.reference) {
    const existing = items.find(
      (n) => n.userId === input.userId && n.kind === input.kind &&
             n.reference === input.reference && !n.readAt,
    );
    if (existing) {
      existing.title = input.title;
      existing.body = input.body;
      existing.severity = input.severity || existing.severity;
      existing.link = input.link || existing.link;
      flush();
      return existing;
    }
  }
  const now = new Date().toISOString();
  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : undefined;
  const n: Notification = {
    id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId: input.userId,
    kind: input.kind,
    severity: input.severity || "info",
    title: input.title.trim(),
    body: input.body.trim(),
    link: input.link,
    reference: input.reference,
    expiresAt,
    createdAt: now,
  };
  items.unshift(n);
  // Cap per-user history to avoid unbounded growth.
  const userItems = items.filter((x) => x.userId === input.userId);
  if (userItems.length > MAX_PER_USER) {
    const excess = userItems.slice(MAX_PER_USER);
    for (const e of excess) {
      const idx = items.findIndex((x) => x.id === e.id);
      if (idx >= 0) { tombstone(items[idx].id); items.splice(idx, 1); }
    }
  }
  flush();
  return n;
}

export function markRead(id: string, userId: string): boolean {
  const n = items.find((x) => x.id === id && x.userId === userId);
  if (!n) return false;
  if (!n.readAt) { n.readAt = new Date().toISOString(); flush(); }
  return true;
}

export function markAllRead(userId: string): number {
  let n = 0;
  const at = new Date().toISOString();
  for (const it of items) {
    if (it.userId === userId && !it.readAt) { it.readAt = at; n++; }
  }
  if (n > 0) flush();
  return n;
}

export function deleteNotificationsForUser(userId: string): number {
  let n = 0;
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].userId === userId) { tombstone(items[i].id); items.splice(i, 1); n++; }
  }
  if (n > 0) flush();
  return n;
}
