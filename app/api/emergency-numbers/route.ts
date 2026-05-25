// Public lookup for the emergency banner. Resolves the visitor's
// country (via the Vercel edge geo header) against the admin-managed
// list in site settings and returns the matching {localEmergency,
// helpline} pair, falling back to the "*" row when no country-specific
// entry exists.
//
// Cached very lightly: the answer only changes when an admin edits the
// list, and the banner is fetched on every page mount, so we just turn
// off the route cache and let the client cache via fetch's default.

import { NextRequest, NextResponse } from "next/server";
import { ensureHydrated, getSettings } from "@/lib/settings-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await ensureHydrated();
  const settings = getSettings();
  const list = settings.emergencyNumbers || [];

  // x-vercel-ip-country is populated by Vercel's edge from the request
  // IP. In `next dev` (and on non-Vercel hosts) it's missing — we just
  // return the "*" fallback row in that case, which is the same row a
  // browser-overridden country would hit if it didn't match any entry.
  // Allow a manual override via ?country=XX so the admin preview / QA
  // can sanity-check a row without spoofing headers.
  const headerCountry =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    "";
  const queryCountry = req.nextUrl.searchParams.get("country") || "";
  const country = (queryCountry || headerCountry || "").toUpperCase();

  const match =
    (country && list.find((e) => e.country.toUpperCase() === country)) ||
    list.find((e) => e.country === "*") ||
    null;

  if (!match) {
    // Settings has no rows at all — hand back a hard default so the
    // banner can still render something useful. This shouldn't happen
    // in practice (the store seeds a "*" row), but guards against an
    // admin emptying the table.
    return NextResponse.json({
      country: country || null,
      localEmergency: "911",
      helpline: "+1 (302) 899-2625",
      fallback: true,
    });
  }

  return NextResponse.json({
    country: country || null,
    matched: match.country,
    localEmergency: match.localEmergency,
    helpline: match.helpline,
  });
}
