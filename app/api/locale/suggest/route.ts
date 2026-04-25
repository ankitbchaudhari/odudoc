// Lightweight geo hint used by the checkout currency switcher.
//
// Returns `{ country, currency, language }` derived from request headers
// — see lib/geo-locale.ts for the priority order. Runs on the edge so the
// switcher can render with the right preselect on first paint.

import { NextResponse } from "next/server";
import { suggestLocale } from "@/lib/geo-locale";

export const runtime = "edge";

export async function GET(req: Request) {
  const { country, currency, language } = suggestLocale(req);
  return NextResponse.json({
    country,
    currency: {
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      decimals: currency.decimals,
    },
    language: {
      code: language.code,
      name: language.name,
      native: language.native,
      rtl: language.rtl,
    },
  });
}
