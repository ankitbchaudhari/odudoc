// Single-use password reset tokens.
//
// Flow:
//   1. User submits email on /auth/forgot-password.
//   2. Server creates a random token, stores { token, email, expiresAt },
//      and emails them a link /auth/reset-password?token=XYZ.
//   3. User opens the link + picks a new password.
//   4. Server verifies token + writes the new hashed password, then
//      deletes the token so the link can't be reused.
//
// Tokens expire in 30 minutes. Old/expired tokens are pruned on every
// read so the store doesn't grow indefinitely.

import { randomBytes } from "crypto";
import { bindPersistentArray, awaitAllFlushes } from "./persistent-array";

export interface PasswordResetToken {
  token: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

const TTL_MS = 30 * 60 * 1000; // 30 minutes

const tokens: PasswordResetToken[] = [];
const { hydrate, flush, reload } = bindPersistentArray<PasswordResetToken>(
  "password_reset_tokens",
  tokens,
  () => []
);
await hydrate();

function pruneExpired() {
  const now = Date.now();
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (new Date(tokens[i].expiresAt).getTime() < now) {
      tokens.splice(i, 1);
    }
  }
}

export async function createResetToken(email: string): Promise<PasswordResetToken> {
  pruneExpired();
  // Drop any existing tokens for this email so the most recent link wins.
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (tokens[i].email.toLowerCase() === email.toLowerCase()) {
      tokens.splice(i, 1);
    }
  }
  const now = Date.now();
  const rec: PasswordResetToken = {
    token: randomBytes(32).toString("hex"),
    email,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TTL_MS).toISOString(),
  };
  tokens.push(rec);
  flush();
  // Drain the flush so the user's reset-link click — which may land on
  // a different Lambda — sees the token in Postgres immediately.
  await awaitAllFlushes();
  return rec;
}

export async function consumeResetToken(token: string): Promise<PasswordResetToken | null> {
  // Cross-Lambda freshness — token created by /forgot-password on
  // Lambda A; /reset-password click typically lands on Lambda B.
  await reload();
  pruneExpired();
  const idx = tokens.findIndex((t) => t.token === token);
  if (idx < 0) return null;
  const [rec] = tokens.splice(idx, 1);
  flush();
  return rec;
}

// Peek without consuming — used by the reset page to show "invalid/expired
// link" up-front instead of waiting for submit.
export async function peekResetToken(token: string): Promise<PasswordResetToken | null> {
  await reload();
  pruneExpired();
  return tokens.find((t) => t.token === token) || null;
}
