// Razorpay — server-side wrapper.
//
// API: v1 (https://razorpay.com/docs/api/)
// Endpoint base: https://api.razorpay.com/v1
//
// Auth: HTTP Basic with `<RAZORPAY_KEY_ID>:<RAZORPAY_KEY_SECRET>`.
//
// Flow we use (Standard Web Checkout):
//   1. Server: POST /orders → response carries `id` (order_id) + `amount`
//   2. Client: load https://checkout.razorpay.com/v1/checkout.js,
//      instantiate `new window.Razorpay({ order_id, key, ... })` and
//      call `.open()` — Razorpay renders the payment modal
//   3. On success the handler receives:
//        razorpay_order_id, razorpay_payment_id, razorpay_signature
//   4. Server: verify the signature with HMAC-SHA256 over
//      `${order_id}|${payment_id}` using KEY_SECRET. ONLY mark paid
//      when the signatures match — the client cannot forge this.
//
// Why no `razorpay` npm SDK:
//   - The HTTP surface is tiny (two endpoints) so the SDK adds ~200 kB
//     of cold-start weight for no real benefit.
//   - Matches the existing Cashfree wrapper which also uses raw fetch.

import crypto from "node:crypto";
import { log } from "./log";

const ENDPOINT = "https://api.razorpay.com/v1";

export interface RazorpayOrder {
  id: string;        // order_<...>
  amount: number;    // in paise
  currency: string;
  receipt?: string;
  status: string;
  created_at: number;
}

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** Public key for the browser — Razorpay's checkout.js needs it to
 *  instantiate the modal. It's safe to ship to the client; the SECRET
 *  must never leave the server. */
export function razorpayPublicKey(): string {
  return process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
}

function authHeader(): string {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Razorpay credentials not configured");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

/** Create a Razorpay order. `amountPaise` is in the smallest currency
 *  unit (paise for INR, cents for USD). Minimum 100. `receipt` is an
 *  arbitrary short string we set to the booking id so it shows up in
 *  the Razorpay dashboard for support lookups. */
export async function createRazorpayOrder(input: {
  amountPaise: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  if (!Number.isFinite(input.amountPaise) || input.amountPaise < 100) {
    throw new Error("amountPaise must be >= 100");
  }
  const body = {
    amount: Math.floor(input.amountPaise),
    currency: (input.currency || "INR").toUpperCase(),
    receipt: input.receipt?.slice(0, 40),
    notes: input.notes,
  };

  const res = await fetch(`${ENDPOINT}/orders`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let payload: Record<string, unknown> = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { /* keep empty */ }

  if (!res.ok) {
    const errObj = payload.error as { description?: string } | undefined;
    const msg = errObj?.description || `razorpay_${res.status}`;
    log.warn("razorpay.create_order_failed", { status: res.status, error: msg });
    throw new Error(msg);
  }
  return payload as unknown as RazorpayOrder;
}

/** Verify a payment-success callback. Razorpay returns three fields to
 *  the success handler — `razorpay_order_id`, `razorpay_payment_id`,
 *  `razorpay_signature`. The signature is HMAC-SHA256 of
 *  `${order_id}|${payment_id}` keyed with KEY_SECRET.
 *
 *  Returns `true` only when the computed signature exactly equals the
 *  one Razorpay sent. Anything else → return false and DO NOT mark the
 *  booking as paid. */
export function verifyRazorpaySignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  if (!input.orderId || !input.paymentId || !input.signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");

  // Constant-time compare to avoid timing side channels — same hygiene
  // we apply to the clinic-session cookie verify.
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(input.signature, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Fetch a payment record from Razorpay — used by the verify endpoint
 *  as defence in depth so we don't trust the client-supplied amount /
 *  status. Returns the raw payload (status, amount, captured, etc.). */
export async function getRazorpayPayment(paymentId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${ENDPOINT}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: authHeader() },
  });
  if (!res.ok) throw new Error(`razorpay_payment_fetch_${res.status}`);
  return res.json();
}

/** Fetch an order record from Razorpay — used by webhook + verify
 *  paths so we can read `notes` (which carry our typing + userId
 *  fields the client cannot forge) directly from the authoritative
 *  source instead of trusting what the webhook payload claims. */
export async function getRazorpayOrder(orderId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${ENDPOINT}/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: authHeader() },
  });
  if (!res.ok) throw new Error(`razorpay_order_fetch_${res.status}`);
  return res.json();
}

/** Verify a Razorpay webhook signature. Razorpay sends the signature
 *  in the `x-razorpay-signature` header, computed as HMAC-SHA256 of
 *  the raw request body keyed with the WEBHOOK SECRET (configured in
 *  the Razorpay dashboard, distinct from the API key secret).
 *
 *  IMPORTANT: pass the raw request body string — do NOT JSON.parse +
 *  re-stringify first. Razorpay computes the HMAC over the exact
 *  bytes they sent, and Node's stringify is not byte-identical.
 *
 *  Returns `true` only when the computed hex digest exactly matches.
 *  Anything else → false; the webhook handler MUST 401 in that case
 *  (otherwise an attacker can mark any order paid). */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
