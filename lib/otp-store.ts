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
import { sendEmail } from "./email";

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

  // --- Email via Resend -------------------------------------------------
  // Always attempt email — it's the fallback when Twilio is on a trial
  // account or the user's phone is unverified. sendEmail() no-ops safely
  // (without throwing) when RESEND_API_KEY isn't set.
  try {
    const html = renderOtpEmailHtml(record.emailCode);
    const result = await sendEmail({
      from: "no-reply",
      to: record.email,
      subject: `Your OduDoc verification code: ${record.emailCode}`,
      html,
    });
    if (result.ok && !result.skipped) {
      console.log(`[Email] OTP sent to ${record.email}`);
    } else if (result.skipped) {
      console.warn("[Email] Skipped OTP send — RESEND_API_KEY not configured.");
    } else {
      console.error("[Email] OTP send failed:", result.error);
    }
  } catch (err: any) {
    console.error("[Email] OTP send threw:", err?.message || err);
  }
}

function renderOtpEmailHtml(code: string): string {
  // Keep the styling inline + minimal — email clients strip <style> blocks.
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f6f7fb;padding:32px 16px;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Your OduDoc verification code</h1>
      <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.5;">
        Use the code below to finish signing in. It expires in 10 minutes.
      </p>
      <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:6px;background:#f1f5f9;color:#0f172a;text-align:center;padding:16px;border-radius:8px;">
        ${code}
      </div>
      <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">
        If you didn't try to sign in, you can safely ignore this email — no one
        can access your account without this code.
      </p>
    </div>
    <p style="text-align:center;color:#cbd5e1;font-size:11px;margin-top:16px;">
      OduDoc · do not reply to this email
    </p>
  </div>`;
}
