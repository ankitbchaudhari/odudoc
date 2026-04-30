// Push-token store. One row per (userEmail, deviceToken) — a single
// user can have multiple devices, and a single device might be re-used
// by multiple users (rare but possible: shared family phone). We key
// on (userEmail, token) so we can always find every device for a user
// AND remove a token cleanly on logout from one device.
//
// Token shapes we accept:
//   - Expo push token: "ExponentPushToken[xxx]"   (90% of mobile users)
//   - FCM token: bare device token                (Android native)
//   - APNs token: hex string                      (iOS native)
//
// We store all of them; the sender (lib/push.ts) routes based on the
// token prefix.

import { bindPersistentArray } from "./persistent-array";

export interface PushToken {
  id: string;
  userEmail: string;       // lowercased
  token: string;           // ExponentPushToken[xxx] | FCM | APNs hex
  platform: "ios" | "android" | "web";
  app: "doctor" | "patient";
  createdAt: string;
  lastSeenAt: string;
  /** Set when the user explicitly logs out from this device. We keep
   *  the row for audit but stop sending to it. */
  revokedAt?: string;
}

const tokens: PushToken[] = [];
const { hydrate, flush } = bindPersistentArray<PushToken>(
  "push-tokens",
  tokens,
  () => [],
);
await hydrate();

const now = () => new Date().toISOString();
const genId = () =>
  `pt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export interface RegisterPushTokenInput {
  userEmail: string;
  token: string;
  platform: "ios" | "android" | "web";
  app: "doctor" | "patient";
}

/** Idempotent: if the same (userEmail, token) row exists we just bump
 *  lastSeenAt and clear any revokedAt so the device starts receiving
 *  again after a re-login. */
export function registerPushToken(input: RegisterPushTokenInput): PushToken {
  const e = input.userEmail.trim().toLowerCase();
  const existing = tokens.find((t) => t.userEmail === e && t.token === input.token);
  if (existing) {
    existing.lastSeenAt = now();
    existing.platform = input.platform;
    existing.app = input.app;
    existing.revokedAt = undefined;
    flush();
    return existing;
  }
  const row: PushToken = {
    id: genId(),
    userEmail: e,
    token: input.token,
    platform: input.platform,
    app: input.app,
    createdAt: now(),
    lastSeenAt: now(),
  };
  tokens.unshift(row);
  flush();
  return row;
}

/** Soft-revoke a single device's tokens (logout from THIS device).
 *  We don't hard-delete because revoked rows are useful for audit
 *  ("this user signed out at 14:32 from device X"). */
export function revokePushToken(userEmail: string, token: string): void {
  const e = userEmail.trim().toLowerCase();
  const row = tokens.find((t) => t.userEmail === e && t.token === token);
  if (!row) return;
  row.revokedAt = now();
  flush();
}

/** Active tokens for a user, optionally filtered to a specific app
 *  (so doctor-app pushes don't go to a patient-app session of the
 *  same user). Excludes revoked rows. */
export function getActiveTokens(
  userEmail: string,
  app?: "doctor" | "patient",
): PushToken[] {
  const e = userEmail.trim().toLowerCase();
  return tokens.filter(
    (t) =>
      t.userEmail === e &&
      !t.revokedAt &&
      (app ? t.app === app : true),
  );
}
