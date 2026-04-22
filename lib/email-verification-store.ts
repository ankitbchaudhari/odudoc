// Email verification token store.
//
// Tokens expire after 10 minutes. Two purposes:
//   - "signup": new account must verify before first login
//   - "reactivate": user returning after >3 days of inactivity
//
// Stored in memory for now (will move to MySQL with the other stores). On a
// single Vercel serverless instance this is fine for a demo; in production
// with multiple instances each will have its own tokens, so a user might have
// to click the most recent link. That's acceptable for a 10-minute window.

import crypto from "crypto";

export type TokenPurpose = "signup" | "reactivate";

export interface VerificationToken {
  token: string;
  email: string;
  purpose: TokenPurpose;
  createdAt: number;
  expiresAt: number;
}

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

const tokens = new Map<string, VerificationToken>();

function cleanupExpired() {
  const now = Date.now();
  tokens.forEach((v, k) => {
    if (v.expiresAt < now) tokens.delete(k);
  });
}

export function createVerificationToken(
  email: string,
  purpose: TokenPurpose
): VerificationToken {
  cleanupExpired();

  // Invalidate any outstanding token for this email — only one active link
  // at a time so the user never wonders which mail to click.
  const lowerEmail = email.toLowerCase();
  tokens.forEach((v, k) => {
    if (v.email.toLowerCase() === lowerEmail) tokens.delete(k);
  });

  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const record: VerificationToken = {
    token,
    email: email.toLowerCase(),
    purpose,
    createdAt: now,
    expiresAt: now + TOKEN_TTL_MS,
  };
  tokens.set(token, record);
  return record;
}

export type ConsumeResult =
  | { ok: true; email: string; purpose: TokenPurpose }
  | { ok: false; reason: "not_found" | "expired" };

// Single-use: looking up a valid token also deletes it.
export function consumeVerificationToken(token: string): ConsumeResult {
  cleanupExpired();
  const record = tokens.get(token);
  if (!record) return { ok: false, reason: "not_found" };
  tokens.delete(token);
  if (record.expiresAt < Date.now()) return { ok: false, reason: "expired" };
  return { ok: true, email: record.email, purpose: record.purpose };
}

// Returns remaining ms until the token expires, or 0 if missing/expired.
// Useful for UI hints. Does not consume.
export function peekTokenTtl(token: string): number {
  const record = tokens.get(token);
  if (!record) return 0;
  return Math.max(0, record.expiresAt - Date.now());
}
