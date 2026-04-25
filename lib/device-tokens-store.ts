// Mobile device tokens for FCM push notifications.
//
// Each row links a Firebase registration token (per-install, per-app)
// back to the OduDoc user it was registered for. We send pushes by
// fanning out over every active token for the target user.
//
// Tokens rotate (Firebase periodically refreshes them, and the app
// re-registers on every cold start). Stale tokens that FCM rejects
// during a send are pruned via [removeDeadToken] from lib/fcm.ts.

import { bindPersistentArray, awaitAllFlushes } from "./persistent-array";

export interface DeviceToken {
  token: string;          // FCM registration token
  userId: string;         // users-store id
  email: string;          // lowercased — for cross-token lookup if userId changes
  role: string;           // patient | doctor | …
  platform: "android" | "ios";
  appVersion?: string;
  registeredAt: string;   // ISO-8601
  lastSeenAt: string;     // ISO-8601 — bumped on every register
}

const tokens: DeviceToken[] = [];
const handle = bindPersistentArray<DeviceToken>("device-tokens", tokens, () => []);

async function ready(): Promise<void> {
  await handle;
}

/** Upsert. Same token for the same user → bump lastSeenAt. Same token for
 *  a different user (logged out + back in as someone else) → reassign. */
export async function upsertDeviceToken(
  input: Omit<DeviceToken, "registeredAt" | "lastSeenAt"> & { lastSeenAt?: string }
): Promise<DeviceToken> {
  await ready();
  const now = new Date().toISOString();

  const existingIdx = tokens.findIndex((t) => t.token === input.token);
  const record: DeviceToken = {
    token: input.token,
    userId: input.userId,
    email: input.email.toLowerCase(),
    role: input.role,
    platform: input.platform,
    appVersion: input.appVersion,
    registeredAt: existingIdx >= 0 ? tokens[existingIdx].registeredAt : now,
    lastSeenAt: now,
  };

  if (existingIdx >= 0) tokens.splice(existingIdx, 1, record);
  else tokens.push(record);

  await awaitAllFlushes();
  return record;
}

export async function removeDeviceToken(token: string): Promise<boolean> {
  await ready();
  const idx = tokens.findIndex((t) => t.token === token);
  if (idx === -1) return false;
  tokens.splice(idx, 1);
  await awaitAllFlushes();
  return true;
}

/** Best-effort lookup. Used by sender helpers that fan out to every device. */
export async function getTokensForUser(userId: string): Promise<DeviceToken[]> {
  await ready();
  return tokens.filter((t) => t.userId === userId);
}

export async function getTokensForEmail(email: string): Promise<DeviceToken[]> {
  await ready();
  const e = email.toLowerCase();
  return tokens.filter((t) => t.email === e);
}

/** Drop tokens FCM has flagged as unregistered/invalid. */
export async function dropTokens(tokensToDrop: string[]): Promise<number> {
  await ready();
  if (tokensToDrop.length === 0) return 0;
  const set = new Set(tokensToDrop);
  let removed = 0;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (set.has(tokens[i].token)) {
      tokens.splice(i, 1);
      removed++;
    }
  }
  if (removed) await awaitAllFlushes();
  return removed;
}
