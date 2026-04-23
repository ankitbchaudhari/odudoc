/**
 * ConnectPay payment gateway helper.
 * https://connectpay.com/
 *
 * Credentials are pulled from the admin settings store — super admins
 * enter them on /admin/settings under "Payment Gateways → ConnectPay".
 *   publicKey  → Merchant ID / API Key
 *   secretKey  → API Secret (HMAC-SHA256 signing key)
 *   mode       → "test" | "live"   (sandbox or production base URL)
 *
 * Integration shape (hosted checkout):
 *   POST {baseUrl}/v1/checkout/sessions
 *     Headers:
 *       Content-Type: application/json
 *       X-Api-Key: <publicKey>
 *       X-Signature: hex(HMAC-SHA256(secretKey, rawBody))
 *     Body: { reference_id, amount (minor units), currency, customer, ... }
 *   Response: { id, checkout_url, ... }
 *
 * Webhook: JSON body + `X-Connectpay-Signature` header = hex HMAC-SHA256
 * of the raw body using secretKey. Our `reference_id` == consultation id
 * so we look the consultation up directly from the webhook payload.
 *
 * NOTE: ConnectPay's public API docs require an authenticated merchant
 * account. The exact endpoint paths / field names below follow their
 * published hosted-checkout pattern; if the live integration differs,
 * only the small section in `createCheckoutSession` needs tweaking.
 */

import crypto from "crypto";
import { getSettings } from "./settings-store";

export interface ConnectPayConfig {
  apiKey: string;
  apiSecret: string;
  mode: "test" | "live";
  baseUrl: string;
}

export interface ConnectPayCheckoutRequest {
  referenceId: string;
  amount: number;               // major currency unit
  currency: string;              // "USD", "INR", "EUR", ...
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  webhookUrl?: string;
  metadata?: Record<string, string>;
}

export interface ConnectPayCheckoutResponse {
  success: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  error?: string;
}

export function getConnectPayConfig(): ConnectPayConfig {
  const gw = getSettings().paymentGateways.find((g) => g.id === "connectpay");
  if (!gw || !gw.enabled) {
    throw new Error("ConnectPay is not enabled in admin settings.");
  }
  const apiKey = (gw.publicKey || "").trim();
  const apiSecret = (gw.secretKey || "").trim();
  if (!apiKey || !apiSecret) {
    throw new Error("ConnectPay API Key and API Secret must be configured in admin settings.");
  }
  const mode: "test" | "live" = gw.mode === "live" ? "live" : "test";
  const baseUrl =
    mode === "live"
      ? "https://api.connectpay.com"
      : "https://api-sandbox.connectpay.com";
  return { apiKey, apiSecret, mode, baseUrl };
}

function signBody(secret: string, rawBody: string): string {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

/**
 * Create a hosted Checkout session. Returns the URL the customer must
 * be redirected to, plus the ConnectPay session id (stored on our order
 * so the webhook can match back).
 */
export async function createCheckoutSession(
  req: ConnectPayCheckoutRequest
): Promise<ConnectPayCheckoutResponse> {
  try {
    const { apiKey, apiSecret, baseUrl } = getConnectPayConfig();
    // ConnectPay expects minor currency units (cents, paise).
    const minorAmount = Math.round(req.amount * 100);
    const payload = {
      reference_id: req.referenceId,
      amount: minorAmount,
      currency: req.currency,
      description: req.description,
      customer: {
        name: req.customerName,
        email: req.customerEmail,
        phone: req.customerPhone || undefined,
      },
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
      webhook_url: req.webhookUrl,
      metadata: req.metadata || {},
    };
    const rawBody = JSON.stringify(payload);
    const res = await fetch(`${baseUrl}/v1/checkout/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "X-Signature": signBody(apiSecret, rawBody),
      },
      body: rawBody,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { success: false, error: `ConnectPay API error: ${res.status} ${text.slice(0, 300)}` };
    }
    const data = (await res.json()) as {
      data?: { checkout_url?: string; redirect_url?: string; id?: string };
      checkout_url?: string;
      redirect_url?: string;
      id?: string;
    };
    const checkoutUrl =
      data.data?.checkout_url ||
      data.data?.redirect_url ||
      data.checkout_url ||
      data.redirect_url;
    const sessionId = data.data?.id || data.id;
    if (!checkoutUrl) {
      return { success: false, error: "ConnectPay did not return a checkout_url." };
    }
    return { success: true, checkoutUrl, sessionId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown ConnectPay error";
    return { success: false, error: message };
  }
}

/**
 * Verify an incoming webhook signature. ConnectPay signs the raw
 * request body with HMAC-SHA256 using the API Secret; the hex digest
 * arrives in the `X-Connectpay-Signature` header.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  try {
    const { apiSecret } = getConnectPayConfig();
    const expected = crypto.createHmac("sha256", apiSecret).update(rawBody).digest("hex");
    const given = (signature || "").toLowerCase().replace(/^sha256=/, "");
    if (expected.length !== given.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given));
  } catch {
    return false;
  }
}
