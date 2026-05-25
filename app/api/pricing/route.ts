// Public pricing lookup. Resolves the visitor's country (URL ?country
// override > odudoc-country cookie > Vercel geo header > "US" default)
// and returns every product's localized price in one call.
//
// Shape:
//   {
//     country: "IN",
//     currency: { code: "INR", symbol: "₹", ... },
//     products: { [productKey]: ResolvedPrice }
//   }
//
// Force-dynamic because the response varies by header / cookie /
// query — Next.js would otherwise try to cache a single response.

import { NextRequest, NextResponse } from "next/server";
import { resolveAllPrices } from "@/lib/regional-pricing";
import { resolveVisitorCountry } from "@/lib/resolve-visitor-country";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const country = resolveVisitorCountry(req);
  const prices = await resolveAllPrices(country);
  // Index by productKey for O(1) lookup at the call site (the pricing
  // page reads a known set of keys, not the whole list).
  const products: Record<string, (typeof prices)[number]> = {};
  for (const p of prices) products[p.productKey] = p;
  return NextResponse.json({
    country,
    currency: prices[0]?.currency ?? null,
    products,
  });
}
