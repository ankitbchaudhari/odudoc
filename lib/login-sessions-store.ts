// Login session tracker — V14 §security item "concurrent-session
// detection with auto-lock". Every successful sign-in writes a row
// here (user, ip, userAgent, at). When the count of *distinct IPs*
// for a single user inside the lockout window exceeds the threshold
// we mark the user as auto-locked: the next sign-in attempt is
// refused with a clear message and an accountability event is
// recorded.
//
// Trade-offs:
//  - This is in-memory + persistent-array, not Redis. Fine for our
//    Lambda-warm population sizes (≤ a few thousand active logins
//    per hour). At scale move to Redis ZSETs keyed by user id.
//  - We trust the X-Forwarded-For chain (Vercel terminates HTTPS,
//    so the left-most IP is the client). Spoofing it requires
//    Vercel-edge access.
//  - "Distinct IP" is exact match. Mobile networks shift IPs often
//    (especially behind CGNAT), so we set the threshold high enough
//    that benign mobile users don't trip it. Tune per real data.

import { bindPersistentArray } from "./persistent-array";

export interface LoginSession {
  id: string;
  userEmail: string; // canonical lookup key — stable across role changes
  ip: string;
  userAgent: string;
  at: string; // ISO
}

const sessions: LoginSession[] = [];
const locks: { userEmail: string; lockedAt: string; reason: string }[] = [];

const h = bindPersistentArray<LoginSession>("login-sessions", sessions, () => []);
const lh = bindPersistentArray<{ userEmail: string; lockedAt: string; reason: string }>(
  "login-locks",
  locks,
  () => [],
);
await h;
await lh;

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_DISTINCT_IPS = 3;
const RETAIN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function prune() {
  const cutoff = Date.now() - RETAIN_MS;
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (new Date(sessions[i].at).getTime() < cutoff) sessions.splice(i, 1);
  }
}

/** Record a successful sign-in. Returns true when the recording itself
 *  triggered a lockout — caller may want to invalidate the session it
 *  was about to mint. (We can't do it here: the JWT is signed downstream.) */
export function recordLoginSession(input: {
  userEmail: string;
  ip: string;
  userAgent: string;
}): { lockedNow: boolean; distinctIps: number } {
  prune();
  const email = input.userEmail.toLowerCase();
  sessions.push({
    id: `ls-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userEmail: email,
    ip: input.ip || "unknown",
    userAgent: input.userAgent || "unknown",
    at: new Date().toISOString(),
  });

  const since = Date.now() - WINDOW_MS;
  const recent = sessions.filter(
    (s) => s.userEmail === email && new Date(s.at).getTime() >= since,
  );
  const distinct = new Set(recent.map((s) => s.ip)).size;

  if (distinct > MAX_DISTINCT_IPS && !locks.find((l) => l.userEmail === email)) {
    locks.push({
      userEmail: email,
      lockedAt: new Date().toISOString(),
      reason: `${distinct} distinct IPs in the last hour`,
    });
    return { lockedNow: true, distinctIps: distinct };
  }
  return { lockedNow: false, distinctIps: distinct };
}

export function isLoginLocked(email: string): boolean {
  return !!locks.find((l) => l.userEmail === email.toLowerCase());
}

export function clearLoginLock(email: string): boolean {
  const idx = locks.findIndex((l) => l.userEmail === email.toLowerCase());
  if (idx < 0) return false;
  locks.splice(idx, 1);
  return true;
}

export function listRecentSessionsFor(email: string, limit = 20): LoginSession[] {
  const e = email.toLowerCase();
  return sessions
    .filter((s) => s.userEmail === e)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}
