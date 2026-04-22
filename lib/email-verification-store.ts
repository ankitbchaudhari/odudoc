// Email verification token store.
//
// Tokens expire after 10 minutes. Two purposes:
//   - "signup": new account must verify before first login
//   - "reactivate": user returning after >3 days of inactivity
//
// Persisted to the `app_kv` table via bindPersistentArray so tokens survive
// Vercel Lambda recycles and, critically, are visible to OTHER Lambda
// instances — the one that sends the email is rarely the one that handles
// the user's click on the verification link.

import crypto from "crypto";
import { bindPersistentArray, awaitAllFlushes } from "./persistent-array";

export type TokenPurpose = "signup" | "reactivate";

export interface VerificationToken {
  token: string;
  email: string;
  purpose: TokenPurpose;
  createdAt: number;
  expiresAt: number;
}

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

const tokens: VerificationToken[] = [];
const handle = bindPersistentArray<VerificationToken>(
  "email-verification-tokens",
  tokens,
  () => []
);

async function ready(): Promise<void> {
  await handle;
}

function cleanupExpired() {
  const now = Date.now();
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (tokens[i].expiresAt < now) tokens.splice(i, 1);
  }
}

export async function createVerificationToken(
  email: string,
  purpose: TokenPurpose
): Promise<VerificationToken> {
  await ready();
  cleanupExpired();

  // Invalidate any outstanding token for this email — only one active link
  // at a time so the user never wonders which mail to click.
  const lowerEmail = email.toLowerCase();
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (tokens[i].email.toLowerCase() === lowerEmail) tokens.splice(i, 1);
  }

  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const record: VerificationToken = {
    token,
    email: email.toLowerCase(),
    purpose,
    createdAt: now,
    expiresAt: now + TOKEN_TTL_MS,
  };
  tokens.push(record);
  // Make sure the write lands before the caller sends the verification email —
  // otherwise a different Lambda handling the click can't find the token.
  await awaitAllFlushes();
  return record;
}

export type ConsumeResult =
  | { ok: true; email: string; purpose: TokenPurpose }
  | { ok: false; reason: "not_found" | "expired" };

// Single-use: looking up a valid token also deletes it.
export async function consumeVerificationToken(
  token: string
): Promise<ConsumeResult> {
  await ready();
  cleanupExpired();
  const idx = tokens.findIndex((t) => t.token === token);
  if (idx === -1) return { ok: false, reason: "not_found" };
  const record = tokens[idx];
  tokens.splice(idx, 1);
  await awaitAllFlushes();
  if (record.expiresAt < Date.now()) return { ok: false, reason: "expired" };
  return { ok: true, email: record.email, purpose: record.purpose };
}

// Returns remaining ms until the token expires, or 0 if missing/expired.
// Useful for UI hints. Does not consume.
export async function peekTokenTtl(token: string): Promise<number> {
  await ready();
  const record = tokens.find((t) => t.token === token);
  if (!record) return 0;
  return Math.max(0, record.expiresAt - Date.now());
}
