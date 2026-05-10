// Compute country-aware invoice tax. Stateless — pure function over
// the request body. Used by hospital billing, pharmacy invoicing,
// lab invoicing, and the patient wallet for receipt rendering.

import { NextRequest, NextResponse } from "next/server";
import { computeInvoice, COUNTRY_TAX_RULES } from "@/lib/tax/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ rules: COUNTRY_TAX_RULES });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body.countryIso2 || !Array.isArray(body.lines)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const summary = computeInvoice({
    countryIso2: String(body.countryIso2),
    lines: body.lines,
    intraStateInIndia: !!body.intraStateInIndia,
    reducedCategories: Array.isArray(body.reducedCategories) ? body.reducedCategories : undefined,
  });
  return NextResponse.json({ summary });
}
