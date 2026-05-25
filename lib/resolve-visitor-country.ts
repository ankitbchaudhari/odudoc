// Single source of truth for "which country is this visitor in".
//
// Used by /api/pricing, /api/emergency-numbers and any future
// region-aware route. Priority order:
//   1. ?country=XX in the URL (admin preview, QA, integration tests)
//   2. odudoc-country cookie (set by the visible country switcher)
//   3. x-vercel-ip-country header (set by Vercel's edge from request IP)
//   4. cf-ipcountry header (fallback for Cloudflare proxies)
//   5. "US" — last-resort default, matches the same fallback used in
//      lib/geo-locale.ts
//
// Returns an UPPERCASED ISO-2 string. Never throws; on a malformed
// input we fall through to the next signal.

import type { NextRequest } from "next/server";

export const COUNTRY_COOKIE = "odudoc-country";

export function resolveVisitorCountry(req: NextRequest): string {
  const queryCountry = req.nextUrl.searchParams.get("country");
  if (queryCountry && /^[A-Za-z]{2}$/.test(queryCountry)) {
    return queryCountry.toUpperCase();
  }
  const cookieCountry = req.cookies.get(COUNTRY_COOKIE)?.value;
  if (cookieCountry && /^[A-Za-z]{2}$/.test(cookieCountry)) {
    return cookieCountry.toUpperCase();
  }
  const header =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    "";
  if (header && /^[A-Za-z]{2}$/.test(header)) {
    return header.toUpperCase();
  }
  return "US";
}
