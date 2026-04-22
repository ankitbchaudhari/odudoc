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
  () => {
    const seed: Subscriber[] = [
      { id: "s1", email: "sridhari.lk@gmail.com",       subscribedAt: "2026-04-14T12:00:00Z", source: "footer", active: true },
      { id: "s2", email: "neerajjan1995@gmail.com",     subscribedAt: "2026-04-14T10:10:00Z", source: "footer", active: true },
      { id: "s3", email: "keyur.p@gmail.com",           subscribedAt: "2026-04-13T18:45:00Z", source: "blog",   active: true },
      { id: "s4", email: "bpantlee@gmail.com",          subscribedAt: "2026-04-13T09:20:00Z", source: "footer", active: true },
      { id: "s5", email: "admin@odudoc.com",            subscribedAt: "2026-04-12T22:00:00Z", source: "admin",  active: true },
      { id: "s6", email: "priya@example.com",           subscribedAt: "2026-04-12T14:30:00Z", source: "popup",  active: true },
      { id: "s7", email: "sajib.malik96@gmail.com",     subscribedAt: "2026-04-11T11:00:00Z", source: "blog",   active: true },
      { id: "s8", email: "junaedchaddara@gmail.com",    subscribedAt: "2026-04-11T08:00:00Z", source: "footer", active: true },
    ];
    for (let i = 0; i < 304; i++) {
      seed.push({
        id: `s-seed-${i}`,
        email: `user${i + 1}@example.com`,
        subscribedAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
        source: "footer",
        active: true,
      });
    }
    return seed;
  }
);
await hydrate();

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

export function removeSubscriber(id: string): boolean {
  const idx = subscribers.findIndex((s) => s.id === id);
  if (idx < 0) return false;
  subscribers.splice(idx, 1);
  flush();
  return true;
}
