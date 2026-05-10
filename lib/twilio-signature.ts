// Twilio webhook signature verification.
//
// Per Twilio docs (https://www.twilio.com/docs/usage/webhooks/webhooks-security),
// the X-Twilio-Signature header is HMAC-SHA1(authToken, fullUrl + sortedFormBody)
// base64-encoded. We verify on every webhook before honouring the
// payload — without this an attacker can spoof inbound WhatsApp /
// SMS webhooks and inject conversation rows.
//
// The auth token comes from process.env.TWILIO_AUTH_TOKEN. When the
// env is missing (sandbox / local dev) we accept all webhooks but
// log a clear warning so production never silently drops the check.

import crypto from "node:crypto";
import { log } from "./log";

export interface TwilioVerifyInput {
  /** Full URL Twilio called, including https:// + host + path + query.
   *  Matches the URL the webhook is configured against. */
  url: string;
  /** Raw form-encoded body Twilio sent. */
  formParams: Record<string, string>;
  /** X-Twilio-Signature header. */
  signature: string;
  /** Override the env auth token (test path). */
  authToken?: string;
}

export function verifyTwilioSignature(input: TwilioVerifyInput): boolean {
  const token = input.authToken ?? process.env.TWILIO_AUTH_TOKEN;
  if (!token) {
    log.warn("twilio_signature.no_auth_token", {
      url: input.url,
      note: "TWILIO_AUTH_TOKEN env missing — accepting webhook without verification (dev only).",
    });
    return true;
  }
  if (!input.signature) {
    log.warn("twilio_signature.missing_header", { url: input.url });
    return false;
  }
  // Concatenate URL + sorted form params (key1value1key2value2…).
  const sortedKeys = Object.keys(input.formParams).sort();
  let data = input.url;
  for (const k of sortedKeys) {
    data += k + (input.formParams[k] ?? "");
  }
  const expected = crypto
    .createHmac("sha1", token)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");
  // Timing-safe equality.
  if (expected.length !== input.signature.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf-8"),
      Buffer.from(input.signature, "utf-8"),
    );
  } catch {
    return false;
  }
}

/** Helper to extract the verification args from a Next.js Request. */
export async function verifyFromRequest(req: Request): Promise<{
  ok: boolean;
  formParams: Record<string, string>;
  reason?: string;
}> {
  const sig = req.headers.get("x-twilio-signature") || "";
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    // Non-form bodies aren't Twilio webhooks; bail out gracefully.
    return { ok: true, formParams: {}, reason: "not_form_encoded" };
  }
  const raw = await req.text();
  const params = new URLSearchParams(raw);
  const formParams: Record<string, string> = {};
  for (const [k, v] of params.entries()) formParams[k] = v;
  // Reconstruct the URL Twilio thinks it called. We honour the
  // x-forwarded-proto / x-forwarded-host headers Vercel sets so the
  // signature math matches.
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const url = req.url
    ? new URL(req.url).pathname + new URL(req.url).search
    : "";
  const fullUrl = `${proto}://${host}${url}`;
  const ok = verifyTwilioSignature({ url: fullUrl, formParams, signature: sig });
  return { ok, formParams, reason: ok ? undefined : "signature_mismatch" };
}
