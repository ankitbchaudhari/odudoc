// Public endpoint — returns the active auto-apply offer for the banner +
// any other active offers the site might want to display. No auth; safe
// for the homepage to fetch.

import { NextResponse } from "next/server";
import { getActiveOffers, getPrimaryOffer } from "@/lib/offers-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    primary: getPrimaryOffer(),
    active: getActiveOffers(),
  });
}
