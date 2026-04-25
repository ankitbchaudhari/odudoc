// Public read of the currency slice of site settings.
//
// Returns the site default + the list of currencies the admin has marked
// as accepted at checkout. Used by the CurrencySwitcher to populate its
// dropdown without exposing the rest of the (admin-only) settings.

import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings-store";
import { byCode } from "@/lib/currencies";

export const runtime = "nodejs";

export async function GET() {
  const s = getSettings();
  const enabledCodes = (s.enabledCurrencies && s.enabledCurrencies.length > 0)
    ? s.enabledCurrencies
    : ["USD", "EUR", "GBP", "INR", "AED"];

  // Always make sure the site default is in the visible list — the user
  // should be able to "pay in the default" even if the admin removed it
  // from enabledCurrencies by accident.
  const codes = Array.from(new Set([s.currency.code, ...enabledCodes]));

  const enabled = codes
    .map((code) => {
      const def = byCode(code);
      if (!def) return null;
      return {
        code: def.code,
        name: def.name,
        symbol: def.symbol,
        decimals: def.decimals,
      };
    })
    .filter((x): x is { code: string; name: string; symbol: string; decimals: number } => x !== null);

  return NextResponse.json({
    default: {
      code: s.currency.code,
      symbol: s.currency.symbol,
      name: s.currency.name,
      decimals: s.currency.decimals,
    },
    enabled,
  });
}
