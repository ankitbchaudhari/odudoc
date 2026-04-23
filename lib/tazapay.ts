/**
 * Tazapay payment gateway helper.
 * https://tazapay.com/payment-gateway
 *
 * Credentials are pulled from the admin settings store — super admins
 * enter them on /admin/settings under "Payment Gateways → Tazapay".
 *   publicKey  → API Key
 *   secretKey  → API Secret
 *   mode       → "test" | "live"   (sandbox or production base URL)
 *
 * Tazapay uses REST + HTTP Basic auth (apiKey:apiSecret). We create a
 * Checkout session with POST /v3/checkout, receive a `redirect_url`,
 * and bounce the customer there. Webhooks come back as JSON with an
 * `X-Tazapay-Signature` HMAC-SHA256 over the raw body.
 */

import crypto from "crypto";
import { getSettings } from "./settings-store";

export interface TazapayConfig {
  apiKey: string;
  apiSecret: string;
  mode: "test" | "live";
  baseUrl: string;
}

export interface TazapayCheckoutRequest {
  referenceId: string;
  amount: number;               // major currency unit
  currency: string;              // "USD", "INR", "SGD", ...
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  webhookUrl?: string;
  metadata?: Record<string, string>;
}

export interface TazapayCheckoutResponse {
  success: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  error?: string;
}

export function getTazapayConfig(): TazapayConfig {
  const gw = getSettings().paymentGateways.find((g) => g.id === "tazapay");
  if (!gw || !gw.enabled) {
    throw new Error("Tazapay is not enabled in admin settings.");
  }
  const apiKey = (gw.publicKey || "").trim();
  const apiSecret = (gw.secretKey || "").trim();
  if (!apiKey || !apiSecret) {
    throw new Error("Tazapay API Key and API Secret must be configured in admin settings.");
  }
  const mode: "test" | "live" = gw.mode === "live" ? "live" : "test";
  const baseUrl =
    mode === "live"
      ? "https://api.tazapay.com"
      : "https://api-sandbox.tazapay.com";
  return { apiKey, apiSecret, mode, baseUrl };
}

function authHeader(apiKey: string, apiSecret: string): string {
  return "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
}

/**
 * Create a hosted Checkout session. Returns the URL the customer must
 * be redirected to, plus the Tazapay session id (stored on our order so
 * the webhook can match back).
 */
export async function createCheckoutSession(
  req: TazapayCheckoutRequest
): Promise<TazapayCheckoutResponse> {
  try {
    const { apiKey, apiSecret, baseUrl } = getTazapayConfig();
    // amount_in_cents — Tazapay expects minor units (cents, paise).
    const minorAmount = Math.round(req.amount * 100);
    const payload = {
      invoice_currency: req.currency,
      amount: minorAmount,
      reference_id: req.referenceId,
      customer_details: {
        name: req.customerName,
        email: req.customerEmail,
        phone: req.customerPhone || undefined,
        country: "IN",
      },
      transaction_description: req.description,
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
      webhook_url: req.webhookUrl,
      metadata: req.metadata || {},
    };
    const res = await fetch(`${baseUrl}/v3/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(apiKey, apiSecret),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { success: false, error: `Tazapay API error: ${res.status} ${text.slice(0, 300)}` };
    }
    const data = (await res.json()) as {
      data?: { redirect_url?: string; id?: string };
      redirect_url?: string;
      id?: string;
    };
    const checkoutUrl = data.data?.redirect_url || data.redirect_url;
    const sessionId = data.data?.id || data.id;
    if (!checkoutUrl) {
      return { success: false, error: "Tazapay did not return a redirect_url." };
    }
    return { success: true, checkoutUrl, sessionId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Tazapay error";
    return { success: false, error: message };
  }
}

/**
 * Verify an incoming webhook signature. Tazapay signs the raw request
 * body with HMAC-SHA256 using the API Secret; the hex digest is sent
 * in the `X-Tazapay-Signature` header.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  try {
    const { apiSecret } = getTazapayConfig();
    const expected = crypto.createHmac("sha256", apiSecret).update(rawBody).digest("hex");
    const given = (signature || "").toLowerCase().replace(/^sha256=/, "");
    if (expected.length !== given.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given));
  } catch {
    return false;
  }
}
