/**
 * PayU Biz payment gateway helper.
 * https://corporate.payu.com/
 *
 * Credentials are pulled from the admin settings store — super admins
 * enter them on /admin/settings under "Payment Gateways → PayU".
 *   publicKey  → Merchant Key   (PayU calls this "Key")
 *   secretKey  → Merchant Salt
 *   mode       → "test" | "live"  (routes to sandbox or production URL)
 *
 * PayU hosted-checkout flow:
 *   1. Server computes a SHA-512 hash of the order fields + salt.
 *   2. Server returns the form fields + hash + endpoint URL to the client.
 *   3. Client POSTs that form to PayU, which renders its checkout page.
 *   4. PayU redirects back to surl / furl with the txn result + response
 *      hash that we verify server-side.
 */

import crypto from "crypto";
import { getSettings } from "./settings-store";

export interface PayUConfig {
  key: string;
  salt: string;
  mode: "test" | "live";
  endpoint: string;
}

export interface PayUCheckoutRequest {
  txnid: string;           // our order id — must be unique per attempt
  amount: number;          // in major currency unit (INR usually)
  productinfo: string;
  firstname: string;
  email: string;
  phone?: string;
  surl: string;            // success redirect URL
  furl: string;            // failure redirect URL
  udf1?: string;           // user-defined fields — handy for metadata
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}

export interface PayUCheckoutFields {
  endpoint: string;
  fields: Record<string, string>;
}

/** Read admin-managed credentials; throws if the gateway isn't configured. */
export function getPayUConfig(): PayUConfig {
  const gw = getSettings().paymentGateways.find((g) => g.id === "payu");
  if (!gw || !gw.enabled) {
    throw new Error("PayU is not enabled in admin settings.");
  }
  const key = (gw.publicKey || "").trim();
  const salt = (gw.secretKey || "").trim();
  if (!key || !salt) {
    throw new Error("PayU Merchant Key and Salt must be configured in admin settings.");
  }
  const mode: "test" | "live" = gw.mode === "live" ? "live" : "test";
  const endpoint =
    mode === "live"
      ? "https://secure.payu.in/_payment"
      : "https://test.payu.in/_payment";
  return { key, salt, mode, endpoint };
}

/**
 * PayU request hash formula (as documented in their integration kit):
 *   sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
 * Missing udf fields are blank — the pipes stay.
 */
export function buildRequestHash(params: {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  salt: string;
}): string {
  const p = params;
  const s = [
    p.key,
    p.txnid,
    p.amount,
    p.productinfo,
    p.firstname,
    p.email,
    p.udf1 || "",
    p.udf2 || "",
    p.udf3 || "",
    p.udf4 || "",
    p.udf5 || "",
    "", "", "", "", "",     // 5 reserved slots, always blank on the way out
    p.salt,
  ].join("|");
  return crypto.createHash("sha512").update(s).digest("hex");
}

/**
 * Response hash (used to verify PayU's redirect / webhook):
 *   sha512(salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 */
export function buildResponseHash(params: {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  status: string;
  salt: string;
}): string {
  const p = params;
  const s = [
    p.salt,
    p.status,
    "", "", "", "", "", "",  // 6 reserved slots
    p.udf5 || "",
    p.udf4 || "",
    p.udf3 || "",
    p.udf2 || "",
    p.udf1 || "",
    p.email,
    p.firstname,
    p.productinfo,
    p.amount,
    p.txnid,
    p.key,
  ].join("|");
  return crypto.createHash("sha512").update(s).digest("hex");
}

/** Build the exact HTML-form payload the client must POST to PayU. */
export function createCheckoutFields(req: PayUCheckoutRequest): PayUCheckoutFields {
  const { key, salt, endpoint } = getPayUConfig();
  const amount = req.amount.toFixed(2);
  const hash = buildRequestHash({
    key,
    txnid: req.txnid,
    amount,
    productinfo: req.productinfo,
    firstname: req.firstname,
    email: req.email,
    udf1: req.udf1,
    udf2: req.udf2,
    udf3: req.udf3,
    udf4: req.udf4,
    udf5: req.udf5,
    salt,
  });
  return {
    endpoint,
    fields: {
      key,
      txnid: req.txnid,
      amount,
      productinfo: req.productinfo,
      firstname: req.firstname,
      email: req.email,
      phone: req.phone || "",
      surl: req.surl,
      furl: req.furl,
      udf1: req.udf1 || "",
      udf2: req.udf2 || "",
      udf3: req.udf3 || "",
      udf4: req.udf4 || "",
      udf5: req.udf5 || "",
      hash,
      service_provider: "payu_paisa",
    },
  };
}

/** Verify the hash PayU POSTs back after a txn; timing-safe comparison. */
export function verifyResponse(body: Record<string, string>): boolean {
  try {
    const { key, salt } = getPayUConfig();
    if (body.key && body.key !== key) return false;
    const expected = buildResponseHash({
      key,
      txnid: body.txnid || "",
      amount: body.amount || "",
      productinfo: body.productinfo || "",
      firstname: body.firstname || "",
      email: body.email || "",
      udf1: body.udf1,
      udf2: body.udf2,
      udf3: body.udf3,
      udf4: body.udf4,
      udf5: body.udf5,
      status: body.status || "",
      salt,
    });
    const given = (body.hash || "").toLowerCase();
    if (expected.length !== given.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given));
  } catch {
    return false;
  }
}
