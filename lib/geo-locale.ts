// Geo-based locale suggestion.
//
// Reads incoming request headers and returns a {country, currency, language}
// hint the UI can use to pre-select a checkout currency or interface language.
//
// Signal priority:
//   1. `x-vercel-ip-country` — set automatically by Vercel's edge network
//      from the requester's IP. EMPTY in `next dev` and on non-Vercel hosts;
//      treat the absence as "unknown" and fall through to the default.
//   2. `accept-language` — browser preference, used as a language fallback
//      when the country doesn't pin a clear primary language.
//   3. Hard default: `{ country: "US", currency: USD, language: en }`.
//
// Pure function, no I/O — safe to call from edge / node / RSC.

import { byCountry as currencyByCountry, type CurrencyDef } from "./currencies";
import {
  byCode as langByCode,
  byCountry as langByCountry,
  type LanguageDef,
} from "./languages-catalogue";

export interface SuggestedLocale {
  country: string;            // ISO 3166-1 alpha-2, uppercase
  currency: CurrencyDef;
  language: LanguageDef;
}

// Accept either a NextRequest or a plain `Request` so this works from edge
// route handlers, RSC, and middleware. Both expose `headers.get`.
type HeadersLike = { headers: { get(name: string): string | null } };

const FALLBACK_COUNTRY = "US";

export function suggestLocale(req: HeadersLike): SuggestedLocale {
  const rawCountry = req.headers.get("x-vercel-ip-country") || "";
  const country = (rawCountry || FALLBACK_COUNTRY).toUpperCase();

  const acceptLang = req.headers.get("accept-language") || "en";
  // First listed locale wins. "en-US,en;q=0.9,fr;q=0.8" → "en-US" → "en".
  const firstTag = acceptLang.split(",")[0]?.trim() || "en";
  const langCode = (firstTag.split("-")[0] || "en").toLowerCase();

  const currency =
    currencyByCountry(country) || currencyByCountry(FALLBACK_COUNTRY);
  // currencies.ts always has USD, so this can't be undefined — assert for TS.
  if (!currency) throw new Error("USD missing from currency catalogue");

  // Prefer the user's accept-language pick when we can resolve it; otherwise
  // fall back to the country's primary language; otherwise an English stub.
  const language: LanguageDef =
    langByCode(langCode) ||
    langByCountry(country) ||
    langByCode("en") || {
      code: langCode,
      name: "",
      native: "",
      rtl: false,
      countries: [],
    };

  return { country, currency, language };
}
