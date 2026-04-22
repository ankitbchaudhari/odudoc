/**
 * In-memory OTP store.
 * In production replace with Redis/DB with TTL.
 *
 * Stores:
 *   - pending OTP codes for email + phone keyed by email
 *   - short-lived "verified" tokens after successful 2FA (used by NextAuth authorize)
 */

import crypto from "crypto";
import twilio from "twilio";

// Lazy Twilio client — only instantiates if env vars are present.
const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

/**
 * Normalize a phone number to E.164 format (required by Twilio).
 * - Strips spaces, dashes, parentheses.
 * - If it starts with "+", keep as-is.
 * - If it's 10 digits, assume India (+91).
 * - Otherwise prepend "+" and hope for the best.
 */
function toE164(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return `+${digits}`;
}

interface OtpRecord {
  email: string;
  phone: string;
  emailCode: string;
  phoneCode: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
}

interface VerifiedToken {
  email: string;
  token: string;
  expiresAt: number;
}

const otpStore = new Map<string, OtpRecord>();       // key = email
const verifiedTokens = new Map<string, VerifiedToken>(); // key = token

const OTP_TTL_MS = 10 * 60 * 1000;       // 10 minutes
const VERIFIED_TTL_MS = 5 * 60 * 1000;   // 5 minutes
const MAX_ATTEMPTS = 5;

function cleanup() {
  const now = Date.now();
  otpStore.forEach((v, k) => {
    if (v.expiresAt < now) otpStore.delete(k);
  });
  verifiedTokens.forEach((v, k) => {
    if (v.expiresAt < now) verifiedTokens.delete(k);
  });
}

function randomCode(): string {
  // 6-digit zero-padded
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function createOtp(email: string, phone: string): OtpRecord {
  cleanup();
  const now = Date.now();
  const record: OtpRecord = {
    email: email.toLowerCase(),
    phone,
    emailCode: randomCode(),
    phoneCode: randomCode(),
    createdAt: now,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
  };
  otpStore.set(email.toLowerCase(), record);
  return record;
}

export function verifyOtp(email: string, emailCode: string, phoneCode: string):
  | { success: true; token: string }
  | { success: false; error: string } {
  cleanup();
  const key = email.toLowerCase();
  const record = otpStore.get(key);
  if (!record) return { success: false, error: "No verification code found. Please request a new code." };
  if (record.expiresAt < Date.now()) {
    otpStore.delete(key);
    return { success: false, error: "Verification codes expired. Please request new codes." };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(key);
    return { success: false, error: "Too many attempts. Please request new codes." };
  }

  record.attempts += 1;
  if (record.emailCode !== emailCode || record.phoneCode !== phoneCode) {
    return { success: false, error: "Invalid verification codes." };
  }

  // Success - delete OTP, issue verified token
  otpStore.delete(key);
  const token = crypto.randomBytes(24).toString("hex");
  verifiedTokens.set(token, {
    email: key,
    token,
    expiresAt: Date.now() + VERIFIED_TTL_MS,
  });
  return { success: true, token };
}

/**
 * Consume a verified-token once: returns the email if valid, then deletes it.
 * Called from NextAuth authorize() to confirm 2FA was completed.
 */
export function consumeVerifiedToken(token: string, email: string): boolean {
  cleanup();
  const record = verifiedTokens.get(token);
  if (!record) return false;
  if (record.expiresAt < Date.now()) {
    verifiedTokens.delete(token);
    return false;
  }
  if (record.email !== email.toLowerCase()) return false;
  verifiedTokens.delete(token);
  return true;
}

/**
 * Stub for sending codes. In production integrate:
 *   - Email: SendGrid / Resend / SES
 *   - SMS: Twilio / IndusPays SMS / MSG91 / AWS SNS
 *
 * For now codes are logged to the server console so you can test the flow.
 */
export async function sendOtpCodes(record: OtpRecord): Promise<void> {
  // Always log server-side so Vercel function logs show the codes
  // (useful while email provider is still a stub).
  console.log("\n================ OduDoc OTP ================");
  console.log(`Email:       ${record.email}`);
  console.log(`Email code:  ${record.emailCode}`);
  console.log(`Phone:       ${record.phone}`);
  console.log(`Phone code:  ${record.phoneCode}`);
  console.log(`Expires in:  10 minutes`);
  console.log("============================================\n");

  // --- SMS via Twilio ---------------------------------------------------
  if (twilioClient && process.env.TWILIO_PHONE_NUMBER && record.phone) {
    try {
      const to = toE164(record.phone);
      await twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
        body: `Your OduDoc verification code is ${record.phoneCode}. Valid for 10 minutes. Do not share this code with anyone.`,
      });
      console.log(`[Twilio] SMS sent to ${to}`);
    } catch (err: any) {
      // Don't throw — user can still use the email code, and during Twilio
      // trial unverified numbers will fail here but not block login.
      console.error("[Twilio] SMS send failed:", err?.message || err);
    }
  } else {
    console.warn(
      "[Twilio] Skipped SMS — TWILIO_* env vars missing or phone not provided."
    );
  }

  // TODO integrate real email provider (Resend / SendGrid / SES):
  //   await sendEmail({ to: record.email, subject: "OduDoc code", body: `Your code: ${record.emailCode}` });
}
