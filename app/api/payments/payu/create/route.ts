// PayU hosted-checkout bootstrapper.
//
// Returns the `endpoint` URL + signed `fields` the client must POST to
// PayU as an HTML form. The client renders a short auto-submit form
// (or a Link button) pointing at the endpoint. This two-step handoff
// is PayU's standard integration pattern — the hash must be generated
// server-side so the Merchant Salt never hits the browser.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCheckoutFields } from "@/lib/payu";
import { parseJson } from "@/lib/api-validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const PayuCreateSchema = z.object({
  txnid: z.string().trim().min(1).max(64),
  amount: z.number().positive().max(10000000),
  productinfo: z.string().trim().min(1).max(200),
  firstname: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(32).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, PayuCreateSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const { txnid, amount, productinfo, firstname, email } = body;
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
