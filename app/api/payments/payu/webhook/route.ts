// PayU redirects back to our surl/furl with a form-encoded body that
// includes the txn result + response hash. Same endpoint also serves
// as the server-to-server webhook (PayU's "Informational URL").
//
// We verify the SHA-512 response hash with the configured Merchant
// Salt, then — on success — flip the matching consultation to Paid.
// Mismatched hashes are refused with 400 so an attacker can't forge
// a completion.

import { NextRequest, NextResponse } from "next/server";
import { verifyResponse } from "@/lib/payu";
import { getConsultation, markPaid, markPaymentFailed } from "@/lib/consultations-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";

async function readBody(req: NextRequest): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return (await req.json()) as Record<string, string>;
    } catch {
      return {};
    }
  }
  // PayU posts application/x-www-form-urlencoded by default.
  const text = await req.text();
  const out: Record<string, string> = {};
  for (const pair of text.split("&")) {
    const [k, v = ""] = pair.split("=");
    if (!k) continue;
    out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " "));
  }
  return out;
}

async function handle(req: NextRequest) {
  const body = await readBody(req);
  if (!verifyResponse(body)) {
    log.error("payu.webhook.bad_hash", undefined, { txnid: body.txnid });
    return NextResponse.json({ error: "Invalid hash" }, { status: 400 });
  }

  // Our convention: `txnid` carried by PayU is the consultation id.
  const txnid = body.txnid || "";
  const status = (body.status || "").toLowerCase();
  const paymentId = body.mihpayid || body.payuMoneyId || body.txnid || txnid;

  if (txnid && getConsultation(txnid)) {
    try {
      if (status === "success") markPaid(txnid, `payu_${paymentId}`);
      else if (status === "failure" || status === "failed") markPaymentFailed(txnid);
    } catch (err) {
      log.error("payu.webhook.update_failed", err);
    }
  }
  return NextResponse.json({ ok: true, status });
}

export async function POST(req: NextRequest) {
  return handle(req);
}

// PayU's surl/furl are hit with a POST, but some setups redirect via
// GET after — accept both so the user lands on /payment/success cleanly.
export async function GET(req: NextRequest) {
  return handle(req);
}
