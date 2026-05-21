// Allowlist for routes where third-party marketing trackers (Meta
// Pixel, Google Ads conversion tag, TikTok pixel, LinkedIn Insight)
// are permitted to load.
//
// OduDoc is a healthcare platform. Page titles, URLs, breadcrumbs,
// product tags, and (post-20-Jun-2026) Meta's AI-driven "Automatic
// event enrichment" can transmit inferred health attributes about
// visitors to ad networks. That's a problem under:
//
//   - India's DPDP Act 2023 — "health data" is sensitive personal
//     data requiring explicit, granular consent. We can't consent
//     a visitor to Meta enrichment before they've even decided to
//     book a consultation.
//   - GDPR Article 9 — special-category data (health) needs an
//     explicit lawful basis beyond the standard cookie consent.
//   - HIPAA — HHS 2023/2024 guidance: pixel trackers on
//     health-related URLs constitute a breach of unsecured PHI for
//     covered entities. We may not be a covered entity today, but
//     B2B hospital clients we serve are.
//   - Meta's own Health & Wellness ad policy — using inferred
//     sensitive-category data for targeting violates section 27.
//
// The strategy is FAIL-CLOSED: a route only loads marketing trackers
// when it appears in the allowlist below. Every new route is
// automatically excluded. If a marketing person wants to add a new
// blog category or campaign LP, they edit this file — explicit
// choice, in git, reviewable.
//
// To check the current route from a client component:
//
//     import { usePathname } from "next/navigation";
//     import { isMarketingRoute } from "@/lib/marketing-routes";
//     const path = usePathname();
//     if (!isMarketingRoute(path)) return null;
//
// Server components on a marketing-only page can simply render the
// pixel inline — but prefer the client-side check so a stray
// `<MetaPixel />` in the root layout still gets gated.

/** Exact-match allowlist. Routes here load the pixel as-is. */
const EXACT_ALLOW: ReadonlySet<string> = new Set([
  "/",
  "/about",
  "/contact",
  "/careers",
  "/press",
  "/faq",
  "/pricing",
  "/privacy",
  "/terms",
  "/signup",
  "/login",
  "/login/patient",
  "/login/doctor",
  "/login/corporate",
  "/for-doctors",
  "/for-clinics",
  "/for-hospitals",
  "/for-pharmacies",
  "/for-labs",
  "/for-pharma",
  "/for-insurance",
]);

/** Prefix allowlist. Any route starting with one of these loads the
 *  pixel. Used for blog posts, campaign landing pages, marketing
 *  feature pages — anywhere we publish content for un-authed visitors
 *  and DO NOT expose health-specific user data on the page. */
const PREFIX_ALLOW: ReadonlyArray<string> = [
  "/blog",
  "/changelog",
  "/customers",
  "/features",
  "/for-doctors/",
  "/for-clinics/",
  "/for-hospitals/",
  "/for-pharmacies/",
  "/for-labs/",
  "/for-pharma/",
  "/for-insurance/",
  "/learn",
];

/** Hard denylist — these win even if some future allowlist edit
 *  accidentally lets them through. Defence in depth. The intent
 *  reads as: "if the URL hints at a clinical context, no pixel.
 *  Ever. Period." */
const PREFIX_DENY: ReadonlyArray<string> = [
  "/dashboard",
  "/admin",
  "/pro",
  "/booking",
  "/consult",
  "/consultation",
  "/consult-now",
  "/video",
  "/appointments",
  "/doctors", // includes /doctors/[slug] specialty-revealing pages
  "/doctors-az",
  "/doctors-in",
  "/conditions", // disease-specific landing pages
  "/specialties",
  "/medicines",
  "/pharmacy",
  "/products",
  "/labs",
  "/lab-tests",
  "/tests",
  "/diet",
  "/mental-health",
  "/prescription",
  "/prescriptions",
  "/checkout",
  "/payment",
  "/cart",
  "/account",
  "/profile",
  "/clinic",
  "/hospital",
  "/api",
  "/auth", // login flows can carry next= URLs with health context
];

export function isMarketingRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const p = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";

  // Denylist wins.
  for (const deny of PREFIX_DENY) {
    if (p === deny || p.startsWith(deny + "/")) return false;
  }

  if (EXACT_ALLOW.has(p)) return true;

  for (const allow of PREFIX_ALLOW) {
    if (p === allow || p.startsWith(allow.endsWith("/") ? allow : allow + "/")) {
      return true;
    }
  }

  return false;
}
