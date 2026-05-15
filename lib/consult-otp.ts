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
import { bindPersistentArray } from "./persistent-array";

const SID = process.env.TWILIO_ACCOUNT_SID?.trim();
const TOKEN = process.env.TWILIO_AUTH_TOKEN?.trim();
const VERIFY_SID = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();

export function isVerifyConfigured(): boolean {
  return Boolean(SID && TOKEN && VERIFY_SID);
}

// -- Name cache ------------------------------------------------------------
// Verify doesn't let us attach arbitrary metadata to a verification, so we
// keep a small persistent list of phone → {firstName, lastName} between
// the send and verify calls. Backed by Postgres so the verify hop sees
// the identity even when it lands on a different Lambda than the send.
interface PendingIdentity {
  // bindPersistentArray dedupes by `id`; we set id=phone so a second
  // start-verification for the same phone overwrites the prior row.
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  expiresAt: number;
}
const pending: PendingIdentity[] = [];
const pendingPa = bindPersistentArray<PendingIdentity>(
  "consult_otp_pending",
  pending,
  () => [],
);
await pendingPa.hydrate();
const PENDING_TTL_MS = 15 * 60 * 1000; // matches Verify's default code TTL

// -- Post-verify token -----------------------------------------------------
interface ConsultVerifiedToken {
  id: string; // = token; lets persistent-array key on it
  token: string;
  phone: string;
  firstName: string;
  lastName: string;
  expiresAt: number;
}
const verified: ConsultVerifiedToken[] = [];
const verifiedPa = bindPersistentArray<ConsultVerifiedToken>(
  "consult_otp_verified",
  verified,
  () => [],
);
await verifiedPa.hydrate();
const VERIFIED_TTL_MS = 15 * 60 * 1000;

function cleanup(): void {
  const now = Date.now();
  for (let i = pending.length - 1; i >= 0; i--) {
    if (pending[i].expiresAt < now) pending.splice(i, 1);
  }
  for (let i = verified.length - 1; i >= 0; i--) {
    if (verified[i].expiresAt < now) verified.splice(i, 1);
  }
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
  // Stash the identity keyed on the E.164 phone so /verify can retrieve
  // it — even when the verify hop lands on a different Lambda than this
  // send. We reload first so a re-send for the same phone overwrites
  // the prior row.
  await pendingPa.reload();
  const idx = pending.findIndex((p) => p.id === phone);
  const row: PendingIdentity = {
    id: phone,
    phone,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    expiresAt: Date.now() + PENDING_TTL_MS,
  };
  if (idx >= 0) pending.splice(idx, 1, row);
  else pending.push(row);
  pendingPa.flush();

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
  // Reload so a pending row written by a sibling Lambda's startVerification
  // is visible to this Lambda's verify hop.
  await pendingPa.reload();
  const identity = pending.find((p) => p.id === phone);
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

  const pIdx = pending.findIndex((p) => p.id === phone);
  if (pIdx >= 0) pending.splice(pIdx, 1);
  pendingPa.flush();
  const token = crypto.randomBytes(24).toString("hex");
  verified.push({
    id: token,
    token,
    phone: identity.phone,
    firstName: identity.firstName,
    lastName: identity.lastName,
    expiresAt: Date.now() + VERIFIED_TTL_MS,
  });
  verifiedPa.flush();
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
  verified.push({
    id: token,
    token,
    phone: identity.phone,
    firstName: identity.firstName.trim(),
    lastName: identity.lastName.trim(),
    expiresAt,
  });
  verifiedPa.flush();
  return { token, expiresAt };
}

// Consume a verified token on the room-creation side. Single-use.
// Async so we can reload from Postgres — the token may have been
// minted by checkVerification / mintConsultToken running on a
// different Lambda than this consumer.
export async function consumeConsultToken(token: string): Promise<
  | { phone: string; firstName: string; lastName: string }
  | null
> {
  cleanup();
  await verifiedPa.reload();
  const idx = verified.findIndex((v) => v.id === token);
  if (idx < 0) return null;
  const rec = verified[idx];
  verified.splice(idx, 1);
  verifiedPa.flush();
  if (rec.expiresAt < Date.now()) return null;
  return { phone: rec.phone, firstName: rec.firstName, lastName: rec.lastName };
}
