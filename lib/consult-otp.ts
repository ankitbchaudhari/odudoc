// Guest video-consult OTP — thin wrapper around Twilio Verify.
//
// Verify generates, delivers, and validates the one-time code for us, so
// this module only holds the name + phone alongside a post-verification
// token the room-creation endpoint consumes to prove the phone was
// confirmed. A local cache of the in-flight name/phone lets the verify
// step return the trusted identity without the client having to resend it.
//
// Env:
//   TWILIO_ACCOUNT_SID         — required
//   TWILIO_AUTH_TOKEN          — required
//   TWILIO_VERIFY_SERVICE_SID  — required; VAxxxx… from the Verify service
//   TWILIO_VERIFY_CHANNEL      — optional; "sms" (default) | "whatsapp" | "call"

import crypto from "crypto";

const SID = process.env.TWILIO_ACCOUNT_SID?.trim();
const TOKEN = process.env.TWILIO_AUTH_TOKEN?.trim();
const VERIFY_SID = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();

export function isVerifyConfigured(): boolean {
  return Boolean(SID && TOKEN && VERIFY_SID);
}

// -- Name cache ------------------------------------------------------------
// Verify doesn't let us attach arbitrary metadata to a verification, so we
// keep a tiny in-memory map of phone → {firstName, lastName} between the
// send and verify calls.
interface PendingIdentity {
  phone: string;
  firstName: string;
  lastName: string;
  expiresAt: number;
}
const pending = new Map<string, PendingIdentity>();
const PENDING_TTL_MS = 15 * 60 * 1000; // matches Verify's default code TTL

// -- Post-verify token -----------------------------------------------------
interface ConsultVerifiedToken {
  token: string;
  phone: string;
  firstName: string;
  lastName: string;
  expiresAt: number;
}
const verified = new Map<string, ConsultVerifiedToken>();
const VERIFIED_TTL_MS = 15 * 60 * 1000;

function cleanup(): void {
  const now = Date.now();
  pending.forEach((v, k) => { if (v.expiresAt < now) pending.delete(k); });
  verified.forEach((v, k) => { if (v.expiresAt < now) verified.delete(k); });
}

// OduDoc is worldwide — never silently assume a country code. If the user
// omits the "+", we add one and let Twilio decide if the number is valid.
// Previously a 10-digit input became +91<n>, quietly routing US / UK / EU
// numbers to the wrong country. The client UI requires a country code,
// this is a last-resort normaliser.
export function toE164(raw: string): string {
  const digits = (raw || "").replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) return digits;
  return `+${digits}`;
}

function basicAuth(): string {
  return "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64");
}

// Kick off Twilio Verify. Returns { ok: true, channel } on success, or
// { ok: false, error } on failure.
export async function startVerification(
  phone: string,
  firstName: string,
  lastName: string,
  channel: "sms" | "whatsapp" | "call" = "sms",
): Promise<{ ok: true; channel: string } | { ok: false; error: string }> {
  cleanup();
  if (!isVerifyConfigured()) {
    return { ok: false, error: "Verify is not configured on the server." };
  }
  // Stash the identity keyed on the E.164 phone so /verify can retrieve it.
  pending.set(phone, {
    phone,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    expiresAt: Date.now() + PENDING_TTL_MS,
  });

  try {
    const form = new URLSearchParams({ To: phone, Channel: channel });
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${VERIFY_SID}/Verifications`,
      {
        method: "POST",
        headers: {
          Authorization: basicAuth(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );
    const data = (await res.json()) as {
      status?: string;
      channel?: string;
      message?: string;
      code?: number;
    };
    if (!res.ok) {
      return { ok: false, error: data.message || `twilio_verify_${res.status}` };
    }
    return { ok: true, channel: data.channel || channel };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Confirm the code via Verify. On success we mint our own short-lived
// consult-token carrying the trusted name + phone.
export async function checkVerification(
  phone: string,
  code: string,
): Promise<
  | { success: true; token: string; firstName: string; lastName: string; phone: string }
  | { success: false; error: string }
> {
  cleanup();
  if (!isVerifyConfigured()) {
    return { success: false, error: "Verify is not configured on the server." };
  }
  const identity = pending.get(phone);
  if (!identity) {
    return { success: false, error: "No pending verification for that number. Please request a new code." };
  }

  try {
    const form = new URLSearchParams({ To: phone, Code: code.trim() });
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${VERIFY_SID}/VerificationCheck`,
      {
        method: "POST",
        headers: {
          Authorization: basicAuth(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );
    const data = (await res.json()) as {
      status?: string;
      valid?: boolean;
      message?: string;
      code?: number;
    };
    if (!res.ok) {
      return { success: false, error: data.message || `twilio_verify_${res.status}` };
    }
    if (data.status !== "approved" || !data.valid) {
      return { success: false, error: "Invalid or expired code." };
    }
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  pending.delete(phone);
  const token = crypto.randomBytes(24).toString("hex");
  verified.set(token, {
    token,
    phone: identity.phone,
    firstName: identity.firstName,
    lastName: identity.lastName,
    expiresAt: Date.now() + VERIFIED_TTL_MS,
  });
  return {
    success: true,
    token,
    firstName: identity.firstName,
    lastName: identity.lastName,
    phone: identity.phone,
  };
}

// Mint a consult token from an already-verified identity. Used by the
// Firebase Phone Auth path, where verification happens via a Firebase
// ID token rather than Twilio Verify.
export function mintConsultToken(identity: {
  firstName: string;
  lastName: string;
  phone: string;
}): { token: string; expiresAt: number } {
  cleanup();
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = Date.now() + VERIFIED_TTL_MS;
  verified.set(token, {
    token,
    phone: identity.phone,
    firstName: identity.firstName.trim(),
    lastName: identity.lastName.trim(),
    expiresAt,
  });
  return { token, expiresAt };
}

// Consume a verified token on the room-creation side. Single-use.
export function consumeConsultToken(token: string):
  | { phone: string; firstName: string; lastName: string }
  | null {
  cleanup();
  const rec = verified.get(token);
  if (!rec) return null;
  if (rec.expiresAt < Date.now()) {
    verified.delete(token);
    return null;
  }
  verified.delete(token);
  return { phone: rec.phone, firstName: rec.firstName, lastName: rec.lastName };
}
