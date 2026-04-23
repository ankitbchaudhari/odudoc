// PayU hosted-checkout bootstrapper.
//
// Returns the `endpoint` URL + signed `fields` the client must POST to
// PayU as an HTML form. The client renders a short auto-submit form
// (or a Link button) pointing at the endpoint. This two-step handoff
// is PayU's standard integration pattern — the hash must be generated
// server-side so the Merchant Salt never hits the browser.

import { NextRequest, NextResponse } from "next/server";
import { createCheckoutFields } from "@/lib/payu";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: {
    txnid?: string;
    amount?: number;
    productinfo?: string;
    firstname?: string;
    email?: string;
    phone?: string;
    metadata?: Record<string, string>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const txnid = (body.txnid || "").trim();
  const amount = Number(body.amount);
  const productinfo = (body.productinfo || "").trim();
  const firstname = (body.firstname || "").trim();
  const email = (body.email || "").trim();
  if (!txnid || !Number.isFinite(amount) || amount <= 0 || !productinfo || !firstname || !email) {
    return NextResponse.json(
      { error: "txnid, amount, productinfo, firstname and email are required" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.odudoc.com";
  const meta = body.metadata || {};

  try {
    const out = createCheckoutFields({
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone: body.phone,
      surl: `${appUrl}/payment/success?gw=payu&orderId=${encodeURIComponent(txnid)}`,
      furl: `${appUrl}/payment/cancel?gw=payu&orderId=${encodeURIComponent(txnid)}`,
      udf1: meta.type || "",
      udf2: meta.doctorId || meta.clinicId || "",
      udf3: meta.orderId || txnid,
    });
    return NextResponse.json({ ok: true, ...out });
  } catch (err) {
    log.error("payu.create_failed", err);
    const msg = err instanceof Error ? err.message : "PayU create failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
