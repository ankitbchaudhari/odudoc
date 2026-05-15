// Mobile signup OTP store.
//
// The web signup flow emails a magic link — fine in a browser, terrible on
// a phone (switch apps, click link, opens browser, no way back to the app).
// Mobile signup sends a 6-digit code instead. This store holds the
// outstanding codes keyed by email, expires them after 10 minutes, and
// tracks attempt counts so a leaked code can't be brute-forced.
//
// Persisted via bindPersistentArray so codes survive Lambda recycles and
// are visible to the Lambda that handles the /mobile-verify call.

import crypto from "crypto";
import { bindPersistentArray, awaitAllFlushes } from "./persistent-array";

export interface MobileOtp {
  email: string;      // lowercased
  codeHash: string;   // sha256 of the 6-digit code — never store the raw code
  createdAt: number;
  expiresAt: number;
  attempts: number;   // failed verify attempts
  lastSentAt: number; // for resend rate-limiting
}

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000; // 30s

const otps: MobileOtp[] = [];
const handle = bindPersistentArray<MobileOtp>("mobile-otps", otps, () => []);

async function ready(): Promise<void> {
  await handle;
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function cleanup(): void {
  const now = Date.now();
  for (let i = otps.length - 1; i >= 0; i--) {
    if (otps[i].expiresAt < now) otps.splice(i, 1);
  }
}

function randomCode(): string {
  // 6 digits, zero-padded. crypto.randomInt is uniform.
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export type IssueResult =
  | { ok: true; code: string }
  | { ok: false; reason: "cooldown"; retryAfterMs: number };

/**
 * Mint a new code (or refresh an existing one if the cooldown has passed).
 * Returns the plaintext code so the caller can email it — the store only
 * keeps the hash.
 */
export async function issueMobileOtp(email: string): Promise<IssueResult> {
  await ready();
  cleanup();

  const lower = email.toLowerCase();
  const existing = otps.findIndex((o) => o.email === lower);
  if (existing >= 0) {
    const rec = otps[existing];
    const sinceLast = Date.now() - rec.lastSentAt;
    if (sinceLast < RESEND_COOLDOWN_MS) {
      return { ok: false, reason: "cooldown", retryAfterMs: RESEND_COOLDOWN_MS - sinceLast };
    }
    otps.splice(existing, 1);
  }

  const code = randomCode();
  const now = Date.now();
  otps.push({
    email: lower,
    codeHash: hashCode(code),
    createdAt: now,
    expiresAt: now + TTL_MS,
    attempts: 0,
    lastSentAt: now,
  });
  await awaitAllFlushes();
  return { ok: true, code };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "too_many_attempts" | "invalid_code" };

/**
 * Verify a submitted code. Single-use on success; increments attempts on
 * failure and locks out after MAX_ATTEMPTS.
 */
export async function verifyMobileOtp(email: string, code: string): Promise<VerifyResult> {
  await ready();
  // Cross-Lambda freshness — issueMobileOtp ran on a different Lambda
  // in most cases; without reload the verify silently 404s on a valid
  // code.
  await handle.reload();
  cleanup();

  const lower = email.toLowerCase();
  const idx = otps.findIndex((o) => o.email === lower);
  if (idx === -1) return { ok: false, reason: "not_found" };

  const rec = otps[idx];
  if (rec.expiresAt < Date.now()) {
    otps.splice(idx, 1);
    await awaitAllFlushes();
    return { ok: false, reason: "expired" };
  }
  if (rec.attempts >= MAX_ATTEMPTS) {
    otps.splice(idx, 1);
    await awaitAllFlushes();
    return { ok: false, reason: "too_many_attempts" };
  }

  if (rec.codeHash !== hashCode(code)) {
    // Replace with a new object so the persistent-array wrapper flushes.
    otps.splice(idx, 1, { ...rec, attempts: rec.attempts + 1 });
    await awaitAllFlushes();
    return { ok: false, reason: "invalid_code" };
  }

  // Success — single-use.
  otps.splice(idx, 1);
  await awaitAllFlushes();
  return { ok: true };
}
