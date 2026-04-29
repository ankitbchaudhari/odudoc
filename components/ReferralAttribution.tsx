"use client";

// Tiny client component that captures `?ref=CODE` from the URL on
// any page and stashes it in localStorage. Survives navigation, so
// a visitor landing on a marketing page from a referral link can
// browse around before signing up and the code is still there
// when they hit /auth/register.
//
// Mount once near the root of the app — duplicates are harmless
// (idempotent write).

import { useEffect } from "react";

const KEY = "odudoc_ref";
const TTL_DAYS = 30;

export default function ReferralAttribution() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (!ref) return;
      const code = ref.trim().toUpperCase();
      if (code.length < 4 || code.length > 16) return;
      const payload = JSON.stringify({
        code,
        capturedAt: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000
        ).toISOString(),
      });
      window.localStorage.setItem(KEY, payload);
    } catch {
      // localStorage blocked (private browsing, third-party-cookie
      // restrictions). The ?ref= URL alone still works on direct
      // signup; only the navigation-survival case is lost.
    }
  }, []);
  return null;
}

/** Helper for the registration form: read a still-valid stored
 *  referral code, ignoring expired ones. */
export function readStoredReferralCode(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as {
      code: string;
      expiresAt: string;
    };
    if (new Date(parsed.expiresAt).getTime() < Date.now()) {
      window.localStorage.removeItem(KEY);
      return undefined;
    }
    return parsed.code;
  } catch {
    return undefined;
  }
}
