// Cashfree Payments — server-side SDK wrapper.
//
// API: 2023-08-01 (https://docs.cashfree.com/reference)
// Endpoint base:
//   Production: https://api.cashfree.com/pg
//   Sandbox:    https://sandbox.cashfree.com/pg
//
// Auth headers required on every request:
//   x-api-version: 2023-08-01
//   x-client-id:   <CASHFREE_APP_ID>
//   x-client-secret: <CASHFREE_SECRET_KEY>
//
// Flow we use (Hosted Checkout):
//   1. Server: POST /orders → response carries `payment_session_id`
//   2. Client: load Cashfree's checkout JS, instantiate with the
//      `payment_session_id`, redirect the patient to pay
//   3. Cashfree: hits our notify_url webhook with payment events
//   4. Client: returns to our return_url after payment
//   5. Server: verifies via GET /orders/{order_id} (defence in depth)
//
// Webhook signature verification:
//   x-webhook-signature   = base64( HMAC-SHA256(secret, timestamp + body) )
//   x-webhook-timestamp   = epoch seconds the webhook was generated
//   We MUST compare the recomputed signature to the header to prevent
//   spoofed payment notifications.

import crypto from "node:crypto";
import { log } from "./log";

const API_VERSION = "2023-08-01";

function endpointBase(): string {
  // CASHFREE_ENV defaults to PROD so a misconfigured deploy fails
  // closed (real money, real failures) rather than silently going
  // to the sandbox.
  return (process.env.CASHFREE_ENV || "PROD").toUpperCase() === "SANDBOX"
    ? "https://sandbox.cashfree.com/pg"
    : "https://api.cashfree.com/pg";
}

function authHeaders(): Record<string, string> {
  const appId = process.env.CASHFREE_APP_ID || "";
  const secret = process.env.CASHFREE_SECRET_KEY || "";
  if (!appId || !secret) {
    throw new Error("Cashfree credentials missing — set CASHFREE_APP_ID and CASHFREE_SECRET_KEY");
  }
  return {
    "x-api-version": API_VERSION,
    "x-client-id": appId,
    "x-client-secret": secret,
    "content-type": "application/json",
    accept: "application/json",
  };
}

export interface CashfreeCheckoutInput {
  /** Stable id we control — typically the consultation/booking id. */
  orderId: string;
  /** Amount in the order currency (e.g. 500.00 INR, not paise). */
  amount: number;
  /** ISO 4217. INR is the canonical Cashfree currency; their cards
   *  rail also supports USD/EUR/GBP/SGD when enabled on the account. */
  currency: "INR" | "USD" | "EUR" | "GBP" | "SGD";
  customerName: string;
  customerEmail: string;
  /** International format preferred ("+919876543210"). Cashfree
   *  accepts plain "9876543210" for Indian numbers but the +CC form
   *  is safer for non-IN customers. */
  customerPhone: string;
  /** Stable id for the customer side. We use the user's id where we
   *  have one, falling back to a hash of the email. */
  customerId?: string;
  description?: string;
  /** Where Cashfree returns the user after payment. We append
   *  `?order_id=<orderId>&cf_status=...` so the verify route can
   *  re-check status server-side. */
  returnUrl: string;
  /** Webhook target. Cashfree POSTs here for every status change. */
  notifyUrl: string;
  /** Free-form bag, surfaced back on order-status reads + webhooks. */
  metadata?: Record<string, string>;
}

export interface CashfreeCheckoutResult {
  /** The id Cashfree assigned (looks like "cf_..."). */
  cfOrderId: string;
  /** Echoes back the orderId we sent. */
  orderId: string;
  /** "ACTIVE" / "PAID" / "EXPIRED". A freshly created order is
   *  ACTIVE until the customer pays or it ages out (24h default). */
  orderStatus: string;
  /** The token we hand to the client SDK to launch checkout. */
  paymentSessionId: string;
  /** Direct hosted-checkout URL — useful as a fallback if the JS
   *  SDK fails to load. Cashfree includes this on the response when
   *  return_url is set. */
  paymentLink?: string;
}

/** Create a Cashfree order. The result includes a payment_session_id
 *  the client SDK uses to launch checkout. */
export async function createCheckoutSession(
  input: CashfreeCheckoutInput,
): Promise<CashfreeCheckoutResult> {
  const customerId = input.customerId
    || crypto.createHash("sha1").update(input.customerEmail.toLowerCase()).digest("hex").slice(0, 32);

  const body = {
    order_id: input.orderId,
    order_amount: Number(input.amount.toFixed(2)),
    order_currency: input.currency,
    customer_details: {
      customer_id: customerId,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
    },
    order_meta: {
      return_url: `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}order_id={order_id}`,
      notify_url: input.notifyUrl,
    },
    order_note: input.description?.slice(0, 200),
    order_tags: input.metadata,
  };

  // Bound the upstream call so a slow / unreachable Cashfree doesn't
  // push our serverless function past Vercel's edge timeout (which
  // would surface as a bare 502 with no JSON body — the client then
  // falls back to "Top-up failed (502)" and loses the diagnostic).
  // 8s leaves comfortable headroom under the 10s Hobby limit.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  let res: Response;
  try {
    res = await fetch(`${endpointBase()}/orders`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") {
      log.error("cashfree.create_order_timeout", undefined, { orderId: input.orderId });
      throw new Error("Cashfree create order timed out after 8s");
    }
    log.error("cashfree.create_order_network", err, { orderId: input.orderId });
    throw new Error(`Cashfree create order network error: ${(err as Error).message || "unknown"}`);
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  if (!res.ok) {
    log.error("cashfree.create_order_failed", undefined, {
      status: res.status,
      body: text.slice(0, 500),
      orderId: input.orderId,
    });
    throw new Error(`Cashfree create order ${res.status}: ${text.slice(0, 200)}`);
  }
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Cashfree create order returned non-JSON");
  }

  const paymentSessionId = data.payment_session_id as string | undefined;
  if (!paymentSessionId) {
    throw new Error("Cashfree create order succeeded but no payment_session_id was returned");
  }
  return {
    cfOrderId: String(data.cf_order_id ?? ""),
    orderId: String(data.order_id ?? input.orderId),
    orderStatus: String(data.order_status ?? "ACTIVE"),
    paymentSessionId,
    paymentLink: typeof data.payment_link === "string" ? data.payment_link : undefined,
  };
}

export interface CashfreeOrderStatus {
  orderId: string;
  cfOrderId: string;
  /** "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED" | "TERMINATION_REQUESTED" */
  orderStatus: string;
  amount: number;
  currency: string;
  /** Convenience boolean for the common "is this order successfully paid?" check. */
  paid: boolean;
  /** Metadata we attached at order creation — `type`, `userId`, `amount` for
   *  wallet topups. Lets the verify endpoint route the post-payment side
   *  effect to the right handler (wallet vs consultation) without
   *  fetching another store. */
  tags: Record<string, string>;
}

/** Read an order's current status. Used after the customer returns to
 *  our return_url so we can verify payment server-side rather than
 *  trusting the client redirect. */
export async function getOrderStatus(orderId: string): Promise<CashfreeOrderStatus> {
  const res = await fetch(`${endpointBase()}/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    headers: authHeaders(),
  });
  const text = await res.text();
  if (!res.ok) {
    log.error("cashfree.get_order_failed", undefined, {
      status: res.status,
      body: text.slice(0, 500),
      orderId,
    });
    throw new Error(`Cashfree get order ${res.status}: ${text.slice(0, 200)}`);
  }
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Cashfree get order returned non-JSON");
  }
  const status = String(data.order_status ?? "");
  // Cashfree returns order_tags as a flat string map when we set them
  // on create. Defensively coerce — any non-string values get
  // stringified so the consumer doesn't have to.
  const rawTags = (data.order_tags as Record<string, unknown> | undefined) || {};
  const tags: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawTags)) {
    if (v == null) continue;
    tags[k] = String(v);
  }
  return {
    orderId: String(data.order_id ?? orderId),
    cfOrderId: String(data.cf_order_id ?? ""),
    orderStatus: status,
    amount: Number(data.order_amount ?? 0),
    currency: String(data.order_currency ?? "INR"),
    paid: status === "PAID",
    tags,
  };
}

/** Replay-protection window in seconds. Cashfree clocks aren't perfect
 *  so we accept a 10-minute skew either side; anything older is a
 *  captured-and-replayed webhook and gets rejected even if its
 *  signature is valid. */
const WEBHOOK_REPLAY_WINDOW_SEC = 10 * 60;

export type VerifyReason =
  | "missing_secret" | "missing_signature" | "missing_timestamp"
  | "signature_mismatch" | "timestamp_too_old" | "timestamp_in_future"
  | "verify_threw";

export interface VerifyResult { ok: boolean; reason?: VerifyReason }

/** Verify a webhook callback. Cashfree signs `timestamp + rawBody`
 *  with the secret key (HMAC-SHA256, base64). We additionally check
 *  the timestamp is within a ±10-minute replay window so a captured
 *  webhook can't be replayed forever. */
export function verifyWebhookSignatureDetailed(
  rawBody: string,
  signatureHeader: string | null,
  timestampHeader: string | null,
): VerifyResult {
  const secret = process.env.CASHFREE_SECRET_KEY || "";
  if (!secret) return { ok: false, reason: "missing_secret" };
  if (!signatureHeader) return { ok: false, reason: "missing_signature" };
  if (!timestampHeader) return { ok: false, reason: "missing_timestamp" };
  // Reject anything outside the replay window.
  const ts = Number(timestampHeader);
  if (Number.isFinite(ts)) {
    const nowSec = Math.floor(Date.now() / 1000);
    const skew = nowSec - ts;
    if (skew > WEBHOOK_REPLAY_WINDOW_SEC) return { ok: false, reason: "timestamp_too_old" };
    if (skew < -WEBHOOK_REPLAY_WINDOW_SEC) return { ok: false, reason: "timestamp_in_future" };
  }
  try {
    const data = `${timestampHeader}${rawBody}`;
    const expected = crypto.createHmac("sha256", secret).update(data).digest("base64");
    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return { ok: false, reason: "signature_mismatch" };
    return crypto.timingSafeEqual(a, b) ? { ok: true } : { ok: false, reason: "signature_mismatch" };
  } catch (err) {
    log.error("cashfree.signature_verify_threw", err);
    return { ok: false, reason: "verify_threw" };
  }
}

/** Backwards-compat wrapper. New code should prefer the detailed
 *  variant for the reason-code in ops logs. */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  timestampHeader: string | null,
): boolean {
  return verifyWebhookSignatureDetailed(rawBody, signatureHeader, timestampHeader).ok;
}

// ── Webhook event idempotency ─────────────────────────────────────
// In-memory ring of processed webhook event ids. Cashfree retries
// failed webhooks; remembering the last N event ids stops a retry
// from double-marking the same order paid if our 5xx came after we
// successfully wrote state.
const processedEvents = new Map<string, number>();
const MAX_PROCESSED_EVENTS = 1000;

export function isWebhookReplay(eventId: string | undefined | null): boolean {
  if (!eventId) return false;
  return processedEvents.has(eventId);
}
export function markWebhookProcessed(eventId: string | undefined | null): void {
  if (!eventId) return;
  processedEvents.set(eventId, Date.now());
  if (processedEvents.size > MAX_PROCESSED_EVENTS) {
    const first = processedEvents.keys().next().value;
    if (first !== undefined) processedEvents.delete(first);
  }
}

/** OduDoc takes a 30 % platform commission off every paid consult.
 *  Mirrors lib/induspays.ts:calculateCommission so caller code can
 *  swap providers without re-doing math. */
export function calculateCommission(consultationFee: number): {
  commission: number;
  doctorPayout: number;
} {
  const commission = Math.round(consultationFee * 0.30 * 100) / 100;
  const doctorPayout = Math.round((consultationFee - commission) * 100) / 100;
  return { commission, doctorPayout };
}

/** True when env config is present and minimally valid. Used by the
 *  payment-routing module to skip Cashfree if the deploy hasn't been
 *  set up yet. */
export function isCashfreeConfigured(): boolean {
  return Boolean(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);
}
