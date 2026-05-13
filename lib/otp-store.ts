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
import { log } from "./log";

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
  // Dev-only fallback: print codes to the console so local flows still work
  // when neither provider is configured. Never log codes in production —
  // Vercel log readers shouldn't see verification codes.
  if (process.env.VERCEL_ENV !== "production") {
    console.log("\n================ OduDoc OTP ================");
    console.log(`Email:       ${record.email}`);
    console.log(`Email code:  ${record.emailCode}`);
    console.log(`Phone:       ${record.phone}`);
    console.log(`Phone code:  ${record.phoneCode}`);
    console.log(`Expires in:  10 minutes`);
    console.log("============================================\n");
  }

  // --- SMS via sent.dm (primary) → Twilio (fallback) -------------------
  if (record.phone) {
    const to = toE164(record.phone);
    let sent = false;
    // Try sent.dm first — cheaper, supports templates, no Twilio
    // trial-account "verified-numbers-only" restriction.
    const sentDmTemplate = process.env.SENTDM_TEMPLATE_OTP;
    if (process.env.SENTDM_API_KEY && sentDmTemplate) {
      try {
        const { sentDmSend } = await import("./sent-dm");
        const r = await sentDmSend({
          to,
          channel: "sms",
          template: sentDmTemplate,
          variables: { code: record.phoneCode, otp: record.phoneCode },
        });
        if (r.ok) {
          sent = true;
          log.info("otp.sms.sent_via_sent_dm", { to, messageId: r.messageId });
        } else {
          log.warn("otp.sent_dm_failed_falling_back", { error: r.error });
        }
      } catch (err) {
        log.error("otp.sent_dm.threw", err);
      }
    }
    // Twilio fallback (or primary if sent.dm isn't configured).
    if (!sent && twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        await twilioClient.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER,
          to,
          body: `Your OduDoc verification code is ${record.phoneCode}. Valid for 10 minutes. Do not share this code with anyone.`,
        });
        log.info("otp.sms.sent_via_twilio", { to });
        sent = true;
      } catch (err: unknown) {
        // Don't throw — user can still use the email code.
        log.error("otp.sms.send_failed", err);
      }
    }
    if (!sent) log.warn("otp.sms.skipped_no_provider", { to });
  } else {
    log.warn("otp.sms.skipped_no_phone");
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
      log.info("otp.email.sent", { to: record.email });
    } else if (result.skipped) {
      log.warn("otp.email.skipped_unconfigured");
    } else {
      log.error("otp.email.send_failed", result.error);
    }
  } catch (err: unknown) {
    log.error("otp.email.send_threw", err);
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
