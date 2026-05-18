// Pre-registration OTP store. Separate from lib/otp-store.ts which
// handles 2FA for *existing* users. Here we hold a short-lived
// challenge for an email/phone pair the user is in the process of
// signing up with — no user record exists yet.
//
// Flow:
//   1. /api/auth/signup-otp/send  → mint a 6-digit code, store by
//      email+phone, send via email + SMS, return a session id.
//   2. /api/auth/signup-otp/verify → caller submits session id +
//      code; on match, swap for a short-lived "verified" token bound
//      to the email+phone pair.
//   3. /api/auth/register accepts that token instead of doing its own
//      verification — the wizard's contract with the backend.
//
// Storage is in-memory with a 10-minute TTL. The map clears itself on
// every successful verify so a stolen code can't be replayed. Move to
// Redis when we need cross-Lambda persistence; for one Lambda this is
// safe because the wizard completes within seconds.

import crypto from "crypto";

interface Pending {
  code: string;        // 6-digit
  email: string;
  phone: string;
  attempts: number;
  expiresAt: number;
}

interface VerifiedToken {
  email: string;
  phone: string;
  expiresAt: number;
}

const PENDING = new Map<string, Pending>();   // sessionId → Pending
const TOKENS = new Map<string, VerifiedToken>(); // token → identity

const TTL_MS = 10 * 60 * 1000; // 10 min for the challenge
const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 min to complete the wizard
const MAX_ATTEMPTS = 5;

function sweep() {
  const now = Date.now();
  for (const [k, v] of PENDING) if (v.expiresAt < now) PENDING.delete(k);
  for (const [k, v] of TOKENS) if (v.expiresAt < now) TOKENS.delete(k);
}

/** Mint a 6-digit code, store it, and return the session id + the
 *  code (caller is responsible for sending the code to the user). */
export function issueSignupOtp(email: string, phone: string): { sessionId: string; code: string } {
  sweep();
  const sessionId = crypto.randomBytes(16).toString("hex");
  const code = String(Math.floor(100000 + Math.random() * 900000));
  PENDING.set(sessionId, {
    code,
    email: email.toLowerCase().trim(),
    phone: phone.trim(),
    attempts: 0,
    expiresAt: Date.now() + TTL_MS,
  });
  return { sessionId, code };
}

/** Verify a submitted code against the pending challenge. On success,
 *  emit a short-lived token the wizard's next step can present to
 *  /api/auth/register. On failure, return an error reason. */
export function verifySignupOtp(
  sessionId: string,
  code: string,
): { ok: true; token: string } | { ok: false; reason: "expired" | "invalid" | "exhausted" } {
  sweep();
  const p = PENDING.get(sessionId);
  if (!p) return { ok: false, reason: "expired" };
  if (p.attempts >= MAX_ATTEMPTS) {
    PENDING.delete(sessionId);
    return { ok: false, reason: "exhausted" };
  }
  if (p.code !== code.trim()) {
    p.attempts += 1;
    return { ok: false, reason: "invalid" };
  }
  // Success — burn the challenge and mint a verified token.
  PENDING.delete(sessionId);
  const token = crypto.randomBytes(24).toString("hex");
  TOKENS.set(token, { email: p.email, phone: p.phone, expiresAt: Date.now() + TOKEN_TTL_MS });
  return { ok: true, token };
}

/** Consume a verified token. Single-use; deleted after redemption.
 *  Returns the email+phone the user proved ownership of. */
export function redeemSignupToken(token: string): { email: string; phone: string } | null {
  sweep();
  const t = TOKENS.get(token);
  if (!t) return null;
  TOKENS.delete(token);
  return { email: t.email, phone: t.phone };
}

/** Test-only escape hatch — lets devs see the active OTPs in the
 *  same Lambda without spinning up Twilio. Returns the code that
 *  would have been sent for a given email. Used in dev mode only. */
export function debugPeekOtp(email: string): string | null {
  if (process.env.NODE_ENV === "production") return null;
  const lower = email.toLowerCase().trim();
  for (const v of PENDING.values()) if (v.email === lower) return v.code;
  return null;
}
