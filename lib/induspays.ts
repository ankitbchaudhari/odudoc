/**
 * IndusPays Payment Gateway Helper
 * https://induspays.com
 *
 * SETUP:
 *   1. Sign up at https://induspays.com
 *   2. Get your Merchant ID, API Key, and API Secret from the IndusPays dashboard
 *   3. Add these to your .env.local (and Vercel Environment Variables):
 *        INDUSPAYS_MERCHANT_ID=your_merchant_id
 *        INDUSPAYS_API_KEY=your_api_key
 *        INDUSPAYS_API_SECRET=your_api_secret
 *        INDUSPAYS_BASE_URL=https://api.induspays.com   (confirm from docs)
 *        INDUSPAYS_WEBHOOK_SECRET=your_webhook_secret
 *        NEXT_PUBLIC_APP_URL=https://www.odudoc.com
 *   4. Configure the webhook URL in IndusPays dashboard:
 *        https://www.odudoc.com/api/payments/induspays/webhook
 *
 * NOTE: The exact endpoints and payload shape must be confirmed from the
 *       IndusPays integration PDF / API reference you receive after signing up.
 *       Placeholders below follow a standard hosted-checkout pattern.
 */

import crypto from "crypto";

export interface IndusPaysCheckoutRequest {
  orderId: string;
  amount: number;          // in major currency unit, e.g. 100.00 = $100.00
  currency: string;        // "USD" | "INR" | ...
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  description: string;
  returnUrl: string;       // redirect after success
  cancelUrl: string;       // redirect after cancel
  webhookUrl?: string;
  metadata?: Record<string, string>;
}

export interface IndusPaysCheckoutResponse {
  success: boolean;
  checkoutUrl?: string;    // hosted payment page URL to redirect user to
  sessionId?: string;
  error?: string;
}

function getConfig() {
  const merchantId = process.env.INDUSPAYS_MERCHANT_ID;
  const apiKey = process.env.INDUSPAYS_API_KEY;
  const apiSecret = process.env.INDUSPAYS_API_SECRET;
  const baseUrl = process.env.INDUSPAYS_BASE_URL || "https://api.induspays.com";

  if (!merchantId || !apiKey || !apiSecret) {
    throw new Error(
      "IndusPays is not configured. Set INDUSPAYS_MERCHANT_ID, INDUSPAYS_API_KEY, and INDUSPAYS_API_SECRET environment variables."
    );
  }

  return { merchantId, apiKey, apiSecret, baseUrl };
}

/**
 * Sign a request payload with HMAC-SHA256 using the API secret.
 * IndusPays (like most gateways) requires a signature header for auth.
 */
export function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Create a hosted checkout session.
 * Returns a URL to redirect the customer to.
 */
export async function createCheckoutSession(
  req: IndusPaysCheckoutRequest
): Promise<IndusPaysCheckoutResponse> {
  try {
    const { merchantId, apiKey, apiSecret, baseUrl } = getConfig();

    const payload = {
      merchant_id: merchantId,
      order_id: req.orderId,
      amount: req.amount.toFixed(2),
      currency: req.currency,
      customer: {
        name: req.customerName,
        email: req.customerEmail,
        phone: req.customerPhone || "",
      },
      description: req.description,
      return_url: req.returnUrl,
      cancel_url: req.cancelUrl,
      webhook_url: req.webhookUrl,
      metadata: req.metadata || {},
      timestamp: Date.now(),
    };

    const body = JSON.stringify(payload);
    const signature = signPayload(body, apiSecret);

    const res = await fetch(`${baseUrl}/v1/checkout/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-Signature": signature,
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `IndusPays API error: ${res.status} ${text}` };
    }

    const data = await res.json();
    return {
      success: true,
      checkoutUrl: data.checkout_url || data.payment_url,
      sessionId: data.session_id || data.id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown IndusPays error";
    return { success: false, error: message };
  }
}

/**
 * Verify a webhook signature sent by IndusPays.
 * Typically in the "X-IndusPays-Signature" header.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.INDUSPAYS_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Calculate the 30% OduDoc commission on a doctor's consultation fee.
 */
export function calculateCommission(consultationFee: number) {
  const commissionRate = 0.3;
  const commission = Math.round(consultationFee * commissionRate * 100) / 100;
  const doctorPayout = Math.round((consultationFee - commission) * 100) / 100;
  return { commission, doctorPayout, commissionRate };
}
