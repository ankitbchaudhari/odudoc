"use client";

// PostHog analytics — env-gated.
//
// Loads only when NEXT_PUBLIC_POSTHOG_KEY is set in the environment.
// Until then this component renders nothing and ships zero JS to
// visitors, so adding the integration without populating the key is
// a no-op.
//
// What we capture out of the box (PostHog autocapture):
//   - Pageviews (with the visitor cookie from lib/experiments.ts as
//     the distinct_id, so A/B variants and analytics events line up)
//   - Click + form submit events on every interactive element
//   - Web vitals (LCP, CLS, INP) when ?webvitals=1 is in the
//     bootstrap config
//
// What we deliberately do NOT capture:
//   - Form input values (PostHog masks them by default; we keep that)
//   - URL query strings on PII-bearing routes (configured below)
//
// To wire conversion events later:
//   import posthog from "posthog-js";
//   posthog.capture("consultation.booked", { specialty, fee });
//
// The library is dynamically imported inside this component so
// builds without the env var don't pull posthog-js into the bundle.

import { useEffect } from "react";
import { ensureVisitorIdClient } from "@/lib/experiments";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

// Routes whose query strings often carry PII / patient data and
// should be redacted before any event is captured.
const PII_ROUTE_PATTERNS = [
  /^\/dashboard\//,
  /^\/admin\//,
  /^\/api\//,
  /^\/consult\/book/,
  /^\/payment\//,
  /^\/prescription\//,
  /^\/consultation\//,
];

function shouldRedactQuery(pathname: string): boolean {
  return PII_ROUTE_PATTERNS.some((re) => re.test(pathname));
}

export default function Analytics() {
  useEffect(() => {
    if (!KEY) return;
    let cancelled = false;
    (async () => {
      const distinctId = ensureVisitorIdClient();
      try {
        const mod = await import("posthog-js");
        const posthog = mod.default;
        if (cancelled) return;
        posthog.init(KEY, {
          api_host: HOST,
          person_profiles: "identified_only",
          // Bring in the visitor cookie so A/B arms in
          // lib/experiments.ts and PostHog events join up.
          bootstrap: { distinctID: distinctId },
          capture_pageview: false, // we capture manually below
          capture_pageleave: true,
          autocapture: {
            // Don't capture sensitive form inputs.
            css_selector_allowlist: undefined,
          },
          // Redact query strings on PII-bearing routes — strips
          // ?bookingId=…&phone=… and similar before they leave the
          // browser.
          sanitize_properties: (props, _eventName) => {
            const url = typeof props.$current_url === "string" ? props.$current_url : "";
            if (!url) return props;
            try {
              const u = new URL(url);
              if (shouldRedactQuery(u.pathname)) {
                u.search = "";
                return { ...props, $current_url: u.toString() };
              }
            } catch {
              /* not a URL, ignore */
            }
            return props;
          },
        });
        // Manual pageview so we apply sanitize_properties to the
        // very first event (PostHog's auto pageview fires before
        // any other config takes effect).
        posthog.capture("$pageview");
      } catch (err) {
        // Failure to load PostHog must NEVER break the app — silent
        // fallback is the explicit policy.
        if (typeof console !== "undefined") {
          console.warn("[analytics] posthog-js failed to load", err);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return null;
}
