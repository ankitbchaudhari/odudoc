"use client";

// Meta Pixel — fail-closed, allowlist-gated.
//
// Renders nothing unless ALL of the following are true:
//   1. NEXT_PUBLIC_META_PIXEL_ID is set (or the legacy
//      facebookPixelId theme setting is filled in — read at runtime
//      via the settings store). Without an ID there's nothing to load.
//   2. The current route passes lib/marketing-routes.ts allowlist.
//      Patient + clinical surfaces are denied unconditionally.
//   3. The user has accepted the marketing cookie category via the
//      CookieConsent banner. We never load marketing trackers on a
//      "necessary-only" choice.
//
// IMPORTANT: this component is deliberately a near-empty stub today.
// We DO NOT inject fbevents.js yet, because Meta's 20-Jun-2026
// "Automatic event enrichment" default will scrape page metadata
// (titles, OG tags, schema.org, breadcrumbs) and ship it back.
// Until that auto-toggle is turned OFF inside Events Manager AND a
// DPO sign-off is on record, this component intentionally renders
// nothing even on the marketing allowlist. The scaffold exists so
// that flipping the kill-switch is a single safe change.
//
// To actually enable in future:
//   1. Set the toggle below to `true` (or env-gate it on
//      NEXT_PUBLIC_META_PIXEL_ENABLED === "1").
//   2. Confirm "Automatic event enrichment" is OFF in Meta Events
//      Manager.
//   3. Confirm CookieConsent has a "marketing" category and is
//      defaulting to opt-in for the user's region only where lawful.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isMarketingRoute } from "@/lib/marketing-routes";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
// Hard kill-switch. Flip to `true` only after the Events Manager
// auto-enrichment toggle has been turned off and a compliance sign-off
// is on record. See lib/marketing-routes.ts for the full reasoning.
const PIXEL_ENABLED = process.env.NEXT_PUBLIC_META_PIXEL_ENABLED === "1";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export default function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (!PIXEL_ENABLED) return;
    if (!PIXEL_ID) return;
    if (!isMarketingRoute(pathname)) return;
    // Marketing cookie consent check. The CookieConsent banner stores
    // its decision in localStorage under "cookieConsent" — only fire
    // if the user explicitly accepted marketing.
    try {
      const consent = window.localStorage.getItem("cookieConsent");
      if (!consent) return;
      const parsed = JSON.parse(consent) as { marketing?: boolean } | null;
      if (!parsed?.marketing) return;
    } catch {
      return; // fail closed on any read/parse error
    }

    // Lazy-init the fbq stub so we control insertion order. We do NOT
    // call fbq("track", "PageView") here — page views will be fired
    // explicitly by marketing code on conversion events only, which
    // sidesteps Meta's PageView-derived audience-building.
    if (typeof window.fbq === "function") return;

    const w = window as Window & { fbq?: (...args: unknown[]) => void };
    type FbqStub = ((...args: unknown[]) => void) & {
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
    };
    const stub: FbqStub = function (this: FbqStub, ...args: unknown[]) {
      (stub.queue = stub.queue || []).push(args);
    } as FbqStub;
    stub.queue = [];
    stub.loaded = true;
    stub.version = "2.0";
    w.fbq = stub;
    w._fbq = stub;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);

    w.fbq?.("init", PIXEL_ID);
    // Intentionally NOT calling fbq("track", "PageView") — events
    // are fired manually on conversion only, per DPO requirement.
  }, [pathname]);

  // No <noscript> tag either — the 1x1 tracking GIF would fire
  // regardless of the JS-side guards, defeating the allowlist.
  return null;
}
