// Admin notifications store — Postgres-backed via bindPersistentArray.
//
// Powers the bell-dropdown in the admin layout. Any signup / application /
// publish event that the admin should see in real time pushes here. We prune
// to the last 50 to keep the JSONB blob small and the dropdown snappy.

import { bindPersistentArray } from "./persistent-array";

export type AdminNotificationType =
  | "user_signup"
  | "doctor_application"
  | "doctor_verification_submission"
  | "doctor_verification_requested"
  | "doctor_profile_nudge"
  | "career_application"
  | "blog_published"
  | "withdrawal_request"
  | "contact_form"
  | "role_changed"
  | "user_deleted"
  | "payment_received"
  | "payment_failed"
  | "subscription_activated"
  | "subscription_cancelled"
  | "module_request"
  | "license_expiry"
  | "doctor_referral";

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  body: string;
  link: string;
  createdAt: string;
  read: boolean;
}

const MAX_NOTIFICATIONS = 50;

const notifications: AdminNotification[] = [];
const { hydrate, reload, flush } = bindPersistentArray<AdminNotification>(
  "admin_notifications",
  notifications,
  () => []
);
await hydrate();

export async function reloadAdminNotifications(): Promise<void> {
  await reload();
}

export function listAdminNotifications(): AdminNotification[] {
  // Newest first.
  return [...notifications].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
  );
}

export function addAdminNotification(input: {
  type: AdminNotificationType;
  title: string;
  body: string;
  link: string;
}): AdminNotification {
  const n: AdminNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
    createdAt: new Date().toISOString(),
    read: false,
  };
  notifications.unshift(n);
  // Prune oldest.
  if (notifications.length > MAX_NOTIFICATIONS) {
    notifications.splice(MAX_NOTIFICATIONS);
  }
  flush();
  return n;
}

export function markAdminNotificationRead(id: string): boolean {
  const n = notifications.find((x) => x.id === id);
  if (!n) return false;
  if (!n.read) {
    n.read = true;
    flush();
  }
  return true;
}

export function markAllAdminNotificationsRead(): number {
  let changed = 0;
  for (const n of notifications) {
    if (!n.read) {
      n.read = true;
      changed++;
    }
  }
  if (changed > 0) flush();
  return changed;
}
