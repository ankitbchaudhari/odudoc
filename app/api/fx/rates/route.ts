// Public FX rate fetcher. Wraps lib/currency-convert.ts which
// already has dual-provider failover + 1h cache. Useful for
// client-side dashboards that need to convert a stored amount
// (e.g. USD) into the doctor's display currency in batch.
//
// GET /api/fx/rates?base=USD
//   { base: "USD", rates: { INR: 83.42, EUR: 0.92, ... }, fetchedAt: 1738... }

import { NextRequest, NextResponse } from "next/server";
import { getRates } from "@/lib/currency-convert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const base = (req.nextUrl.searchParams.get("base") || "USD")
    .toUpperCase()
    .slice(0, 3);
  if (!/^[A-Z]{3}$/.test(base)) {
    return NextResponse.json({ error: "Invalid base currency" }, { status: 400 });
  }
  const rates = await getRates(base);
  return NextResponse.json({
    base,
    rates,
    fetchedAt: Date.now(),
  });
}
