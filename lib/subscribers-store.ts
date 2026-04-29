// Newsletter subscribers store — Postgres-backed via bindPersistentArray.

import { bindPersistentArray } from "./persistent-array";

export interface Subscriber {
  id: string;
  email: string;
  subscribedAt: string;
  source: string;
  active: boolean;
}

const now = () => new Date().toISOString();

const subscribers: Subscriber[] = [];
const { hydrate, flush } = bindPersistentArray<Subscriber>(
  "subscribers",
  subscribers,
  // Seed empty — real subscribers come from public newsletter form +
  // auto-subscribe-on-verify hook in the auth flow. Earlier builds
  // shipped a 312-row demo set; purgeDemoSubscribers() below removes
  // any leftover seed rows from existing prod databases.
  () => []
);
await hydrate();

// One-time cleanup on cold start: nuke the legacy demo seed (304
// user@example.com rows + 8 named seeds) from prod databases that
// hydrated before we emptied the seed function. Idempotent — once
// clean, this is a no-op.
(function cleanupLegacyDemoRows(): void {
  const legacyEmails = new Set([
    "sridhari.lk@gmail.com",
    "neerajjan1995@gmail.com",
    "keyur.p@gmail.com",
    "bpantlee@gmail.com",
    "priya@example.com",
    "sajib.malik96@gmail.com",
    "junaedchaddara@gmail.com",
  ]);
  let removed = 0;
  for (let i = subscribers.length - 1; i >= 0; i--) {
    const s = subscribers[i];
    if (
      /@example\.(com|org|net)$/i.test(s.email) ||
      s.id.startsWith("s-seed-") ||
      /^s[1-8]$/.test(s.id) ||
      legacyEmails.has(s.email)
    ) {
      subscribers.splice(i, 1);
      removed++;
    }
  }
  if (removed) flush();
})();

export function listSubscribers(opts: { activeOnly?: boolean; limit?: number } = {}): Subscriber[] {
  let list = [...subscribers].sort((a, b) => (a.subscribedAt < b.subscribedAt ? 1 : -1));
  if (opts.activeOnly) list = list.filter((s) => s.active);
  if (opts.limit) list = list.slice(0, opts.limit);
  return list;
}

export function countSubscribers(): number {
  return subscribers.filter((s) => s.active).length;
}

export function addSubscriber(email: string, source = "footer"): Subscriber {
  const clean = email.trim().toLowerCase();
  const existing = subscribers.find((s) => s.email === clean);
  if (existing) {
    existing.active = true;
    flush();
    return existing;
  }
  const sub: Subscriber = {
    id: `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    email: clean,
    subscribedAt: now(),
    source,
    active: true,
  };
  subscribers.unshift(sub);
  flush();
  return sub;
}

export function setSubscriberActive(id: string, active: boolean): Subscriber | null {
  const sub = subscribers.find((s) => s.id === id);
  if (!sub) return null;
  sub.active = active;
  flush();
  return sub;
}

export function getSubscriberById(id: string): Subscriber | null {
  return subscribers.find((s) => s.id === id) || null;
}

export function countSubscribersAll(): { total: number; active: number; unsubscribed: number } {
  const total = subscribers.length;
  const active = subscribers.filter((s) => s.active).length;
  return { total, active, unsubscribed: total - active };
}

export function bulkAddSubscribers(emails: string[], source = "import"): { added: number; reactivated: number; skipped: number } {
  let added = 0;
  let reactivated = 0;
  let skipped = 0;
  for (const raw of emails) {
    const clean = raw.trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { skipped++; continue; }
    const existing = subscribers.find((s) => s.email === clean);
    if (existing) {
      if (!existing.active) { existing.active = true; reactivated++; } else { skipped++; }
    } else {
      subscribers.unshift({
        id: `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}-${added}`,
        email: clean,
        subscribedAt: now(),
        source,
        active: true,
      });
      added++;
    }
  }
  if (added || reactivated) flush();
  return { added, reactivated, skipped };
}

/** One-shot cleanup for the legacy demo seed. Removes any subscriber whose
 *  email ends in @example.com (always fake) plus the specific seed addresses
 *  shipped before we wired up the public newsletter form. Returns the number
 *  of rows removed. Idempotent — safe to call repeatedly. */
export function purgeDemoSubscribers(): { removed: number } {
  const legacySeedEmails = new Set([
    "sridhari.lk@gmail.com",
    "neerajjan1995@gmail.com",
    "keyur.p@gmail.com",
    "bpantlee@gmail.com",
    "priya@example.com",
    "sajib.malik96@gmail.com",
    "junaedchaddara@gmail.com",
  ]);
  let removed = 0;
  for (let i = subscribers.length - 1; i >= 0; i--) {
    const s = subscribers[i];
    const isExampleDomain = /@example\.(com|org|net)$/i.test(s.email);
    const isLegacySeedId = s.id.startsWith("s-seed-") || /^s[1-8]$/.test(s.id);
    const isLegacyEmail = legacySeedEmails.has(s.email);
    if (isExampleDomain || isLegacySeedId || isLegacyEmail) {
      subscribers.splice(i, 1);
      removed++;
    }
  }
  if (removed) flush();
  return { removed };
}

export function removeSubscriber(id: string): boolean {
  const idx = subscribers.findIndex((s) => s.id === id);
  if (idx < 0) return false;
  subscribers.splice(idx, 1);
  flush();
  return true;
}
