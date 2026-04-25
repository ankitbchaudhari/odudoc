// Public read of the payment providers available to the visitor.
//
// Combines the admin-managed enabled-gateways list (from settings) with
// regional routing rules in lib/payment-routing.ts. Returns the
// suggested default first, followed by alternates the visitor can opt
// into. Used by the booking flow so the checkout page can surface a
// regional payment option (PayU in India, Tazapay in APAC, ConnectPay
// in EU/US) without anyone hard-coding 'stripe'.

import { NextRequest, NextResponse } from "next/server";
import { providersForCountry, suggestedProvider } from "@/lib/payment-routing";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const country = req.headers.get("x-vercel-ip-country") || "";
  const providers = providersForCountry(country);
  const suggested = suggestedProvider(country);
  return NextResponse.json(
    {
      country: country || null,
      suggested: suggested.id,
      providers,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
